import React, { useState } from "react";
import {
  ArrowLeft,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Check,
  LogOut,
  MapPin,
  Minus,
  Mountain,
  Plus,
  ShieldCheck,
  Ticket,
  Users,
} from "lucide-react";
import { MAX_PARTY } from "../server/validation.js";
import {
  currency,
  dateLabel,
  dateRange,
  endDate,
  plural,
  todayISO,
  trails,
  tripLength,
} from "./data";
import { Dialog, Difficulty, EmptyState, Masl, Pill, trailName } from "./Operator";
import "./hiker.css";

// The hiker side, laid out like the capstone's (site) pages: a trail page with its
// departures, the "Who's climbing" checkout, My bookings, and one booking.

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const isRealId = (id) => /^[a-f0-9]{24}$/.test(id);

/** How a booking reads to the hiker. */
export function bookingState(booking, today = todayISO()) {
  if (booking.status === "Cancelled")
    return booking.cancelledBy === "operator"
      ? { label: "Cancelled by operator", tone: "danger" }
      : { label: "Cancelled", tone: "neutral" };
  if (booking.trip && endDate(booking.trip) < today) return { label: "Completed", tone: "neutral" };
  return { label: "Confirmed", tone: "success" };
}

export function SiteHeader({ user, onHome, onOperator, onSignIn, onBookings }) {
  return (
    <header className="discover-header">
      <div className="discover-header-inner">
        <button type="button" className="discover-brand hk-brand" onClick={onHome}>
          <span>
            <Mountain size={22} aria-hidden="true" />
          </span>
          AkyatPH
        </button>
        <nav aria-label="Site navigation">
          <button type="button" className="hk-nav-hide" onClick={onHome}>
            Discover
          </button>
          {user?.role !== "hiker" && (
            <button type="button" onClick={onOperator}>
              For operators
            </button>
          )}
          {!user && (
            <button type="button" className="discover-sign-in" onClick={onSignIn}>
              Sign in
            </button>
          )}
          {user?.role === "hiker" && (
            <button type="button" className="discover-sign-in" onClick={onBookings}>
              My bookings
            </button>
          )}
          {user?.role === "operator" && (
            <button type="button" className="discover-sign-in" onClick={onOperator}>
              Operator portal
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="discover-footer">
      AkyatPH <span>Guided climbs in the Philippines</span>
    </footer>
  );
}

function TripPill({ trip }) {
  const left = trip.capacity - trip.booked;
  return left > 0 ? <Pill tone="success">{left} left</Pill> : <Pill tone="warning">Full</Pill>;
}

// ── Trail page (capstone: (site)/trails/[slug]) ───────────────────────────────────

export function TrailPage({ header, trailIndex, trips, user, demo, onBook }) {
  const trail = trails[trailIndex];
  const today = todayISO();
  const departures = trips
    .filter((t) => t.trail === trailIndex && t.status === "Open" && endDate(t) >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const firstOpen = departures.find((t) => t.booked < t.capacity && t.date > today);
  const [selectedId, setSelectedId] = useState(firstOpen?.id ?? null);
  const trip = departures.find((t) => t.id === selectedId) ?? null;
  const seatsLeft = trip ? trip.capacity - trip.booked : 0;
  const bookable = trip && seatsLeft > 0 && trip.date > today && isRealId(trip.id);
  const blocked = user?.role === "operator";

  const priceBlock = (
    <div>
      <p className="op-eyebrow">{trip ? dateRange(trip.date, endDate(trip)) : "Price"}</p>
      {trip ? (
        <>
          <p className="hk-price">
            {currency(trip.price)} <span>/ person</span>
          </p>
          <p className="hk-muted">{seatsLeft > 0 ? `${plural(seatsLeft, "seat")} left` : "This trip is full"}</p>
        </>
      ) : (
        <p className="hk-muted hk-strong">{departures.length ? "Choose a departure" : "No open trips yet"}</p>
      )}
    </div>
  );
  const bookButton = (
    <button
      type="button"
      className="op-btn accent hk-book-btn"
      disabled={!bookable || blocked}
      onClick={() => onBook(trip)}
    >
      <CalendarCheck size={16} aria-hidden="true" />
      Book this trip
    </button>
  );

  return (
    <div className="hk-page">
      {header}
      <main>
        <section className="hk-hero">
          <img src={`/trails/${trail.image}`} alt={trailName(trail)} />
          <div className="hk-hero-scrim" />
          <div className="hk-hero-inner">
            <span className="hk-hero-tag">
              {trail.typicalDays === 1 ? "Day hike" : `${trail.typicalDays}-day climb`}
            </span>
            <h1>{trailName(trail)}</h1>
            <p>
              <MapPin size={16} aria-hidden="true" />
              {trail.location} · {trail.masl.toLocaleString("en-PH")} MASL
            </p>
          </div>
        </section>

        <div className="hk-wrap hk-grid">
          <div className="hk-column">
            <dl className="hk-stats">
              <div>
                <dt>Difficulty</dt>
                <dd>
                  <Difficulty level={trail.level} />
                </dd>
              </div>
              <div>
                <dt>Elevation</dt>
                <dd>{trail.masl.toLocaleString("en-PH")} MASL</dd>
              </div>
              <div>
                <dt>Duration</dt>
                <dd>{trail.typicalDays === 1 ? "Day hike" : `${trail.typicalDays} days`}</dd>
              </div>
            </dl>

            <section className="op-card pad">
              <h2 className="hk-h2">About this trail</h2>
              <p className="hk-body">{trail.description}</p>
            </section>

            <section>
              <div className="hk-section-head">
                <h2 className="hk-h2 lg">Choose a departure</h2>
                {departures.length > 0 && (
                  <span className="hk-accent">{plural(departures.length, "departure")}</span>
                )}
              </div>
              {demo && (
                <p className="op-notice" style={{ marginTop: 16 }}>
                  These are sample departures. Start the API server to see and book real trips.
                </p>
              )}
              {departures.length === 0 ? (
                <div className="hk-none">
                  <span className="op-section-icon">
                    <CalendarClock size={20} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="hk-strong">No departures open yet</p>
                    <p className="hk-muted">Operators add new dates often. Check back soon.</p>
                  </div>
                </div>
              ) : (
                <div role="radiogroup" aria-label="Departures" className="hk-departures">
                  {departures.map((t) => {
                    const [, month, day] = t.date.split("-").map(Number);
                    const full = t.booked >= t.capacity;
                    const closed = t.date <= today;
                    const selected = t.id === selectedId;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={full || closed}
                        className={`hk-departure ${selected ? "selected" : ""}`}
                        onClick={() => setSelectedId(t.id)}
                      >
                        <span className="hk-date-tile">
                          <span>{MONTH_SHORT[month - 1]}</span>
                          <strong>{day}</strong>
                        </span>
                        <span className="hk-departure-text">
                          <strong className={full ? "full" : ""}>{t.title}</strong>
                          <span>
                            {t.operator} · {tripLength(t)}
                            {closed ? " · Booking closed" : ""}
                          </span>
                        </span>
                        <span className="hk-departure-side">
                          <TripPill trip={t} />
                          <strong>{currency(t.price)}</strong>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {trip && (
              <section className="op-card pad">
                <div className="hk-operator">
                  <div>
                    <p className="hk-operator-name">{trip.operator}</p>
                    <p className="hk-muted">Tour operator for this trip</p>
                  </div>
                  <span className="hk-chip">
                    <Users size={14} aria-hidden="true" />
                    {trip.booked} of {trip.capacity} booked
                  </span>
                </div>
                <p className="hk-meeting">
                  <MapPin size={16} aria-hidden="true" />
                  <span>
                    <strong>{trip.meeting}</strong>
                    <span>Meet on {dateLabel(trip.date)}</span>
                  </span>
                </p>
                {trip.notes && (
                  <>
                    <h3 className="hk-h3">What to know</h3>
                    <p className="hk-body">{trip.notes}</p>
                  </>
                )}
              </section>
            )}
          </div>

          <aside className="hk-aside">
            <div className="op-card hk-book-card">
              {priceBlock}
              {bookButton}
              {blocked ? (
                <p className="hk-fine">Operator accounts can't book. Sign in with a hiker account to book a seat.</p>
              ) : (
                <p className="hk-fine">
                  <ShieldCheck size={16} aria-hidden="true" />
                  Your seats are held the moment you book, and a trip can never be overbooked. No payment is taken in
                  this activity.
                </p>
              )}
            </div>
          </aside>
        </div>
      </main>
      <div className="hk-bottom-bar">
        <div>{priceBlock}</div>
        {bookButton}
      </div>
      <SiteFooter />
    </div>
  );
}

// ── Checkout (capstone: (site)/book/[expeditionId]) ───────────────────────────────

export function BookPage({ header, trip, user, busy, error, onSubmit, onBack }) {
  const today = todayISO();
  const seatsLeft = trip ? trip.capacity - trip.booked : 0;
  const most = Math.max(1, Math.min(MAX_PARTY, seatsLeft));
  const [names, setNames] = useState([user?.name ?? ""]);
  if (!trip || trip.date <= today || seatsLeft <= 0) {
    return (
      <div className="hk-page">
        {header}
        <main className="hk-wrap narrow">
          <EmptyState
            title={!trip ? "This trip isn't open for booking" : seatsLeft <= 0 ? "This trip is full" : "Booking has closed"}
            action={
              <button type="button" className="op-btn secondary sm" onClick={onBack}>
                Back to the trail
              </button>
            }
          >
            Choose another departure on the trail page.
          </EmptyState>
        </main>
      </div>
    );
  }
  const trail = trails[trip.trail];
  const setCount = (count) =>
    setNames((current) => (count > current.length ? [...current, ...Array(count - current.length).fill("")] : current.slice(0, count)));

  return (
    <div className="hk-page">
      {header}
      <main className="hk-wrap">
        <button type="button" className="hk-back" onClick={onBack}>
          <ArrowLeft size={16} aria-hidden="true" />
          {trailName(trail)}
        </button>
        <form
          className="hk-grid checkout"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(trip, names);
          }}
        >
          <div className="hk-column">
            <div>
              <p className="op-eyebrow">Book {trip.title}</p>
              <h1 className="hk-h1">Who&apos;s climbing</h1>
            </div>
            <section className="op-card pad">
              <div className="hk-section-head">
                <h2 className="hk-h2">Hikers in your party</h2>
                <div className="hk-stepper" role="group" aria-label="Number of hikers">
                  <button
                    type="button"
                    aria-label="One fewer hiker"
                    disabled={names.length <= 1}
                    onClick={() => setCount(names.length - 1)}
                  >
                    <Minus size={16} aria-hidden="true" />
                  </button>
                  <output aria-live="polite">{names.length}</output>
                  <button
                    type="button"
                    aria-label="One more hiker"
                    disabled={names.length >= most}
                    onClick={() => setCount(names.length + 1)}
                  >
                    <Plus size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
              <p className="hk-muted" style={{ marginTop: 4 }}>
                {plural(seatsLeft, "seat")} left on this trip. Up to {MAX_PARTY} hikers per booking.
              </p>
              <div className="hk-hikers">
                {names.map((name, i) => (
                  <div key={i} className="op-field">
                    <label htmlFor={`hiker-${i}`}>
                      Hiker {i + 1}
                      {i === 0 ? " · you" : ""}
                    </label>
                    <input
                      id={`hiker-${i}`}
                      className="op-input"
                      required
                      maxLength={80}
                      autoComplete={i === 0 ? "name" : "off"}
                      placeholder="Full name (as on ID)"
                      value={name}
                      onChange={(event) =>
                        setNames((current) => current.map((n, j) => (j === i ? event.target.value : n)))
                      }
                    />
                  </div>
                ))}
              </div>
              <p className="hk-fine" style={{ marginTop: 16 }}>
                Use names as they appear on an ID. Your operator lists them on the trip manifest.
              </p>
            </section>
          </div>

          <aside className="hk-column">
            <section className="op-card" style={{ overflow: "hidden" }}>
              <img className="hk-summary-photo" src={`/trails/${trail.image}`} alt="" />
              <div className="hk-summary">
                <h2 className="hk-h2">{trip.title}</h2>
                <p className="hk-muted">
                  <CalendarDays size={15} aria-hidden="true" />
                  {dateRange(trip.date, endDate(trip))} · {tripLength(trip)}
                </p>
                <p className="hk-muted">
                  <MapPin size={15} aria-hidden="true" />
                  {trip.meeting}
                </p>
                <p className="hk-muted">
                  <Mountain size={15} aria-hidden="true" />
                  {trip.operator}
                </p>
              </div>
            </section>
            <section className="op-card pad">
              <h2 className="hk-h3" style={{ marginTop: 0 }}>
                Fare
              </h2>
              <dl className="op-facts">
                <div>
                  <dt>
                    {currency(trip.price)} × {plural(names.length, "hiker")}
                  </dt>
                  <dd>{currency(trip.price * names.length)}</dd>
                </div>
                <div className="total">
                  <dt>
                    <strong className="hk-strong">Total</strong>
                  </dt>
                  <dd className="hk-total">{currency(trip.price * names.length)}</dd>
                </div>
              </dl>
              <p className="op-small">No payment is taken in this classroom activity.</p>
              {error && (
                <p className="op-form-error" role="alert">
                  {error}
                </p>
              )}
              <button type="submit" className="op-btn accent hk-book-btn" style={{ marginTop: 16 }} disabled={busy}>
                <Ticket size={16} aria-hidden="true" />
                {busy ? "Booking…" : `Confirm ${plural(names.length, "seat")}`}
              </button>
            </section>
          </aside>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}

// ── My bookings (capstone: (site)/bookings) ─────────────────────────────────────────

function BookingCard({ booking, onOpen, today }) {
  const trip = booking.trip;
  const trail = trip ? trails[trip.trail] : null;
  const state = bookingState(booking, today);
  return (
    <li>
      <button type="button" className="hk-booking" onClick={() => onOpen(booking)}>
        {trail ? (
          <img src={`/trails/${trail.image}`} alt="" />
        ) : (
          <span className="hk-booking-placeholder">
            <Mountain size={28} aria-hidden="true" />
          </span>
        )}
        <span className="hk-booking-text">
          <span className="op-eyebrow">{trail ? trailName(trail) : "Removed trip"}</span>
          <strong>{trip?.title ?? "This trip was removed by its operator"}</strong>
          <span className="hk-muted">
            {trip ? `${dateRange(trip.date, endDate(trip))} · ` : ""}
            {plural(booking.seats, "hiker")} · {booking.reference}
          </span>
        </span>
        <span className="hk-booking-side">
          <Pill tone={state.tone}>{state.label}</Pill>
          <strong>{currency(booking.total)}</strong>
        </span>
      </button>
    </li>
  );
}

export function MyBookings({ header, user, bookings, loading, onOpen, onFind, onLogout }) {
  const today = todayISO();
  const upcoming = bookings.filter((b) => bookingState(b, today).label === "Confirmed");
  const rest = bookings.filter((b) => bookingState(b, today).label !== "Confirmed");
  return (
    <div className="hk-page">
      {header}
      <main className="hk-wrap narrow">
        <div className="hk-page-head">
          <div>
            <h1 className="hk-h1">My bookings</h1>
            <p className="hk-muted">Signed in as {user.name}. Your trips with AkyatPH operators.</p>
          </div>
          <button type="button" className="op-btn secondary sm" onClick={onLogout}>
            <LogOut size={16} aria-hidden="true" />
            Sign out
          </button>
        </div>
        {bookings.length === 0 ? (
          <EmptyState
            title={loading ? "Loading your bookings…" : "No bookings yet"}
            action={
              !loading && (
                <button type="button" className="op-btn primary sm" onClick={onFind}>
                  Find a trail
                </button>
              )
            }
          >
            {!loading && "Find a trail and book a seat with a tour operator."}
          </EmptyState>
        ) : (
          <>
            <section>
              <h2 className="hk-h2">Upcoming</h2>
              {upcoming.length ? (
                <ul className="hk-bookings">
                  {upcoming.map((b) => (
                    <BookingCard key={b.id} booking={b} onOpen={onOpen} today={today} />
                  ))}
                </ul>
              ) : (
                <p className="hk-muted" style={{ marginTop: 8 }}>
                  No upcoming trips.{" "}
                  <button type="button" className="hk-link" onClick={onFind}>
                    Find a trail
                  </button>
                </p>
              )}
            </section>
            {rest.length > 0 && (
              <section>
                <h2 className="hk-h2">Past and cancelled</h2>
                <ul className="hk-bookings">
                  {rest.map((b) => (
                    <BookingCard key={b.id} booking={b} onOpen={onOpen} today={today} />
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

// ── One booking (capstone: (site)/bookings/[id]) ────────────────────────────────────

export function BookingDetail({ header, booking, busy, error, clearError, onCancel, onBack }) {
  const [confirm, setConfirm] = useState(false);
  const today = todayISO();
  if (booking === undefined) return <div className="hk-page">{header}</div>;
  if (!booking) {
    return (
      <div className="hk-page">
        {header}
        <main className="hk-wrap narrow">
          <EmptyState
            title="Booking not found"
            action={
              <button type="button" className="op-btn secondary sm" onClick={onBack}>
                My bookings
              </button>
            }
          />
        </main>
      </div>
    );
  }
  const trip = booking.trip;
  const trail = trip ? trails[trip.trail] : null;
  const state = bookingState(booking, today);
  const cancellable = booking.status === "Confirmed" && trip && trip.date > today;

  return (
    <div className="hk-page">
      {header}
      <main className="hk-wrap">
        <button type="button" className="hk-back" onClick={onBack}>
          <ArrowLeft size={16} aria-hidden="true" />
          My bookings
        </button>
        <div className="hk-page-head">
          <div>
            <p className="op-eyebrow">Booking {booking.reference}</p>
            <div className="op-title-row" style={{ marginTop: 4 }}>
              <h1 className="hk-h1">{trip?.title ?? "Removed trip"}</h1>
              <Pill tone={state.tone}>{state.label}</Pill>
            </div>
            {trip && (
              <p className="hk-muted hk-meta">
                <span>
                  <CalendarDays size={15} aria-hidden="true" />
                  {dateRange(trip.date, endDate(trip))} · {tripLength(trip)}
                </span>
                <span>
                  <MapPin size={15} aria-hidden="true" />
                  {trailName(trail)} · {trail.location}
                </span>
              </p>
            )}
          </div>
          {cancellable && (
            <button
              type="button"
              className="op-btn danger"
              onClick={() => {
                clearError();
                setConfirm(true);
              }}
            >
              Cancel booking
            </button>
          )}
        </div>

        {state.label === "Confirmed" && (
          <div className="hk-confirmed">
            <Check size={20} aria-hidden="true" />
            <p>
              Your {plural(booking.seats, "seat")} {booking.seats === 1 ? "is" : "are"} held. {trip.operator} sees you on
              the trip manifest.
            </p>
          </div>
        )}
        {booking.cancelledBy === "operator" && (
          <p className="op-notice">The operator cancelled this trip, so your booking was cancelled too.</p>
        )}
        {!trip && <p className="op-notice neutral">The operator removed this trip after it was cancelled.</p>}

        <div className="hk-grid detail">
          <div className="hk-column">
            <section className="op-card pad">
              <h2 className="hk-h2">Your party</h2>
              <ol className="hk-party">
                {booking.hikers.map((name, i) => (
                  <li key={i}>
                    <span className="op-avatar soft">{i + 1}</span>
                    {name}
                  </li>
                ))}
              </ol>
            </section>
            {trail && (
              <section className="op-card">
                <img className="op-trail-photo" src={`/trails/${trail.image}`} alt={trailName(trail)} />
                <div className="op-trail-body">
                  <h2>{trailName(trail)}</h2>
                  <div className="op-chips">
                    <Masl masl={trail.masl} variant="lg" />
                    <Difficulty level={trail.level} />
                  </div>
                  <p>{trail.description}</p>
                  {trip?.notes && (
                    <div className="op-notes">
                      <p className="op-eyebrow">From your operator</p>
                      <p>{trip.notes}</p>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
          <aside className="hk-column">
            {trip && (
              <section className="op-card pad">
                <p className="op-eyebrow">Meeting point</p>
                <p className="op-strong-line">{trip.meeting}</p>
                <p className="hk-muted">Meet on {dateLabel(trip.date)}</p>
              </section>
            )}
            {trip && (
              <section className="op-card pad">
                <p className="op-eyebrow">Tour operator</p>
                <p className="op-strong-line">{trip.operator}</p>
              </section>
            )}
            <section className="op-card pad">
              <p className="op-eyebrow">Fare</p>
              <dl className="op-facts">
                <div>
                  <dt>
                    {currency(booking.pricePerSeat)} × {plural(booking.seats, "hiker")}
                  </dt>
                  <dd>{currency(booking.total)}</dd>
                </div>
                <div className="total">
                  <dt>Total</dt>
                  <dd>{currency(booking.total)}</dd>
                </div>
              </dl>
              <p className="op-small">No payment is taken in this classroom activity.</p>
            </section>
          </aside>
        </div>
      </main>
      <SiteFooter />

      {confirm && (
        <Dialog
          title="Cancel this booking?"
          busy={busy}
          onClose={() => setConfirm(false)}
          footer={
            <>
              <button type="button" className="op-btn secondary" disabled={busy} onClick={() => setConfirm(false)}>
                Keep my booking
              </button>
              <button
                type="button"
                className="op-btn danger-solid"
                disabled={busy}
                onClick={async () => {
                  if (await onCancel(booking)) setConfirm(false);
                }}
              >
                {busy ? "Cancelling…" : "Cancel booking"}
              </button>
            </>
          }
        >
          <p>
            Your {plural(booking.seats, "seat")} on <strong>{trip?.title}</strong> will be released for other hikers.
            This can&apos;t be undone.
          </p>
          {error && (
            <p className="op-form-error" role="alert" style={{ marginTop: 0 }}>
              {error}
            </p>
          )}
        </Dialog>
      )}
    </div>
  );
}
