import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";

const propertyService = vi.hoisted(() => ({
  listProperties: vi.fn(),
  getPropertyById: vi.fn(),
  submitPropertyInquiry: vi.fn(),
}));
const authApi = vi.hoisted(() => ({
  fetchCurrentUser: vi.fn(),
  signIn: vi.fn(),
  registerAccount: vi.fn(),
  registerPartner: vi.fn(),
  fetchPartners: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  fetchLeads: vi.fn(),
  fetchFollowUps: vi.fn(),
  fetchAnalytics: vi.fn(),
  fetchRecent: vi.fn(),
  fetchProfile: vi.fn(),
  recordView: vi.fn(),
  fetchNotifications: vi.fn(),
  markNotificationsRead: vi.fn(),
  fetchMyVisits: vi.fn(),
  fetchAgentVisits: vi.fn(),
  fetchAllVisits: vi.fn(),
  signOut: vi.fn(),
  sendContactMessage: vi.fn(),
  fetchAdminOverview: vi.fn(),
  fetchSavedProperties: vi.fn(),
  fetchSavedIds: vi.fn(),
  fetchMyEnquiries: vi.fn(),
  fetchMyListings: vi.fn(),
  fetchListingsByStatus: vi.fn(),
  updateMessageStatus: vi.fn(),
}));

vi.mock("./services/properties.js", () => propertyService);
vi.mock("./services/auth.js", async (importOriginal) => ({
  ...(await importOriginal()),
  ...authApi,
}));

function renderRoute(route) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );
}

const admin = { id: 1, email: "admin@example.com", firstName: "Site", lastName: "Admin", role: "admin" };
const customer = { id: 2, email: "c@example.com", firstName: "Asha", lastName: "Rao", role: "customer" };

beforeEach(() => {

  vi.clearAllMocks();
  authApi.fetchCurrentUser.mockRejectedValue({ response: { status: 401 } });
  authApi.signOut.mockResolvedValue();
  authApi.fetchPartners.mockResolvedValue([]);
  authApi.fetchLeads.mockResolvedValue([{ id: 7, name: "Meera", email: "meera@example.com", phone: "", topic: "buying", message: "Looking for a 3BHK", status: "new", stage: "new", request_type: "enquiry", created_at: "2026-10-12T10:00:00Z" }]);
  authApi.fetchFollowUps.mockResolvedValue([]);
  authApi.fetchAnalytics.mockResolvedValue({ totals: { listings: 0, live: 0, views: 0, leads: 0, won: 0, visitsScheduled: 0, visitsCompleted: 0, conversion: 0 }, byStage: { new: 0, contacted: 0, visit_scheduled: 0, follow_up: 0, closed_won: 0, closed_lost: 0 }, properties: [] });
  authApi.fetchRecent.mockResolvedValue([]);
  authApi.fetchProfile.mockResolvedValue({ phone: null });
  authApi.recordView.mockResolvedValue();
  authApi.fetchNotifications.mockResolvedValue({ items: [], unread: 0 });
  authApi.markNotificationsRead.mockResolvedValue();
  authApi.fetchMyVisits.mockResolvedValue([]);
  authApi.fetchAgentVisits.mockResolvedValue([]);
  authApi.fetchAllVisits.mockResolvedValue([]);
  authApi.fetchSavedProperties.mockResolvedValue([]);
  authApi.fetchSavedIds.mockResolvedValue([]);
  authApi.fetchMyEnquiries.mockResolvedValue([]);
  authApi.fetchMyListings.mockResolvedValue([]);
  authApi.fetchListingsByStatus.mockResolvedValue([]);
  propertyService.listProperties.mockResolvedValue({ data: [], meta: { total: 0 } });
  propertyService.getPropertyById.mockRejectedValue({ response: { status: 404 } });
  authApi.fetchAdminOverview.mockResolvedValue({
    stats: { users: 3, messages: 1, newMessages: 1, pendingListings: 0, properties: 8 },
    messages: [
      { id: 7, name: "Meera", email: "meera@example.com", phone: "", topic: "buying", message: "Looking for a 3BHK", status: "new", created_at: "2026-10-12T10:00:00Z" },
    ],
  });
});

