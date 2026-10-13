// Curated luxury imagery used across the site (Unsplash, hotlinked).
// Every photo is atmosphere only - never a claim about a listed property.
// Add the Unsplash photo id below; `img()` builds a sized URL.
// Full https:// links (images pasted by agents) and local paths pass through.
export const img = (id, w = 1200) =>
  /^https?:\/\//.test(id) || id.startsWith("/")
    ? id
    : `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=80&w=${w}`;

// Local fallback shown if a remote image fails to load.
export const FALLBACK_IMAGE = "/images/hero-residence.jpg";

export const heroSlides = [
  {
    id: "1613490493576-7fde63acd811",
    place: "Modern villa residence",
    city: "Mumbai",
    note: "Sea-facing living, framed by light",
  },
  {
    id: "1512917774080-9991f1c4c750",
    place: "Pool-side estate",
    city: "Goa",
    note: "Where the garden becomes a room",
  },
  {
    id: "1600596542815-ffad4c1539a9",
    place: "Landscaped signature home",
    city: "Bengaluru",
    note: "Quiet streets, generous space",
  },
  {
    id: "1600607687939-ce8a6c25118c",
    place: "Contemporary penthouse",
    city: "Delhi NCR",
    note: "Skyline evenings above the city",
  },
];

export const categories = [
  { mode: "buy", label: "Buy", blurb: "Apartments, villas and plots", id: "1600585154340-be6161a56a0c" },
  { mode: "rent", label: "Rent", blurb: "Furnished and ready to move", id: "1560448204-e02f11c3d0e2" },
  { mode: "commercial", label: "Commercial", blurb: "Offices, retail and studios", id: "1497366216548-37526070297c" },
  { mode: "luxury", label: "Luxury", blurb: "Signature residences", id: "1600573472550-8090b5e0745e" },
  { mode: "new-projects", label: "New launches", blurb: "Pre-launch and under construction", id: "1600566753086-00f18fb6b3ea" },
];

export const cityTiles = [
  { slug: "mumbai", city: "Mumbai", note: "Sea-facing mornings and a city that never stands still.", id: "1570129477492-45c003edd2be" },
  { slug: "bengaluru", city: "Bengaluru", note: "Garden-lined streets and a gentler pace of life.", id: "1600566752355-35792bedcfea" },
  { slug: "delhi", city: "Delhi", note: "Grand avenues, intimate neighbourhoods, layers of history.", id: "1600607687920-4e2a09cf159d" },
  { slug: "kochi", city: "Kochi", note: "Waterfront light and an old-world coastal rhythm.", id: "1600585154526-990dced4db0d" },
];
