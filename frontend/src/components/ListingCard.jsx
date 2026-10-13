import { ArrowUpRight, BedDouble, MapPin, MoveUpRight, Heart, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { img } from "../data/media.js";
import { useSaved } from "../context/SavedContext.jsx";

const premiumBackgrounds = [
  "#ded3bd",
  "#cdb9a9",
  "#c9d0be",
  "#d5c3a0",
  "#d4c0b4",
  "#c3cbc7",
  "#e8ddd0",
  "#d9cfc0",
  "#cdd5c8",
  "#e0d5c5",
];

export default function ListingCard({ listing, compact = false }) {
  const { isSaved, toggle } = useSaved();
  const isFavorited = isSaved(listing.id);
  const backgroundIndex = listing.id ? listing.id.length % premiumBackgrounds.length : 0;
  const customBackground = premiumBackgrounds[backgroundIndex];

  const toggleFavorite = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(listing.id);
  };

  return (
    <article
      className={`listing-card ${compact ? "listing-card-compact" : ""}`}
    >
      <Link
        className="listing-art"
        to={`/property/${listing.id}`}
        aria-label={`View ${listing.title}`}
        style={{ backgroundColor: customBackground }}
      >
        <img
          src={listing.images?.[0] ? img(listing.images[0], 800) : "/images/hero-residence.jpg"}
          alt={`${listing.title} in ${listing.location}`}
          loading="lazy"
        />
        <div className="art-badges">
          {listing.verified && (
            <span className="verified-badge">
              <ShieldCheck size={12} /> Verified
            </span>
          )}
        </div>
        <button
          className="favorite-btn"
          onClick={toggleFavorite}
          aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart
            size={18}
            fill={isFavorited ? "currentColor" : "none"}
            className={isFavorited ? "favorited" : ""}
          />
        </button>
        <span className="art-open">
          <MoveUpRight size={16} />
        </span>
      </Link>
      <div className="listing-card-copy">
        <div className="listing-topline">
          <span>{listing.tag}</span>
          <span>{listing.type}</span>
        </div>
        <h3>
          <Link to={`/property/${listing.id}`}>{listing.title}</Link>
        </h3>
        <p className="listing-location">
          <MapPin size={13} /> {listing.location}
        </p>
        <div className="listing-bottom">
          <strong>{listing.priceLabel}</strong>
          <span>
            {listing.beds > 0 && (
              <>
                <BedDouble size={14} /> {listing.beds} bed <i>·</i>
              </>
            )}{" "}
            {listing.area}
          </span>
        </div>
      </div>
    </article>
  );
}

export function SectionLink({ to, children }) {
  return (
    <Link className="text-link" to={to}>
      {children}
      <ArrowUpRight size={15} />
    </Link>
  );
}
