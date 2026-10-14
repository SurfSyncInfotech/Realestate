import api from "./api.js";

export async function fetchCurrentUser() {
  const { data } = await api.get("/auth/me");
  return data.data.user;
}

export async function signIn({ email, password, portal }) {
  const { data } = await api.post("/auth/login", { email, password, portal });
  return data.data.user;
}

export async function registerAccount(payload) {
  const { data } = await api.post("/auth/register", payload);
  return data;
}

export async function registerPartner(payload) {
  const { data } = await api.post("/auth/register-partner", payload);
  return data;
}

export async function fetchPartners(status) {
  const { data } = await api.get("/admin/partners", { params: { status } });
  return data.data;
}

export async function setPartnerStatus(id, status) {
  await api.patch(`/admin/partners/${id}`, { status });
}

export async function requestPasswordReset(email) {
  const { data } = await api.post("/auth/forgot-password", { email });
  return data;
}

export async function resetPassword(token, password) {
  const { data } = await api.post("/auth/reset-password", { token, password });
  return data;
}

export async function signOut() {
  await api.post("/auth/logout");
}

export async function sendContactMessage(payload) {
  const { data } = await api.post("/contact", payload);
  return data;
}

export async function fetchAdminOverview() {
  const { data } = await api.get("/admin/overview");
  return data.data;
}

export async function updateMessageStatus(id, status) {
  await api.patch(`/admin/messages/${id}`, { status });
}

// Pulls the API's human-readable message out of an axios error.
export function apiErrorMessage(error, fallback) {
  return error?.response?.data?.error?.message || fallback;
}

/* ---- customer workspace ---- */
export async function fetchSavedProperties() {
  const { data } = await api.get("/me/saved");
  return data.data;
}

export async function fetchSavedIds() {
  const { data } = await api.get("/me/saved/ids");
  return data.data;
}

export async function saveProperty(id) {
  await api.put(`/me/saved/${encodeURIComponent(id)}`);
}

export async function unsaveProperty(id) {
  await api.delete(`/me/saved/${encodeURIComponent(id)}`);
}

export async function fetchMyEnquiries() {
  const { data } = await api.get("/me/enquiries");
  return data.data;
}

/* ---- agents / builders ---- */
export async function fetchMyListings() {
  const { data } = await api.get("/partner/properties");
  return data.data;
}

export async function createListing(payload) {
  const { data } = await api.post("/partner/properties", payload);
  return data;
}

/* ---- admin ---- */
export async function fetchListingsByStatus(status) {
  const { data } = await api.get("/admin/properties", { params: { status } });
  return data.data;
}

export async function reviewListing(id, status, verified) {
  await api.patch(`/admin/properties/${encodeURIComponent(id)}`, { status, verified });
}

/* ---- notifications (every role) ---- */
export async function fetchNotifications() {
  const { data } = await api.get("/me/notifications");
  return data.data;
}

export async function markNotificationsRead(id) {
  await api.post("/me/notifications/read", id ? { id } : {});
}

/* ---- customer: visits, profile, recently viewed ---- */
export async function fetchMyVisits() {
  const { data } = await api.get("/me/visits");
  return data.data;
}

export async function cancelMyVisit(id) {
  await api.patch(`/me/visits/${id}`, { status: "cancelled" });
}

export async function fetchProfile() {
  const { data } = await api.get("/me/profile");
  return data.data;
}

export async function updateProfile(payload) {
  const { data } = await api.patch("/me/profile", payload);
  return data;
}

export async function fetchRecent() {
  const { data } = await api.get("/me/recent");
  return data.data;
}

export async function recordView(id) {
  await api.post(`/me/recent/${encodeURIComponent(id)}`);
}

/* ---- leads: admin sees all, agents see their own ---- */
export async function fetchLeads(stage) {
  const { data } = await api.get("/leads", { params: { stage } });
  return data.data;
}

export async function fetchFollowUps() {
  const { data } = await api.get("/follow-ups");
  return data.data;
}

export async function fetchAnalytics() {
  const { data } = await api.get("/analytics");
  return data.data;
}

export async function fetchThread(leadId) {
  const { data } = await api.get(`/leads/${leadId}/thread`);
  return data.data;
}

export async function sendReply(leadId, body) {
  const { data } = await api.post(`/leads/${leadId}/replies`, { body });
  return data;
}

export async function scheduleVisit(leadId, payload) {
  const { data } = await api.post(`/leads/${leadId}/visits`, payload);
  return data;
}

export async function setLeadStage(leadId, payload) {
  const { data } = await api.patch(`/leads/${leadId}/stage`, payload);
  return data;
}

export async function assignLead(leadId, agentUserId) {
  await api.patch(`/leads/${leadId}/assign`, { agentUserId });
}

/* ---- site visits (admin: all, agents: theirs) ---- */
export async function fetchAllVisits(status) {
  const { data } = await api.get("/visits", { params: { status } });
  return data.data;
}

export const fetchAgentVisits = () => fetchAllVisits();

export async function setVisitStatus(id, status) {
  await api.patch(`/visits/${id}`, { status });
}

export const setAgentVisitStatus = setVisitStatus;

/* ---- agents: edit and remove own listings ---- */
export async function updateListing(id, payload) {
  const { data } = await api.patch(`/partner/properties/${encodeURIComponent(id)}`, payload);
  return data;
}

export async function deleteListing(id) {
  const { data } = await api.delete(`/partner/properties/${encodeURIComponent(id)}`);
  return data;
}

/* ---- agents: photo upload ---- */
export async function uploadPhotos(files) {
  const body = new FormData();
  files.forEach((file) => body.append("photos", file));
  const { data } = await api.post("/partner/uploads", body, { headers: { "Content-Type": "multipart/form-data" }, timeout: 60000 });
  return data.data.urls;
}

/* ---- admin: all users ---- */
export async function fetchUsers({ role, q } = {}) {
  const { data } = await api.get("/admin/users", { params: { role, q: q || undefined } });
  return data.data;
}

export async function setUserAccountStatus(id, status) {
  await api.patch(`/admin/users/${id}`, { status });
}

/* ---- admin: manage administrators ---- */
export async function fetchAdmins() {
  const { data } = await api.get("/admin/admins");
  return data.data;
}

export async function createAdmin(payload) {
  const { data } = await api.post("/admin/admins", payload);
  return data;
}

export async function setAdminStatus(id, status) {
  await api.patch(`/admin/admins/${id}`, { status });
}

// Where each role lands after signing in.
export function homeForRole(role) {
  if (role === "admin") return "/dashboard/admin";
  if (role === "agent") return "/dashboard/agent";
  if (role === "builder") return "/dashboard/builder";
  return "/user-dashboard";
}
