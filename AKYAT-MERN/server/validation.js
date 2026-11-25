export function validateTrip(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("A trip object is required.");
  const trip = {};
  for (const [key, max] of [
    ["title", 100],
    ["meeting", 160],
    ["notes", 2000],
  ]) {
    if (
      typeof input[key] !== "string" ||
      input[key].trim().length > max ||
      (key !== "notes" && !input[key].trim())
    )
      throw new Error(`Enter a valid ${key} (maximum ${max} characters).`);
    trip[key] = input[key].trim();
  }
  for (const [key, min, max] of [
    ["trail", 0, 3],
    ["capacity", 1, 500],
    ["booked", 0, 500],
    ["price", 0, 1000000],
  ]) {
    const value = input[key];
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < min ||
      value > max ||
      (key !== "price" && !Number.isInteger(value))
    )
      throw new Error(`Enter a valid ${key} between ${min} and ${max}.`);
    trip[key] = value;
  }
  if (trip.booked > trip.capacity) throw new Error("Reserved seats cannot exceed group capacity.");
  if (
    typeof input.date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(input.date) ||
    !Number.isFinite(Date.parse(input.date)) ||
    new Date(input.date).toISOString().slice(0, 10) !== input.date
  )
    throw new Error("Enter a valid departure date.");
  if (!["Draft", "Open", "Cancelled"].includes(input.status))
    throw new Error("Choose a valid trip status.");
  if (!["Day hike", "2 days / 1 night", "3 days / 2 nights"].includes(input.duration))
    throw new Error("Choose a valid duration.");
  return { ...trip, date: input.date, status: input.status, duration: input.duration };
}

export const MAX_PARTY = 10;

/** A hiker's booking request: which trip, and the full name of everyone climbing. */
export function validateBooking(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("A booking object is required.");
  if (typeof input.tripId !== "string" || !/^[a-f0-9]{24}$/.test(input.tripId))
    throw new Error("Choose a trip to book.");
  if (!Array.isArray(input.hikers) || input.hikers.length < 1 || input.hikers.length > MAX_PARTY)
    throw new Error(`Book between 1 and ${MAX_PARTY} hikers at a time.`);
  const hikers = input.hikers.map((name) => (typeof name === "string" ? name.trim().replace(/\s+/g, " ") : ""));
  if (hikers.some((name) => !name || name.length > 80))
    throw new Error("Enter each hiker's full name (up to 80 characters).");
  return { tripId: input.tripId, hikers, seats: hikers.length };
}

const DURATION_DAYS = { "Day hike": 1, "2 days / 1 night": 2, "3 days / 2 nights": 3 };

/** YYYY-MM-DD plus some days. */
export const addDays = (date, days) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);

/** Last day of a trip, from its start date and duration. */
export const tripEndDate = (date, duration) => addDays(date, (DURATION_DAYS[duration] ?? 1) - 1);

/** Today in Manila, as YYYY-MM-DD. */
export const manilaToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
