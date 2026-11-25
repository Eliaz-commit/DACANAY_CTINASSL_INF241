import express from "express";
import mongoose from "mongoose";
import { randomBytes } from "node:crypto";
import { addDays, manilaToday, tripEndDate, validateBooking, validateTrip } from "./validation.js";
import {
  ROLES,
  hashPassword,
  newToken,
  roleOf,
  tokenHash,
  validateCredentials,
  verifyPassword,
} from "./auth.js";

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "16kb" }));
// Local classroom API. The token is also usable by Postman without browser Origin headers.
app.use("/api", (req, res, next) => {
  if (
    req.headers.origin &&
    !["http://127.0.0.1:5180", "http://localhost:5180"].includes(req.headers.origin)
  )
    return res
      .status(403)
      .json({ error: "This local activity accepts requests only from its local UI." });
  res.set("Cache-Control", "no-store");
  next();
});

// ── Models ──────────────────────────────────────────────────────────────────────

const { ObjectId } = mongoose.Schema.Types;
const tripSchema = new mongoose.Schema(
  {
    owner: { type: ObjectId, ref: "User", required: true, select: false },
    title: { type: String, required: true, maxLength: 100 },
    trail: { type: Number, required: true, min: 0, max: 3 },
    date: { type: String, required: true },
    duration: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    capacity: { type: Number, required: true, min: 1, max: 500 },
    // Seats taken by confirmed bookings. Only the booking routes change it, and always with $inc.
    booked: { type: Number, required: true, min: 0, default: 0 },
    status: { type: String, enum: ["Draft", "Open", "Cancelled"], required: true },
    meeting: { type: String, required: true, maxLength: 160 },
    notes: { type: String, maxLength: 2000 },
  },
  { timestamps: true },
);
tripSchema.index({ owner: 1, date: 1 });
tripSchema.index({ status: 1, date: 1 });
const Trip = mongoose.model("Trip", tripSchema);

const User = mongoose.model(
  "User",
  new mongoose.Schema(
    {
      name: { type: String, required: true, maxLength: 80 },
      email: { type: String, required: true, unique: true, lowercase: true },
      // No default: accounts from before roles existed read as operators (see roleOf).
      role: { type: String, enum: ROLES },
      passwordHash: { type: String, select: false },
      googleId: { type: String, unique: true, sparse: true, select: false },
    },
    { timestamps: true },
  ),
);

const bookingSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true },
    trip: { type: ObjectId, ref: "Trip", required: true },
    hiker: { type: ObjectId, ref: "User", required: true },
    hikers: { type: [{ type: String, maxLength: 80 }], required: true },
    seats: { type: Number, required: true, min: 1, max: 10 },
    pricePerSeat: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["Confirmed", "Cancelled"], required: true, default: "Confirmed" },
    cancelledBy: { type: String, enum: ["hiker", "operator"] },
    cancelledAt: Date,
  },
  { timestamps: true },
);
bookingSchema.index({ hiker: 1, createdAt: -1 });
bookingSchema.index({ trip: 1, createdAt: -1 });
const Booking = mongoose.model("Booking", bookingSchema);

const sessionSchema = new mongoose.Schema({
  userId: { type: ObjectId, ref: "User", required: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
});
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const Session = mongoose.model("Session", sessionSchema);
const resetSchema = new mongoose.Schema({ userId: { type: ObjectId, required: true }, tokenHash: { type: String, required: true, unique: true }, expiresAt: { type: Date, required: true } });
resetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const Reset = mongoose.model("PasswordReset", resetSchema);
const oauthSchema = new mongoose.Schema({ tokenHash: { type: String, required: true, unique: true }, userId: ObjectId, role: { type: String, enum: ROLES }, kind: { type: String, required: true }, expiresAt: { type: Date, required: true } });
oauthSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const OAuth = mongoose.model("OAuthFlow", oauthSchema);

// ── Auth ────────────────────────────────────────────────────────────────────────

const uiOrigin = "http://127.0.0.1:5180";
const googleRedirect = process.env.GOOGLE_REDIRECT_URI || "http://127.0.0.1:4100/api/auth/google/callback";
const publicUser = (user) => ({ id: String(user._id), name: user.name, email: user.email, role: roleOf(user) });
async function issueSession(user, res, status = 200) {
  const token = newToken();
  await Session.create({ userId: user._id, tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + 7 * 86400000) });
  res.status(status).json({ token, user: publicUser(user) });
}
async function requireAuth(req, res, next) {
  const match = /^Bearer ([a-f0-9]{64})$/.exec(req.get("Authorization") || "");
  if (!match) return res.status(401).json({ error: "Sign in to continue." });
  const session = await Session.findOne({ tokenHash: tokenHash(match[1]), expiresAt: { $gt: new Date() } });
  if (!session) return res.status(401).json({ error: "Session expired. Sign in again." });
  const user = await User.findById(session.userId);
  if (!user) return res.status(401).json({ error: "Session expired. Sign in again." });
  req.user = user;
  req.session = session;
  next();
}
const requireRole = (role, message) => (req, res, next) =>
  roleOf(req.user) === role ? next() : res.status(403).json({ error: message });
