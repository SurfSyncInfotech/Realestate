import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  Heart,
  MapPin,
  Pause,
  PhoneCall,
  Play,
  Search,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import SiteLayout from "../components/SiteLayout.jsx";
import SmartImage from "../components/SmartImage.jsx";
import ListingCard, {
  SectionLink,
} from "../components/ListingCard.jsx";
import { listProperties } from "../services/properties.js";
import { categories, cityTiles, heroSlides, img } from "../data/media.js";

const journeySteps = [
  { icon: Search, title: "Search", text: "Filter by city, budget, BHK, type and possession." },
  { icon: Heart, title: "Shortlist", text: "Save favourites and compare them side by side." },
  { icon: PhoneCall, title: "Enquire", text: "Request a callback or message the agent." },
  { icon: CalendarCheck, title: "Visit", text: "Schedule a site visit that suits your week." },
  { icon: BadgeCheck, title: "Close", text: "Follow up with your advisor until the keys are yours." },
];

const partnerSteps = [
  { icon: CreditCard, title: "Choose a plan" },
  { icon: Upload, title: "Add listings" },
  { icon: ClipboardCheck, title: "Admin verification" },
  { icon: ShieldCheck, title: "Published" },
];

const trustPoints = [
  {
    title: "Verified-first listings",
    text: "Every listing is designed to pass an admin check for ownership, RERA details and photographs before it goes live.",
  },
  {
    title: "Advisors, not call centres",
    text: "Callbacks, WhatsApp and site visits are routed to a named agent who follows your enquiry through.",
  },
  {
    title: "Transparent by design",
    text: "Price, area, possession and builder details sit up front, with an EMI calculator on every detail page.",
  },
];

const editorialSlides = [
  {
    eyebrow: "Field notes / Architecture",
    title: "The courtyard: a room with no ceiling",
    description:
      "An enduring idea in Indian homes brings daylight and fresh air into the centre of daily life. Discover how a courtyard connects quiet moments and shared ones.",
    image: "1600585154526-990dced4db0d",
    alt: "Luxury villa with private pool and ocean views",
    link: "/journal/the-courtyard-a-room-with-no-ceiling",
  },
  {
    eyebrow: "Field notes / Neighbourhoods",
    title: "The small rituals that make a street",
    description:
      "A morning walk, a nearby grocer, the familiar turn home: the character of a neighbourhood is found in its everyday details.",
    image: "1600566752355-35792bedcfea",
    alt: "Premium residence with landscaped gardens",
    link: "/journal/a-slower-kind-of-morning",
  },
  {
    eyebrow: "Field notes / Living well",
    title: "A little more room for the day",
    description:
      "Flexible corners, calm light and an easy connection to the outdoors help a house make space for changing routines.",
    image: "1600573472550-8090b5e0745e",
    alt: "Contemporary luxury house with floor-to-ceiling windows",
    link: "/journal/the-art-of-keeping-a-little-space",
  },
];

const SLIDE_MS = 6000;

