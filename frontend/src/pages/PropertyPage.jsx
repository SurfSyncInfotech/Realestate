import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  BedDouble,
  Bath,
  Calculator,
  CalendarDays,
  Car,
  ChevronLeft,
  ChevronRight,
  Compass,
  Heart,
  Layers,
  MapPin,
  MessageCircle,
  MessageSquareText,
  PhoneCall,
  Ruler,
  Share2,
  Sofa,
  Sparkles,
  Timer,
  X,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import SiteLayout from "../components/SiteLayout.jsx";
import SmartImage from "../components/SmartImage.jsx";
import ListingCard from "../components/ListingCard.jsx";
import { img } from "../data/media.js";
import { useSaved } from "../context/SavedContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { recordView } from "../services/auth.js";
import { site } from "../data/site.js";
import {
  getPropertyById,
  listProperties,
  submitPropertyInquiry,
} from "../services/properties.js";

const FURNISHING = {
  furnished: "Fully furnished",
  semi_furnished: "Semi-furnished",
  unfurnished: "Unfurnished",
};

const MODE_LABEL = {
  buy: "Buy",
  rent: "Rent",
  commercial: "Commercial",
};

function Fact({ icon: Icon, label, value }) {
  if (!value && value !== 0) return null;
  return (
    <li className="pd-fact">
      <Icon size={20} aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
    </li>
  );
}