const requireOperator = requireRole("operator", "Only operator accounts can manage expeditions.");
const requireHiker = requireRole("hiker", "Only hiker accounts can book trips. Sign in with a hiker account.");

app.post("/api/auth/signup", async (req, res) => {
  const { name, email, password, role } = validateCredentials(req.body, true);
  if (await User.exists({ email })) return res.status(409).json({ error: "An account with this email already exists." });
  const user = await User.create({ name, email, role, passwordHash: await hashPassword(password) });
  await issueSession(user, res, 201);
});
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = validateCredentials(req.body);
  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user || !(await verifyPassword(password, user.passwordHash)))
    return res.status(401).json({ error: "Incorrect email or password." });
  await issueSession(user, res);
});
app.post("/api/auth/forgot-password", async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (!email || email.length > 254) return res.status(400).json({ error: "Enter your email address." });
  const user = await User.findOne({ email });
  if (user) {
    const token = newToken();
    await Reset.deleteMany({ userId: user._id });
    await Reset.create({ userId: user._id, tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + 15 * 60000) });
    console.log(`Local password reset for ${email}: ${uiOrigin}/#reset=${token}`);
  }
  res.json({ message: "If that account exists, a reset link was printed in the API terminal. It expires in 15 minutes." });
});
app.post("/api/auth/reset-password", async (req, res) => {
  const { token, password } = req.body || {};
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token) || typeof password !== "string" || password.length < 8 || password.length > 128)
    return res.status(400).json({ error: "Use a valid reset link and a password of 8 to 128 characters." });
  const reset = await Reset.findOneAndDelete({ tokenHash: tokenHash(token), expiresAt: { $gt: new Date() } });
  if (!reset) return res.status(400).json({ error: "This reset link expired or was already used." });
  await User.updateOne({ _id: reset.userId }, { passwordHash: await hashPassword(password) });
  await Session.deleteMany({ userId: reset.userId });
  res.json({ message: "Password changed. Sign in with your new password." });
});
app.get("/api/auth/google/config", (req, res) => res.json({ enabled: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) }));
app.get("/api/auth/google/start", async (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return res.redirect(`${uiOrigin}/#google-error=not-configured`);
  const state = newToken();
  // The account type a new Google user gets; existing accounts keep theirs.
  const role = ROLES.includes(req.query.role) ? req.query.role : "hiker";
  await OAuth.create({ tokenHash: tokenHash(state), kind: "state", role, expiresAt: new Date(Date.now() + 10 * 60000) });
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  for (const [key, value] of Object.entries({ client_id: process.env.GOOGLE_CLIENT_ID, redirect_uri: googleRedirect, response_type: "code", scope: "openid email profile", state })) url.searchParams.set(key, value);
  res.redirect(url.toString());
});
app.get("/api/auth/google/callback", async (req, res) => {
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const flow = /^[a-f0-9]{64}$/.test(state) && await OAuth.findOneAndDelete({ tokenHash: tokenHash(state), kind: "state", expiresAt: { $gt: new Date() } });
  if (!flow || !code || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return res.redirect(`${uiOrigin}/#google-error=failed`);
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, redirect_uri: googleRedirect, grant_type: "authorization_code" }), signal: AbortSignal.timeout(10000) });
    if (!tokenResponse.ok) throw new Error("Google token exchange failed");
    const googleTokens = await tokenResponse.json();
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${googleTokens.access_token}` }, signal: AbortSignal.timeout(10000) });
    if (!profileResponse.ok) throw new Error("Google profile request failed");
    const profile = await profileResponse.json();
    if (!profile.email_verified || !profile.sub || !profile.email) throw new Error("Google email not verified");
    const email = profile.email.toLowerCase();
    let user = await User.findOne({ $or: [{ googleId: profile.sub }, { email }] }).select("+googleId");
    if (user && user.googleId && user.googleId !== profile.sub) throw new Error("Account mismatch");
    if (user) { user.googleId = profile.sub; await user.save(); }
    else user = await User.create({ name: String(profile.name || email).slice(0, 80), email, role: flow.role || "hiker", googleId: profile.sub });
    const ticket = newToken();
    await OAuth.create({ tokenHash: tokenHash(ticket), userId: user._id, kind: "ticket", expiresAt: new Date(Date.now() + 5 * 60000) });
    res.redirect(`${uiOrigin}/#google-ticket=${ticket}`);
  } catch (error) {
    console.error("Google sign-in failed:", error.message);
    res.redirect(`${uiOrigin}/#google-error=failed`);
  }
});
app.post("/api/auth/google/exchange", async (req, res) => {
  const ticket = req.body?.ticket;
  if (typeof ticket !== "string" || !/^[a-f0-9]{64}$/.test(ticket)) return res.status(400).json({ error: "Invalid Google sign-in ticket." });
  const flow = await OAuth.findOneAndDelete({ tokenHash: tokenHash(ticket), kind: "ticket", expiresAt: { $gt: new Date() } });
  if (!flow) return res.status(400).json({ error: "Google sign-in expired. Try again." });
  const user = await User.findById(flow.userId);
  if (!user) return res.status(400).json({ error: "Account unavailable." });
  await issueSession(user, res);
});
app.get("/api/auth/me", requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));
app.post("/api/auth/logout", requireAuth, async (req, res) => {
  await Session.deleteOne({ _id: req.session._id });
  res.status(204).end();
});

