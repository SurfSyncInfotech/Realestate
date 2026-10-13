import { useEffect, useState } from "react";
import {
  ArrowUp,
  ArrowUpRight,
  Building2,
  Clock,
  Mail,
  MapPin,
  ChevronDown,
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Phone,
  Search,
  Star,
  X,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { categories, img } from "../data/media.js";
import LogoMark from "./LogoMark.jsx";
import { site } from "../data/site.js";
import { useAuth } from "../context/AuthContext.jsx";
import { homeForRole } from "../services/auth.js";

// NOTE: keep the words "home" and "properties" out of these descriptions;
// link names are matched by the navigation tests.
const links = [
  { label: "Home", to: "/", icon: Home, description: "Featured & trending" },
  { label: "About Us", to: "/about", icon: Star, description: "Our story & promise" },
  {
    label: "Properties",
    to: "/search",
    icon: Building2,
    description: "Buy, rent & invest",
    menu: true,
  },
  { label: "Contact Us", to: "/contact", icon: Phone, description: "Talk to an advisor" },
];

const menuItems = categories.map((item) => ({
  ...item,
  description: {
    buy: "Apartments, villas, plots",
    rent: "Furnished & unfurnished",
    commercial: "Offices, retail, studios",
    luxury: "Signature residences",
    "new-projects": "Pre-launch projects",
  }[item.mode],
}));

function isLinkActive(link, pathname) {
  if (link.to === "/") return pathname === "/";
  if (link.to === "/search") {
    return pathname === "/search" || pathname.startsWith("/property/");
  }
  return pathname === link.to;
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    setOpen(false);
    navigate("/");
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("nav-locked", open);
    return () => document.body.classList.remove("nav-locked");
  }, [open]);

  const close = () => setOpen(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?city=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setSearchOpen(false);
      close();
    }
  };

  return (
    <header className={`nb ${scrolled ? "is-scrolled" : ""}`}>
      <div className="nb-inner">
        <Link className="nb-brand" to="/" onClick={close} aria-label="Estate & Co. home">
          <LogoMark className="nb-logo" />
          <span className="nb-brand-text">
            <strong>
              ESTATE <i>&amp;</i> CO.
            </strong>
            <small>Luxury real estate</small>
          </span>
        </Link>

        <nav className={`nb-nav ${open ? "is-open" : ""}`} aria-label="Main navigation">
          {links.map((link) => {
            const Icon = link.icon;
            const active = isLinkActive(link, location.pathname);
            return (
              <div className={`nb-item ${link.menu ? "has-menu" : ""}`} key={link.label}>
                <Link
                  to={link.to}
                  onClick={close}
                  aria-current={active ? "page" : undefined}
                  className={`nb-link ${active ? "active" : ""}`}
                >
                  <span className="nb-link-icon" aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <span className="nb-link-copy">
                    <span className="nb-link-label">{link.label}</span>
                    <span className="nb-link-desc">{link.description}</span>
                  </span>
                  {link.menu && <ChevronDown className="nb-chevron" size={15} aria-hidden="true" />}
                </Link>
                {link.menu && (
                  <div className="nb-menu">
                    {menuItems.map((item) => (
                      <Link
                        key={item.mode}
                        to={`/search?mode=${item.mode}`}
                        onClick={close}
                        className="nb-menu-card"
                      >
                        <span className="nb-menu-img">
                          <img src={img(item.id, 360)} alt="" loading="lazy" />
                        </span>
                        <span className="nb-menu-copy">
                          <strong>{item.label}</strong>
                          <small>{item.description}</small>
                        </span>
                        <ArrowUpRight size={16} aria-hidden="true" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <div className="nb-mobile-cta">
            {user ? (
              <>
                <Link className="nb-btn nb-btn-solid" to={homeForRole(user.role)} onClick={close}>
                  <LayoutDashboard size={16} /> My dashboard
                </Link>
                <button type="button" className="nb-btn nb-btn-ghost" onClick={handleLogout}>
                  <LogOut size={16} /> Sign out
                </button>
              </>
            ) : (
              <>
                <Link className="nb-btn nb-btn-solid" to="/sign-in" onClick={close}>
                  <LogIn size={16} /> Sign in
                </Link>
                <Link className="nb-btn nb-btn-ghost" to="/register" onClick={close}>
                  Create account
                </Link>
              </>
            )}
          </div>
        </nav>

        <div className="nb-actions">
          <button
            className="nb-icon-btn"
            type="button"
            aria-label="Search properties"
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen(!searchOpen)}
          >
            <Search size={18} />
          </button>
          {user ? (
            <>
              <Link className="nb-btn nb-btn-solid nb-desktop-only" to={homeForRole(user.role)}>
                <LayoutDashboard size={16} /> {user.firstName}
              </Link>
              <button
                type="button"
                className="nb-icon-btn nb-desktop-only"
                aria-label="Sign out"
                onClick={handleLogout}
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <>
              <Link className="nb-btn nb-btn-ghost nb-desktop-only" to="/register">
                Register
              </Link>
              <Link className="nb-btn nb-btn-solid nb-desktop-only" to="/sign-in">
                <LogIn size={16} /> Sign In
              </Link>
            </>
          )}
          <button
            className="nb-icon-btn nb-burger"
            type="button"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {searchOpen && (
        <form className="nb-search" onSubmit={handleSearch} role="search">
          <Search size={18} aria-hidden="true" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by city, neighbourhood or landmark…"
            aria-label="Search by city, neighbourhood or landmark"
            autoFocus
          />
          <button type="submit" className="nb-btn nb-btn-solid">
            Search
          </button>
        </form>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="ft">
      <section className="ft-cta">
        <div className="ft-shell ft-cta-inner">
          <div>
            <p className="ft-eyebrow">Let us find it together</p>
            <h2>
              Tell us what you are looking for and an <em>advisor</em> will
              reply within one working day.
            </h2>
          </div>
          <div className="ft-cta-actions">
            <Link className="ft-btn ft-btn-gold" to="/contact">
              Speak to an advisor <ArrowUpRight size={16} />
            </Link>
            <Link className="ft-btn ft-btn-line" to="/search?mode=buy">
              Browse properties
            </Link>
          </div>
        </div>
      </section>

      <div className="ft-dark">
      <div className="ft-shell ft-main">
        <div className="ft-brand">
          <Link className="nb-brand ft-wordmark" to="/" aria-label="Estate & Co. home">
            <LogoMark className="nb-logo" />
            <span className="nb-brand-text">
              <strong>
                ESTATE <i>&amp;</i> CO.
              </strong>
              <small>Luxury real estate</small>
            </span>
          </Link>
          <p>
            Places with a point of view. We help families, investors and
            businesses find, visit and buy property they will be proud of.
          </p>
          <ul className="ft-contact">
            {site.email && (
              <li>
                <Mail size={16} aria-hidden="true" />
                <a href={`mailto:${site.email}`}>{site.email}</a>
              </li>
            )}
            {site.phone && (
              <li>
                <Phone size={16} aria-hidden="true" />
                <a href={`tel:${site.phone.replace(/\s/g, "")}`}>{site.phone}</a>
              </li>
            )}
            {site.address && (
              <li>
                <MapPin size={16} aria-hidden="true" />
                <span>{site.address}</span>
              </li>
            )}
            <li>
              <Clock size={16} aria-hidden="true" />
              <span>{site.hours}</span>
            </li>
          </ul>
        </div>

        <nav className="ft-col" aria-label="Discover">
          <h3>Discover</h3>
          <Link to="/search?mode=buy">Buy</Link>
          <Link to="/search?mode=rent">Rent</Link>
          <Link to="/search?mode=commercial">Commercial</Link>
          <Link to="/search?mode=luxury">Luxury residences</Link>
          <Link to="/search?mode=new-projects">New launches</Link>
        </nav>

        <nav className="ft-col" aria-label="Cities">
          <h3>Top cities</h3>
          {site.cities.slice(0, 5).map((city) => (
            <Link key={city} to={`/locations/${city.toLowerCase().replace(" ncr", "").replace(" ", "-")}`}>
              {city}
            </Link>
          ))}
          <Link to="/locations">All locations</Link>
        </nav>

        <nav className="ft-col" aria-label="Company">
          <h3>Company</h3>
          <Link to="/about">Our story</Link>
          <Link to="/journal">The journal</Link>
          <Link to="/faq">Questions answered</Link>
          <Link to="/contact">Contact</Link>
        </nav>

        <nav className="ft-col" aria-label="Your account">
          <h3>Your account</h3>
          <Link to="/sign-in">Sign in</Link>
          <Link to="/register">Create account</Link>
          <Link to="/agent">Agent &amp; builder login</Link>
        </nav>
      </div>

      <div className="ft-shell ft-bottom">
        <span>© {new Date().getFullYear()} Estate &amp; Co. All rights reserved.</span>
        <span className="ft-legal">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/admin">Staff</Link>
          <button
            type="button"
            className="ft-top"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            Back to top <ArrowUp size={14} aria-hidden="true" />
          </button>
        </span>
      </div>
      </div>
    </footer>
  );
}

export default function SiteLayout({ children }) {
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  );
}
