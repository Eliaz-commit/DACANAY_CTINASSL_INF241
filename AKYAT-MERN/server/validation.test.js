import test from "node:test";
import assert from "node:assert/strict";
import { validateTrip } from "./validation.js";
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