export default function HomePage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("buy");
  const [city, setCity] = useState("");
  const [hero, setHero] = useState(0);
  const [paused, setPaused] = useState(false);
  const [story, setStory] = useState(0);
  const rail = useRef(null);
  const [latest, setLatest] = useState([]);
  const touchStart = useRef(null);

  // Newest approved listings first, so a property shows up here as soon as an admin approves it.
  useEffect(() => {
    let active = true;
    listProperties({ sort: "newest" })
      .then((r) => active && setLatest(r.data.slice(0, 8)))
      .catch(() => active && setLatest([]));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (paused) return undefined;
    const t = setInterval(
      () => setHero((i) => (i + 1) % heroSlides.length),
      SLIDE_MS,
    );
    return () => clearInterval(t);
  }, [paused, hero]);

  useEffect(() => {
    const t = setInterval(
      () => setStory((i) => (i + 1) % editorialSlides.length),
      7000,
    );
    return () => clearInterval(t);
  }, [story]);

  const moveStory = useCallback((dir) => {
    setStory((i) => (i + dir + editorialSlides.length) % editorialSlides.length);
  }, []);

  function submitSearch(event) {
    event.preventDefault();
    const params = new URLSearchParams({ mode });
    if (city.trim()) params.set("city", city.trim());
    navigate(`/search?${params.toString()}`);
  }

  function scrollRail(dir) {
    const el = rail.current;
    if (el) {
      el.scrollBy({
        left: dir * Math.min(el.clientWidth * 0.85, 420),
        behavior: "smooth",
      });
    }
  }

  function onTouchEnd(event) {
    if (touchStart.current === null) return;
    const d = event.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(d) > 40) moveStory(d < 0 ? 1 : -1);
    touchStart.current = null;
  }

  const slide = editorialSlides[story];
  const current = heroSlides[hero];
  const featured = latest;

  return (
    <SiteLayout>
      <main className="home-page hm">
        {/* Hero carousel */}
        <section
          className="hm-hero"
          aria-roledescription="carousel"
          aria-label="Latest listings"
        >
          <div className="hm-hero-slides" aria-hidden="true">
            {heroSlides.map((s, i) => (
              <div
                className={`hm-hero-slide ${i === hero ? "is-active" : ""}`}
                key={s.id}
              >
                <SmartImage
                  src={img(s.id, 1920)}
                  loading={i === 0 ? "eager" : "lazy"}
                />
              </div>
            ))}
          </div>
          <div className="hm-hero-shade" aria-hidden="true" />

          <div className="hm-hero-inner">
            <div className="hm-hero-copy">
              <p className="hm-eyebrow hm-rise">A more considered search</p>
              <h1 className="hm-rise" style={{ "--d": "120ms" }}>
                Find a place
                <br />
                to <em>belong.</em>
              </h1>
              <p className="hm-hero-intro hm-rise" style={{ "--d": "240ms" }}>
                Explore the details that make a home feel right: the light in a
                room, the pace of a neighbourhood, and the everyday journeys
                that connect them.
              </p>
              <Link
                className="hm-hero-link hm-rise"
                style={{ "--d": "360ms" }}
                to="/journal"
              >
                Read the field notes <ArrowDownRight size={16} />
              </Link>
            </div>

            <aside className="hm-hero-caption" aria-live="polite">
              <span className="hm-hero-count">
                {String(hero + 1).padStart(2, "0")}
                <i>/ {String(heroSlides.length).padStart(2, "0")}</i>
              </span>
              <strong>{current.place}</strong>
              <span>
                <MapPin size={14} aria-hidden="true" /> {current.city} ·{" "}
                {current.note}
              </span>
            </aside>
          </div>

          <div className="hm-hero-controls">
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() =>
                setHero((hero - 1 + heroSlides.length) % heroSlides.length)
              }
            >
              <ChevronLeft size={18} />
            </button>
            <div className="hm-dots" role="group" aria-label="Choose slide">
              {heroSlides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  aria-label={`Show slide ${i + 1}`}
                  aria-current={i === hero}
                  className={i === hero ? "is-active" : ""}
                  onClick={() => setHero(i)}
                />
              ))}
            </div>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => setHero((hero + 1) % heroSlides.length)}
            >
              <ChevronRight size={18} />
            </button>
            <button
              type="button"
              aria-label={paused ? "Play slideshow" : "Pause slideshow"}
              onClick={() => setPaused(!paused)}
            >
              {paused ? <Play size={16} /> : <Pause size={16} />}
            </button>
          </div>
        </section>

        {/* Search panel */}
        <section className="hm-search-wrap" aria-label="Find a property">
          <form className="hm-search reveal" onSubmit={submitSearch} role="search">
            <div
              className="hm-search-modes"
              role="group"
              aria-label="Listing category"
            >
              {[
                ["buy", "Buy"],
                ["rent", "Rent"],
                ["commercial", "Commercial"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={mode === value ? "selected" : ""}
                  aria-pressed={mode === value}
                  onClick={() => setMode(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="hm-search-field">
              <span>Where would you like to be?</span>
              <span className="hm-search-input">
                <MapPin size={18} aria-hidden="true" />
                <input
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder="City, neighbourhood or landmark"
                  aria-label="City, neighbourhood or landmark"
                />
              </span>
            </label>
            <button className="hm-btn hm-btn-dark" type="submit">
              <Search size={17} aria-hidden="true" /> Explore places
            </button>
          </form>
        </section>

        {/* Categories */}
        <section className="hm-section hm-shell">
          <header className="hm-head">
            <div>
              <p className="hm-eyebrow">Prepared with intention</p>
              <h2>
                Beautiful homes.
                <br />
                <em>Thoughtful living.</em>
              </h2>
            </div>
            <p>
              A useful search starts with the things that matter to you. Choose
              a path below and we will shape the rest around it.
            </p>
          </header>
          <div className="hm-cats">
            {categories.map((c, i) => (
              <Link
                key={c.mode}
                to={`/search?mode=${c.mode}`}
                className="hm-cat reveal"
                style={{ "--d": `${i * 80}ms` }}
              >
                <SmartImage src={img(c.id, 800)} alt="" />
                <span className="hm-cat-copy">
                  <strong>{c.label}</strong>
                  <small>{c.blurb}</small>
                </span>
                <ArrowUpRight
                  className="hm-cat-arrow"
                  size={20}
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>
        </section>

        {/* Featured rail */}
        <section className="hm-section hm-featured">
          <div className="hm-shell">
            <header className="hm-head">
              <div>
                <p className="hm-eyebrow">Latest listings</p>
                <h2>
                  Homes with a <em>point of view.</em>
                </h2>
              </div>
              <div className="hm-rail-btns">
                <button
                  type="button"
                  aria-label="Scroll featured left"
                  onClick={() => scrollRail(-1)}
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  aria-label="Scroll featured right"
                  onClick={() => scrollRail(1)}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </header>
          </div>
          <div
            className="hm-rail"
            ref={rail}
            tabIndex={0}
            aria-label="Latest listings"
          >
            {featured.map((listing) => (
              <div className="hm-rail-item" key={listing.id}>
                <ListingCard listing={listing} />
              </div>
            ))}
          </div>
          <div className="hm-shell hm-center">
            <SectionLink to="/search?mode=buy">
              Browse all properties
            </SectionLink>
          </div>
        </section>

        {/* Cities */}
        <section className="hm-section hm-shell">
          <header className="hm-head">
            <div>
              <p className="hm-eyebrow">A map of possibility</p>
              <h2>
                Every city has
                <br />
                its <em>own pace.</em>
              </h2>
            </div>
            <SectionLink to="/locations">Explore cities</SectionLink>
          </header>
          <div className="hm-cities">
            {cityTiles.map((c, i) => (
              <Link
                key={c.city}
                to={`/locations/${c.slug}`}
                className="hm-city reveal"
                style={{ "--d": `${i * 90}ms` }}
              >
                <SmartImage src={img(c.id, 900)} alt="" />
                <span className="hm-city-copy">
                  <small>{String(i + 1).padStart(2, "0")}</small>
                  <strong>{c.city}</strong>
                  <span>{c.note}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Buyer journey */}
        <section className="hm-section hm-journey">
          <div className="hm-shell">
            <header className="hm-head hm-head-light">
              <div>
                <p className="hm-eyebrow hm-eyebrow-gold">
                  From first look to keys
                </p>
                <h2>
                  Your journey, <em>step by step.</em>
                </h2>
              </div>
              <p>
                The buyer flow, from search to a closed deal, with an advisor at
                your side at every step.
              </p>
            </header>
            <ol className="hm-steps">
              {journeySteps.map((s, i) => {
                const Icon = s.icon;
                return (
                  <li
                    className="hm-step reveal"
                    style={{ "--d": `${i * 100}ms` }}
                    key={s.title}
                  >
                    <span className="hm-step-icon">
                      <Icon size={22} aria-hidden="true" />
                    </span>
                    <small>Step {i + 1}</small>
                    <h3>{s.title}</h3>
                    <p>{s.text}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* Trust */}
        <section className="hm-section hm-shell hm-trust">
          <div className="hm-trust-art reveal">
            <SmartImage
              src={img("1613977257363-707ba9348227", 1200)}
              alt="Elegant living room with natural light"
            />
          </div>
          <div className="hm-trust-copy">
            <p className="hm-eyebrow">Why Estate &amp; Co.</p>
            <h2>
              Luxury is in the <em>detail.</em>
            </h2>
            <ul>
              {trustPoints.map((t, i) => (
                <li
                  className="reveal"
                  style={{ "--d": `${i * 100}ms` }}
                  key={t.title}
                >
                  <ShieldCheck size={20} aria-hidden="true" />
                  <div>
                    <strong>{t.title}</strong>
                    <p>{t.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Partners */}
        <section className="hm-partner">
          <SmartImage src={img("1486406146926-c627a92ad1ab", 1800)} alt="" />
          <div className="hm-partner-shade" />
          <div className="hm-shell hm-partner-inner">
            <div>
              <p className="hm-eyebrow hm-eyebrow-gold">
                For agents &amp; builders
              </p>
              <h2>
                List with <em>confidence.</em>
              </h2>
              <p>
                Pick a subscription plan, add your listings, and go live after a
                quick admin verification. Every listing is reviewed to keep the
                marketplace trustworthy.
              </p>
              <Link className="hm-btn hm-btn-gold" to="/contact">
                Become a partner <ArrowUpRight size={16} />
              </Link>
            </div>
            <ol className="hm-partner-steps">
              {partnerSteps.map((s, i) => {
                const Icon = s.icon;
                return (
                  <li
                    className="reveal"
                    style={{ "--d": `${i * 90}ms` }}
                    key={s.title}
                  >
                    <Icon size={20} aria-hidden="true" />
                    <span>{s.title}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* Journal carousel */}
        <section className="hm-section hm-shell">
          <header className="hm-head">
            <div>
              <p className="hm-eyebrow">The journal / Field notes</p>
              <h2>
                Places to pause
                <br />
                and <em>look closer.</em>
              </h2>
            </div>
            <SectionLink to="/journal">Explore the journal</SectionLink>
          </header>
          <div
            className="hm-story"
            onTouchStart={(e) => (touchStart.current = e.touches[0].clientX)}
            onTouchEnd={onTouchEnd}
          >
            <div className="hm-story-art" key={story}>
              <SmartImage src={img(slide.image, 1400)} alt={slide.alt} />
            </div>
            <article className="hm-story-copy" aria-live="polite" key={`c${story}`}>
              <p className="hm-eyebrow">{slide.eyebrow}</p>
              <h3>{slide.title}</h3>
              <p>{slide.description}</p>
              <Link className="text-link" to={slide.link}>
                Explore this story <ArrowUpRight size={15} />
              </Link>
              <div className="hm-story-controls">
                <span>
                  {String(story + 1).padStart(2, "0")} /{" "}
                  {String(editorialSlides.length).padStart(2, "0")}
                </span>
                <button
                  type="button"
                  aria-label="Previous editorial story"
                  onClick={() => moveStory(-1)}
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  aria-label="Next editorial story"
                  onClick={() => moveStory(1)}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </article>
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}
