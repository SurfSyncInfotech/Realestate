import api from "./api.js";
import {
  catalogue,
  searchCatalogue,
} from "../../../database/src/catalogue.js";

// If the API cannot be reached (server down, network error, 5xx) the site
// falls back to the bundled catalogue so a property page is never empty.
// Real "not found" (404) and validation (4xx) answers are passed through.
const apiIsDown = (error) => !error.response || error.response.status >= 500;

export async function listProperties(filters = {}) {
  try {
    const { data } = await api.get("/properties", { params: filters });
    return data;
  } catch (error) {
    if (!apiIsDown(error)) throw error;
    const maxPrice = filters.maxPrice ? Number(filters.maxPrice) : undefined;
    const results = searchCatalogue(catalogue, { ...filters, maxPrice });
    return { data: results, meta: { total: results.length, source: "bundled" } };
  }
}

export async function getPropertyById(id) {
  try {
    const { data } = await api.get(`/properties/${encodeURIComponent(id)}`);
    return data;
  } catch (error) {
    if (!apiIsDown(error)) throw error;
    const property = catalogue.find((item) => item.id === id);
    if (!property) {
      throw { response: { status: 404, data: { error: { message: "This property is no longer available." } } } };
    }
    return { data: property, meta: { source: "bundled" } };
  }
}

export async function submitPropertyInquiry(payload) {
  const { data } = await api.post("/leads", payload);
  return data;
}
