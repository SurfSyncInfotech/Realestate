import { useState } from "react";
import { ArrowLeft, ArrowUpRight, CheckCircle2, Eye, EyeOff, MailCheck, ShieldCheck } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import SiteLayout from "../components/SiteLayout.jsx";
import SmartImage from "../components/SmartImage.jsx";
import { img } from "../data/media.js";
import { apiErrorMessage, requestPasswordReset, resetPassword } from "../services/auth.js";

function Shell({ title, lead, children }) {
  return (
    <SiteLayout>
      <main className="au au-customer">
        <aside className="au-aside">
          <SmartImage src={img("1613490493576-7fde63acd811", 1400)} alt="" loading="eager" />
          <div className="au-shade" />
          <div className="au-aside-copy">
            <p className="au-eyebrow">Account security</p>
            <h1>Back in, <em>safely.</em></h1>
            <p>Reset links are single-use and expire after one hour.</p>
          </div>
        </aside>
        <section className="au-panel">
          <div className="au-card">
            <span className="au-flag"><ShieldCheck size={14} aria-hidden="true" /> Secure reset</span>
            <h2>{title}</h2>
            <p className="au-lead">{lead}</p>
            {children}
            <Link className="au-back" to="/sign-in"><ArrowLeft size={14} /> Back to sign-in</Link>
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}

// Step 1: ask for the email. The answer is the same whether or not the account exists.
export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState({ busy: false, done: "", error: "" });

  async function submit(event) {
    event.preventDefault();
    setState({ busy: true, done: "", error: "" });
    try {
      const result = await requestPasswordReset(email);
      setState({ busy: false, done: result.message, error: "" });
    } catch (error) {
      setState({ busy: false, done: "", error: apiErrorMessage(error, "We could not send the email right now. Please try again in a moment.") });
    }
  }

  return (
    <Shell title="Forgot your password?" lead="Enter the email you signed up with and we will send you a link to choose a new password.">
      {state.done ? (
        <div className="au-done" role="status">
          <MailCheck size={34} aria-hidden="true" />
          <p>{state.done}</p>
          <p style={{ fontSize: ".9rem" }}>Nothing arrived? Check your spam folder, or ask the Estate &amp; Co. team to reset it for you.</p>
        </div>
      ) : (
        <form className="au-form" onSubmit={submit}>
          <label>Email address
            <input type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <button className="au-submit" type="submit" disabled={state.busy}>
            {state.busy ? "Sending…" : "Send reset link"} <ArrowUpRight size={16} />
          </button>
          {state.error && <p className="form-message form-error" role="alert">{state.error}</p>}
        </form>
      )}
    </Shell>
  );
}

// Step 2: the emailed link brings the visitor here with ?token=...
export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [show, setShow] = useState(false);
  const [state, setState] = useState({ busy: false, done: false, error: "" });
  const mismatch = form.confirm.length > 0 && form.password !== form.confirm;

  async function submit(event) {
    event.preventDefault();
    if (form.password !== form.confirm) {
      setState({ busy: false, done: false, error: "The two passwords do not match." });
      return;
    }
    setState({ busy: true, done: false, error: "" });
    try {
      await resetPassword(token, form.password);
      setState({ busy: false, done: true, error: "" });
    } catch (error) {
      setState({ busy: false, done: false, error: apiErrorMessage(error, "We could not reset your password. Please try again.") });
    }
  }

  if (!token) {
    return (
      <Shell title="This link is incomplete" lead="Open the full link from your email, or request a new one.">
        <Link className="au-submit" to="/forgot-password" style={{ textDecoration: "none" }}>Request a new link <ArrowUpRight size={16} /></Link>
      </Shell>
    );
  }

  return (
    <Shell title="Choose a new password" lead="Pick something you have not used elsewhere. At least 8 characters.">
      {state.done ? (
        <div className="au-done" role="status">
          <CheckCircle2 size={34} aria-hidden="true" />
          <p>Your password has been changed and you were signed out everywhere. Sign in with the new one.</p>
          <Link className="button button-outline" to="/sign-in">Go to sign-in</Link>
        </div>
      ) : (
        <form className="au-form" onSubmit={submit}>
          <label>New password
            <span className="au-password">
              <input type={show ? "text" : "password"} required minLength={8} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <button type="button" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow(!show)}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </span>
          </label>
          <label>Confirm new password
            <input type={show ? "text" : "password"} required minLength={8} autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} aria-invalid={mismatch} />
          </label>
          {mismatch && <p className="form-message form-error" role="alert">The two passwords do not match.</p>}
          <button className="au-submit" type="submit" disabled={state.busy}>
            {state.busy ? "Saving…" : "Change password"} <ArrowUpRight size={16} />
          </button>
          {state.error && (
            <p className="form-message form-error" role="alert">
              {state.error} <Link to="/forgot-password" style={{ textDecoration: "underline" }}>Request a new link</Link>
            </p>
          )}
        </form>
      )}
    </Shell>
  );
}
