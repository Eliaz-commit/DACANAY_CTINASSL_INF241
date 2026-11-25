import test from "node:test";
import assert from "node:assert/strict";
import { tripEndDate, validateBooking, validateTrip } from "./validation.js";
const valid = {
  title: " Test trip ",
  trail: 0,
  date: "2026-12-12",
  duration: "Day hike",
  price: 1000,
  capacity: 10,
  booked: 3,
  status: "Draft",
  meeting: " Baguio ",
  notes: "",
};
test("normalizes text and discards unexpected database operators", () => {
  const result = validateTrip({ ...valid, $set: { price: 0 } });
  assert.equal(result.title, "Test trip");
  assert.equal(result.meeting, "Baguio");
  assert.equal(result.$set, undefined);
});
test("rejects impossible capacity, invalid dates, and malformed fields", () => {
  for (const patch of [
    { booked: 11 },
    { capacity: 0 },
    { capacity: 2.5 },
    { price: -1 },
    { price: "100" },
    { trail: 4 },
    { status: "Full" },
    { date: "2026-02-30" },
    { title: " " },
    { meeting: "" },
    { notes: undefined },
  ])
    assert.throws(() => validateTrip({ ...valid, ...patch }));
});
test("allows empty notes and a completely full group", () =>
  assert.equal(validateTrip({ ...valid, booked: 10 }).booked, 10));

const tripId = "6b06e29ea3d332f1baad740d";
test("a booking names every hiker and counts the seats", () => {
  const result = validateBooking({ tripId, hikers: ["  Bea   Ramirez ", "Marco Dela Cruz"], seats: 99 });
  assert.deepEqual(result, { tripId, hikers: ["Bea Ramirez", "Marco Dela Cruz"], seats: 2 });
});
test("rejects bookings without a trip, names, or a sensible party size", () => {
  for (const input of [
    { tripId: "nope", hikers: ["Bea"] },
    { tripId: { $ne: null }, hikers: ["Bea"] },
    { tripId, hikers: [] },
    { tripId, hikers: ["Bea", " "] },
    { tripId, hikers: Array(11).fill("Bea") },
    { tripId, hikers: ["x".repeat(81)] },
    null,
  ])
    assert.throws(() => validateBooking(input));
});
test("a trip ends on its last day", () => {
  assert.equal(tripEndDate("2026-12-31", "2 days / 1 night"), "2027-01-01");
  assert.equal(tripEndDate("2026-12-05", "Day hike"), "2026-12-05");
});
