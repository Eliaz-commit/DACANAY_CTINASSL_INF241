import React, { useEffect, useRef, useState } from "react";
import {
  Ban,
  CalendarDays,
  Check,
  ChevronRight,
  Database,
  Download,
  FileText,
  Footprints,
  LayoutGrid,
  LogOut,
  Map as MapIcon,
  MapPin,
  Mountain,
  NotebookPen,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Send,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  DURATIONS,
  addDays,
  currency,
  dateLabel,
  dateRange,
  daysBetween,
  difficultyBand,
  endDate,
  initials,
  plural,
  todayISO,
  trails,
  tripLength,
  tripStatus,
} from "./data";
import "./operator.css";

// The operator portal, laid out like the capstone's /operator pages:
// a sidebar shell, then Overview, Expeditions, an expedition's page, its form, and Trails.

const MONTH_LONG = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", month: "long" });
const LONG_DATE = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

function greeting(now) {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", hour: "numeric", hourCycle: "h23" }).format(now),
  );
  if (hour < 12) return "Magandang umaga";
  if (hour < 18) return "Magandang hapon";
  return "Magandang gabi";
}

/** Saturday and Sunday of this week in Manila (on Sunday, yesterday and today). */
function thisWeekend(today) {
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  const saturday = weekday === 0 ? addDays(today, -1) : addDays(today, 6 - weekday);
  return [saturday, addDays(saturday, 1)];
}

export const trailName = (trail) => `${trail.name} via ${trail.route.replace(/ trail$/i, "")}`;

// ── Small pieces ───────────────────────────────────────────────────────────────

export function Pill({ tone, children }) {
  return <span className={`op-pill ${tone}`}>{children}</span>;
}

function StatusPill({ trip, today }) {
  const status = tripStatus(trip, today);
  if (status === "Open") return <Pill tone="success">Open · {trip.capacity - trip.booked} left</Pill>;
  if (status === "Full") return <Pill tone="warning">Full</Pill>;
  if (status === "Cancelled") return <Pill tone="danger">Cancelled</Pill>;
  return <Pill tone="neutral">{status}</Pill>;
}

export function Difficulty({ level }) {
  const band = difficultyBand(level);
  return (
    <span className={`op-difficulty ${band}`}>
      {band[0].toUpperCase() + band.slice(1)} {level}/9
    </span>
  );
}

export function Masl({ masl, variant = "" }) {
  return <span className={`op-masl ${variant}`}>▲ {masl.toLocaleString("en-PH")} MASL</span>;
}

export function Meter({ value, max, tone = "" }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={`op-meter ${tone}`} role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
      <div style={{ width: `${pct}%` }} />
    </div>
  );
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="op-empty">
      <p className="op-empty-title">{title}</p>
      {children && <p className="op-empty-text">{children}</p>}
      {action}
    </div>
  );
}

function LiveBadge({ mode }) {
  return (
    <span className={`op-live ${mode === "demo" ? "demo" : ""}`}>
      <span className="op-live-dot" aria-hidden="true" />
      {mode === "demo" ? "Demo data" : "MongoDB connected"}
    </span>
  );
}

export function Dialog({ title, onClose, busy, children, footer }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="op-dialog"
      aria-labelledby="op-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="op-dialog-head">
        <h2 id="op-dialog-title">{title}</h2>
        <button type="button" className="op-icon-btn" onClick={onClose} disabled={busy} aria-label="Close">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="op-dialog-body">{children}</div>
      <div className="op-dialog-foot">{footer}</div>
    </dialog>
  );
}

// ── Shell ──────────────────────────────────────────────────────────────────────

const NAV = [
  { page: "overview", label: "Overview", icon: LayoutGrid },
  { page: "expeditions", label: "Expeditions", icon: Footprints },
  { page: "trails", label: "Trails", icon: MapIcon },
];

/** Which sidebar item a route belongs under. */
const section = (page) => (page === "trails" ? "trails" : page === "overview" ? "overview" : "expeditions");