app.param("id", (req, res, next, id) =>
  mongoose.isObjectIdOrHexString(id) ? next() : res.status(400).json({ error: "Invalid ID." }),
);

// ── Public trips: what hikers see in Discover ─────────────────────────────────────

const publicTrip = (trip) => ({
  id: String(trip._id),
  title: trip.title,
  trail: trip.trail,
  date: trip.date,
  duration: trip.duration,
  price: trip.price,
  capacity: trip.capacity,
  booked: trip.booked,
  status: trip.status,
  meeting: trip.meeting,
  notes: trip.notes ?? "",
  operator: trip.owner?.name ?? "AkyatPH operator",
});
const withOperator = (query) => query.select("+owner").populate("owner", "name");

// Open trips that haven't ended, from every operator, soonest first.
app.get("/api/expeditions", async (req, res) => {
  const today = manilaToday();
  const trips = await withOperator(Trip.find({ status: "Open", date: { $gte: addDays(today, -2) } }).sort({ date: 1 }));
  res.json(trips.filter((t) => tripEndDate(t.date, t.duration) >= today).map(publicTrip));
});
app.get("/api/expeditions/:id", async (req, res) => {
  const trip = await withOperator(Trip.findOne({ _id: req.params.id, status: "Open" }));
  if (!trip) return res.status(404).json({ error: "This trip isn't open for booking." });
  res.json(publicTrip(trip));
});

// ── Bookings: hikers ───────────────────────────────────────────────────────────

const newReference = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return "AKY-" + [...randomBytes(6)].map((b) => alphabet[b % alphabet.length]).join("");
};
const hikerBooking = (b) => ({
  id: String(b._id),
  reference: b.reference,
  hikers: b.hikers,
  seats: b.seats,
  pricePerSeat: b.pricePerSeat,
  total: b.total,
  status: b.status,
  cancelledBy: b.cancelledBy ?? null,
  createdAt: b.createdAt,
  // Null when the operator deleted the trip after it was cancelled.
  trip: b.trip ? publicTrip(b.trip) : null,
});
const populateTrip = { path: "trip", select: "+owner", populate: { path: "owner", select: "name" } };

