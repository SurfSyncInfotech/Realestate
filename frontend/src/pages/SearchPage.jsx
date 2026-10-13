import { useEffect, useState } from "react";
import { ArrowDownUp, SlidersHorizontal } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import SiteLayout from "../components/SiteLayout.jsx";
import ListingCard from "../components/ListingCard.jsx";
import { listProperties } from "../services/properties.js";

const searchImages = {
  "all": "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800",
  "buy": "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
  "rent": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
  "commercial": "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800",
  "luxury": "https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=800",
  "new-projects": "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800",
};

const modes = ["all", "buy", "rent", "commercial", "luxury", "new-projects"];
const modeLabels = {
  all: "All",
  buy: "Buy",
  rent: "Rent",
  commercial: "Commercial",
  luxury: "Luxury",
  "new-projects": "New projects",
};

export default function SearchPage() {
  const [params] = useSearchParams();
  return <SearchResults key={params.get("city") || ""} />;
}

function SearchResults() {
  const [params, setParams] = useSearchParams();
  const city = params.get("city") || "";
  // A search with a place but no category (header search box) looks across everything.
  const mode = modes.includes(params.get("mode")) ? params.get("mode") : city ? "all" : "buy";
  const [query, setQuery] = useState(city);
  const [type, setType] = useState("all");
  const [sort, setSort] = useState("featured");
  const [maxPrice, setMaxPrice] = useState("any");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchResult, setSearchResult] = useState({
    key: "",
    properties: [],
    error: "",
  });
  const searchKey = JSON.stringify({
    mode,
    city: query.trim(),
    type,
    maxPrice,
    sort,
  });
  const loading = searchResult.key !== searchKey;
  const properties = loading ? [] : searchResult.properties;
  const error = loading ? "" : searchResult.error;

  useEffect(() => {
    let current = true;

    listProperties({
      mode,
      city: query.trim() || undefined,
      type: type === "all" ? undefined : type,
      maxPrice: maxPrice === "any" ? undefined : maxPrice,
      sort,
    })
      .then((response) => {
        if (current) {
          setSearchResult({
            key: searchKey,
            properties: response.data,
            error: "",
          });
        }
      })
      .catch((requestError) => {
        if (current) {
          setSearchResult({
            key: searchKey,
            properties: [],
            error:
              requestError.response?.data?.error?.message ||
              "Properties could not be loaded right now. Please try again in a moment.",
          });
        }
      });

    return () => {
      current = false;
    };
  }, [mode, query, sort, type, maxPrice, searchKey]);

  function changeMode(nextMode) {
    const updated = new URLSearchParams(params);
    updated.set("mode", nextMode);
    setParams(updated);
  }

  function clearFilters() {
    setType("all");
    setMaxPrice("any");
    setQuery("");
    const updated = new URLSearchParams(params);
    updated.delete("city");
    setParams(updated);
  }

  return (
    <SiteLayout>
      <main className="page-shell">
        <div className="search-hero" style={{ backgroundImage: `url(${searchImages[mode] || searchImages.buy})` }}>
          <div className="search-hero-content">
            <p className="eyebrow">{mode === "all" ? "Premium Properties" : `Premium ${modeLabels[mode]} Properties`}</p>
            <h1>
              Discover <em>Luxury</em> Living
            </h1>
            <p>
              Explore exclusive properties across India's most desirable locations.
              Premium listings curated for discerning buyers.
            </p>
          </div>
        </div>
        <div className="breadcrumbs">
          <Link to="/">Home</Link>
          <span>/</span>
          <span>{modeLabels[mode]}</span>
        </div>
        <header className="results-heading">
          <div>
            <p className="eyebrow">A curated collection · India</p>
            <h1>
              {mode === "all" ? "Every" : modeLabels[mode]} <em>{mode === "all" ? "Property" : "Collection"}</em>
            </h1>
            <p>
              Explore homes, apartments and workspaces across India, curated by our advisors.
            </p>
          </div>
          <span className="results-edition">
            COLLECTION
            <br />
            NO. 001 / INDIA
          </span>
        </header>
                <div
          className="results-tabs"
          role="group"
          aria-label="Listing category"
        >
          {modes.map((item) => (
            <button
              type="button"
              aria-pressed={mode === item}
              className={mode === item ? "active" : ""}
              key={item}
              onClick={() => changeMode(item)}
            >
              {modeLabels[item]}
            </button>
          ))}
        </div>
        <div className="results-toolbar">
          <button
            type="button"
            className="filter-toggle"
            onClick={() => setFiltersOpen(!filtersOpen)}
            aria-expanded={filtersOpen}
          >
            <SlidersHorizontal size={15} /> Refine{" "}
            <span>
              {type !== "all" || maxPrice !== "any" || query ? "1" : ""}
            </span>
          </button>
          <label className="sort-select">
            <ArrowDownUp size={15} />
            <span className="sr-only">Sort properties</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="featured">Curated order</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
              <option value="newest">Newest first</option>
            </select>
          </label>
          <span className="results-count" aria-live="polite">
            {loading ? "Loading…" : `${properties.length} properties`}
          </span>
        </div>
        {filtersOpen && (
          <div className="filter-bar">
            <label>
              Property type
              <select
                value={type}
                onChange={(event) => setType(event.target.value)}
              >
                <option value="all">All types</option>
                <option value="apartment">Apartment</option>
                <option value="penthouse">Penthouse</option>
                <option value="villa">Villa</option>
                <option value="house">House</option>
                <option value="studio">Studio</option>
                <option value="office">Office</option>
                <option value="retail">Retail</option>
              </select>
            </label>
            <label>
              Maximum budget
              <select
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
              >
                <option value="any">Any budget</option>
                <option value="500000">Up to ₹5 L</option>
                <option value="10000000">Up to ₹1 Cr</option>
                <option value="20000000">Up to ₹2 Cr</option>
                <option value="50000000">Up to ₹5 Cr</option>
                <option value="100000000">Up to ₹10 Cr</option>
                <option value="250000000">Up to ₹25 Cr</option>
              </select>
            </label>
            <label>
              City / neighbourhood
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Any location"
              />
            </label>
            <button
              type="button"
              className="filter-reset"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          </div>
        )}
        {error ? (
          <div
            className="empty-results"
            role="alert"
            style={{ marginTop: "2rem" }}
          >
            <span className="eyebrow">Temporarily unavailable</span>
            <h2>
              We could not load the <em>properties.</em>
            </h2>
            <p>{error}</p>
          </div>
        ) : loading ? (
          <div
            className="empty-results"
            role="status"
            style={{ marginTop: "2rem" }}
          >
            <span className="eyebrow">One moment</span>
            <h2>
              Loading the <em>collection.</em>
            </h2>
          </div>
        ) : properties.length > 0 ? (
          <div
            className="listing-grid results-grid"
            aria-label="Property results"
          >
            {properties.map((property) => (
              <ListingCard key={property.id} listing={property} />
            ))}
          </div>
        ) : (
          <div className="empty-results" style={{ marginTop: "2rem" }}>
            <span className="eyebrow">No matching properties</span>
            <h2>
              Nothing here <em>matches just yet.</em>
            </h2>
            <p>
              Try another location or clear the filters.
            </p>
            <button
              className="button button-outline"
              type="button"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          </div>
        )}
        <p className="results-footnote">
          Prices and availability are subject to change. Contact an advisor to
          confirm details before making any decision.
        </p>
      </main>
    </SiteLayout>
  );
}
