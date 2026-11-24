import React, { useState } from "react";
import {
  CalendarDays,
  Compass,
  Download,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { trails, currency, dateLabel, tripStatus } from "./data";

export function WorkspaceContent({
  page,
  navigate,
  trips,
  filtered,
  filter,
  setFilter,
  query,
  setQuery,
  sort,
  setSort,
  open,
  exportTrips,
  mode,
}) {
  const [selectedId, setSelectedId] = useState(null);
  const selected = filtered.find((t) => t.id === selectedId) || filtered[0] || null;
  const current = new Date();
  const today = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
  const upcoming = trips.filter((t) => t.date >= today && t.status !== "Cancelled");
  const openSeats = upcoming.reduce(
    (sum, t) => sum + (t.status === "Open" ? t.capacity - t.booked : 0),
    0,
  );
  const groups = Object.groupBy(filtered, (t) =>
    new Date(t.date + "T12:00:00").toLocaleDateString("en-PH", { month: "long", year: "numeric" }),
  );
  return (
    <>
      <div className="work-nav" role="navigation" aria-label="Workspace sections">
        {["Overview", "Explore trails"].map((label) => (
          <button
            key={label}
            className={page === label ? "current" : ""}
            onClick={() => navigate(label)}
            aria-current={page === label ? "page" : undefined}
          >
            {label === "Overview" ? "Schedule" : "Trail library"}
          </button>
        ))}
      </div>
      {page === "Explore trails" ? (
        <section className="library-layout" aria-label="Trail library">
          <div className="library-intro">
            <p>CORDILLERA ROUTES</p>
            <h2>Choose the ground before the date.</h2>
            <span>Four routes available in this activity. Select one to prefill a new trip.</span>
          </div>
          <div className="library-grid">
            {trails.map((trail, i) => (
              <article className="library-item" key={i}>
                <img src={"/trails/" + trail.image} alt={`${trail.name}, ${trail.route}`} />
                <div>
                  <span className="route-index">{String(i + 1).padStart(2, "0")} / 04</span>
                  <h3>{trail.name}</h3>
                  <p>
                    {trail.route} · {trail.location}
                  </p>
                  <p>{trail.description}</p>
                  <div className="library-meta">
                    <span>{trail.elevation} m elevation</span>
                    <span>{trail.difficulty}</span>
                  </div>
                  <button
                    className="button primary"
                    onClick={() => open({ type: "create", trail: i })}
                  >
                    <Plus size={17} />
                    Plan this route
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <div className="operations-layout">
          <section className="operations-list" aria-label="Trips">
            <div className="operations-summary">
              <div>
                <span>UPCOMING DEPARTURES</span>
                <strong>{upcoming.length}</strong>
              </div>
              <div>
                <span>OPEN SEATS</span>
                <strong>{openSeats}</strong>
              </div>
              <div>
                <span>DRAFTS TO FINISH</span>
                <strong>{trips.filter((t) => t.status === "Draft").length}</strong>
              </div>
            </div>
            <div className="operations-controls">
              <label>
                <Search size={18} />
                <input
                  aria-label="Search trips"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find a trip or mountain"
                />
              </label>
              <select
                aria-label="Sort trips"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="date">Departure date</option>
                <option value="price">Price: low to high</option>
              </select>
              <button onClick={exportTrips} aria-label="Export trips to CSV" title="Export CSV">
                <Download size={18} />
              </button>
            </div>
            <div className="operations-filters" aria-label="Filter trips">
              {["All trips", "Open", "Full", "Draft", "Cancelled"].map((value) => (
                <button
                  key={value}
                  className={filter === value ? "current" : ""}
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                >
                  {value}
                </button>
              ))}
            </div>
            <div className="records">
              <div className="records-caption">
                <span>
                  {filtered.length} {filtered.length === 1 ? "trip" : "trips"}
                </span>
                <span>{mode === "demo" ? "Sample data in this browser" : "MongoDB records"}</span>
              </div>
              {Object.entries(groups).map(([month, items]) => (
                <section key={month} className="month-group">
                  <h2>{month}</h2>
                  {items.map((trip) => {
                    const trail = trails[trip.trail];
                    return (
                      <button
                        className={"trip-row " + (selected?.id === trip.id ? "is-selected" : "")}
                        key={trip.id}
                        onClick={() => setSelectedId(trip.id)}
                        aria-pressed={selected?.id === trip.id}
                      >
                        <span className="date-block">
                          <strong>{new Date(trip.date + "T12:00:00").getDate()}</strong>
                          <small>
                            {new Date(trip.date + "T12:00:00").toLocaleDateString("en-PH", {
                              weekday: "short",
                            })}
                          </small>
                        </span>
                        <span className="row-main">
                          <strong>{trip.title}</strong>
                          <small>
                            {trail.name} · {trail.route}
                          </small>
                        </span>
                        <span className="row-side">
                          <strong>{tripStatus(trip)}</strong>
                          <small>
                            {trip.booked}/{trip.capacity} hikers
                          </small>
                        </span>
                      </button>
                    );
                  })}
                </section>
              ))}
              {filtered.length === 0 && (
                <div className="records-empty">
                  <Compass size={30} />
                  <h2>No matching trips</h2>
                  <p>Change the search or status filter to see more trips.</p>
                  <button
                    className="button secondary"
                    onClick={() => {
                      setQuery("");
                      setFilter("All trips");
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </section>
          <aside className="trip-inspector" aria-label="Selected trip">
            {selected ? (
              <>
                <div className="inspector-photo">
                  <img
                    src={"/trails/" + trails[selected.trail].image}
                    alt={`${trails[selected.trail].name} landscape`}
                  />
                  <span>{trails[selected.trail].name}</span>
                </div>
                <div className="inspector-content">
                  <div className="inspector-top">
                    <span>SELECTED TRIP</span>
                    <span className={"state-label " + tripStatus(selected).toLowerCase()}>
                      {tripStatus(selected)}
                    </span>
                  </div>
                  <h2>{selected.title}</h2>
                  <p className="inspector-route">
                    <MapPin size={17} />
                    {trails[selected.trail].route}, {trails[selected.trail].location}
                  </p>
                  <dl>
                    <div>
                      <dt>Departure</dt>
                      <dd>{dateLabel(selected.date)}</dd>
                    </div>
                    <div>
                      <dt>Duration</dt>
                      <dd>{selected.duration}</dd>
                    </div>
                    <div>
                      <dt>Price / hiker</dt>
                      <dd>{currency(selected.price)}</dd>
                    </div>
                    <div>
                      <dt>Group</dt>
                      <dd>
                        {selected.booked} of {selected.capacity} reserved
                      </dd>
                    </div>
                  </dl>
                  <div className="inspector-section">
                    <h3>Meeting point</h3>
                    <p>{selected.meeting}</p>
                  </div>
                  <div className="inspector-section">
                    <h3>Operator notes</h3>
                    <p>{selected.notes || "No notes added yet."}</p>
                  </div>
                  <div className="inspector-actions">
                    <button
                      className="button primary"
                      onClick={() => open({ type: "edit", trip: selected })}
                    >
                      <Pencil size={16} />
                      Edit trip
                    </button>
                    <button
                      className="button secondary"
                      onClick={() => open({ type: "detail", trip: selected })}
                    >
                      Full details
                    </button>
                  </div>
                  <button
                    className="inspector-delete"
                    onClick={() => open({ type: "delete", trip: selected })}
                  >
                    <Trash2 size={15} />
                    Delete trip
                  </button>
                </div>
              </>
            ) : (
              <div className="inspector-blank">
                <CalendarDays size={28} />
                <h2>Select a trip</h2>
                <p>Choose a departure from the schedule to inspect its details.</p>
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
