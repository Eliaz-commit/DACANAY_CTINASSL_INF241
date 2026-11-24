import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Mountain,
  LayoutDashboard,
  Compass,
  CalendarDays,
  Plus,
  Search,
  ArrowUpRight,
  MapPin,
  Users,
  X,
  Pencil,
  Trash2,
  Check,
  SlidersHorizontal,
  Download,
  Database,
  CircleHelp,
  ChevronRight,
  Leaf,
  Tent,
  Menu,
} from "lucide-react";
import { trails, seedTrips, currency, dateLabel, tripStatus } from "./data";
import { validateTrip } from "../server/validation.js";
import "./styles.css";
import { WorkspaceContent } from "./WorkspaceContent";
import { Discover } from "./Discover";
import { Auth } from "./Auth";
import "./redesign.css";

const STORE = "akyat-activity-trips-v1";
const TOKEN_STORE = "akyat-activity-session";
const Icon = ({ icon: Component, ...props }) => (
  <Component size={19} strokeWidth={1.7} aria-hidden="true" {...props} />
);
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
  const response = await fetch("/api/trips" + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(sessionStorage.getItem(TOKEN_STORE) ? { Authorization: `Bearer ${sessionStorage.getItem(TOKEN_STORE)}` } : {}) },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      body.error ||
        "The database could not be reached. Start the API server and check its MongoDB connection.",
    );
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
function Modal({ title, children, onClose, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? "modal wide" : "modal"}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      aria-labelledby="dialog-title"
    >
      <div className="modal-heading">
        <h2 id="dialog-title">{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label="Close dialog">
          <Icon icon={X} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function Badge({ status }) {
  return <span className={"badge " + status.toLowerCase()}>{status}</span>;
}

function TripForm({ trip, initialTrail, onSave, onClose, busy, error }) {
  const [form, setForm] = useState(
    trip || {
      title: "",
      trail: initialTrail ?? 0,
      date: "",
      duration: "Day hike",
      price: "",
      capacity: 15,
      booked: 0,
      status: "Draft",
      meeting: "",
      notes: "",
    },
  );
  const update = (event) => {
    const { name, value, type } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "number" || name === "trail" ? (value === "" ? "" : Number(value)) : value,
    }));
  };
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave(form);
      }}
    >
      <p className="muted form-intro">
        {trip
          ? "Update the details hikers need before they head out."
          : "Turn your next adventure into a trip hikers can join."}
      </p>
      <div className="form-grid">
        <label className="span-2">
          Trip name
          <input
            autoFocus
            required
            maxLength={100}
            name="title"
            value={form.title}
            onChange={update}
            placeholder="e.g. Pulag sunrise escape"
          />
        </label>
        <label className="span-2">
          Trail
          <select name="trail" value={form.trail} onChange={update}>
            {trails.map((t, i) => (
              <option value={i} key={i}>
                {t.name} · {t.route}
              </option>
            ))}
          </select>
        </label>
        <label>
          Departure date
          <input required type="date" name="date" value={form.date} onChange={update} />
        </label>
        <label>
          Duration
          <select name="duration" value={form.duration} onChange={update}>
            <option>Day hike</option>
            <option>2 days / 1 night</option>
            <option>3 days / 2 nights</option>
          </select>
        </label>
        <label>
          Price per hiker (PHP)
          <input
            required
            type="number"
            min="0"
            max="1000000"
            step="0.01"
            name="price"
            value={form.price}
            onChange={update}
          />
        </label>
        <label>
          Group capacity
          <input
            required
            type="number"
            min={Math.max(1, form.booked)}
            max="500"
            step="1"
            name="capacity"
            value={form.capacity}
            onChange={update}
          />
        </label>
        <label>
          Reserved seats
          <input
            required
            type="number"
            min="0"
            max={form.capacity}
            step="1"
            name="booked"
            value={form.booked}
            onChange={update}
          />
        </label>
        <label>
          Trip status
          <select name="status" value={form.status} onChange={update}>
            <option>Draft</option>
            <option>Open</option>
            <option>Cancelled</option>
          </select>
        </label>
        <label className="span-2">
          Meeting point
          <input
            required
            maxLength={160}
            name="meeting"
            value={form.meeting}
            onChange={update}
            placeholder="Where will the group meet?"
          />
        </label>
        <label className="span-2">
          Trip notes
          <textarea
            name="notes"
            maxLength={2000}
            value={form.notes}
            onChange={update}
            rows="3"
            placeholder="Inclusions, what to bring, and reminders"
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="modal-footer">
        <button type="button" className="button secondary" disabled={busy} onClick={onClose}>
          Cancel
        </button>
        <button className="button primary" disabled={busy}>
          {busy ? "Saving…" : trip ? "Save changes" : "Create trip"}
        </button>
      </div>
    </form>
  );
}