describe("public pages", () => {
  it("shows the primary navigation with links to the main sections", () => {
    renderRoute("/");
    const nav = screen.getByRole("navigation", { name: /main navigation/i });
    expect(within(nav).getByRole("link", { name: /home/i })).toHaveAttribute("href", "/");
    expect(within(nav).getByRole("link", { name: /about us/i })).toHaveAttribute("href", "/about");
    expect(within(nav).getByRole("link", { name: /properties/i })).toHaveAttribute("href", "/search");
    expect(within(nav).getByRole("link", { name: /contact us/i })).toHaveAttribute("href", "/contact");
  });

  it("opens and closes the mobile navigation", () => {
    renderRoute("/");
    const menu = screen.getByRole("button", { name: /open navigation/i });
    fireEvent.click(menu);
    expect(menu).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("link", { name: /about us/i }));
    expect(screen.getByRole("button", { name: /open navigation/i })).toHaveAttribute("aria-expanded", "false");
  });

  it("renders the home page without any demo wording", () => {
    renderRoute("/");
    expect(screen.getByRole("heading", { name: /find a place to belong/i })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/demo|preview|not connected/i);
  });

  it("renders the about page content", () => {
    renderRoute("/about");
    expect(screen.getByRole("heading", { name: /not more listings/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /four promises/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /cities we serve/i })).toBeInTheDocument();
  });

  it("shows an empty state when no properties match", async () => {
    renderRoute("/search?mode=buy");
    expect(await screen.findByText(/no matching properties/i)).toBeInTheDocument();
  });

  it("shows a not-found state for an unknown property", async () => {
    renderRoute("/property/missing");
    expect(await screen.findByRole("heading", { name: /not in the collection/i })).toBeInTheDocument();
  });

  it("renders the footer with contact and legal links", () => {
    renderRoute("/");
    const footer = screen.getByRole("contentinfo");
    expect(within(footer).getByRole("link", { name: /privacy/i })).toHaveAttribute("href", "/privacy");
    expect(within(footer).getByRole("link", { name: /speak to an advisor/i })).toHaveAttribute("href", "/contact");
  });
});

describe("contact form", () => {
  it("sends the message to the API and confirms receipt", async () => {
    authApi.sendContactMessage.mockResolvedValue({ message: "Thank you. Your message has reached our team." });
    renderRoute("/contact");
    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: "Meera Shah" } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "meera@example.com" } });
    fireEvent.change(screen.getByLabelText(/how can we help/i), { target: { value: "I am looking for a 3BHK in Pune." } });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() =>
      expect(authApi.sendContactMessage).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Meera Shah", email: "meera@example.com", topic: "general" }),
      ),
    );
    expect(await screen.findByText(/message received/i)).toBeInTheDocument();
  });

  it("shows the server's error when sending fails", async () => {
    authApi.sendContactMessage.mockRejectedValue({ response: { data: { error: { message: "Please provide a valid email." } } } });
    renderRoute("/contact");
    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: "Meera" } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "meera@example.com" } });
    fireEvent.change(screen.getByLabelText(/how can we help/i), { target: { value: "Hello there" } });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/valid email/i);
  });
});