export default function PropertyPage() {
  const { id } = useParams();
  const [result, setResult] = useState({ id: "", property: null, error: "" });
  const [similar, setSimilar] = useState([]);
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const { isSaved, toggle } = useSaved();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");
  const [formError, setFormError] = useState("");
  const [interestType, setInterestType] = useState("enquiry");
  const [emi, setEmi] = useState({ loanAmount: 5000000, interestRate: 8.5, tenure: 20 });

  const loading = result.id !== id;
  const property = loading ? null : result.property;
  const loadError = loading ? "" : result.error;

  useEffect(() => {
    let current = true;
    window.scrollTo({ top: 0 });
    getPropertyById(id)
      .then((response) => {
        if (!current) return;
        setActive(0);
        setStatus("");
        setFormError("");
        setResult({ id, property: response.data, error: "" });
      })
      .catch((error) => {
        if (!current) return;
        setResult({
          id,
          property: null,
          error:
            error.response?.status === 404
              ? "This property is no longer available."
              : error.response?.data?.error?.message ||
                "This property could not be loaded right now. Please try again in a moment.",
        });
      });
    return () => {
      current = false;
    };
  }, [id]);

  // Signed-in customers get a "recently viewed" list.
  useEffect(() => {
    if (user && property) recordView(property.id).catch(() => {});
  }, [user, property]);

  // Similar properties: same category, other listings.
  useEffect(() => {
    if (!property) return undefined;
    let current = true;
    listProperties({ mode: property.mode })
      .then((response) => {
        if (current) setSimilar(response.data.filter((p) => p.id !== property.id).slice(0, 3));
      })
      .catch(() => current && setSimilar([]));
    return () => {
      current = false;
    };
  }, [property]);

  const images = useMemo(
    () => (property?.images?.length ? property.images : []).map((photo) => photo),
    [property],
  );

  // Keyboard control for the lightbox.
  useEffect(() => {
    if (!lightbox) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setLightbox(false);
      if (event.key === "ArrowRight") setActive((i) => (i + 1) % images.length);
      if (event.key === "ArrowLeft") setActive((i) => (i - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", onKey);
    document.body.classList.add("nav-locked");
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("nav-locked");
    };
  }, [lightbox, images.length]);

  async function submitInquiry(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSubmitting(true);
    setStatus("");
    setFormError("");
    try {
      const response = await submitPropertyInquiry({
        propertyId: property.id,
        name: data.get("name"),
        email: data.get("email"),
        phone: data.get("phone"),
        message: [`Request type: ${interestType}.`, data.get("message")]
          .filter(Boolean)
          .join(" ")
          .slice(0, 800),
        mode: property.mode,
      });
      setStatus(response.message);
      form.reset();
    } catch (error) {
      setFormError(
        error.response?.data?.error?.message ||
          "We could not send your request. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: property.title, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* user cancelled */
    }
  }

  if (loading) {
    return (
      <SiteLayout>
        <main className="page-shell property-page">
          <p className="eyebrow" role="status">Loading property…</p>
        </main>
      </SiteLayout>
    );
  }

  if (loadError || !property) {
    return (
      <SiteLayout>
        <main className="page-shell not-found">
          <p className="eyebrow">Property unavailable</p>
          <h1>
            This address is <em>not in the collection.</em>
          </h1>
          <p role="alert">{loadError || "No property details were returned."}</p>
          <Link className="button button-outline" to="/search">
            <ArrowLeft size={15} /> Return to properties
          </Link>
        </main>
      </SiteLayout>
    );
  }

  // EMI
  const P = emi.loanAmount;
  const R = emi.interestRate / 12 / 100;
  const N = emi.tenure * 12;
  const monthlyEMI = Math.round((P * R * Math.pow(1 + R, N)) / (Math.pow(1 + R, N) - 1));
  const totalPayment = monthlyEMI * N;
  const showEmi = property.mode === "buy";

  const mapQuery = encodeURIComponent(property.location);
  const phoneHref = site.phone ? `tel:${site.phone.replace(/\s/g, "")}` : null;
  const waHref = site.whatsapp
    ? `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(`Hi, I am interested in ${property.title} (${property.location}).`)}`
    : null;

  return (
    <SiteLayout>
      <main className="pd">
        <div className="pd-shell">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <Link to={`/search?mode=${property.mode}`}>{MODE_LABEL[property.mode] ?? "Properties"}</Link>
            <span>/</span>
            <span>{property.title}</span>
          </nav>

          <header className="pd-head">
            <div>
              <p className="pd-tags">
                <span>{property.tag}</span>
                {property.verified && (
                  <span className="pd-verified"><BadgeCheck size={14} aria-hidden="true" /> Verified</span>
                )}
                {property.luxury && <span className="pd-lux"><Sparkles size={14} aria-hidden="true" /> Luxury</span>}
              </p>
              <h1>{property.title}</h1>
              <p className="pd-address"><MapPin size={16} aria-hidden="true" /> {property.location}</p>
            </div>
            <div className="pd-head-actions">
              <div className="pd-price">
                <small>{property.mode === "buy" ? "Asking price" : "Rent"}</small>
                <strong>{property.priceLabel}</strong>
              </div>
              <div className="pd-icon-row">
                <button type="button" className={`pd-icon ${isSaved(property.id) ? "is-on" : ""}`} aria-pressed={isSaved(property.id)} aria-label={isSaved(property.id) ? "Remove from saved" : "Save property"} onClick={() => toggle(property.id)}>
                  <Heart size={18} fill={isSaved(property.id) ? "currentColor" : "none"} />
                </button>
                <button type="button" className="pd-icon" aria-label="Share property" onClick={share}>
                  <Share2 size={18} />
                </button>
              </div>
              {copied && <span className="pd-copied" role="status">Link copied</span>}
            </div>
          </header>

          {images.length > 0 && (
            <section className="pd-gallery" aria-label="Photo gallery">
              <button type="button" className="pd-main" onClick={() => setLightbox(true)} aria-label="Open full-screen gallery">
                <SmartImage key={active} src={img(images[active], 1600)} alt={`${property.title}, photo ${active + 1}`} loading="eager" />
                <span className="pd-count">{active + 1} / {images.length}</span>
              </button>
              <div className="pd-thumbs">
                {images.map((photo, i) => (
                  <button key={photo} type="button" className={i === active ? "is-active" : ""} onClick={() => setActive(i)} aria-label={`Show photo ${i + 1}`} aria-current={i === active}>
                    <SmartImage src={img(photo, 400)} alt="" />
                  </button>
                ))}
              </div>
            </section>
          )}

          <div className="pd-layout">
            <div className="pd-main-col">
              <section className="pd-block" aria-labelledby="facts-title">
                <h2 id="facts-title">Property at a glance</h2>
                <ul className="pd-facts">
                  <Fact icon={BedDouble} label="Bedrooms" value={property.beds > 0 ? property.beds : null} />
                  <Fact icon={Bath} label="Bathrooms" value={property.baths} />
                  <Fact icon={Ruler} label="Built-up area" value={property.area} />
                  <Fact icon={Layers} label="Floor" value={property.floor} />
                  <Fact icon={Compass} label="Facing" value={property.facing} />
                  <Fact icon={Sofa} label="Furnishing" value={FURNISHING[property.furnishing]} />
                  <Fact icon={Timer} label="Possession" value={property.possession} />
                  <Fact icon={Car} label="Parking" value={property.parking} />
                </ul>
              </section>

              <section className="pd-block" aria-labelledby="about-title">
                <h2 id="about-title">About this property</h2>
                <p className="pd-lead">{property.description}</p>
                {property.highlights?.length > 0 && (
                  <ul className="pd-highlights">
                    {property.highlights.map((item) => (
                      <li key={item}><Sparkles size={16} aria-hidden="true" /> {item}</li>
                    ))}
                  </ul>
                )}
              </section>

              {property.amenities?.length > 0 && (
                <section className="pd-block" aria-labelledby="amenities-title">
                  <h2 id="amenities-title">Amenities</h2>
                  <ul className="pd-amenities">
                    {property.amenities.map((item) => (
                      <li key={item}><BadgeCheck size={16} aria-hidden="true" /> {item}</li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="pd-block" aria-labelledby="loc-title">
                <h2 id="loc-title">Location</h2>
                <p className="pd-address"><MapPin size={16} aria-hidden="true" /> {property.location}</p>
                <div className="pd-map">
                  <iframe
                    title={`Map of ${property.location}`}
                    src={`https://maps.google.com/maps?q=${mapQuery}&output=embed`}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </section>

              <section className="pd-block" aria-labelledby="doc-title">
                <h2 id="doc-title">Documents &amp; verification</h2>
                <ul className="pd-docs">
                  <li>
                    <BadgeCheck size={18} aria-hidden="true" />
                    <div>
                      <strong>{property.verified ? "Verified listing" : "Verification in progress"}</strong>
                      <span>{property.verified ? "Ownership and photographs checked by our team." : "Our team is still reviewing the documents for this listing."}</span>
                    </div>
                  </li>
                  <li>
                    <Layers size={18} aria-hidden="true" />
                    <div>
                      <strong>RERA &amp; title documents</strong>
                      <span>{property.rera ? `RERA no. ${property.rera}` : "Shared by your advisor on request."}</span>
                    </div>
                  </li>
                </ul>
              </section>

              {showEmi && (
                <section className="pd-block pd-emi" aria-labelledby="emi-title">
                  <h2 id="emi-title"><Calculator size={20} aria-hidden="true" /> EMI calculator</h2>
                  <p className="pd-muted">An indicative estimate, not a lending offer.</p>
                  <div className="pd-emi-grid">
                    <div className="pd-emi-controls">
                      <label>
                        <span>Loan amount <strong>₹{(emi.loanAmount / 100000).toFixed(1)} L</strong></span>
                        <input type="range" min="500000" max="100000000" step="500000" value={emi.loanAmount} onChange={(e) => setEmi({ ...emi, loanAmount: Number(e.target.value) })} />
                      </label>
                      <label>
                        <span>Interest rate <strong>{emi.interestRate}% p.a.</strong></span>
                        <input type="range" min="6" max="15" step="0.1" value={emi.interestRate} onChange={(e) => setEmi({ ...emi, interestRate: Number(e.target.value) })} />
                      </label>
                      <label>
                        <span>Tenure <strong>{emi.tenure} years</strong></span>
                        <input type="range" min="5" max="30" step="1" value={emi.tenure} onChange={(e) => setEmi({ ...emi, tenure: Number(e.target.value) })} />
                      </label>
                    </div>
                    <div className="pd-emi-result">
                      <small>Monthly EMI</small>
                      <strong>₹{monthlyEMI.toLocaleString("en-IN")}</strong>
                      <span>Total payable ₹{totalPayment.toLocaleString("en-IN")}</span>
                      <span>Total interest ₹{(totalPayment - P).toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </section>
              )}
            </div>

            <aside className="pd-aside">
              <form className="pd-form" onSubmit={submitInquiry}>
                <div className="pd-advisor">
                  <span className="pd-avatar" aria-hidden="true">E</span>
                  <div>
                    <strong>{property.agent?.name ?? "Estate & Co. Advisory Desk"}</strong>
                    <small>{property.agent?.role ?? "Dedicated property advisor"}</small>
                  </div>
                </div>
                <h2>Interested in this property?</h2>
                <div className="pd-types" role="group" aria-label="How can we help?">
                  {[
                    ["enquiry", "Enquiry", MessageSquareText],
                    ["callback", "Callback", PhoneCall],
                    ["site visit", "Site visit", CalendarDays],
                  ].map(([value, label, Icon]) => (
                    <button key={value} type="button" className={interestType === value ? "selected" : ""} aria-pressed={interestType === value} onClick={() => setInterestType(value)}>
                      <Icon size={15} aria-hidden="true" /> {label}
                    </button>
                  ))}
                </div>
                <p className="pd-muted">
                  {interestType === "site visit"
                    ? "Tell us your preferred date in the note and we will confirm the visit."
                    : interestType === "callback"
                      ? "An advisor will call you back on the number below."
                      : "Your enquiry goes straight to our advisory team."}
                </p>
                <label>Your name<input name="name" autoComplete="name" required maxLength="120" /></label>
                <label>Email address<input name="email" type="email" autoComplete="email" required /></label>
                <label>Phone number<input name="phone" type="tel" autoComplete="tel" required minLength="7" maxLength="30" /></label>
                <label>Note <small>(optional)</small><textarea name="message" rows="3" maxLength="700" /></label>
                <button className="button button-dark" type="submit" disabled={submitting}>
                  {submitting ? "Sending…" : interestType === "enquiry" ? "Send enquiry" : `Request ${interestType}`} <ArrowUpRight size={15} />
                </button>
                {status && <p role="status" className="form-message pd-ok">{status}</p>}
                {formError && <p role="alert" className="form-message form-error">{formError}</p>}
                {(phoneHref || waHref) && (
                  <div className="pd-quick">
                    {phoneHref && <a href={phoneHref}><PhoneCall size={16} /> Call</a>}
                    {waHref && <a href={waHref} target="_blank" rel="noreferrer"><MessageCircle size={16} /> WhatsApp</a>}
                  </div>
                )}
              </form>
            </aside>
          </div>

          {similar.length > 0 && (
            <section className="pd-similar" aria-labelledby="similar-title">
              <div className="hm-head">
                <div>
                  <p className="hm-eyebrow">Continue exploring</p>
                  <h2 id="similar-title">More places to <em>imagine.</em></h2>
                </div>
                <Link to={`/search?mode=${property.mode}`} className="text-link">
                  See all <ArrowUpRight size={15} />
                </Link>
              </div>
              <div className="pd-similar-grid">
                {similar.map((item) => (
                  <ListingCard key={item.id} listing={item} />
                ))}
              </div>
            </section>
          )}
        </div>

        {lightbox && images.length > 0 && (
          <div className="pd-lightbox" role="dialog" aria-modal="true" aria-label="Photo gallery">
            <button type="button" className="pd-lb-close" aria-label="Close gallery" onClick={() => setLightbox(false)}><X size={22} /></button>
            <button type="button" className="pd-lb-nav pd-prev" aria-label="Previous photo" onClick={() => setActive((active - 1 + images.length) % images.length)}><ChevronLeft size={26} /></button>
            <img src={img(images[active], 1800)} alt={`${property.title}, photo ${active + 1}`} />
            <button type="button" className="pd-lb-nav pd-next" aria-label="Next photo" onClick={() => setActive((active + 1) % images.length)}><ChevronRight size={26} /></button>
            <span className="pd-lb-count">{active + 1} / {images.length}</span>
          </div>
        )}
      </main>
    </SiteLayout>
  );
}