app.post("/api/bookings", requireAuth, requireHiker, async (req, res) => {
  const { tripId, hikers, seats } = validateBooking(req.body);
  const today = manilaToday();
  // Take the seats in one atomic update: it only matches while the trip is open, hasn't
  // started, and still has room, so two hikers can never both get the last seat.
  const trip = await Trip.findOneAndUpdate(
    { _id: tripId, status: "Open", date: { $gt: today }, $expr: { $lte: [{ $add: ["$booked", seats] }, "$capacity"] } },
    { $inc: { booked: seats } },
    { new: true },
  );
  if (!trip) {
    const current = await Trip.findOne({ _id: tripId, status: "Open" });
    if (!current) return res.status(404).json({ error: "This trip isn't open for booking." });
    if (current.date <= today) return res.status(409).json({ error: "Booking has closed for this trip." });
    const left = current.capacity - current.booked;
    return res.status(409).json({ error: left > 0 ? `Only ${left} ${left === 1 ? "seat is" : "seats are"} left on this trip.` : "This trip is full." });
  }
  let booking;
  try {
    booking = await Booking.create({ reference: newReference(), trip: trip._id, hiker: req.user._id, hikers, seats, pricePerSeat: trip.price, total: trip.price * seats });
  } catch (error) {
    await Trip.updateOne({ _id: trip._id }, { $inc: { booked: -seats } });
    throw error;
  }
  await booking.populate(populateTrip);
  res.status(201).json(hikerBooking(booking));
});
app.get("/api/bookings", requireAuth, requireHiker, async (req, res) => {
  const bookings = await Booking.find({ hiker: req.user._id }).sort({ createdAt: -1 }).populate(populateTrip);
  res.json(bookings.map(hikerBooking));
});
app.get("/api/bookings/:id", requireAuth, requireHiker, async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, hiker: req.user._id }).populate(populateTrip);
  if (!booking) return res.status(404).json({ error: "Booking not found." });
  res.json(hikerBooking(booking));
});
app.post("/api/bookings/:id/cancel", requireAuth, requireHiker, async (req, res) => {
  const current = await Booking.findOne({ _id: req.params.id, hiker: req.user._id }).populate("trip");
  if (!current) return res.status(404).json({ error: "Booking not found." });
  if (current.status !== "Confirmed") return res.status(409).json({ error: "This booking is already cancelled." });
  if (current.trip && current.trip.date <= manilaToday())
    return res.status(409).json({ error: "This trip has started, so the booking can't be cancelled here." });
  // Only one request can flip it from Confirmed, so the seats are released once.
  const booking = await Booking.findOneAndUpdate(
    { _id: current._id, status: "Confirmed" },
    { status: "Cancelled", cancelledBy: "hiker", cancelledAt: new Date() },
    { new: true },
  );
  if (!booking) return res.status(409).json({ error: "This booking is already cancelled." });
  await Trip.updateOne({ _id: booking.trip, booked: { $gte: booking.seats } }, { $inc: { booked: -booking.seats } });
  await booking.populate(populateTrip);
  res.json(hikerBooking(booking));
});

// ── Trips: operators ───────────────────────────────────────────────────────────

const serialize = (trip) => {
  // `owner` is select:false on reads, but create() returns it; drop it so every response matches.
  const { _id, __v, owner, ...data } = trip.toObject();
  return { ...data, id: String(_id) };
};
const operatorBooking = (b) => ({
  id: String(b._id),
  reference: b.reference,
  hikers: b.hikers,
  seats: b.seats,
  total: b.total,
  status: b.status,
  cancelledBy: b.cancelledBy ?? null,
  createdAt: b.createdAt,
  bookedBy: b.hiker ? { name: b.hiker.name, email: b.hiker.email } : null,
  trip: b.trip?.title ? { id: String(b.trip._id), title: b.trip.title, date: b.trip.date } : undefined,
});

