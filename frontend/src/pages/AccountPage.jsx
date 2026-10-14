import { useState } from "react";
import { ArrowLeft, ArrowUpRight, CheckCircle2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import SiteLayout from "../components/SiteLayout.jsx";
import SmartImage from "../components/SmartImage.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { img } from "../data/media.js";
import { apiErrorMessage, homeForRole, registerAccount, registerPartner } from "../services/auth.js";

// One sign-in / register screen, three entrances:
//   /sign-in, /register          customers
//   /agent, /agent/register      agents and builders
//   /admin                       administrators (sign-in only)
const PORTALS = {
  customer: {
    eyebrow: "Members",
    title: <>Your next chapter<br />starts <em>somewhere.</em></>,
    blurb: "Save the places you love, request callbacks and keep every site visit in one private place.",
    photo: "1613490493576-7fde63acd811",
    signIn: "Welcome back.",
    signInLead: "Sign in to see your saved properties and enquiries.",
    register: "Create your account",
    registerLead: "Create a free account to save properties and track your enquiries.",
    base: "/sign-in",
    registerPath: "/register",
    switchText: "New to Estate & Co.?",
    switchLink: "Create an account",
  },
  agent: {
    eyebrow: "Partner portal",
    title: <>List with<br /><em>confidence.</em></>,
    blurb: "Add listings, receive qualified enquiries and track every property from one workspace.",
    photo: "1486406146926-c627a92ad1ab",
    signIn: "Agent & builder sign-in",
    signInLead: "Sign in to manage your listings.",
    register: "Become a partner",
    registerLead: "Apply for an agent or builder account. Our team reviews every application before it goes live.",
    base: "/agent",
    registerPath: "/agent/register",
    switchText: "New partner?",
    switchLink: "Apply for an account",
  },
  admin: {
    eyebrow: "Administration",
    title: <>Run the<br /><em>marketplace.</em></>,
    blurb: "Review listings, approve partners and answer enquiries.",
    photo: "1600607687920-4e2a09cf159d",
    signIn: "Administrator sign-in",
    signInLead: "Authorised staff only.",
    base: "/admin",
  },
};

export default function AccountPage({ portal = "customer", register = false }) {
  const config = PORTALS[portal];
  const location = useLocation();
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const isRegister = register && portal !== "admin";
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", firstName: "", lastName: "", company: "", role: "agent" });
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);

  // Already signed in with the right kind of account: straight to the workspace.
  // /agent and /admin with a different account (e.g. a customer) show the
  // sign-in form instead of bouncing to the customer dashboard.
  const allowed = { customer: null, agent: ["agent", "builder"], admin: ["admin"] }[portal];
  const wrongAccount = user && allowed && !allowed.includes(user.role);
  if (user && !wrongAccount) return <Navigate to={homeForRole(user.role)} replace />;

  const update = (field) => (event) => setForm((c) => ({ ...c, [field]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (isRegister && portal === "agent") {
        const result = await registerPartner({
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          role: form.role,
          company: form.company,
        });
        setDone(result.message);
        return;
      }
      if (isRegister) {
        await registerAccount({
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
        });
      }
      const signedIn = await login({ email: form.email, password: form.password, portal });
      const target = location.state?.from;
      navigate(target && !["/sign-in", "/agent", "/admin"].includes(target) ? target : homeForRole(signedIn.role), { replace: true });
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "We could not reach the server. Please try again in a moment."));
    } finally {
      setBusy(false);
    }
  }

  const heading = isRegister ? config.register : config.signIn;
  const lead = isRegister ? config.registerLead : config.signInLead;

  return (
    <SiteLayout>
      <main className={`au au-${portal}`}>
        <aside className="au-aside">
          <SmartImage src={img(config.photo, 1400)} alt="" loading="eager" />
          <div className="au-shade" />
          <div className="au-aside-copy">
            <p className="au-eyebrow">{config.eyebrow}</p>
            <h1>{config.title}</h1>
            <p>{config.blurb}</p>
          </div>
        </aside>

        <section className="au-panel">
          <div className="au-card">
            <span className="au-flag"><ShieldCheck size={14} aria-hidden="true" /> Secure sign-in</span>
            <h2>{heading}</h2>
            <p className="au-lead">{lead}</p>
            {wrongAccount && (
              <p className="au-notice" role="status">
                You are currently signed in as <strong>{user.email}</strong> ({user.role}). Sign in below with your {portal} account, or{" "}
                <Link to={homeForRole(user.role)}>go to your dashboard</Link>.
              </p>
            )}

            {done ? (
              <div className="au-done" role="status">
                <CheckCircle2 size={34} aria-hidden="true" />
                <p>{done}</p>
                <Link className="button button-outline" to={config.base}>Go to sign-in</Link>
              </div>
            ) : (
              <form className="au-form" onSubmit={handleSubmit}>
                {isRegister && (
                  <div className="au-row">
                    <label>First name<input required autoComplete="given-name" value={form.firstName} onChange={update("firstName")} /></label>
                    <label>Last name<input autoComplete="family-name" value={form.lastName} onChange={update("lastName")} /></label>
                  </div>
                )}
                {isRegister && portal === "agent" && (
                  <div className="au-row">
                    <label>I am a
                      <select value={form.role} onChange={update("role")}>
                        <option value="agent">Real-estate agent</option>
                        <option value="builder">Builder / developer</option>
                      </select>
                    </label>
                    <label>{form.role === "builder" ? "Company name" : "Agency name"}<input required={form.role === "builder"} value={form.company} onChange={update("company")} /></label>
                  </div>
                )}
                <label>Email address
                  <input type="email" required autoComplete="email" placeholder="you@example.com" value={form.email} onChange={update("email")} />
                </label>
                <label>Password
                  <span className="au-password">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={isRegister ? 8 : 1}
                      autoComplete={isRegister ? "new-password" : "current-password"}
                      placeholder={isRegister ? "At least 8 characters" : "Your password"}
                      value={form.password}
                      onChange={update("password")}
                    />
                    <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </span>
                </label>
                {!isRegister && (
                  <Link className="au-forgot" to="/forgot-password">Forgot your password?</Link>
                )}
                <button className="au-submit" type="submit" disabled={busy}>
                  {busy ? "Please wait…" : isRegister ? (portal === "agent" ? "Submit application" : "Create account") : "Sign in"}
                  <ArrowUpRight size={16} />
                </button>
                {error && <p className="form-message form-error" role="alert">{error}</p>}
              </form>
            )}

            {config.registerPath && !done && (
              <p className="au-switch">
                {isRegister ? "Already registered?" : config.switchText}{" "}
                <Link to={isRegister ? config.base : config.registerPath}>
                  {isRegister ? "Sign in" : config.switchLink} <ArrowUpRight size={13} />
                </Link>
              </p>
            )}
            {portal === "customer" && (
              <p className="au-other">Agent or builder? <Link to="/agent">Partner sign-in</Link></p>
            )}
            {portal === "agent" && (
              <p className="au-other">Looking for a property? <Link to="/sign-in">Customer sign-in</Link></p>
            )}
            <Link className="au-back" to="/"><ArrowLeft size={14} /> Return to the website</Link>
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}