function App() {
  const [siteView, setSiteView] = useState(window.location.hash.startsWith("#reset=") || window.location.hash.startsWith("#google-") ? "auth" : "discover");
  const [user, setUser] = useState(null);
  const [resetToken, setResetToken] = useState(window.location.hash.startsWith("#reset=") ? window.location.hash.slice(7) : "");
  const [authNotice, setAuthNotice] = useState("");
  const [trips, setTrips] = useState(loadDemo);
  const [page, setPage] = useState("Overview");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All trips");
  const [sort, setSort] = useState("date");
  const [modal, setModal] = useState(null);
  const [mode, setMode] = useState("demo");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [nav, setNav] = useState(false);
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith("#google-error=")) {
      setError(hash.includes("not-configured") ? "Google sign-in needs a Google OAuth client ID and secret in .env. See README.md." : "Google sign-in could not finish. Try again.");
      window.history.replaceState(null, "", "/");
    }
    if (hash.startsWith("#google-ticket=")) {
      const ticket = hash.slice(15);
      window.history.replaceState(null, "", "/");
      authApi("google/exchange", { ticket }).then(async (result) => {
        sessionStorage.setItem(TOKEN_STORE, result.token);
        setUser(result.user);
        setTrips(await api());
        setMode("database");
        setSiteView("operator");
      }).catch((e) => setError(e.message));
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
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  function open(value) {
    setError("");
    setModal(value);
  }
  function close() {
    if (!busy) setModal(null);
  }
  function navigate(value) {
    setPage(value);
    setQuery("");
    setFilter("All trips");
    setNav(false);
  }
  async function persist(next) {
    if (mode === "demo") {
      try {
        localStorage.setItem(STORE, JSON.stringify(next));
      } catch {
        throw new Error(
          "Your browser could not save this change. Allow local storage and try again.",
        );
      }
    }
    setTrips(next);
  }
  async function save(form) {
    setBusy(true);
    setError("");
    try {
      const cleaned = validateTrip(form);
      const editing = modal.type === "edit";
      const saved =
        mode === "database"
          ? await api(editing ? "/" + form.id : "", {
              method: editing ? "PUT" : "POST",
              body: JSON.stringify(cleaned),
            })
          : { ...cleaned, id: editing ? form.id : crypto.randomUUID() };
      await persist(
        editing ? trips.map((t) => (t.id === saved.id ? saved : t)) : [...trips, saved],
      );
      setModal(null);
      setToast(editing ? "Trip updated." : "Trip created.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    setError("");
    try {
      if (mode === "database") await api("/" + modal.trip.id, { method: "DELETE" });
      await persist(trips.filter((t) => t.id !== modal.trip.id));
      setModal(null);
      setToast("Trip deleted.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function connect() {
    setBusy(true);
    setError("");
    try {
      if (!user) { setSiteView("auth"); setModal(null); return; }
      setTrips(await api());
      setMode("database");
      setModal(null);
      setToast("Connected to MongoDB.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
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
      setSiteView("operator");
      setToast(signup ? "Account created." : "Signed in.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function forgotPassword(email) {
    setBusy(true); setError(""); setAuthNotice("");
    try { const result = await authApi("forgot-password", { email }); setAuthNotice(result.message); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function resetPassword(token, password) {
    setBusy(true); setError(""); setAuthNotice("");
    try {
      const result = await authApi("reset-password", { token, password });
      setResetToken("");
      window.history.replaceState(null, "", "/");
      setAuthNotice(result.message);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function logout() {
    const token = sessionStorage.getItem(TOKEN_STORE);
    sessionStorage.removeItem(TOKEN_STORE);
    setUser(null);
    setMode("demo");
    setTrips(loadDemo());
    setSiteView("discover");
    if (token) await authApi("logout", {}, token).catch(() => {});
  }
  function exportTrips() {
    const rows = [
      ["Trip", "Trail", "Departure", "Price (PHP)", "Capacity", "Reserved", "Status"],
      ...trips.map((t) => [
        t.title,
        trails[t.trail].name,
        t.date,
        t.price,
        t.capacity,
        t.booked,
        tripStatus(t),
      ]),
    ];
    const csv = rows
      .map((row) =>
        row
          .map(
            (value) =>
              '"' +
              String(value)
                .replace(/^[=+@-]/, "'$&")
                .replaceAll('"', '""') +
              '"',
          )
          .join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "akyat-ph-trips.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast("Trip list exported.");
  }
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const active = trips.filter((t) => t.status === "Open" && t.date >= today);
  const totalSeats = active.reduce((n, t) => n + t.capacity, 0);
  const reserved = active.reduce((n, t) => n + t.booked, 0);
  const filtered = trips
    .filter(
      (t) =>
        (filter === "All trips" || tripStatus(t) === filter) &&
        (t.title + " " + trails[t.trail].name + " " + trails[t.trail].location)
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => (sort === "price" ? a.price - b.price : a.date.localeCompare(b.date)));
  const nextTrip = [...active].sort((a, b) => a.date.localeCompare(b.date))[0];
  const detail = modal?.trip;
  if (siteView === "auth") return <Auth key={resetToken || "auth"} onBack={() => { setError(""); setAuthNotice(""); setSiteView("discover"); }} onSubmit={submitAuth} onForgot={forgotPassword} onReset={resetPassword} onGoogle={() => { window.location.assign("/api/auth/google/start"); }} busy={busy} error={error} notice={authNotice} resetToken={resetToken} />;
  if (siteView === "discover")
    return (
      <Discover
        trips={trips}
        onOperator={() => setSiteView(user ? "operator" : "auth")}
        onSignIn={() => setSiteView(user ? "operator" : "auth")}
        user={user}
        onTrip={(trip) => {
          setSiteView(user ? "operator" : "auth");
          if (user) open({ type: "detail", trip });
        }}
      />
    );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className={"sidebar " + (nav ? "is-open" : "")}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("Overview");
          }}
        >
          <span className="brand-mark">
            <Mountain size={27} />
          </span>
          <span>
            AKYAT<span className="brand-ph">PH</span>
            <small>Operator workspace</small>
          </span>
        </a>
        <div className="workspace-label">Your workspace</div>
        <nav aria-label="Main navigation">
          {[
            [LayoutDashboard, "Overview"],
            [CalendarDays, "Trips"],
            [Compass, "Explore trails"],
          ].map(([icon, label]) => (
            <button
              key={label}
              className={"nav-link " + (page === label ? "selected" : "")}
              onClick={() => navigate(label)}
              aria-current={page === label ? "page" : undefined}
            >
              <Icon icon={icon} />
              {label}
              {label === "Trips" && <span className="nav-count">{trips.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="trail-note">
            <Icon icon={Leaf} />
            <h3>Good trips start here.</h3>
            <p>A little planning. A safer climb. More moments worth the trek.</p>
          </div>
          <button className="nav-link" onClick={() => open({ type: "help" })}>
            <Icon icon={CircleHelp} />
            Workspace guide
          </button>
          <div className="profile">
            <div className="avatar">AP</div>
            <div>
              <strong>{user?.name || "AKYAT PH"}</strong>
              <small>{user?.email || "Activity workspace"}</small>
            </div>
          </div>
          {user && <button className="nav-link" onClick={logout}>Log out</button>}
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button className="back-to-discover" onClick={() => setSiteView("discover")}>
              AkyatPH Discover
            </button>
            <span>Trip operations</span>
          </div>
          <button className="connection" onClick={() => open({ type: "connection" })}>
            <span className={"connection-dot " + mode} />
            {mode === "demo" ? "Demo workspace" : "MongoDB connected"}
            <Icon icon={Database} size={15} />
          </button>
        </header>
        <main id="main">
          <div className="page-heading">
            <div>
              <h1>
                {page === "Overview"
                  ? "Trip schedule"
                  : page === "Trips"
                    ? "All trips"
                    : "Trail library"}
              </h1>
              <p className="muted">
                {page === "Explore trails"
                  ? "Choose a Cordillera route for your next departure."
                  : "Plan departures, check capacity, and update trip details."}
              </p>
            </div>
            <button className="button primary" onClick={() => open({ type: "create" })}>
              <Icon icon={Plus} />
              Create trip
            </button>
          </div>
          <WorkspaceContent
            page={page}
            navigate={navigate}
            trips={trips}
            filtered={filtered}
            filter={filter}
            setFilter={setFilter}
            query={query}
            setQuery={setQuery}
            sort={sort}
            setSort={setSort}
            open={open}
            exportTrips={exportTrips}
            mode={mode}
          />
          <footer className="page-footer">
            <span>
              <Mountain size={15} />
              AKYAT PH
            </span>
            <span>Made for the journey.</span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Icon icon={Check} />
          {toast}
        </div>
      )}
      {(modal?.type === "create" || modal?.type === "edit") && (
        <Modal title={modal.type === "edit" ? "Edit trip" : "Create a trip"} wide onClose={close}>
          <TripForm
            trip={modal.trip}
            initialTrail={modal.trail}
            onSave={save}
            onClose={close}
            busy={busy}
            error={error}
          />
        </Modal>
      )}
      {modal?.type === "detail" && (
        <Modal title="Trip details" wide onClose={close}>
          <img
            className="detail-photo"
            src={"/trails/" + trails[detail.trail].image}
            alt={trails[detail.trail].name}
          />
          <div className="detail-body">
            <Badge status={tripStatus(detail)} />
            <h2>{detail.title}</h2>
            <p className="muted">
              {trails[detail.trail].name} · {trails[detail.trail].route}
            </p>
            <dl className="detail-grid">
              <div>
                <dt>Departure</dt>
                <dd>{dateLabel(detail.date)}</dd>
              </div>
              <div>
                <dt>Duration</dt>
                <dd>{detail.duration}</dd>
              </div>
              <div>
                <dt>Price per hiker</dt>
                <dd>{currency(detail.price)}</dd>
              </div>
              <div>
                <dt>Reserved seats</dt>
                <dd>
                  {detail.booked} / {detail.capacity}
                </dd>
              </div>
            </dl>
            <h3>Meeting point</h3>
            <p>{detail.meeting}</p>
            <h3>Trip notes</h3>
            <p className="notes">{detail.notes || "No additional notes yet."}</p>
          </div>
          <div className="modal-footer spread">
            <button
              className="button danger-quiet"
              onClick={() => open({ type: "delete", trip: detail })}
            >
              <Icon icon={Trash2} />
              Delete trip
            </button>
            <button className="button primary" onClick={() => open({ type: "edit", trip: detail })}>
              <Icon icon={Pencil} />
              Edit trip
            </button>
          </div>
        </Modal>
      )}
      {modal?.type === "delete" && (
        <Modal title="Delete this trip?" onClose={close}>
          <div className="dialog-copy">
            <p>
              <strong>{detail.title}</strong> will be permanently removed from this{" "}
              {mode === "demo" ? "demo workspace" : "database"}.
            </p>
            {detail.booked > 0 && (
              <p className="error">
                This trip has {detail.booked} reserved seats. Consider changing its status to
                Cancelled to keep the record.
              </p>
            )}
            <p>This action cannot be undone.</p>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </div>
          <div className="modal-footer">
            <button className="button secondary" disabled={busy} onClick={close}>
              Keep trip
            </button>
            <button className="button danger" disabled={busy} onClick={remove}>
              {busy ? "Deleting…" : "Delete trip"}
            </button>
          </div>
        </Modal>
      )}
      {modal?.type === "connection" && (
        <Modal title="Workspace data" onClose={close}>
          <div className="dialog-copy">
            <Icon icon={Database} size={32} />
            <h3>
              {mode === "demo" ? "You’re exploring the demo." : "You’re connected to MongoDB."}
            </h3>
            <p>
              Demo trips are sample records saved only in this browser. The database workspace uses
              the Express API and your configured MongoDB database.
            </p>
            <p>
              To connect, start the API with <code>npm run server</code> and set{" "}
              <code>MONGODB_URI</code> in the activity’s <code>.env</code> file.
            </p>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
          </div>
          <div className="modal-footer">
            {mode === "database" ? (
              <button
                className="button secondary"
                onClick={() => {
                  setTrips(loadDemo());
                  setMode("demo");
                  setModal(null);
                }}
              >
                Use demo workspace
              </button>
            ) : (
              <button className="button primary" disabled={busy} onClick={connect}>
                {busy ? "Connecting…" : "Connect database"}
              </button>
            )}
          </div>
        </Modal>
      )}
      {modal?.type === "help" && (
        <Modal title="Your workspace guide" onClose={close}>
          <div className="dialog-copy guide">
            <p>Plan hiking trips from one place.</p>
            <h3>Create a trip</h3>
            <p>
              Choose a trail, departure date, price, and group capacity. Keep it as a draft until it
              is ready.
            </p>
            <h3>Find and update trips</h3>
            <p>
              Search by trip or mountain. Select a trip name to see its details, or use its pencil
              button to edit.
            </p>
            <h3>Remove a trip</h3>
            <p>
              Open trip details and choose Delete trip. You will confirm before the record is
              removed.
            </p>
            <h3>Activity scope</h3>
            <p>
              This workspace demonstrates trip CRUD and operator sign in. Reserved seats are entered manually; bookings,
              payments, and permits are not connected.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