function Shell({ user, mode, route, navigate, tripCount, onLogout, onDiscover, children }) {
  const current = section(route.page);
  return (
    <div className="op-shell">
      <a className="op-skip" href="#op-main">
        Skip to content
      </a>
      <aside className="op-sidebar">
        <div className="op-sidebar-top">
          <button type="button" className="op-brand" onClick={onDiscover} aria-label="AkyatPH Discover">
            <span className="op-brand-mark">
              <Mountain size={20} aria-hidden="true" />
            </span>
            <span>
              <span className="op-brand-name">AkyatPH</span>
              <span className="op-brand-label">Operator portal</span>
            </span>
          </button>
          <button type="button" className="op-btn primary sm op-new-mobile" onClick={() => navigate({ page: "new" })}>
            <Plus size={16} aria-hidden="true" />
            New
          </button>
        </div>

        <div className="op-account">
          <div className="op-account-card">
            <span className="op-avatar">{initials(user?.name || "AkyatPH")}</span>
            <div style={{ minWidth: 0 }}>
              <p className="op-account-name">{user?.name || "Demo operator"}</p>
              <span className={`op-badge ${mode === "demo" ? "demo" : ""}`}>
                <Database size={14} aria-hidden="true" />
                {mode === "demo" ? "Demo workspace" : "MongoDB workspace"}
              </span>
            </div>
          </div>
          <button type="button" className="op-btn primary" onClick={() => navigate({ page: "new" })}>
            <Plus size={16} aria-hidden="true" />
            New Expedition
          </button>
        </div>

        <nav className="op-nav" aria-label="Operator">
          {NAV.map(({ page, label, icon: Icon }) => (
            <button
              key={page}
              type="button"
              className="op-nav-link"
              aria-current={current === page ? "page" : undefined}
              onClick={() => navigate({ page })}
            >
              <Icon size={20} aria-hidden="true" />
              <span>{label}</span>
              {page === "expeditions" && <span className="op-nav-count">{tripCount}</span>}
            </button>
          ))}
          {user && (
            <button type="button" className="op-nav-link op-nav-signout" onClick={onLogout}>
              <LogOut size={20} aria-hidden="true" />
              <span>Sign out</span>
            </button>
          )}
        </nav>

        <div className="op-sidebar-foot">
          <div className="op-user">
            <span className="op-avatar soft">{initials(user?.name || user?.email || "AkyatPH")}</span>
            <div className="op-user-text">
              <p className="op-user-name">{user?.name || user?.email || "Demo operator"}</p>
              <p className="op-user-role">{user ? "Owner" : "Not signed in"}</p>
            </div>
            {user && (
              <button type="button" className="op-icon-btn" onClick={onLogout} aria-label="Sign out" title="Sign out">
                <LogOut size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </aside>
      <div className="op-main">{children}</div>
    </div>
  );
}

function PageHeader({ crumbs, navigate, title, badges, description, actions }) {
  return (
    <header className="op-header">
      {crumbs && (
        <nav aria-label="Breadcrumb" className="op-crumbs">
          {crumbs.map((c, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="sep">/</span>}
              {c.route ? (
                <button type="button" onClick={() => navigate(c.route)}>
                  {c.label}
                </button>
              ) : (
                <span className="current">{c.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="op-header-row">
        <div style={{ minWidth: 0 }}>
          <div className="op-title-row">
            <h1>{title}</h1>
            {badges}
          </div>
          {description && <div className="op-desc">{description}</div>}
        </div>
        {actions && <div className="op-actions">{actions}</div>}
      </div>
    </header>
  );
}

// ── Expedition table (capstone: components/dashboard/expedition-table.tsx) ───────────

function ExpeditionTable({ rows, tabs, initialTab, today, navigate, empty, showPrice = true }) {
  const [tab, setTab] = useState(initialTab ?? tabs[0].key);
  const count = (key) => (key === "all" ? rows.length : rows.filter((r) => r.tags.includes(key)).length);
  const shown = tab === "all" ? rows : rows.filter((r) => r.tags.includes(tab));
  return (
    <div>
      <div role="tablist" aria-label="Filter expeditions" className="op-tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            className="op-tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            <span className="op-tab-count">{count(t.key)}</span>
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <div className="op-table-empty">{empty}</div>
      ) : (
        <div className="op-table-wrap">
          <table className="op-table">
            <thead>
              <tr>
                <th>Trail &amp; route</th>
                <th>Date</th>
                <th>Seats</th>
                {showPrice && <th>Price</th>}
                <th>Status</th>
                <th aria-hidden="true" />
              </tr>
            </thead>
            <tbody>
              {shown.map(({ trip }) => {
                const trail = trails[trip.trail];
                return (
                  <tr key={trip.id}>
                    <td>
                      <button
                        type="button"
                        className="op-row-link"
                        onClick={() => navigate({ page: "expedition", id: trip.id })}
                      >
                        {trip.title}
                      </button>
                      <div className="op-row-meta">
                        <Masl masl={trail.masl} />
                        <Difficulty level={trail.level} />
                        <span>{trailName(trail)}</span>
                      </div>
                    </td>
                    <td>
                      <p className="op-cell-strong">{dateRange(trip.date, endDate(trip))}</p>
                      <p className="op-cell-sub">{tripLength(trip)}</p>
                    </td>
                    <td className="op-seats">
                      <p className="op-cell-strong">
                        {trip.booked} / {trip.capacity}
                      </p>
                      <Meter value={trip.booked} max={trip.capacity} />
                    </td>
                    {showPrice && (
                      <td>
                        <p className="op-cell-strong">{currency(trip.price)}</p>
                        <p className="op-cell-sub">per hiker</p>
                      </td>
                    )}
                    <td>
                      <StatusPill trip={trip} today={today} />
                    </td>
                    <td className="op-chevron">
                      <ChevronRight size={16} aria-hidden="true" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Overview (capstone: app/operator/page.tsx) ──────────────────────────────────────

function buildQueue(upcoming, today) {
  const items = [];
  for (const e of upcoming) {
    const days = daysBetween(today, e.date);
    const when = days <= 0 ? "Today" : days === 1 ? "Tomorrow" : `${days} days left`;
    const trip = `${e.title} · ${dateRange(e.date, endDate(e))}`;
    if (e.status === "Draft" && days <= 30) {
      items.push({
        key: `${e.id}-draft`,
        id: e.id,
        urgent: false,
        icon: FileText,
        eyebrow: `Draft · ${when}`,
        title: "Not published yet",
        detail: `${trip}. Hikers can't see it in Discover until you publish.`,
        cta: "Open draft",
        days,
      });
    }
    if (e.status === "Open" && e.booked === 0 && days <= 14) {
      items.push({
        key: `${e.id}-empty`,
        id: e.id,
        urgent: days <= 3,
        icon: Users,
        eyebrow: `${when} · No bookings`,
        title: "No hikers have booked yet",
        detail: `${trip}. Check the date and price, or share the trip.`,
        cta: "Open expedition",
        days,
      });
    }
  }
  return items.sort((a, b) => Number(b.urgent) - Number(a.urgent) || a.days - b.days);
}

function timeAgo(timestamp, now = Date.now()) {
  const minutes = Math.max(0, Math.round((now - Date.parse(timestamp)) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return dateLabel(new Date(timestamp).toISOString().slice(0, 10));
}

/** How a booking reads to the operator. */
function BookingPill({ booking }) {
  if (booking.status === "Confirmed") return <Pill tone="success">Confirmed</Pill>;
  return <Pill tone="neutral">{booking.cancelledBy === "hiker" ? "Cancelled by hiker" : "Cancelled"}</Pill>;
}

// Capstone: RecentBookings on app/operator/page.tsx.
function LiveBookings({ recent, mode, navigate }) {
  return (
    <section className="op-card">
      <div className="op-card-head ruled">
        <h2>Live bookings</h2>
        {mode === "database" && <span className="op-eyebrow">Updates every 10 s</span>}
      </div>
      {mode === "demo" ? (
        <p className="op-quiet">Connect MongoDB to see hikers' bookings as they land.</p>
      ) : recent.length === 0 ? (
        <div style={{ padding: 16 }}>
          <EmptyState title="No bookings yet">New bookings appear here as hikers book from Discover.</EmptyState>
        </div>
      ) : (
        <ul className="op-feed">
          {recent.map((b) => (
            <li key={b.id}>
              <button type="button" onClick={() => b.trip && navigate({ page: "expedition", id: b.trip.id })}>
                <span className="op-avatar soft">{initials(b.bookedBy?.name ?? "?")}</span>
                <span className="op-feed-text">
                  <span>
                    <strong>{b.bookedBy?.name ?? "A hiker"}</strong> booked {plural(b.seats, "seat")}
                  </span>
                  <small>
                    {b.trip?.title ?? "Removed trip"} · {currency(b.total)}
                  </small>
                </span>
                <span className="op-feed-side">
                  <small>{timeAgo(b.createdAt)}</small>
                  <BookingPill booking={b} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Overview({ trips, recent = [], user, mode, navigate, onConnect, onUseDemo, busy, error }) {
  const now = new Date();
  const today = todayISO();
  const month = today.slice(0, 7);
  const monthName = MONTH_LONG.format(now);
  const monthShort = monthName.slice(0, 3);

  const byDate = [...trips].sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = byDate.filter((t) => (t.status === "Open" || t.status === "Draft") && endDate(t) >= today);
  const published = upcoming.filter((t) => t.status === "Open");
  const drafts = upcoming.filter((t) => t.status === "Draft");
  const thisMonth = trips.filter((t) => t.status === "Open" && t.date.startsWith(month));
  const seatsTaken = thisMonth.reduce((n, t) => n + t.booked, 0);
  const seatsTotal = thisMonth.reduce((n, t) => n + t.capacity, 0);
  const reservedValue = thisMonth.reduce((n, t) => n + t.booked * t.price, 0);
  const queue = buildQueue(upcoming, today);
  const urgent = queue.filter((q) => q.urgent).length;

  const [saturday, sunday] = thisWeekend(today);
  const rows = upcoming.map((trip) => {
    const tags = [];
    if (trip.date <= sunday && endDate(trip) >= saturday) tags.push("weekend");
    if (queue.some((q) => q.id === trip.id)) tags.push("action");
    return { trip, tags };
  });
  const firstName = (user?.name || "").split(" ")[0];

  return (
    <>
      <header className="op-header">
        <div className="op-header-row">
          <div>
            <h1>
              {greeting(now)}
              {firstName ? `, ${firstName}` : ""}
            </h1>
            <p className="op-desc">{LONG_DATE.format(now)} · Operator workspace</p>
          </div>
          <div className="op-actions">
            <LiveBadge mode={mode} />
            <button type="button" className="op-btn primary" onClick={() => navigate({ page: "new" })}>
              <Plus size={16} aria-hidden="true" />
              New Expedition
            </button>
          </div>
        </div>
      </header>

      <main id="op-main" className="op-body">
        {mode === "demo" && (
          <div className="op-notice">
            <Database size={20} aria-hidden="true" />
            <p>You're viewing demo trips saved only in this browser. Changes here don't reach MongoDB.</p>
            {user && (
              <button type="button" onClick={onConnect} disabled={busy}>
                Connect MongoDB
              </button>
            )}
          </div>
        )}

        <div className="op-stats">
          <section className="op-card pad op-stat op-enter" style={{ "--i": 0 }}>
            <p className="op-eyebrow">Upcoming expeditions</p>
            <p className="op-stat-num">{published.length}</p>
            <p className="op-stat-note">
              {published[0] ? `Next: ${published[0].title} (${dateLabel(published[0].date)})` : "Nothing published yet"}
            </p>
          </section>
          <section className="op-card pad op-stat op-enter" style={{ "--i": 1 }}>
            <div className="op-stat-head">
              <p className="op-eyebrow">Seats booked ({monthShort})</p>
              {seatsTotal > 0 && (
                <span className="op-stat-pct">{Math.round((seatsTaken / seatsTotal) * 100)}% full</span>
              )}
            </div>
            <p className="op-stat-num">
              {seatsTaken}
              <small> / {seatsTotal}</small>
            </p>
            <Meter value={seatsTaken} max={seatsTotal} />
            <p className="op-stat-note">{plural(Math.max(0, seatsTotal - seatsTaken), "seat")} left this month</p>
          </section>
          <section className={`op-card pad op-stat op-enter ${drafts.length > 0 ? "alert" : ""}`} style={{ "--i": 2 }}>
            <p className="op-eyebrow">Drafts to publish</p>
            <p className="op-stat-num">{drafts.length}</p>
            <p className="op-stat-note">
              {drafts.length > 0 ? (
                <button type="button" onClick={() => navigate({ page: "expeditions", tab: "drafts" })}>
                  Open your drafts →
                </button>
              ) : (
                "Every upcoming trip is published"
              )}
            </p>
          </section>
          <section className="op-card pad op-stat op-enter" style={{ "--i": 3 }}>
            <p className="op-eyebrow">Bookings value ({monthShort})</p>
            <p className="op-stat-num">{currency(reservedValue)}</p>
            <p className="op-stat-note">
              From {plural(seatsTaken, "booked seat")} on {monthName} trips
            </p>
          </section>
        </div>

        <div className="op-overview-grid">
          <section className="op-card">
            <div className="op-card-head">
              <div>
                <h2>Upcoming expeditions</h2>
                <p>Seats, prices, and status for every trip ahead.</p>
              </div>
              <button type="button" className="op-btn secondary sm" onClick={() => navigate({ page: "expeditions" })}>
                All expeditions
              </button>
            </div>
            <ExpeditionTable
              rows={rows}
              today={today}
              navigate={navigate}
              showPrice={false}
              tabs={[
                { key: "all", label: "All" },
                { key: "weekend", label: "This weekend" },
                { key: "action", label: "Needs action" },
              ]}
              empty={
                <EmptyState
                  title="No upcoming expeditions"
                  action={
                    trips.length === 0 && (
                      <button type="button" className="op-btn primary sm" onClick={() => navigate({ page: "new" })}>
                        <Plus size={16} aria-hidden="true" />
                        Create your first expedition
                      </button>
                    )
                  }
                >
                  Create one and it shows up here.
                </EmptyState>
              }
            />
          </section>

          <div className="op-side">
            <section className="op-card">
              <div className="op-card-head ruled">
                <h2>Action queue</h2>
                {urgent > 0 && <Pill tone="danger">{urgent} urgent</Pill>}
              </div>
              {queue.length === 0 ? (
                <p className="op-quiet">Nothing needs you right now.</p>
              ) : (
                <ul className="op-queue">
                  {queue.slice(0, 6).map((item) => (
                    <li key={item.key} className={item.urgent ? "urgent" : ""}>
                      <p className="op-queue-eyebrow">
                        <item.icon size={14} aria-hidden="true" />
                        {item.eyebrow}
                      </p>
                      <p className="op-queue-title">{item.title}</p>
                      <p className="op-queue-detail">{item.detail}</p>
                      <button
                        type="button"
                        className={`op-btn sm ${item.urgent ? "accent" : "secondary"}`}
                        onClick={() => navigate({ page: "expedition", id: item.id })}
                      >
                        {item.cta}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <LiveBookings recent={recent} mode={mode} navigate={navigate} />

            <section className="op-card">
              <div className="op-card-head ruled">
                <h2>Workspace data</h2>
                <LiveBadge mode={mode} />
              </div>
              <div className="op-data-card">
                <p>
                  {mode === "demo"
                    ? "Demo trips are sample records saved only in this browser."
                    : "Trips are saved to MongoDB through the Express API, and only your account can see them."}
                </p>
                {error && (
                  <p className="op-form-error" role="alert" style={{ marginTop: 0 }}>
                    {error}
                  </p>
                )}
                {mode === "demo" ? (
                  user && (
                    <button type="button" className="op-btn primary sm" onClick={onConnect} disabled={busy}>
                      <Database size={16} aria-hidden="true" />
                      {busy ? "Connecting…" : "Connect MongoDB"}
                    </button>
                  )
                ) : (
                  <button type="button" className="op-btn secondary sm" onClick={onUseDemo}>
                    Use demo workspace
                  </button>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}

// ── Expeditions (capstone: app/operator/expeditions/page.tsx) ────────────────────────

function Expeditions({ trips, navigate, initialTab, onExport }) {
  const today = todayISO();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("date");
  const isPast = (t) => t.status === "Open" && endDate(t) < today;
  const matches = trips.filter((t) => {
    const trail = trails[t.trail];
    return `${t.title} ${trail.name} ${trail.route} ${trail.location}`.toLowerCase().includes(query.trim().toLowerCase());
  });
  const sorted = [...matches].sort((a, b) => (sort === "price" ? a.price - b.price : a.date.localeCompare(b.date)));
  // Soonest first, except past trips, which read best newest first.
  const ordered = sort === "date" ? [...sorted.filter((t) => !isPast(t)), ...sorted.filter(isPast).reverse()] : sorted;
  const rows = ordered.map((trip) => {
    const tags = [];
    if (trip.status === "Draft") tags.push("drafts");
    if (trip.status === "Open" && !isPast(trip)) tags.push("upcoming");
    if (isPast(trip)) tags.push("past");
    if (trip.status === "Cancelled") tags.push("cancelled");
    return { trip, tags };
  });

  return (
    <>
      <PageHeader
        navigate={navigate}
        crumbs={[{ label: "Operator", route: { page: "overview" } }, { label: "Expeditions" }]}
        title="Expeditions"
        description="Every trip you've set up. Open one to see its seats, pricing, and meeting point."
        actions={
          <>
            <button type="button" className="op-btn secondary" onClick={onExport} disabled={trips.length === 0}>
              <Download size={16} aria-hidden="true" />
              Export CSV
            </button>
            <button type="button" className="op-btn primary" onClick={() => navigate({ page: "new" })}>
              <Plus size={16} aria-hidden="true" />
              New Expedition
            </button>
          </>
        }
      />
      <main id="op-main" className="op-body">
        <section className="op-card">
          <div className="op-toolbar">
            <label className="op-search">
              <Search size={18} aria-hidden="true" />
              <input
                className="op-input"
                type="search"
                aria-label="Search expeditions"
                placeholder="Find a trip or mountain"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <select className="op-input" aria-label="Sort expeditions" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="date">Departure date</option>
              <option value="price">Price: low to high</option>
            </select>
          </div>
          <ExpeditionTable
            key={initialTab ?? "upcoming"}
            rows={rows}
            today={today}
            navigate={navigate}
            initialTab={initialTab}
            tabs={[
              { key: "upcoming", label: "Upcoming" },
              { key: "drafts", label: "Drafts" },
              { key: "past", label: "Past" },
              { key: "cancelled", label: "Cancelled" },
              { key: "all", label: "All" },
            ]}
            empty={
              query ? (
                <EmptyState title="No expeditions match your search">Try a different trip or mountain name.</EmptyState>
              ) : (
                <EmptyState
                  title="Nothing here yet"
                  action={
                    trips.length === 0 && (
                      <button type="button" className="op-btn primary sm" onClick={() => navigate({ page: "new" })}>
                        <Plus size={16} aria-hidden="true" />
                        Create your first expedition
                      </button>
                    )
                  }
                >
                  Create an expedition and it shows up under Drafts until you publish it.
                </EmptyState>
              )
            }
          />
        </section>
      </main>
    </>
  );
}

// ── One expedition (capstone: app/operator/expeditions/[id]/page.tsx) ────────────────

function Manifest({ trip, mode, loadManifest }) {
  const [state, setState] = useState({ loading: true, bookings: [], error: "" });
  // Reload when the seat count or status changes, so new and cancelled bookings show up.
  useEffect(() => {
    if (mode !== "database") return;
    let live = true;
    loadManifest(trip.id)
      .then((bookings) => live && setState({ loading: false, bookings, error: "" }))
      .catch((e) => live && setState({ loading: false, bookings: [], error: e.message }));
    return () => {
      live = false;
    };
  }, [trip.id, trip.booked, trip.status, mode]);
  const confirmed = state.bookings.filter((b) => b.status === "Confirmed");
  const hikers = confirmed.reduce((n, b) => n + b.seats, 0);

  return (
    <section className="op-card" id="manifest">
      <div className="op-card-head">
        <div>
          <h2>Manifest</h2>
          <p>
            {mode === "demo"
              ? "Hikers' bookings appear here when you're connected to MongoDB."
              : `${plural(hikers, "hiker")} on ${plural(confirmed.length, "booking")}. Names are as each hiker entered them.`}
          </p>
        </div>
      </div>
      {mode === "demo" ? (
        <div className="op-table-empty">
          <EmptyState title="Demo data has no bookings" />
        </div>
      ) : state.error ? (
        <p className="op-form-error" role="alert" style={{ margin: 20 }}>
          {state.error}
        </p>
      ) : state.bookings.length === 0 ? (
        <div className="op-table-empty">
          <EmptyState title={state.loading ? "Loading bookings…" : "No bookings yet"}>
            {!state.loading && "When hikers book this trip from Discover, they show up here."}
          </EmptyState>
        </div>
      ) : (
        <div className="op-table-wrap" style={{ marginTop: 12 }}>
          <table className="op-table op-manifest">
            <thead>
              <tr>
                <th>Booked by</th>
                <th>Hikers</th>
                <th>Reference</th>
                <th>Booked</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {state.bookings.map((b) => (
                <tr key={b.id} className={b.status === "Cancelled" ? "muted" : ""}>
                  <td>
                    <p className="op-cell-strong">{b.bookedBy?.name ?? "Deleted account"}</p>
                    <p className="op-cell-sub">{b.bookedBy?.email}</p>
                  </td>
                  <td>
                    <p className="op-cell-strong">{plural(b.seats, "seat")}</p>
                    <p className="op-cell-sub op-wrap">{b.hikers.join(", ")}</p>
                  </td>
                  <td className="op-cell-sub">{b.reference}</td>
                  <td className="op-cell-sub">{timeAgo(b.createdAt)}</td>
                  <td>
                    <BookingPill booking={b} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ExpeditionDetail({ trip, mode, navigate, onStatus, onDelete, loadManifest, busy, error, clearError }) {
  const [confirm, setConfirm] = useState(null);
  const today = todayISO();
  if (!trip) {
    return (
      <main id="op-main" className="op-body">
        <EmptyState
          title="This expedition no longer exists"
          action={
            <button type="button" className="op-btn secondary sm" onClick={() => navigate({ page: "expeditions" })}>
              Back to expeditions
            </button>
          }
        >
          It may have been deleted.
        </EmptyState>
      </main>
    );
  }
  const trail = trails[trip.trail];
  const end = endDate(trip);
  const status = tripStatus(trip, today);
  const left = trip.capacity - trip.booked;
  const open = (kind) => {
    clearError();
    setConfirm(kind);
  };

  return (
    <>
      <PageHeader
        navigate={navigate}
        crumbs={[
          { label: "Operator", route: { page: "overview" } },
          { label: "Expeditions", route: { page: "expeditions" } },
          { label: dateRange(trip.date, end) },
        ]}
        title={trip.title}
        badges={
          <>
            <Masl masl={trail.masl} variant="solid" />
            <Difficulty level={trail.level} />
            <StatusPill trip={trip} today={today} />
          </>
        }
        description={
          <span className="op-desc-meta">
            <span>
              <CalendarDays size={16} aria-hidden="true" />
              {dateRange(trip.date, end)} · {tripLength(trip)}
            </span>
            <span>
              <MapPin size={16} aria-hidden="true" />
              {trailName(trail)} · {trail.location}
            </span>
          </span>
        }
        actions={
          <>
            <button type="button" className="op-btn secondary" onClick={() => navigate({ page: "edit", id: trip.id })}>
              <Pencil size={16} aria-hidden="true" />
              Edit
            </button>
            {trip.status === "Draft" && (
              <button type="button" className="op-btn primary" disabled={busy} onClick={() => onStatus(trip, "Open")}>
                <Send size={16} aria-hidden="true" />
                Publish
              </button>
            )}
            {trip.status === "Open" && status !== "Completed" && (
              <button type="button" className="op-btn danger" onClick={() => open("cancel")}>
                <Ban size={16} aria-hidden="true" />
                Cancel expedition
              </button>
            )}
            {trip.status === "Cancelled" && (
              <button type="button" className="op-btn secondary" disabled={busy} onClick={() => onStatus(trip, "Draft")}>
                <RotateCcw size={16} aria-hidden="true" />
                Move to drafts
              </button>
            )}
            <button type="button" className="op-btn danger" onClick={() => open("delete")}>
              <Trash2 size={16} aria-hidden="true" />
              Delete
            </button>
          </>
        }
      />

      <main id="op-main" className="op-body">
        {error && !confirm && (
          <p className="op-form-error" role="alert" style={{ marginTop: 0 }}>
            {error}
          </p>
        )}
        {status === "Completed" && (
          <p className="op-notice neutral">
            This trip ended on {dateLabel(end)}. It stays here as a record of the climb.
          </p>
        )}
        {trip.status === "Draft" && (
          <div className="op-notice">
            <FileText size={20} aria-hidden="true" />
            <p>This is a draft. Hikers can't see it in Discover until you publish it.</p>
          </div>
        )}
        {trip.status === "Cancelled" && (
          <p className="op-notice neutral">This expedition is cancelled. Hikers no longer see it in Discover.</p>
        )}

        <div className="op-detail-grid">
          <div className="op-side">
          <Manifest trip={trip} mode={mode} loadManifest={loadManifest} />
          <section className="op-card">
            <img className="op-trail-photo" src={`/trails/${trail.image}`} alt={trailName(trail)} />
            <div className="op-trail-body">
              <h2>{trailName(trail)}</h2>
              <div className="op-chips">
                <Masl masl={trail.masl} variant="lg" />
                <Difficulty level={trail.level} />
                <span className="op-chip">{trail.location}</span>
              </div>
              <p>{trail.description}</p>
              <div className="op-notes">
                <p className="op-eyebrow">Operator notes</p>
                <p>{trip.notes || "No notes yet. Add inclusions, what to bring, and reminders."}</p>
              </div>
            </div>
          </section>
          </div>

          <div className="op-side">
            <section className="op-card pad">
              <div className="op-stat-head">
                <p className="op-eyebrow">Seats</p>
                <span className="op-stat-pct">{Math.round((trip.booked / trip.capacity) * 100)}% full</span>
              </div>
              <p className="op-stat-num" style={{ marginTop: 8 }}>
                {trip.booked}
                <small> / {trip.capacity}</small>
              </p>
              <div style={{ marginTop: 12 }}>
                <Meter value={trip.booked} max={trip.capacity} />
              </div>
              <p className="op-small" style={{ fontSize: 14, marginTop: 8 }}>
                {left > 0 ? `${plural(left, "seat")} left` : "No seats left"}
              </p>
            </section>

            <section className="op-card pad">
              <p className="op-eyebrow">Pricing</p>
              <dl className="op-facts">
                <div>
                  <dt>Price per hiker</dt>
                  <dd>{currency(trip.price)}</dd>
                </div>
                <div>
                  <dt>Booked ({plural(trip.booked, "seat")})</dt>
                  <dd>{currency(trip.booked * trip.price)}</dd>
                </div>
                <div className="total">
                  <dt>If every seat fills</dt>
                  <dd>{currency(trip.capacity * trip.price)}</dd>
                </div>
              </dl>
              <p className="op-small">Hikers book seats from Discover. Payments aren't connected in this activity.</p>
            </section>

            <section className="op-card pad">
              <p className="op-eyebrow">Meeting point</p>
              <p className="op-strong-line">{trip.meeting}</p>
              <p className="op-small" style={{ marginTop: 2, fontSize: 14 }}>
                Departure {dateLabel(trip.date)}
              </p>
            </section>
          </div>
        </div>
      </main>

      {confirm === "delete" && (
        <Dialog
          title="Delete this expedition?"
          busy={busy}
          onClose={() => setConfirm(null)}
          footer={
            <>
              <button type="button" className="op-btn secondary" disabled={busy} onClick={() => setConfirm(null)}>
                Keep it
              </button>
              <button
                type="button"
                className="op-btn danger-solid"
                disabled={busy || (mode === "database" && trip.booked > 0 && trip.status !== "Cancelled")}
                onClick={() => onDelete(trip)}
              >
                {busy ? "Deleting…" : "Delete expedition"}
              </button>
            </>
          }
        >
          <p>
            <strong>{trip.title}</strong> will be permanently removed from{" "}
            {mode === "demo" ? "this browser's demo data" : "MongoDB"}. This can't be undone.
          </p>
          {trip.booked > 0 && trip.status !== "Cancelled" && (
            <p className="op-warning">
              It has {plural(trip.booked, "booked seat")}, so it can't be deleted yet. Cancel the expedition first;
              that cancels its bookings and keeps the record for those hikers.
            </p>
          )}
          {error && <p className="op-form-error" role="alert" style={{ marginTop: 0 }}>{error}</p>}
        </Dialog>
      )}
      {confirm === "cancel" && (
        <Dialog
          title="Cancel this expedition?"
          busy={busy}
          onClose={() => setConfirm(null)}
          footer={
            <>
              <button type="button" className="op-btn secondary" disabled={busy} onClick={() => setConfirm(null)}>
                Keep it open
              </button>
              <button
                type="button"
                className="op-btn danger-solid"
                disabled={busy}
                onClick={async () => {
                  if (await onStatus(trip, "Cancelled")) setConfirm(null);
                }}
              >
                {busy ? "Cancelling…" : "Cancel expedition"}
              </button>
            </>
          }
        >
          <p>
            Hikers will no longer see <strong>{trip.title}</strong> in Discover. You can move it back to drafts later.
          </p>
          {trip.booked > 0 && (
            <p className="op-warning">
              This also cancels {plural(trip.booked, "booked seat")}. Those hikers will see the trip as cancelled by
              you.
            </p>
          )}
          {error && <p className="op-form-error" role="alert" style={{ marginTop: 0 }}>{error}</p>}
        </Dialog>
      )}
    </>
  );
}

// ── Create and edit (capstone: app/operator/expeditions/expedition-form.tsx) ─────────

function Section({ icon: Icon, title, description, step, children }) {
  return (
    <section className="op-card op-section">
      <div className="op-section-head">
        <span className="op-section-icon">
          <Icon size={20} aria-hidden="true" />
        </span>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <span className="op-step">Step {step} of 3</span>
      </div>
      <div className="op-section-body">{children}</div>
    </section>
  );
}

function Field({ label, id, hint, children }) {
  return (
    <div className="op-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="op-hint">
          {hint}
        </p>
      )}
    </div>
  );
}

const BLANK = {
  title: "",
  trail: "",
  date: "",
  duration: "Day hike",
  price: "",
  capacity: 15,
  booked: 0,
  status: "Draft",
  meeting: "",
  notes: "",
};

function ExpeditionForm({ trip, initialTrail, user, navigate, onSave, busy, error }) {
  const editing = Boolean(trip);
  const [form, setForm] = useState(() => {
    if (trip) return { ...trip };
    if (initialTrail == null) return BLANK;
    return { ...BLANK, trail: initialTrail, title: trailName(trails[initialTrail]) };
  });
  const [titleTouched, setTitleTouched] = useState(editing);
  const today = todayISO();
  const trail = form.trail === "" ? null : trails[form.trail];
  const set = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const number = (event) => set(event.target.name, event.target.value === "" ? "" : Number(event.target.value));

  const capacity = Number(form.capacity) || 0;
  const booked = Number(form.booked) || 0;
  const checklist = [
    { label: "Trail chosen", done: Boolean(trail) },
    { label: "Expedition title", done: form.title.trim().length > 0 },
    { label: "Departure date", done: Boolean(form.date) },
    { label: "Seats and price", done: capacity > 0 && form.price !== "" && booked <= capacity },
    { label: "Meeting point", done: form.meeting.trim().length > 0 },
  ];
  const done = checklist.filter((c) => c.done).length;
  const ready = done === checklist.length;
  const canPublish = !editing || trip.status === "Draft";

  return (
    <>
      <PageHeader
        navigate={navigate}
        crumbs={[
          { label: "Operator", route: { page: "overview" } },
          { label: "Expeditions", route: { page: "expeditions" } },
          ...(editing ? [{ label: trip.title, route: { page: "expedition", id: trip.id } }, { label: "Edit" }] : [{ label: "New" }]),
        ]}
        title={editing ? "Edit expedition" : "Create new expedition"}
        badges={editing ? <StatusPill trip={trip} today={today} /> : <Pill tone="success">Draft</Pill>}
        description={
          editing
            ? "Update the details hikers need before they head out."
            : "Set the trail, dates, seats, and price. It stays a draft until you publish."
        }
        actions={
          <button
            type="button"
            className="op-btn secondary"
            disabled={busy}
            onClick={() => navigate(editing ? { page: "expedition", id: trip.id } : { page: "expeditions" })}
          >
            Cancel
          </button>
        }
      />
      <main id="op-main" className="op-body">
        <form
          className="op-form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            const intent = event.nativeEvent.submitter?.value;
            onSave(form, intent === "Open" || intent === "Draft" ? intent : form.status);
          }}
        >
          <div className="op-form-main">
            <Section
              icon={Mountain}
              title="Trail"
              description="Pick the route. Heights and difficulty come from AkyatPH's trail data."
              step={1}
            >
              <Field label="Mountain and route" id="field-trail">
                <select
                  id="field-trail"
                  className="op-input"
                  required
                  value={form.trail}
                  onChange={(event) => {
                    const value = event.target.value === "" ? "" : Number(event.target.value);
                    setForm((current) => ({
                      ...current,
                      trail: value,
                      title: !titleTouched && value !== "" ? trailName(trails[value]) : current.title,
                    }));
                  }}
                >
                  <option value="">Choose a trail…</option>
                  {trails.map((t, i) => (
                    <option key={i} value={i}>
                      {trailName(t)} · {t.location}
                    </option>
                  ))}
                </select>
              </Field>
              {trail && (
                <div className="op-chips">
                  <Masl masl={trail.masl} variant="lg" />
                  <Difficulty level={trail.level} />
                  <span className="op-chip">
                    Usually {trail.typicalDays === 1 ? "a day hike" : `${trail.typicalDays} days`}
                  </span>
                </div>
              )}
              <Field label="Expedition title" id="field-title" hint="What hikers see in Discover, like “Pulag sunrise escape”.">
                <input
                  id="field-title"
                  className="op-input"
                  aria-describedby="field-title-hint"
                  required
                  maxLength={100}
                  value={form.title}
                  onChange={(event) => {
                    setTitleTouched(true);
                    set("title", event.target.value);
                  }}
                />
              </Field>
            </Section>

            <Section
              icon={CalendarDays}
              title="Schedule and seats"
              description="Hikers book these seats from Discover. AkyatPH never lets a trip overbook."
              step={2}
            >
              <div className="op-fields-2">
                <Field label="Departure date" id="field-date">
                  <input
                    id="field-date"
                    className="op-input"
                    type="date"
                    required
                    min={editing ? undefined : today}
                    value={form.date}
                    onChange={(event) => set("date", event.target.value)}
                  />
                </Field>
                <Field label="Length" id="field-duration">
                  <select
                    id="field-duration"
                    className="op-input"
                    value={form.duration}
                    onChange={(event) => set("duration", event.target.value)}
                  >
                    {DURATIONS.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </Field>
                <Field
                  label="Seats"
                  id="field-capacity"
                  hint={booked > 0 ? `${plural(booked, "seat")} already booked, so it can't go lower.` : undefined}
                >
                  <input
                    id="field-capacity"
                    name="capacity"
                    className="op-input"
                    aria-describedby={booked > 0 ? "field-capacity-hint" : undefined}
                    type="number"
                    required
                    min={Math.max(1, booked)}
                    max="500"
                    step="1"
                    value={form.capacity}
                    onChange={number}
                  />
                </Field>
                <Field label="Price per hiker (₱)" id="field-price">
                  <input
                    id="field-price"
                    name="price"
                    className="op-input"
                    type="number"
                    required
                    min="0"
                    max="1000000"
                    step="0.01"
                    value={form.price}
                    onChange={number}
                  />
                </Field>
              </div>
            </Section>

            <Section
              icon={NotebookPen}
              title="Meeting point and notes"
              description="Where the group meets, and anything hikers should know before they go."
              step={3}
            >
              <Field label="Meeting point" id="field-meeting">
                <input
                  id="field-meeting"
                  className="op-input"
                  required
                  maxLength={160}
                  placeholder="e.g. Baguio City bus terminal"
                  value={form.meeting}
                  onChange={(event) => set("meeting", event.target.value)}
                />
              </Field>
              <Field label="Trip notes" id="field-notes" hint="Inclusions, what to bring, and reminders.">
                <textarea
                  id="field-notes"
                  className="op-input"
                  aria-describedby="field-notes-hint"
                  maxLength={2000}
                  rows={4}
                  value={form.notes}
                  onChange={(event) => set("notes", event.target.value)}
                />
              </Field>
            </Section>
          </div>

          <aside className="op-form-aside">
            <section className="op-card" style={{ overflow: "hidden" }}>
              <div className="op-preview-head">
                <span className="op-eyebrow">Hiker preview</span>
                <span>How it shows in Discover</span>
              </div>
              <div className="op-preview-banner">
                <div className="op-preview-top">
                  {trail && <span className="op-preview-masl">▲ {trail.masl.toLocaleString("en-PH")} MASL</span>}
                  {trail && <Difficulty level={trail.level} />}
                </div>
                <Mountain className="op-preview-mountain" size={64} aria-hidden="true" />
                <div className="op-preview-bottom">
                  <span>{form.date ? dateRange(form.date, endDate(form)) : "Pick dates"}</span>
                  {capacity > 0 && <span className="op-preview-seats">{Math.max(0, capacity - booked)} seats open</span>}
                </div>
              </div>
              <div className="op-preview-body">
                <div className="op-preview-title-row">
                  <p className="op-preview-title">{form.title || (trail ? trailName(trail) : "Your expedition")}</p>
                  <p className="op-preview-price">
                    <strong>{form.price !== "" && form.price >= 0 ? currency(Number(form.price)) : "₱—"}</strong>
                    <span>per hiker</span>
                  </p>
                </div>
                <p className="op-preview-place">
                  <MapPin size={14} aria-hidden="true" />
                  {trail ? trail.location : "Choose a trail"}
                </p>
                <dl className="op-preview-facts">
                  <div>
                    <dt>Length</dt>
                    <dd>{tripLength(form)}</dd>
                  </div>
                  <div>
                    <dt>Summit</dt>
                    <dd>{trail ? `${trail.masl.toLocaleString("en-PH")} m` : "—"}</dd>
                  </div>
                  <div>
                    <dt>Seats</dt>
                    <dd>{capacity || "—"}</dd>
                  </div>
                </dl>
                <p className="op-preview-operator">{user?.name || "Your operator team"}</p>
              </div>
            </section>

            <section className="op-card" style={{ padding: 16 }}>
              <div className="op-checklist-head">
                <span>
                  Checklist: {done} of {checklist.length}
                </span>
                <span>{Math.round((done / checklist.length) * 100)}%</span>
              </div>
              <Meter value={done} max={checklist.length} />
              <ul className="op-checklist">
                {checklist.map((c) => (
                  <li key={c.label} className={c.done ? "done" : ""}>
                    <span className="op-check">{c.done && <Check size={12} aria-hidden="true" />}</span>
                    {c.label}
                  </li>
                ))}
              </ul>
              {error && (
                <p className="op-form-error" role="alert">
                  {error}
                </p>
              )}
              <div className="op-form-buttons">
                {canPublish ? (
                  <>
                    <button type="submit" value="Open" className="op-btn primary" disabled={busy || !ready}>
                      <Send size={16} aria-hidden="true" />
                      Publish expedition
                    </button>
                    <button type="submit" value="Draft" className="op-btn secondary" disabled={busy}>
                      {busy ? "Saving…" : "Save draft"}
                    </button>
                  </>
                ) : (
                  <button type="submit" className="op-btn primary" disabled={busy}>
                    {busy ? "Saving…" : "Save changes"}
                  </button>
                )}
              </div>
            </section>
          </aside>
        </form>
      </main>
    </>
  );
}

// ── Trails ───────────────────────────────────────────────────────────────────────

function Trails({ navigate }) {
  return (
    <>
      <PageHeader
        navigate={navigate}
        crumbs={[{ label: "Operator", route: { page: "overview" } }, { label: "Trails" }]}
        title="Trail library"
        description="The routes you can run in this activity. Heights and difficulty come from AkyatPH's trail data."
      />
      <main id="op-main" className="op-body">
        <div className="op-trail-grid">
          {trails.map((trail, i) => (
            <article key={i} className="op-card op-enter" style={{ "--i": i }}>
              <img className="op-trail-photo" src={`/trails/${trail.image}`} alt={trailName(trail)} />
              <div className="op-trail-body">
                <h3>{trailName(trail)}</h3>
                <div className="op-chips">
                  <Masl masl={trail.masl} variant="lg" />
                  <Difficulty level={trail.level} />
                  <span className="op-chip">
                    Usually {trail.typicalDays === 1 ? "a day hike" : `${trail.typicalDays} days`}
                  </span>
                </div>
                <p className="op-preview-place" style={{ marginTop: 0 }}>
                  <MapPin size={14} aria-hidden="true" />
                  {trail.location}
                </p>
                <p>{trail.description}</p>
                <button type="button" className="op-btn primary sm" onClick={() => navigate({ page: "new", trail: i })}>
                  <Plus size={16} aria-hidden="true" />
                  Plan this route
                </button>
              </div>
            </article>
          ))}
        </div>
      </main>
    </>
  );
}

// ── Portal ───────────────────────────────────────────────────────────────────────

export function OperatorPortal(props) {
  const { trips, route, navigate, toast } = props;
  const byId = (id) => trips.find((t) => t.id === id);
  let page;
  if (route.page === "expeditions") {
    page = <Expeditions trips={trips} navigate={navigate} initialTab={route.tab} onExport={props.onExport} />;
  } else if (route.page === "expedition") {
    page = <ExpeditionDetail {...props} trip={byId(route.id)} />;
  } else if (route.page === "new") {
    page = <ExpeditionForm key="new" {...props} initialTrail={route.trail} onSave={props.onSave} />;
  } else if (route.page === "edit") {
    const trip = byId(route.id);
    page = trip ? (
      <ExpeditionForm key={trip.id} {...props} trip={trip} onSave={props.onSave} />
    ) : (
      <ExpeditionDetail {...props} trip={null} />
    );
  } else if (route.page === "trails") {
    page = <Trails navigate={navigate} />;
  } else {
    page = <Overview {...props} />;
  }

  return (
    <Shell
      user={props.user}
      mode={props.mode}
      route={route}
      navigate={navigate}
      tripCount={trips.length}
      onLogout={props.onLogout}
      onDiscover={props.onDiscover}
    >
      {page}
      {toast && (
        <div className="op-toast" role="status">
          <Check size={18} aria-hidden="true" />
          {toast}
        </div>
      )}
    </Shell>
  );
}
