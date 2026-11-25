import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Check } from "lucide-react";
import { trails, seedTrips, endDate, tripStatus } from "./data";
import { validateTrip } from "../server/validation.js";
import "./base.css";
import { Discover } from "./Discover";
import { Auth } from "./Auth";
import { OperatorPortal, trailName } from "./Operator";
import { BookPage, BookingDetail, MyBookings, SiteHeader, TrailPage } from "./Hiker";

const STORE = "akyat-activity-trips-v1";
const TOKEN_STORE = "akyat-activity-session";

function loadDemo() {
  try {
    const value = JSON.parse(localStorage.getItem(STORE));
    if (
      Array.isArray(value) &&
      value.every(
        (t) =>
          t &&
          typeof t.id === "string" &&
          typeof t.title === "string" &&
          Number.isInteger(t.trail) &&
          trails[t.trail] &&
          /^\d{4}-\d{2}-\d{2}$/.test(t.date) &&
          ["Open", "Draft", "Cancelled"].includes(t.status) &&
          Number.isInteger(t.capacity) &&
          t.capacity > 0 &&
          Number.isInteger(t.booked) &&
          t.booked >= 0 &&
          t.booked <= t.capacity &&
          Number.isFinite(t.price) &&
          t.price >= 0 &&
          typeof t.meeting === "string" &&
          typeof t.notes === "string" &&
          typeof t.duration === "string",
      )
    )
      return value;
  } catch {
    /* An unavailable or invalid browser store starts with sample data. */
  }
  return structuredClone(seedTrips);
}

/** Calls the Express API with the signed-in session. Errors carry the HTTP status. */
async function request(path, { method = "GET", body } = {}) {
  const token = sessionStorage.getItem(TOKEN_STORE);
  const response = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const error = new Error(
      data.error || "The API server could not be reached. Start MongoDB and npm run server, then try again.",
    );
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? null : response.json();
}

const PAGE_TITLES = {
  overview: "Operator overview",
  expeditions: "Expeditions",
  expedition: "Expedition",
  new: "New expedition",
  edit: "Edit expedition",
  trails: "Trails",
};

const startsAtAuth = window.location.hash.startsWith("#reset=") || window.location.hash.startsWith("#google-");

