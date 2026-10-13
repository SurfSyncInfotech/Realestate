import { useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  Clock,
  Handshake,
  HeartHandshake,
  Landmark,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import SiteLayout from "../components/SiteLayout.jsx";
import SmartImage from "../components/SmartImage.jsx";
import { img } from "../data/media.js";
import { site } from "../data/site.js";
import { apiErrorMessage, sendContactMessage } from "../services/auth.js";

/* ───────────────────────── About ───────────────────────── */

const values = [
  {
    icon: ShieldCheck,
    title: "Trust before transactions",
    text: "We verify ownership, RERA details and photographs before a listing goes live, and we say plainly when something has not been verified.",
  },
  {
    icon: HeartHandshake,
    title: "Advice, not pressure",
    text: "Your advisor is paid to help you decide well, not quickly. We will tell you when a property is not right for you.",
  },
  {
    icon: Sparkles,
    title: "Design with a point of view",
    text: "We care about light, proportion, materials and the street outside the door, the things a floor plan never shows.",
  },
  {
    icon: Handshake,
    title: "Respect for your time and data",
    text: "One enquiry reaches one named advisor. Your details are never sold, and you can ask us to delete them at any time.",
  },
];

const services = [
  { icon: Search, title: "Search that understands you", text: "Filter by city, budget, BHK, property type, furnishing and possession, then save what you love." },
  { icon: Building2, title: "Residential, commercial and new launches", text: "Apartments, villas and plots to buy or rent, offices and retail, and pre-launch projects from trusted builders." },
  { icon: CalendarCheck, title: "Site visits, arranged for you", text: "Pick a time that suits your week; your advisor confirms with the owner or builder and accompanies you." },
  { icon: Landmark, title: "Tools for confident decisions", text: "EMI calculator, price and area comparisons and plain-language guidance on documents and ownership." },
];

const process = [
  ["Tell us what matters", "Share your budget, city and the way you live. Create a free account to keep everything together."],
  ["Receive a considered shortlist", "Browse listings or ask an advisor for a curated set, with honest notes on each."],
  ["Visit with your advisor", "We schedule and attend site visits, and follow up on what you liked and what you did not."],
  ["Negotiate and complete", "Your advisor helps with offers, paperwork and handover until the keys are in your hand."],
];

function AboutPage() {
  return (
    <>
      <section className="ab-hero">
        <SmartImage src={img("1613490493576-7fde63acd811", 1900)} alt="Modern luxury residence at golden hour" loading="eager" />
        <div className="ab-hero-shade" />
        <div className="ab-hero-copy">
          <p className="ab-eyebrow">About Estate &amp; Co.</p>
          <h1>
            Not more listings.
            <br />
            <em>More meaning.</em>
          </h1>
          <p>
            Estate &amp; Co. is an Indian real-estate marketplace for people who
            believe where you live should feel like more than an address.
          </p>
        </div>
      </section>

      <section className="ab-story ab-shell">
        <div className="ab-story-art">
          <SmartImage src={img("1600585154526-990dced4db0d", 1100)} alt="Villa with pool and garden" />
        </div>
        <div>
          <p className="ab-eyebrow ab-dark">Our story</p>
          <h2>A home is not a commodity on a list.</h2>
          <p>
            It is light at a certain hour, a street you learn by heart and a
            neighbourhood that slowly becomes yours. Yet most property search
            still feels like scrolling an endless catalogue, with little to
            tell you who is behind a listing or whether it is even available.
          </p>
          <p>
            We started Estate &amp; Co. to change that: fewer, better-described
            properties; advisors you can name; and a process where every
            claim, from price to verification, can be checked.
          </p>
          <Link className="text-link" to="/search?mode=buy">
            Explore properties <ArrowUpRight size={15} />
          </Link>
        </div>
      </section>

      <section className="ab-values">
        <div className="ab-shell">
          <p className="ab-eyebrow ab-dark">What we stand for</p>
          <h2>Four promises we hold ourselves to.</h2>
          <div className="ab-grid">
            {values.map((v, i) => {
              const Icon = v.icon;
              return (
                <article className="ab-card reveal" style={{ "--d": `${i * 90}ms` }} key={v.title}>
                  <span className="ab-icon"><Icon size={22} aria-hidden="true" /></span>
                  <h3>{v.title}</h3>
                  <p>{v.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="ab-shell ab-services">
        <div className="ab-services-head">
          <p className="ab-eyebrow ab-dark">What we do</p>
          <h2>Everything between &ldquo;I am looking&rdquo; and &ldquo;I am home.&rdquo;</h2>
        </div>
        <div className="ab-service-list">
          {services.map((s, i) => {
            const Icon = s.icon;
            return (
              <article className="ab-service reveal" style={{ "--d": `${i * 90}ms` }} key={s.title}>
                <Icon size={24} aria-hidden="true" />
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="ab-process">
        <div className="ab-shell">
          <p className="ab-eyebrow">How it works</p>
          <h2>From first conversation to the keys.</h2>
          <ol>
            {process.map(([title, text], i) => (
              <li className="reveal" style={{ "--d": `${i * 100}ms` }} key={title}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="ab-shell ab-partners">
        <div>
          <p className="ab-eyebrow ab-dark">For agents &amp; builders</p>
          <h2>Reach serious buyers.</h2>
          <p>
            Approved agents and builders can list properties, receive leads,
            schedule site visits and track follow-ups from their own
            workspace. Every listing is reviewed before it is published, which
            keeps the marketplace trustworthy for everyone.
          </p>
          <ul className="ab-checks">
            {["Admin-verified listings earn a Verified badge", "Leads arrive with buyer details and consent", "Subscription plans sized to your inventory"].map((item) => (
              <li key={item}><CheckCircle2 size={18} aria-hidden="true" /> {item}</li>
            ))}
          </ul>
          <Link className="button button-dark" to="/contact">
            Become a partner <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="ab-partner-art">
          <SmartImage src={img("1486406146926-c627a92ad1ab", 1100)} alt="Modern glass office building" />
        </div>
      </section>

      <section className="ab-cities ab-shell">
        <p className="ab-eyebrow ab-dark">Where we work</p>
        <h2>Cities we serve.</h2>
        <div className="ab-city-chips">
          {site.cities.map((city) => (
            <Link key={city} to={`/search?mode=buy&city=${encodeURIComponent(city)}`}>
              <MapPin size={15} aria-hidden="true" /> {city}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

/* ───────────────────────── Contact ───────────────────────── */

const topics = [
  ["general", "General question"],
  ["buying", "I want to buy"],
  ["renting", "I want to rent"],
  ["selling", "I want to sell or list"],
  ["partnership", "Partnership"],
  ["support", "Account support"],
];

function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", topic: "general", message: "" });
  const [state, setState] = useState({ status: "idle", message: "" });
  const update = (field) => (event) => setForm((c) => ({ ...c, [field]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setState({ status: "sending", message: "" });
    try {
      const result = await sendContactMessage(form);
      setState({ status: "sent", message: result.message });
      setForm({ name: "", email: "", phone: "", topic: "general", message: "" });
    } catch (error) {
      setState({
        status: "error",
        message: apiErrorMessage(error, "We could not send your message. Please try again or email us directly."),
      });
    }
  }

  if (state.status === "sent") {
    return (
      <div className="ct-success" role="status">
        <CheckCircle2 size={36} aria-hidden="true" />
        <h3>Message received</h3>
        <p>{state.message}</p>
        <button type="button" className="button button-outline" onClick={() => setState({ status: "idle", message: "" })}>
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form className="ct-form" onSubmit={submit}>
      <h2>Send us a message</h2>
      <div className="ct-topics" role="group" aria-label="What is this about?">
        {topics.map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={form.topic === value}
            className={form.topic === value ? "selected" : ""}
            onClick={() => setForm((c) => ({ ...c, topic: value }))}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="ct-row">
        <label>
          Your name
          <input required maxLength={160} autoComplete="name" placeholder="Full name" value={form.name} onChange={update("name")} />
        </label>
        <label>
          Phone <small>(optional)</small>
          <input type="tel" maxLength={30} autoComplete="tel" placeholder="+91 98765 43210" value={form.phone} onChange={update("phone")} />
        </label>
      </div>
      <label>
        Email address
        <input required type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={update("email")} />
      </label>
      <label>
        How can we help?
        <textarea required minLength={5} maxLength={2000} rows="6" placeholder="Tell us a little about what you are looking for." value={form.message} onChange={update("message")} />
      </label>
      <button className="button button-dark" type="submit" disabled={state.status === "sending"}>
        {state.status === "sending" ? "Sending…" : "Send message"} <ArrowUpRight size={15} />
      </button>
      {state.status === "error" && (
        <p className="form-message form-error" role="alert">{state.message}</p>
      )}
      <p className="form-honesty">
        We use your details only to reply to this message. See our <Link to="/privacy">privacy notice</Link>.
      </p>
    </form>
  );
}

function ContactPage() {
  const channels = [
    site.email && { icon: Mail, label: "Email", value: site.email, href: `mailto:${site.email}` },
    site.phone && { icon: Phone, label: "Call", value: site.phone, href: `tel:${site.phone.replace(/\s/g, "")}` },
    site.whatsapp && { icon: MessageCircle, label: "WhatsApp", value: "Chat with an advisor", href: `https://wa.me/${site.whatsapp}` },
    site.address && { icon: MapPin, label: "Visit", value: site.address },
    { icon: Clock, label: "Hours", value: site.hours },
  ].filter(Boolean);

  return (
    <>
      <section className="ct-hero">
        <SmartImage src={img("1600607687939-ce8a6c25118c", 1900)} alt="Elegant home interior" loading="eager" />
        <div className="ab-hero-shade" />
        <div className="ab-hero-copy">
          <p className="ab-eyebrow">Contact us</p>
          <h1>
            Good things start
            <br />
            with <em>a hello.</em>
          </h1>
          <p>{site.responseTime}</p>
        </div>
      </section>

      <section className="ct-shell ct-layout">
        <aside className="ct-info">
          <h2>Talk to a person</h2>
          <p>Buying, renting, selling or partnering — tell us where you are in the journey and we will take it from there.</p>
          <ul className="ct-channels">
            {channels.map(({ icon: Icon, label, value, href }) => (
              <li key={label}>
                <span className="ct-icon"><Icon size={20} aria-hidden="true" /></span>
                <div>
                  <small>{label}</small>
                  {href ? <a href={href}>{value}</a> : <span>{value}</span>}
                </div>
              </li>
            ))}
          </ul>
          <div className="ct-promise">
            <BadgeCheck size={20} aria-hidden="true" />
            <p>Every message is read by a real advisor. No call centres, no spam.</p>
          </div>
          <div className="ct-cities">
            <small>We work in</small>
            <p>{site.cities.join(" · ")}</p>
          </div>
        </aside>
        <ContactForm />
      </section>
    </>
  );
}

/* ─────────────── Locations, journal, FAQ, legal ─────────────── */

const storySlugs = ["the-courtyard-a-room-with-no-ceiling", "a-slower-kind-of-morning", "the-art-of-keeping-a-little-space"];

const pages = {
  locations: {
    eyebrow: "A map of possibility",
    title: <>A city is made<br />of <em>small worlds.</em></>,
    intro: "The cities whose distinct rhythms make room for many different ways of living.",
    locations: [["Mumbai", "Sea-facing mornings, leafy lanes and the energy of a city that never quite stands still.", "01"], ["Bengaluru", "Garden walls, shaded porches and neighbourhoods that invite you to slow down.", "02"], ["Delhi", "A capital of grand avenues, intimate colonies and history around every corner.", "03"], ["Kochi", "Water, old-world streets and a coastal sensibility all its own.", "04"], ["Pune", "A thoughtful blend of green spaces, lively streets and a gentler pace.", "05"], ["Hyderabad", "A fast-growing city with space to build and lakeside launches.", "06"], ["Goa", "Pool villas, shaded verandahs and slow afternoons.", "07"], ["Chennai", "Beachside breezes and deep-rooted culture.", "08"]],
  },
  journal: {
    eyebrow: "The journal",
    title: <>Notes on how<br />we <em>make a home.</em></>,
    intro: "Ideas, architecture and ways of living — collected for the curious.",
    stories: [
      ["01", "The courtyard: a room with no ceiling", "On an old Indian idea that continues to bring light, air and life to a home.", "Architecture · 4 minute read"],
      ["02", "A slower kind of morning", "What the best streets have in common, from a Mumbai lane to a Bangalore garden suburb.", "Neighbourhoods · 6 minute read"],
      ["03", "The art of keeping a little space", "A designer's notes on objects, memory and making a place feel unmistakably yours.", "Living · 5 minute read"],
    ],
  },
  faq: {
    eyebrow: "Questions, considered",
    title: <>A few things<br />you might <em>wonder.</em></>,
    intro: "Straight answers to the questions we hear most often.",
    faqs: [
      ["Is there a fee to search or enquire?", "No. Browsing, saving properties and speaking to an advisor are free for buyers and renters."],
      ["How do I arrange a site visit?", "Open any property, choose Site visit and tell us when suits you. Your advisor confirms the time with the owner or builder and, where possible, accompanies you."],
      ["What does the Verified badge mean?", "It means our team has checked ownership documents, RERA registration where applicable and the listing photographs. Listings without the badge are still under review."],
      ["How quickly will someone reply?", "Every enquiry and message is answered within one working day, usually sooner."],
      ["I am an agent or builder. How do I list properties?", "Contact us to become a partner. Once approved you receive a workspace to add listings, receive leads and manage site visits."],
      ["How do I delete my account or data?", "Write to us from the Contact page and we will remove your account and personal details."],
    ],
  },
  privacy: {
    eyebrow: "The small print · Privacy",
    title: <>Your details<br />are <em>yours.</em></>,
    intro: "How Estate & Co. collects, uses and protects your information.",
    sections: [
      ["What we collect", "Your name, email address and phone number when you create an account, make an enquiry or contact us; and the properties you save or enquire about. Passwords are stored only as salted cryptographic hashes."],
      ["How we use it", "To reply to you, connect you with the right advisor, arrange site visits and keep your account secure. We do not sell your personal information."],
      ["Who can see it", "Your enquiry is visible to our team and, for a listed property, to the agent or builder responsible for it. Nobody else receives it without your consent, unless the law requires it."],
      ["Your choices", "You can ask us to correct or delete your data at any time through the Contact page. Sessions use a secure, HttpOnly cookie that expires automatically."],
    ],
  },
  terms: {
    eyebrow: "The small print · Terms",
    title: <>Plain terms,<br />fairly <em>stated.</em></>,
    intro: "The ground rules for using Estate & Co.",
    sections: [
      ["Using the service", "Estate & Co. connects buyers, renters, agents and builders. Listing information is provided by property owners, agents and builders and reviewed by our team, but you should confirm important details before committing."],
      ["Accounts", "Keep your password confidential. You are responsible for activity on your account. We may suspend accounts that misuse the service or post misleading listings."],
      ["Estimates", "The EMI calculator is a simplified estimate, not a lending quote or financial advice. Please consult a qualified professional before making a financial decision."],
      ["Images", "Photographs on listings are supplied by the property owners, agents and builders who list them, and remain their property. Do not copy or reuse them without permission."],
    ],
  },
};

export default function InformationPage({ page: pageProp }) {
  const { page: routePage } = useParams();
  const page = pageProp || routePage || "about";
  const crumb = page === "journal" ? "The journal" : page === "about" ? "About us" : page === "contact" ? "Contact us" : page[0].toUpperCase() + page.slice(1);

  if (page === "about" || page === "contact") {
    return (
      <SiteLayout>
        <main className={`info-page info-${page}`}>
          {page === "about" ? <AboutPage /> : <ContactPage />}
        </main>
      </SiteLayout>
    );
  }

  const content = pages[page];
  if (!content) {
    return (
      <SiteLayout>
        <main className="page-shell not-found">
          <p className="eyebrow">A missing page</p>
          <h1>This page has <em>not arrived.</em></h1>
          <Link to="/" className="text-link"><ArrowLeft size={15} /> Return home</Link>
        </main>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <main className={`page-shell info-page info-${page}`}>
        <div className="breadcrumbs"><Link to="/">Home</Link><span>/</span><span>{crumb}</span></div>
        <div className="info-hero"><p className="eyebrow">{content.eyebrow}</p><h1>{content.title}</h1><p className="info-intro">{content.intro}</p></div>
        {content.sections && <div className="copy-sections">{content.sections.map(([title, text], index) => <section key={title}><span className="copy-index">0{index + 1}</span><h2>{title}</h2><p>{text}</p></section>)}</div>}
        {content.locations && <div className="location-collection">{content.locations.map(([name, text, number]) => <article key={name}><span className="copy-index">{number}</span><div><h2>{name}</h2><p>{text}</p></div><Link aria-label={`Explore ${name}`} to={`/locations/${name.toLowerCase()}`}><ArrowUpRight size={19} /></Link></article>)}</div>}
        {content.stories && <div className="story-collection">{content.stories.map(([number, title, text, meta], index) => <article key={title}><span className="copy-index">{number}</span><div className={`story-art art-${["sage", "sand", "rose"][index]}`}><SmartImage src={img(["1600585154526-990dced4db0d", "1600566752355-35792bedcfea", "1600573472550-8090b5e0745e"][index], 800)} alt="" /></div><div className="story-copy"><p className="eyebrow">{meta}</p><h2><Link to={`/journal/${storySlugs[index]}`}>{title}</Link></h2><p>{text}</p><Link className="text-link" to={`/journal/${storySlugs[index]}`}>Read story <ArrowUpRight size={15} /></Link></div></article>)}</div>}
        {content.faqs && <div className="faq-list">{content.faqs.map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown size={16} /></summary><p>{answer}</p></details>)}</div>}
        <div className="info-end"><span className="eyebrow">Still curious?</span><Link to="/contact" className="text-link">Talk to an advisor <ArrowUpRight size={15} /></Link></div>
      </main>
    </SiteLayout>
  );
}