describe("authentication and role routing", () => {
  it("sends signed-out visitors to the right sign-in for each area", async () => {
    const { unmount } = renderRoute("/dashboard/admin");
    expect(await screen.findByRole("heading", { name: /administrator sign-in/i })).toBeInTheDocument();
    unmount();
    const second = renderRoute("/dashboard/agent");
    expect(await screen.findByRole("heading", { name: /agent & builder sign-in/i })).toBeInTheDocument();
    second.unmount();
    renderRoute("/user-dashboard");
    expect(await screen.findByRole("heading", { name: /welcome back\./i })).toBeInTheDocument();
  });

  it("signs an admin in and lands on the admin dashboard", async () => {
    authApi.signIn.mockResolvedValue(admin);
    renderRoute("/admin");
    await screen.findByRole("heading", { name: /administrator sign-in/i });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "admin@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: "secret-pass" } });
    fireEvent.click(screen.getByRole("button", { name: /^sign in/i }));

    await waitFor(() => expect(authApi.signIn).toHaveBeenCalledWith({ email: "admin@example.com", password: "secret-pass", portal: "admin" }));
    expect(await screen.findByRole("heading", { name: /welcome, site/i })).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("navigation", { name: /administrator workspace/i })).getByRole("button", { name: /leads & inbox/i }));
    expect(await screen.findByText(/looking for a 3bhk/i)).toBeInTheDocument();
  });

  it("signs a customer in and lands on the customer dashboard", async () => {
    authApi.signIn.mockResolvedValue(customer);
    renderRoute("/sign-in");
    await screen.findByRole("heading", { name: /welcome back/i });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "c@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: "secret-pass" } });
    fireEvent.click(screen.getByRole("button", { name: /^sign in/i }));
    expect(await screen.findByRole("heading", { name: /welcome back, asha/i })).toBeInTheDocument();
  });

  it("shows the API error for wrong credentials", async () => {
    authApi.signIn.mockRejectedValue({ response: { data: { error: { message: "Email or password is incorrect." } } } });
    renderRoute("/sign-in");
    await screen.findByRole("heading", { name: /welcome back/i });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "x@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: /^sign in/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/incorrect/i);
  });

  it("lets an agent apply for a partner account and shows the approval notice", async () => {
    authApi.registerPartner.mockResolvedValue({ message: "Your partner account was created and is awaiting approval." });
    renderRoute("/agent/register");
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "Ravi" } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "ravi@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: "secret-pass" } });
    fireEvent.click(screen.getByRole("button", { name: /submit application/i }));
    expect(await screen.findByText(/awaiting approval/i)).toBeInTheDocument();
    expect(authApi.registerPartner).toHaveBeenCalledWith(expect.objectContaining({ role: "agent", email: "ravi@example.com" }));
  });

  it("shows unread notifications in a workspace and opens the list", async () => {
    authApi.fetchCurrentUser.mockResolvedValue(customer);
    authApi.fetchNotifications.mockResolvedValue({
      unread: 1,
      items: [{ id: 5, type: "reply", title: "We replied to your enquiry", body: "Happy to arrange a visit", link: "/user-dashboard?tab=enquiries", read_at: null, created_at: new Date().toISOString() }],
    });
    renderRoute("/user-dashboard");
    const bell = await screen.findByRole("button", { name: /notifications, 1 unread/i });
    fireEvent.click(bell);
    expect(await screen.findByText(/we replied to your enquiry/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /mark all as read/i }));
    await waitFor(() => expect(authApi.markNotificationsRead).toHaveBeenCalled());
  });

  it("keeps customers out of the admin area", async () => {
    authApi.fetchCurrentUser.mockResolvedValue(customer);
    renderRoute("/dashboard/admin");
    expect(await screen.findByRole("heading", { name: /welcome back, asha/i })).toBeInTheDocument();
    expect(authApi.fetchAdminOverview).not.toHaveBeenCalled();
  });
});

describe("password reset", () => {
  it("shows a forgot-password link on sign-in and sends the request", async () => {
    authApi.requestPasswordReset.mockResolvedValue({ message: "If an account exists for that email, we have sent a link." });
    renderRoute("/sign-in");
    fireEvent.click(await screen.findByRole("link", { name: /forgot your password/i }));
    fireEvent.change(await screen.findByLabelText(/email address/i), { target: { value: "asha@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));
    expect(await screen.findByText(/if an account exists/i)).toBeInTheDocument();
    expect(authApi.requestPasswordReset).toHaveBeenCalledWith("asha@example.com");
  });

  it("sets a new password from the emailed link", async () => {
    authApi.resetPassword.mockResolvedValue({ message: "ok" });
    const token = "A".repeat(43);
    renderRoute(`/reset-password?token=${token}`);
    fireEvent.change(await screen.findByLabelText(/^new password/i), { target: { value: "brand-new-pass-9" } });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: "different-pass-9" } });
    fireEvent.click(screen.getByRole("button", { name: /change password/i }));
    expect(authApi.resetPassword).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: "brand-new-pass-9" } });
    fireEvent.click(screen.getByRole("button", { name: /change password/i }));
    await waitFor(() => expect(authApi.resetPassword).toHaveBeenCalledWith(token, "brand-new-pass-9"));
    expect(await screen.findByText(/your password has been changed/i)).toBeInTheDocument();
  });

  it("explains an expired link and offers a new one", async () => {
    authApi.resetPassword.mockRejectedValue({ response: { data: { error: { message: "This reset link is invalid or has expired." } } } });
    renderRoute(`/reset-password?token=${"B".repeat(43)}`);
    fireEvent.change(await screen.findByLabelText(/^new password/i), { target: { value: "brand-new-pass-9" } });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: "brand-new-pass-9" } });
    fireEvent.click(screen.getByRole("button", { name: /change password/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/expired/i);
    expect(screen.getByRole("link", { name: /request a new link/i })).toBeInTheDocument();
  });
});
