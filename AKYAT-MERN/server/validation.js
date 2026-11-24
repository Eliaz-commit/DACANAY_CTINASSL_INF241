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
