import React, { useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  ClipboardCheck,
  MapPin,
  Mountain,
  Search,
  ShieldCheck,
  Ticket,
  X,
} from "lucide-react";
import { trails, currency, dateLabel, tripStatus, todayISO } from "./data";
import "./discover.css";

const catalog = [
  {
    name: "Mt. Pulag via Ambangeg",
    location: "Bokod, Benguet",
    province: "Benguet",
    grade: "Minor 3/9",
    band: "minor",
    height: 2922,
    image: "mt-pulag-ambangeg.jpg",
    description:
      "The gentlest route up Luzon’s highest peak: pine forest, then dwarf bamboo, then a sea of clouds.",
    trail: 0,
  },
  {
    name: "Mt. Pulag via Akiki",
    location: "Kabayan, Benguet",
    province: "Benguet",
    grade: "Major 7/9",
    band: "major",
    height: 2922,
    image: "mt-pulag-akiki.jpg",
    description:
      "A steep, demanding approach through pine slopes and mossy forest to the Pulag summit.",
    trail: 3,
  },
  {
    name: "Mt. Ugo Traverse",
    location: "Itogon, Benguet",
    province: "Benguet",
    grade: "Moderate 5/9",
    band: "moderate",
    height: 2150,
    image: "mt-ugo-traverse.jpg",
    description:
      "Pine forest and ridgeline walking from Kayapa, Nueva Vizcaya, down toward Itogon.",
    trail: 2,
  },
  {
    name: "Mt. Ulap Eco-Trail",
    location: "Itogon, Benguet",
    province: "Benguet",
    grade: "Minor 3/9",
    band: "minor",
    height: 1846,
    image: "mt-ulap.jpg",
    description:
      "Grassland and pine ridges with views across the Cordilleras and old burial caves.",
    trail: 1,
  },
  {
    name: "Mt. Batulao via New Trail",
    location: "Nasugbu, Batangas",
    province: "Batangas",
    grade: "Moderate 4/9",
    band: "moderate",
    height: 811,
    image: null,
    description:
      "Open grassland ridges with wide views of Batangas, a day hike about two hours from Manila.",
    trail: null,
  },
  {
    name: "Mt. Daraitan",
    location: "Tanay, Rizal",
    province: "Rizal",
    grade: "Moderate 4/9",
    band: "moderate",
    height: 739,
    image: null,
    description:
      "Tropical forest and limestone outcrops above the Daraitan River, with Sierra Madre views.",
    trail: null,
  },
];
const heights = { low: [0, 1000], mid: [1000, 2000], high: [2000, Infinity] };
export function Discover({ header, trips, onOperator, onTrail }) {
  const [query, setQuery] = useState("");
  const [province, setProvince] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [height, setHeight] = useState("");
  const [selected, setSelected] = useState(null);
  const shown = catalog.filter(
    (t) =>
      (!query || `${t.name} ${t.location}`.toLowerCase().includes(query.toLowerCase())) &&
      (!province || t.province === province) &&
      (!difficulty || t.band === difficulty) &&
      (!height || (t.height >= heights[height][0] && t.height < heights[height][1])),
  );
  const today = todayISO();
  // Hikers only see open departures that haven't happened yet, soonest first.
  const upcomingFor = (index) =>
    trips
      .filter((t) => t.trail === index && t.status === "Open" && t.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date));
  const tripFor = (index) => upcomingFor(index)[0];
  return (
    <div className="discover-page">
      {header}
      <section className="discover-hero" id="top">
        <img
          src="/trails/mt-pulag-ambangeg.jpg"
          alt="Hikers looking across the cloud-covered ridges of Mt. Pulag"
        />
        <div className="discover-tint" />
        <div className="discover-hero-inner">
          <span className="discover-hero-tag">
            <BadgeCheck size={15} />
            GUIDED CLIMBS BY VERIFIED OPERATORS
          </span>
          <h1>
            Climb the Philippines
            <br />
            with confidence.
          </h1>
          <p>
            Find a summit, book a seat with a verified operator, and follow your permit from LGU
            endorsement to cleared, all in one place.
          </p>
        </div>
      </section>
      <main className="discover-main">
        <form
          className="discover-search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            document.getElementById("trails")?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          <div className="discover-fields">
            <label>
              <span>
                <MapPin size={15} />
                DESTINATION
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Where do you want to summit?"
              />
            </label>
            <label>
              <span>
                <MapPin size={15} />
                PROVINCE
              </span>
              <select value={province} onChange={(e) => setProvince(e.target.value)}>
                <option value="">Anywhere</option>
                <option>Benguet</option>
                <option>Batangas</option>
                <option>Rizal</option>
              </select>
            </label>
            <label>
              <span>
                <Mountain size={15} />
                DIFFICULTY
              </span>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                <option value="">All grades</option>
                <option value="minor">Minor 1–3</option>
                <option value="moderate">Moderate 4–6</option>
                <option value="major">Major 7–9</option>
              </select>
            </label>
            <button className="discover-find">
              <Search size={17} />
              Find trails
            </button>
          </div>
          <div className="discover-height">
            <span>Summit height:</span>
            {[
              ["low", "Under 1,000 m"],
              ["mid", "1,000–2,000 m"],
              ["high", "2,000 m+"],
            ].map(([key, label]) => (
              <button
                type="button"
                className={height === key ? "active" : ""}
                key={key}
                onClick={() => setHeight(height === key ? "" : key)}
                aria-pressed={height === key}
              >
                {label}
              </button>
            ))}
          </div>
        </form>
        <div className="discover-trust">
          {[
            [BadgeCheck, "Verified operators"],
            [ClipboardCheck, "Permit tracked live"],
            [Ticket, "Seats never overbooked"],
            [ShieldCheck, "Medical files kept private"],
          ].map(([Icon, label]) => (
            <div key={label}>
              <span>
                <Icon size={17} />
              </span>
              {label}
            </div>
          ))}
        </div>
        <section id="trails" className="discover-trails">
          <div className="discover-section-heading">
            <div>
              <span>TRAILS</span>
              <h2>Summits you can book</h2>
            </div>
            <p>
              Every trip is run by a tour operator AkyatPH has verified, with its permit tracked
              from LGU endorsement to cleared.
            </p>
          </div>
          <div className="discover-grid">
            {shown.map((t) => {
              const departure = tripFor(t.trail);
              return (
                <article key={t.name} className="discover-card">
                  <div className="discover-card-image">
                    {t.image ? (
                      <img src={"/trails/" + t.image} alt={`${t.name} landscape`} />
                    ) : (
                      <div
                        className="discover-card-placeholder"
                        aria-label="Trail image unavailable"
                      >
                        <Mountain size={48} />
                      </div>
                    )}
                    <span className="elevation">▲ {t.height.toLocaleString("en-PH")} MASL</span>
                    <span className={"difficulty " + t.band}>{t.grade.toUpperCase()}</span>
                    <strong>{t.location}</strong>
                  </div>
                  <div className="discover-card-body">
                    <h3>{t.name}</h3>
                    <p>{t.description}</p>
                    <div className="discover-card-footer">
                      <span>
                        <CalendarDays size={16} />
                        {departure ? dateLabel(departure.date) : "New dates soon"}
                      </span>
                      <button onClick={() => (t.trail == null ? setSelected(t) : onTrail(t.trail))}>
                        View trail <span aria-hidden="true">→</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          {!shown.length && (
            <div className="discover-empty">
              <h3>No trails match these filters</h3>
              <p>Try a different destination, grade, or summit height.</p>
              <button
                onClick={() => {
                  setQuery("");
                  setProvince("");
                  setDifficulty("");
                  setHeight("");
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </section>
        <div className="discover-operator">
          <div>
            <h2>Organising a climb?</h2>
            <p>Publish departures, watch bookings land, and keep every trip detail in the operator portal.</p>
          </div>
          <button onClick={onOperator}>Open the operator portal</button>
        </div>
      </main>
      <footer className="discover-footer">
        AkyatPH <span>Guided climbs in the Philippines</span>
      </footer>
      {selected && (
        <dialog className="discover-dialog" open aria-labelledby="trail-dialog-title">
          <div className="discover-dialog-shade" onClick={() => setSelected(null)} />
          <div className="discover-dialog-content">
            <button
              className="discover-close"
              onClick={() => setSelected(null)}
              aria-label="Close trail details"
            >
              <X size={20} />
            </button>
            {selected.image ? (
              <img src={"/trails/" + selected.image} alt="" />
            ) : (
              <div className="discover-dialog-placeholder">
                <Mountain size={50} />
              </div>
            )}
            <div>
              <span className="discover-dialog-grade">
                {selected.grade} · {selected.height.toLocaleString("en-PH")} MASL
              </span>
              <h2 id="trail-dialog-title">{selected.name}</h2>
              <p>
                <MapPin size={16} />
                {selected.location}
              </p>
              <p>{selected.description}</p>
              <h3>Scheduled trips</h3>
              {upcomingFor(selected.trail).map((t) => (
                  <button className="discover-departure" key={t.id} onClick={() => onTrail(t.trail)}>
                    <span>
                      <strong>{dateLabel(t.date)}</strong>
                      <small>
                        {t.title} · {tripStatus(t)}
                      </small>
                    </span>
                    <span>{currency(t.price)}</span>
                  </button>
                ))}
              {!tripFor(selected.trail) && <p>No open trips are scheduled yet.</p>}
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
