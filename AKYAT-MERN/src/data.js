// Trail facts mirror the AKYAT PH capstone catalog (supabase/seeds/01_catalog.sql).
// Trips store the trail by its index in this list, so keep the order.
export const trails = [
  {
    name: "Mt. Pulag",
    route: "Ambangeg trail",
    location: "Bokod, Benguet",
    masl: 2922,
    level: 3,
    typicalDays: 2,
    image: "mt-pulag-ambangeg.jpg",
    description:
      "The gentlest route up Luzon’s highest peak: pine forest, then dwarf bamboo grassland and a sea of clouds at sunrise.",
  },
  {
    name: "Mt. Ulap",
    route: "Eco-trail traverse",
    location: "Itogon, Benguet",
    masl: 1846,
    level: 3,
    typicalDays: 1,
    image: "mt-ulap.jpg",
    description:
      "Grassland and pine ridges with views of the Cordilleras and old burial caves, a day hike about 40 minutes from Baguio.",
  },
  {
    name: "Mt. Ugo",
    route: "Kayapa–Itogon traverse",
    location: "Itogon, Benguet",
    masl: 2150,
    level: 5,
    typicalDays: 2,
    image: "mt-ugo-traverse.jpg",
    description:
      "Pine forest and ridgeline walking from Kayapa, Nueva Vizcaya, down to Brgy. Tinongdan in Itogon.",
  },
  {
    name: "Mt. Pulag",
    route: "Akiki trail",
    location: "Kabayan, Benguet",
    masl: 2922,
    level: 7,
    typicalDays: 3,
    image: "mt-pulag-akiki.jpg",
    description:
      "Nicknamed the “Killer Trail”: Eddet River, the pine slopes of Marlboro Country, then mossy forest before the summit grassland.",
  },
];

// ── Dates ── All dates are YYYY-MM-DD strings in Manila time, like the capstone.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Today in Manila, as YYYY-MM-DD. */
export const todayISO = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());

/** YYYY-MM-DD plus some days. */
export const addDays = (date, days) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);

/** Days from one YYYY-MM-DD date to another (0 when they are the same day). */
export const daysBetween = (from, to) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);

const daysFromToday = (days) => addDays(todayISO(), days);

export const seedTrips = [
  {
    id: "demo-1",
    title: "Pulag sunrise escape",
    trail: 0,
    date: daysFromToday(10),
    duration: "2 days / 1 night",
    price: 4500,
    capacity: 20,
    booked: 14,
    status: "Open",
    meeting: "Baguio City bus terminal",
    notes: "Includes guide, local transfers, and camping fees. Bring warm layers and a headlamp.",
  },
  {
    id: "demo-2",
    title: "A day above the pines",
    trail: 1,
    date: daysFromToday(17),
    duration: "Day hike",
    price: 1800,
    capacity: 15,
    booked: 15,
    status: "Open",
    meeting: "Baguio City bus terminal",
    notes:
      "An easy-paced ridge walk. Bring trail snacks, sun protection, and at least two liters of water.",
  },
  {
    id: "demo-3",
    title: "The Ugo weekend traverse",
    trail: 2,
    date: daysFromToday(24),
    duration: "2 days / 1 night",
    price: 3800,
    capacity: 12,
    booked: 7,
    status: "Open",
    meeting: "Kayapa municipal hall",
    notes: "Overnight camping trip for hikers with prior trekking experience.",
  },
  {
    id: "demo-4",
    title: "Pulag via the road less taken",
    trail: 3,
    date: daysFromToday(45),
    duration: "3 days / 2 nights",
    price: 5800,
    capacity: 10,
    booked: 0,
    status: "Draft",
    meeting: "Baguio City bus terminal",
    notes: "Final itinerary and guide assignments are being prepared.",
  },
  {
    id: "demo-5",
    title: "Ulap slow Sunday",
    trail: 1,
    date: daysFromToday(53),
    duration: "Day hike",
    price: 1800,
    capacity: 18,
    booked: 4,
    status: "Open",
    meeting: "Baguio City bus terminal",
    notes: "A relaxed Sunday on the trail, with plenty of time for photographs.",
  },
];
export const DURATIONS = ["Day hike", "2 days / 1 night", "3 days / 2 nights"];
const DURATION_DAYS = { "Day hike": 1, "2 days / 1 night": 2, "3 days / 2 nights": 3 };

/** Last day of a trip, from its start date and duration. */
export const endDate = (trip) => addDays(trip.date, (DURATION_DAYS[trip.duration] ?? 1) - 1);

/** "Day hike", or "2D1N" for a trip with nights. */
export const tripLength = (trip) => {
  const days = DURATION_DAYS[trip.duration] ?? 1;
  return days <= 1 ? "Day hike" : `${days}D${days - 1}N`;
};

const parts = (date) => {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month: MONTHS[month - 1], day };
};

/** "Oct 24, 2026" */
export const dateLabel = (date) => {
  const d = parts(date);
  return `${d.month} ${d.day}, ${d.year}`;
};

/** "Oct 24–25, 2026", "Oct 31 – Nov 1, 2026", or "Oct 24, 2026" for a day trip. */
export const dateRange = (start, end) => {
  if (start === end) return dateLabel(start);
  const a = parts(start);
  const b = parts(end);
  if (a.year !== b.year) return `${dateLabel(start)} – ${dateLabel(end)}`;
  if (a.month !== b.month) return `${a.month} ${a.day} – ${b.month} ${b.day}, ${b.year}`;
  return `${a.month} ${a.day}–${b.day}, ${b.year}`;
};

/** "₱4,500", or "₱4,500.50" when there are centavos. */
export const currency = (amount) => {
  const whole = Number.isInteger(amount);
  return `₱${Number(amount).toLocaleString("en-PH", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  })}`;
};

export const plural = (count, one, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

/** "Bea Ramirez" -> "BR" */
export const initials = (name) => {
  const words = String(name || "").trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? [words[0], words[words.length - 1]] : words;
  return letters.map((w) => w[0].toUpperCase()).join("") || "?";
};

/** Difficulty band of a 1–9 trail level, as the capstone groups them. */
export const difficultyBand = (level) => (level <= 3 ? "minor" : level <= 6 ? "moderate" : "major");

/**
 * The trip's state as the operator sees it. "Full" and "Completed" are worked out, not stored:
 * an open trip with no seats left is full, and one whose last day has passed is completed.
 */
export const tripStatus = (trip, today = todayISO()) => {
  if (trip.status === "Open" && endDate(trip) < today) return "Completed";
  if (trip.status === "Open" && trip.booked >= trip.capacity) return "Full";
  return trip.status;
};
