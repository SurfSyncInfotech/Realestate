// The catalogue lives in database/src/catalogue.js (shared with the backend).
export { catalogue as featuredListings } from "../../../database/src/catalogue.js";

export const formatPrice = (price) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