function App() {
  // siteView: discover | trail | book | bookings | booking | auth | operator.
  // route holds that view's details: { trail }, { id }, or the operator page.
  const [siteView, setSiteView] = useState(startsAtAuth ? "auth" : "discover");
  const [route, setRoute] = useState({ page: "overview" });
  const [user, setUser] = useState(null);
  const [resetToken, setResetToken] = useState(
    window.location.hash.startsWith("#reset=") ? window.location.hash.slice(7) : "",
  );
  const [authNotice, setAuthNotice] = useState("");
  const [authRole, setAuthRole] = useState("hiker");
  const [afterAuth, setAfterAuth] = useState(null);
  const [publicTrips, setPublicTrips] = useState(undefined); // undefined: loading, null: API unavailable
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [trips, setTrips] = useState(loadDemo);
  const [recent, setRecent] = useState([]);
  const [mode, setMode] = useState("demo");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  /** Move between views, so the browser's Back button works. */
  function go(view, nextRoute = route) {
    setError("");
    setSiteView(view);
    setRoute(nextRoute);
    window.history.pushState({ view, route: nextRoute }, "", window.location.pathname);
    window.scrollTo(0, 0);
  }
  const navigate = (nextRoute) => go("operator", nextRoute);

  function openAuth(role, next = null, notice = "") {
    setAuthRole(role);
    setAfterAuth(next);
    go("auth");
    setAuthNotice(notice);
  }

  async function loadPublic() {
    try {
      setPublicTrips(await request("/api/expeditions"));
    } catch {
      setPublicTrips(null);
    }
  }

  async function loadBookings() {
    setBookingsLoading(true);
    try {
      setBookings(await request("/api/bookings"));
    } catch (e) {
      fail(e);
    } finally {
      setBookingsLoading(false);
    }
  }

  async function loadOperator() {
    const [own, latest] = await Promise.all([request("/api/trips"), request("/api/operator/bookings")]);
    setTrips(own);
    setRecent(latest);
    setMode("database");
  }

  /** Load what the signed-in account needs. */
  async function startSession(account) {
    setUser(account);
    if (account.role === "operator") await loadOperator();
    else await loadBookings();
  }

  useEffect(() => {
    if (!startsAtAuth)
      window.history.replaceState({ view: "discover", route: { page: "overview" } }, "", window.location.pathname);
    const onPop = (event) => {
      const state = event.state ?? { view: "discover" };
      setError("");
      setSiteView(state.view);
      if (state.route) setRoute(state.route);
    };
    window.addEventListener("popstate", onPop);
    loadPublic();
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith("#google-error=")) {
      setError(
        hash.includes("not-configured")
          ? "Google sign-in needs a Google OAuth client ID and secret in .env. See README.md."
          : "Google sign-in could not finish. Try again.",
      );
      window.history.replaceState({ view: "auth" }, "", "/");
    }
    if (hash.startsWith("#google-ticket=")) {
      const ticket = hash.slice(15);
      window.history.replaceState({ view: "auth" }, "", "/");
      request("/api/auth/google/exchange", { method: "POST", body: { ticket } })
        .then(async (result) => {
          sessionStorage.setItem(TOKEN_STORE, result.token);
          await startSession(result.user);
          if (result.user.role === "operator") go("operator", { page: "overview" });
          else go("discover");
        })
        .catch((e) => setError(e.message));
    }
  }, []);

  useEffect(() => {
    if (!sessionStorage.getItem(TOKEN_STORE)) return;
    request("/api/auth/me")
      .then(({ user }) => startSession(user))
      .catch(() => {
        sessionStorage.removeItem(TOKEN_STORE);
        setUser(null);
        setMode("demo");
      });
  }, []);

  // Hiker pages show live seat counts.
  useEffect(() => {
    if (["discover", "trail", "book"].includes(siteView)) loadPublic();
  }, [siteView]);

  // The operator portal checks for new bookings every 10 seconds, so a hiker's booking lands live.
  useEffect(() => {
    if (siteView !== "operator" || user?.role !== "operator" || mode !== "database") return;
    const timer = setInterval(() => {
      loadOperator().catch((e) => {
        if (e.status === 401) expireSession(e.message);
      });
    }, 10000);
    return () => clearInterval(timer);
  }, [siteView, user, mode]);

  useEffect(() => {
    const titles = {
      auth: "Sign in",
      trail: trails[route.trail] ? trailName(trails[route.trail]) : "Trail",
      book: "Book a trip",
      bookings: "My bookings",
      booking: "Booking",
    };
    document.title =
      siteView === "operator"
        ? `${PAGE_TITLES[route.page] ?? "Operator portal"} · AkyatPH`
        : siteView === "discover"
          ? "Discover trails · AkyatPH"
          : `${titles[siteView] ?? "AkyatPH"} · AkyatPH`;
  }, [siteView, route]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  // The server rejected the token (expired, or logged out elsewhere): sign out and ask to sign in again.
  function expireSession(message) {
    const role = user?.role ?? "hiker";
    sessionStorage.removeItem(TOKEN_STORE);
    setUser(null);
    setBookings([]);
    setRecent([]);
    setMode("demo");
    setTrips(loadDemo());
    openAuth(role);
    setError(message || "Session expired. Sign in again.");
  }

  function fail(e) {
    if (e.status === 401) expireSession(e.message);
    else setError(e.message);
  }

  // ── Accounts ──

  async function submitAuth(form, signup) {
    setBusy(true);
    setError("");
    try {
      const result = await request(`/api/auth/${signup ? "signup" : "login"}`, { method: "POST", body: form });
      sessionStorage.setItem(TOKEN_STORE, result.token);
      setBookings([]);
      await startSession(result.user);
      if (result.user.role === "operator") go("operator", { page: "overview" });
      else if (afterAuth) go(afterAuth.view, afterAuth.route);
      else go("discover");
      setAfterAuth(null);
      setAuthNotice("");
      setToast(signup ? "Account created." : `Signed in as ${result.user.name}.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function forgotPassword(email) {
    setBusy(true);
    setError("");
    setAuthNotice("");
    try {
      const result = await request("/api/auth/forgot-password", { method: "POST", body: { email } });
      setAuthNotice(result.message);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(token, password) {
    setBusy(true);
    setError("");
    setAuthNotice("");
    try {
      const result = await request("/api/auth/reset-password", { method: "POST", body: { token, password } });
      setResetToken("");
      window.history.replaceState({ view: "auth" }, "", "/");
      setAuthNotice(result.message);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    const token = sessionStorage.getItem(TOKEN_STORE);
    setUser(null);
    setBookings([]);
    setRecent([]);
    setMode("demo");
    setTrips(loadDemo());
    go("discover", { page: "overview" });
    if (token) await request("/api/auth/logout", { method: "POST", body: {} }).catch(() => {});
    sessionStorage.removeItem(TOKEN_STORE);
  }

  // ── Hikers ──

  function startBooking(trip) {
    if (!user)
      return openAuth("hiker", { view: "book", route: { id: trip.id } }, "Sign in or create a hiker account to book this trip.");
    go("book", { id: trip.id });
  }

  async function submitBooking(trip, hikers) {
    setBusy(true);
    setError("");
    try {
      const booking = await request("/api/bookings", { method: "POST", body: { tripId: trip.id, hikers } });
      setBookings((current) => [booking, ...current]);
      loadPublic();
      go("booking", { id: booking.id });
      setToast("Booked! Your seats are held.");
    } catch (e) {
      fail(e);
      loadPublic();
    } finally {
      setBusy(false);
    }
  }

  async function cancelBooking(booking) {
    setBusy(true);
    setError("");
    try {
      const updated = await request(`/api/bookings/${booking.id}/cancel`, { method: "POST", body: {} });
      setBookings((current) => current.map((b) => (b.id === updated.id ? updated : b)));
      loadPublic();
      setToast("Booking cancelled. Your seats were released.");
      return true;
    } catch (e) {
      fail(e);
      return false;
    } finally {
      setBusy(false);
    }
  }

  // ── Operators ──

  function persist(next) {
    if (mode === "demo") {
      try {
        localStorage.setItem(STORE, JSON.stringify(next));
      } catch {
        throw new Error("Your browser could not save this change. Allow local storage and try again.");
      }
    }
    setTrips(next);
  }

  /** Create or update a trip with the given status. Resolves to the saved trip, or null on failure. */
  async function saveTrip(form, status) {
    setBusy(true);
    setError("");
    try {
      const cleaned = validateTrip({ ...form, status });
      const editing = Boolean(form.id);
      const saved =
        mode === "database"
          ? await request(`/api/trips${editing ? "/" + form.id : ""}`, { method: editing ? "PUT" : "POST", body: cleaned })
          : { ...cleaned, id: editing ? form.id : crypto.randomUUID() };
      persist(editing ? trips.map((t) => (t.id === saved.id ? saved : t)) : [...trips, saved]);
      return saved;
    } catch (e) {
      fail(e);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function submitForm(form, status) {
    const editing = Boolean(form.id);
    const saved = await saveTrip(form, status);
    if (!saved) return;
    navigate({ page: "expedition", id: saved.id });
    setToast(
      editing && form.status === status ? "Changes saved." : status === "Open" ? "Expedition published." : "Draft saved.",
    );
  }

  async function changeStatus(trip, status) {
    const saved = await saveTrip(trip, status);
    if (saved)
      setToast(
        status === "Open"
          ? "Expedition published."
          : status === "Cancelled"
            ? "Expedition cancelled. Its bookings were cancelled too."
            : "Moved back to drafts.",
      );
    return Boolean(saved);
  }

  async function removeTrip(trip) {
    setBusy(true);
    setError("");
    try {
      if (mode === "database") await request(`/api/trips/${trip.id}`, { method: "DELETE" });
      persist(trips.filter((t) => t.id !== trip.id));
      navigate({ page: "expeditions" });
      setToast("Expedition deleted.");
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  const loadManifest = (id) => request(`/api/trips/${id}/bookings`);

  async function connect() {
    if (!user) return openAuth("operator");
    setBusy(true);
    setError("");
    try {
      await loadOperator();
      setToast("Connected to MongoDB.");
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  function switchToDemo() {
    setError("");
    setTrips(loadDemo());
    setMode("demo");
    if (route.page === "expedition" || route.page === "edit") navigate({ page: "overview" });
  }

  function exportTrips() {
    const rows = [
      ["Expedition", "Trail", "Start", "End", "Length", "Price (PHP)", "Seats", "Booked", "Status", "Meeting point"],
      ...[...trips]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((t) => [
          t.title,
          `${trails[t.trail].name} · ${trails[t.trail].route}`,
          t.date,
          endDate(t),
          t.duration,
          t.price,
          t.capacity,
          t.booked,
          tripStatus(t),
          t.meeting,
        ]),
    ];
    // Quote every cell, and defuse values a spreadsheet would read as a formula.
    const csv = rows
      .map((row) => row.map((value) => '"' + String(value).replace(/^[=+@-]/, "'$&").replaceAll('"', '""') + '"').join(","))
      .join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "akyatph-expeditions.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast("Expeditions exported.");
  }

  // ── Views ──

  const openOperator = () =>
    user?.role === "operator"
      ? navigate({ page: "overview" })
      : openAuth(
          "operator",
          null,
          user ? `You're signed in as ${user.name}, a hiker. Sign in with an operator account to switch.` : "",
        );
  const header = (
    <SiteHeader
      user={user}
      onHome={() => go("discover")}
      onOperator={openOperator}
      onSignIn={() => openAuth("hiker", { view: siteView, route })}
      onBookings={() => go("bookings")}
    />
  );
  const shownTrips = publicTrips ?? (publicTrips === null ? seedTrips : []);
  const toastView = toast && (
    <div className="op-toast" role="status">
      <Check size={18} aria-hidden="true" />
      {toast}
    </div>
  );

  if (siteView === "auth")
    return (
      <Auth
        key={resetToken || `auth-${authRole}`}
        initialRole={authRole}
        onBack={() => {
          setAuthNotice("");
          go("discover");
        }}
        onSubmit={submitAuth}
        onForgot={forgotPassword}
        onReset={resetPassword}
        onGoogle={(role) => window.location.assign(`/api/auth/google/start?role=${role}`)}
        busy={busy}
        error={error}
        notice={authNotice}
        resetToken={resetToken}
      />
    );

  if (siteView === "operator" && user?.role === "operator")
    return (
      <OperatorPortal
        user={user}
        mode={mode}
        trips={trips}
        recent={recent}
        route={route}
        navigate={navigate}
        busy={busy}
        error={error}
        clearError={() => setError("")}
        toast={toast}
        loadManifest={loadManifest}
        onSave={submitForm}
        onStatus={changeStatus}
        onDelete={removeTrip}
        onExport={exportTrips}
        onConnect={connect}
        onUseDemo={switchToDemo}
        onLogout={logout}
        onDiscover={() => go("discover")}
      />
    );

  let page;
  if (siteView === "trail" && trails[route.trail]) {
    page = (
      <TrailPage
        key={route.trail}
        header={header}
        trailIndex={route.trail}
        trips={shownTrips}
        demo={publicTrips === null}
        user={user}
        onBook={startBooking}
      />
    );
  } else if (siteView === "book" && user?.role === "hiker") {
    const trip = shownTrips.find((t) => t.id === route.id);
    page =
      publicTrips === undefined ? (
        <div className="hk-page">{header}</div>
      ) : (
        <BookPage
          key={route.id}
          header={header}
          trip={trip}
          user={user}
          busy={busy}
          error={error}
          onSubmit={submitBooking}
          onBack={() => go("trail", { trail: trip?.trail ?? 0 })}
        />
      );
  } else if (siteView === "bookings" && user?.role === "hiker") {
    page = (
      <MyBookings
        header={header}
        user={user}
        bookings={bookings}
        loading={bookingsLoading}
        onOpen={(b) => go("booking", { id: b.id })}
        onFind={() => go("discover")}
        onLogout={logout}
      />
    );
  } else if (siteView === "booking" && user?.role === "hiker") {
    page = (
      <BookingDetail
        header={header}
        booking={bookings.find((b) => b.id === route.id) ?? (bookingsLoading ? undefined : null)}
        busy={busy}
        error={error}
        clearError={() => setError("")}
        onCancel={cancelBooking}
        onBack={() => go("bookings")}
      />
    );
  } else {
    page = (
      <Discover
        header={header}
        trips={shownTrips}
        onOperator={openOperator}
        onTrail={(trail) => go("trail", { trail })}
      />
    );
  }
  return (
    <>
      {page}
      {toastView}
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);
