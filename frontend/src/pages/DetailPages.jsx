import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, CheckCircle2, MapPin } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import SiteLayout from "../components/SiteLayout.jsx";
import SmartImage from "../components/SmartImage.jsx";
import ListingCard from "../components/ListingCard.jsx";
import { articles, cities, findArticle, findCity } from "../data/content.js";
import { img } from "../data/media.js";
import { listProperties } from "../services/properties.js";
import NotFoundPage from "./NotFoundPage.jsx";

/* Journal article: /journal/:slug */
export function ArticlePage() {
  const { slug } = useParams();
  const article = findArticle(slug);
  if (!article) return <NotFoundPage />;
  const more = articles.filter((a) => a.slug !== slug);

  return (
    <SiteLayout>
      <main className="dp">
        <section className="dp-hero">
          <SmartImage src={img(article.image, 1900)} alt="" loading="eager" />
          <div className="ab-hero-shade" />
          <div className="ab-hero-copy">
            <p className="ab-eyebrow">{article.category} · {article.readTime}</p>
            <h1>{article.title}</h1>
            <p>{article.standfirst}</p>
          </div>
        </section>
        <div className="dp-shell dp-article">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link><span>/</span><Link to="/journal">The journal</Link><span>/</span><span>{article.title}</span>
          </nav>
          <article>
            {article.body.map((paragraph, i) => (
              <p key={i} className={i === 0 ? "dp-first" : ""}>{paragraph}</p>
            ))}
            <aside className="dp-tips">
              <h2>Worth remembering</h2>
              <ul>
                {article.tips.map((tip) => (
                  <li key={tip}><CheckCircle2 size={18} aria-hidden="true" /> {tip}</li>
                ))}
              </ul>
            </aside>
          </article>
          <section className="dp-more" aria-labelledby="more-title">
            <h2 id="more-title">Keep reading</h2>
            <div className="dp-more-grid">
              {more.map((a) => (
                <Link key={a.slug} to={`/journal/${a.slug}`} className="dp-more-card">
                  <SmartImage src={img(a.image, 700)} alt="" />
                  <span>{a.category}</span>
                  <strong>{a.title}</strong>
                </Link>
              ))}
            </div>
          </section>
          <Link className="text-link" to="/journal"><ArrowLeft size={15} /> All stories</Link>
        </div>
      </main>
    </SiteLayout>
  );
}

/* City guide: /locations/:slug */
export function CityPage() {
  const { slug } = useParams();
  const city = findCity(slug);
  const [homes, setHomes] = useState({ slug: "", items: [] });

  useEffect(() => {
    if (!city) return undefined;
    let current = true;
    listProperties({ city: city.filter })
      .then((r) => current && setHomes({ slug, items: r.data }))
      .catch(() => current && setHomes({ slug, items: [] }));
    return () => {
      current = false;
    };
  }, [city, slug]);

  if (!city) return <NotFoundPage />;
  const loading = homes.slug !== slug;

  return (
    <SiteLayout>
      <main className="dp">
        <section className="dp-hero">
          <SmartImage src={img(city.image, 1900)} alt="" loading="eager" />
          <div className="ab-hero-shade" />
          <div className="ab-hero-copy">
            <p className="ab-eyebrow">City guide</p>
            <h1>{city.name}</h1>
            <p>{city.tagline}</p>
          </div>
        </section>
        <div className="dp-shell">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link><span>/</span><Link to="/locations">Locations</Link><span>/</span><span>{city.name}</span>
          </nav>

          <section className="dp-city-intro">
            <p>{city.intro}</p>
            <ul className="dp-facts">
              {city.facts.map(([label, value]) => (
                <li key={label}><small>{label}</small><strong>{value}</strong></li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="areas-title">
            <h2 id="areas-title">Neighbourhoods to know</h2>
            <ul className="dp-areas">
              {city.areas.map(([name, note]) => (
                <li key={name}>
                  <MapPin size={18} aria-hidden="true" />
                  <div><strong>{name}</strong><span>{note}</span></div>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="homes-title" className="dp-homes">
            <div className="hm-head">
              <div>
                <p className="hm-eyebrow">Available in {city.name}</p>
                <h2 id="homes-title">Properties in <em>{city.name}.</em></h2>
              </div>
              <Link className="text-link" to={`/search?city=${encodeURIComponent(city.filter)}`}>
                Open full search <ArrowUpRight size={15} />
              </Link>
            </div>
            {loading ? (
              <p role="status" className="pd-muted">Loading properties…</p>
            ) : homes.items.length > 0 ? (
              <div className="pd-similar-grid">
                {homes.items.map((p) => <ListingCard key={p.id} listing={p} />)}
              </div>
            ) : (
              <div className="dashboard-empty">
                No properties are listed in {city.name} right now.{" "}
                <Link to="/contact" className="text-link">Ask an advisor to find one for you <ArrowUpRight size={14} /></Link>
              </div>
            )}
          </section>

          <section className="dp-other">
            <h2>Explore other cities</h2>
            <div className="ab-city-chips">
              {cities.filter((c) => c.slug !== slug).map((c) => (
                <Link key={c.slug} to={`/locations/${c.slug}`}><MapPin size={15} aria-hidden="true" /> {c.name}</Link>
              ))}
            </div>
          </section>
        </div>
      </main>
    </SiteLayout>
  );
}