app.get("/api/trips", requireAuth, requireOperator, async (req, res) =>
  res.json((await Trip.find({ owner: req.user._id }).sort({ date: 1 })).map(serialize)),
);
app.post("/api/trips", requireAuth, requireOperator, async (req, res) => {
  // Seats are only ever taken by bookings, so a new trip starts empty whatever the client sent.
  const { booked, ...fields } = validateTrip({ ...req.body, booked: 0 });
  res.status(201).json(serialize(await Trip.create({ ...fields, booked: 0, owner: req.user._id })));
});
app.put("/api/trips/:id", requireAuth, requireOperator, async (req, res) => {
  const { booked, ...fields } = validateTrip({ ...req.body, booked: 0 });
  const current = await Trip.findOne({ _id: req.params.id, owner: req.user._id });
  if (!current) return res.status(404).json({ error: "This trip no longer exists. Reload the workspace." });
  if (fields.status === "Draft" && current.status === "Open" && current.booked > 0)
    return res.status(409).json({ error: "This expedition has bookings, so it can't go back to draft. Cancel it instead." });
  // The capacity check is part of the update, so a booking that lands meanwhile can't be squeezed out.
  const trip = await Trip.findOneAndUpdate(
    { _id: current._id, owner: req.user._id, booked: { $lte: fields.capacity } },
    fields,
    { new: true, runValidators: true },
  );
  if (!trip) {
    const latest = await Trip.findById(current._id);
    return res.status(409).json({ error: `Seats can't go below the ${latest?.booked ?? current.booked} already booked.` });
  }
  // Cancelling the trip cancels its bookings and frees the seats. The status changed first,
  // and bookings need an open trip, so no new booking can land in between.
  if (fields.status === "Cancelled" && current.status !== "Cancelled") {
    await Booking.updateMany(
      { trip: trip._id, status: "Confirmed" },
      { status: "Cancelled", cancelledBy: "operator", cancelledAt: new Date() },
    );
    trip.booked = 0;
    await trip.save();
  }
  res.json(serialize(trip));
});
app.delete("/api/trips/:id", requireAuth, requireOperator, async (req, res) => {
  const trip = await Trip.findOne({ _id: req.params.id, owner: req.user._id });
  if (!trip) return res.status(404).json({ error: "This trip no longer exists." });
  if (await Booking.exists({ trip: trip._id, status: "Confirmed" }))
    return res.status(409).json({ error: "This expedition has confirmed bookings. Cancel it first." });
  await Trip.deleteOne({ _id: trip._id });
  res.status(204).end();
});

// The manifest: everyone who booked one of the operator's trips.
app.get("/api/trips/:id/bookings", requireAuth, requireOperator, async (req, res) => {
  const trip = await Trip.exists({ _id: req.params.id, owner: req.user._id });
  if (!trip) return res.status(404).json({ error: "This trip no longer exists." });
  const bookings = await Booking.find({ trip: req.params.id }).sort({ createdAt: 1 }).populate("hiker", "name email");
  res.json(bookings.map(operatorBooking));
});
// The newest bookings across all of the operator's trips, for the overview's live feed.
app.get("/api/operator/bookings", requireAuth, requireOperator, async (req, res) => {
  const trips = await Trip.find({ owner: req.user._id }).select("_id");
  const bookings = await Booking.find({ trip: { $in: trips.map((t) => t._id) } })
    .sort({ createdAt: -1 })
    .limit(8)
    .populate("hiker", "name email")
    .populate("trip", "title date");
  res.json(bookings.map(operatorBooking));
});

app.use("/api", (req, res) => res.status(404).json({ error: "Not found." }));
app.use((error, req, res, next) => {
  const expected =
    error.name === "ValidationError" ||
    error.constructor === Error ||
    error.type === "entity.parse.failed";
  const duplicate = error.code === 11000;
  res
    .status(error.type === "entity.too.large" ? 413 : duplicate ? 409 : expected ? 400 : 500)
    .json({
      error: duplicate
        ? error.keyPattern?.email
          ? "An account with this email already exists."
          : "That conflicted with another request. Try again."
        : expected
          ? error.message
          : "The database request failed. Check the API server and try again.",
    });
});
try {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/akyat_activity", {
    serverSelectionTimeoutMS: 5000,
  });
  app.listen(Number(process.env.PORT || 4100), "127.0.0.1", () =>
    console.log("AKYAT PH API ready at http://127.0.0.1:" + (process.env.PORT || 4100)),
  );
} catch {
  console.error(
    "MongoDB connection failed. Start MongoDB and set MONGODB_URI in .env. Demo UI remains available.",
  );
  process.exitCode = 1;
}
