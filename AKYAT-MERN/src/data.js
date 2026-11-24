export const trails = [
  {
    name: "Mt. Pulag",
    route: "Ambangeg trail",
    location: "Benguet",
    difficulty: "Moderate",
    elevation: "2,926",
    image: "mt-pulag-ambangeg.jpg",
    description:
      "Walk above the clouds on Luzon’s highest peak. Mossy forests open into rolling grasslands and an unforgettable summit sunrise.",
  },
  {
    name: "Mt. Ulap",
    route: "Eco-trail traverse",
    location: "Itogon, Benguet",
    difficulty: "Easy",
    elevation: "1,846",
    image: "mt-ulap.jpg",
    description:
      "Follow pine-covered ridges through the Cordillera, with open grasslands, mountain views, and the iconic Gungal Rock.",
  },
  {
    name: "Mt. Ugo",
    route: "Kayapa–Itogon traverse",
    location: "Nueva Vizcaya",
    difficulty: "Challenging",
    elevation: "2,150",
    image: "mt-ugo-traverse.jpg",
    description:
      "A longer journey through quiet villages and pine forests, with an overnight camp beneath the Cordillera sky.",
  },
  {
    name: "Mt. Pulag",
    route: "Akiki trail",
    location: "Kabayan, Benguet",
    difficulty: "Challenging",
    elevation: "2,926",
    image: "mt-pulag-akiki.jpg",
    description:
      "A demanding ascent through steep pine slopes and mossy forest, rewarding experienced hikers with a high-altitude adventure.",
  },
];
export const seedTrips = [
  {
    id: "demo-1",
    title: "Pulag sunrise escape",
    trail: 0,
    date: "2026-12-05",
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
    date: "2026-12-12",
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
    date: "2026-12-19",
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
    date: "2027-01-09",
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
    date: "2027-01-17",
    duration: "Day hike",
    price: 1800,
    capacity: 18,
    booked: 4,
    status: "Open",
    meeting: "Baguio City bus terminal",
    notes: "A relaxed Sunday on the trail, with plenty of time for photographs.",
  },
];
export const currency = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
export const dateLabel = (value) =>
  new Date(value + "T12:00:00").toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
export const tripStatus = (trip) =>
  trip.status === "Open" && trip.booked >= trip.capacity ? "Full" : trip.status;
