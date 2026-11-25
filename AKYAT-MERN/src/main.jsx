import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { trails, seedTrips, endDate, tripStatus } from "./data";
import { validateTrip } from "../server/validation.js";
import "./base.css";
import { Discover } from "./Discover";
import { Auth } from "./Auth";
import { OperatorPortal } from "./Operator";

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

async function api(path = "", options = {}) {
  const token = sessionStorage.getItem(TOKEN_STORE);
  const response = await fetch("/api/trips" + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(
      body.error || "The database could not be reached. Start the API server and check its MongoDB connection.",
    );
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? null : response.json();
}

async function authApi(path, body, token) {
  const response = await fetch("/api/auth/" + path, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Could not reach the API server. Start MongoDB and npm run server.");
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
  const [siteView, setSiteView] = useState(startsAtAuth ? "auth" : "discover");
  const [route, setRoute] = useState({ page: "overview" });
  const [user, setUser] = useState(null);
  const [resetToken, setResetToken] = useState(
    window.location.hash.startsWith("#reset=") ? window.location.hash.slice(7) : "",
  );
  const [authNotice, setAuthNotice] = useState("");
  const [trips, setTrips] = useState(loadDemo);
  const [mode, setMode] = useState("demo");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  /** Move between Discover, sign-in, and operator pages, so the browser's Back button works. */
  function go(view, nextRoute = route) {
    setError("");
    setSiteView(view);
    setRoute(nextRoute);
    window.history.pushState({ view, route: nextRoute }, "", window.location.pathname);
    window.scrollTo(0, 0);
  }
  const navigate = (nextRoute) => go("operator", nextRoute);

  useEffect(() => {
    if (!startsAtAuth) window.history.replaceState({ view: "discover", route: { page: "overview" } }, "", window.location.pathname);
    const onPop = (event) => {
      const state = event.state ?? { view: "discover" };
      setError("");
      setSiteView(state.view);
      if (state.route) setRoute(state.route);
    };
    window.addEventListener("popstate", onPop);
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
      authApi("google/exchange", { ticket })
        .then(async (result) => {
          sessionStorage.setItem(TOKEN_STORE, result.token);
          setUser(result.user);
          setTrips(await api());
          setMode("database");
          go("operator", { page: "overview" });
        })
        .catch((e) => setError(e.message));
    }
  }, []);

  useEffect(() => {
    const token = sessionStorage.getItem(TOKEN_STORE);
    if (!token) return;
    authApi("me", null, token)
      .then(async ({ user }) => {
        setUser(user);
        setTrips(await api());
        setMode("database");
      })
      .catch(() => {
        sessionStorage.removeItem(TOKEN_STORE);
        setUser(null);
        setMode("demo");
      });
  }, []);

  useEffect(() => {
    document.title =
      siteView === "auth"
        ? "Sign in · AkyatPH"
        : siteView === "operator"
          ? `${PAGE_TITLES[route.page] ?? "Operator portal"} · AkyatPH`
          : "Discover trails · AkyatPH";
  }, [siteView, route]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  // The server rejected the token (expired, or logged out elsewhere): sign out and ask to sign in again.
  function expireSession(message) {
    sessionStorage.removeItem(TOKEN_STORE);
    setUser(null);
    setMode("demo");
    setTrips(loadDemo());
    setAuthNotice("");
    go("auth");
    setError(message || "Session expired. Sign in again.");
  }

  function fail(e) {
    if (e.status === 401) expireSession(e.message);
    else setError(e.message);
  }

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
          ? await api(editing ? "/" + form.id : "", { method: editing ? "PUT" : "POST", body: JSON.stringify(cleaned) })
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
      editing && form.status === status
        ? "Changes saved."
        : status === "Open"
          ? "Expedition published."
          : "Draft saved.",
    );
  }

  async function changeStatus(trip, status) {
    const saved = await saveTrip(trip, status);
    if (saved)
      setToast(
        status === "Open" ? "Expedition published." : status === "Cancelled" ? "Expedition cancelled." : "Moved back to drafts.",
      );
    return Boolean(saved);
  }

  async function removeTrip(trip) {
    setBusy(true);
    setError("");
    try {
      if (mode === "database") await api("/" + trip.id, { method: "DELETE" });
      persist(trips.filter((t) => t.id !== trip.id));
      navigate({ page: "expeditions" });
      setToast("Expedition deleted.");
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  async function connect() {
    if (!user) return go("auth");
    setBusy(true);
    setError("");
    try {
      setTrips(await api());
      setMode("database");
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

  async function submitAuth(form, signup) {
    setBusy(true);
    setError("");
    try {
      const result = await authApi(signup ? "signup" : "login", form);
      sessionStorage.setItem(TOKEN_STORE, result.token);
      setUser(result.user);
      setTrips(await api());
      setMode("database");
      go("operator", { page: "overview" });
      setToast(signup ? "Account created." : "Signed in.");
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
      const result = await authApi("forgot-password", { email });
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
      const result = await authApi("reset-password", { token, password });
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
    sessionStorage.removeItem(TOKEN_STORE);
    setUser(null);
    setMode("demo");
    setTrips(loadDemo());
    go("discover", { page: "overview" });
    if (token) await authApi("logout", {}, token).catch(() => {});
  }

  function exportTrips() {
    const rows = [
      ["Expedition", "Trail", "Start", "End", "Length", "Price (PHP)", "Seats", "Reserved", "Status", "Meeting point"],
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

  if (siteView === "auth")
    return (
      <Auth
        key={resetToken || "auth"}
        onBack={() => {
          setAuthNotice("");
          go("discover");
        }}
        onSubmit={submitAuth}
        onForgot={forgotPassword}
        onReset={resetPassword}
        onGoogle={() => window.location.assign("/api/auth/google/start")}
        busy={busy}
        error={error}
        notice={authNotice}
        resetToken={resetToken}
      />
    );

  if (siteView === "discover" || !user)
    return (
      <Discover
        trips={trips}
        user={user}
        onOperator={() => (user ? navigate({ page: "overview" }) : go("auth"))}
        onSignIn={() => (user ? navigate({ page: "overview" }) : go("auth"))}
        onTrip={(trip) => (user ? navigate({ page: "expedition", id: trip.id }) : go("auth"))}
      />
    );

  return (
    <OperatorPortal
      user={user}
      mode={mode}
      trips={trips}
      route={route}
      navigate={navigate}
      busy={busy}
      error={error}
      clearError={() => setError("")}
      toast={toast}
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
}

createRoot(document.getElementById("root")).render(<App />);
