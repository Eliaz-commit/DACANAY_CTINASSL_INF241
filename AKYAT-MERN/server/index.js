import express from "express";
import mongoose from "mongoose";
import { validateTrip } from "./validation.js";
import { hashPassword, newToken, tokenHash, validateCredentials, verifyPassword } from "./auth.js";

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
const schema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, select: false },
    title: { type: String, required: true, maxLength: 100 },
    trail: { type: Number, required: true, min: 0, max: 3 },
    date: { type: String, required: true },
    duration: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    capacity: { type: Number, required: true, min: 1, max: 500 },
    booked: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["Draft", "Open", "Cancelled"], required: true },
    meeting: { type: String, required: true, maxLength: 160 },
    notes: { type: String, maxLength: 2000 },
  },
  { timestamps: true },
);
schema.index({ owner: 1, date: 1 });
const Trip = mongoose.model("Trip", schema);
const User = mongoose.model("User", new mongoose.Schema({
  name: { type: String, required: true, maxLength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, select: false },
  googleId: { type: String, unique: true, sparse: true, select: false },
}, { timestamps: true }));
const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
});
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const Session = mongoose.model("Session", sessionSchema);
const resetSchema = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, required: true }, tokenHash: { type: String, required: true, unique: true }, expiresAt: { type: Date, required: true } });
resetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const Reset = mongoose.model("PasswordReset", resetSchema);
const oauthSchema = new mongoose.Schema({ tokenHash: { type: String, required: true, unique: true }, userId: mongoose.Schema.Types.ObjectId, kind: { type: String, required: true }, expiresAt: { type: Date, required: true } });
oauthSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const OAuth = mongoose.model("OAuthFlow", oauthSchema);
const uiOrigin = "http://127.0.0.1:5180";
const googleRedirect = process.env.GOOGLE_REDIRECT_URI || "http://127.0.0.1:4100/api/auth/google/callback";
const publicUser = (user) => ({ id: String(user._id), name: user.name, email: user.email });
async function issueSession(user, res, status = 200) {
  const token = newToken();
  await Session.create({ userId: user._id, tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + 7 * 86400000) });
  res.status(status).json({ token, user: publicUser(user) });
}
async function requireAuth(req, res, next) {
  const match = /^Bearer ([a-f0-9]{64})$/.exec(req.get("Authorization") || "");
  if (!match) return res.status(401).json({ error: "Sign in to access the operator database." });
  const session = await Session.findOne({ tokenHash: tokenHash(match[1]), expiresAt: { $gt: new Date() } });
  if (!session) return res.status(401).json({ error: "Session expired. Sign in again." });
  const user = await User.findById(session.userId);
  if (!user) return res.status(401).json({ error: "Session expired. Sign in again." });
  req.user = user;
  req.session = session;
  next();
}
app.post("/api/auth/signup", async (req, res) => {
  const { name, email, password } = validateCredentials(req.body, true);
  if (await User.exists({ email })) return res.status(409).json({ error: "An account with this email already exists." });
  const user = await User.create({ name, email, passwordHash: await hashPassword(password) });
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
  await OAuth.create({ tokenHash: tokenHash(state), kind: "state", expiresAt: new Date(Date.now() + 10 * 60000) });
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
    else user = await User.create({ name: String(profile.name || email).slice(0, 80), email, googleId: profile.sub });
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
const serialize = (trip) => {
  const { _id, __v, ...data } = trip.toObject();
  return { ...data, id: String(_id) };
};
app.param("id", (req, res, next, id) =>
  mongoose.isObjectIdOrHexString(id) ? next() : res.status(400).json({ error: "Invalid trip ID." }),
);
app.get("/api/trips", requireAuth, async (req, res) =>
  res.json((await Trip.find({ owner: req.user._id }).sort({ date: 1 })).map(serialize)),
);
app.post("/api/trips", requireAuth, async (req, res) =>
  res.status(201).json(serialize(await Trip.create({ ...validateTrip(req.body), owner: req.user._id }))),
);
app.put("/api/trips/:id", requireAuth, async (req, res) => {
  const trip = await Trip.findOneAndUpdate({ _id: req.params.id, owner: req.user._id }, validateTrip(req.body), {
    new: true,
    runValidators: true,
  });
  if (!trip)
    return res.status(404).json({ error: "This trip no longer exists. Reload the workspace." });
  res.json(serialize(trip));
});
app.delete("/api/trips/:id", requireAuth, async (req, res) => {
  const trip = await Trip.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
  if (!trip) return res.status(404).json({ error: "This trip no longer exists." });
  res.status(204).end();
});
app.use((error, req, res, next) => {
  const expected =
    error.name === "ValidationError" ||
    error.constructor === Error ||
    error.type === "entity.parse.failed";
  const duplicate = error.code === 11000;
  res
    .status(error.type === "entity.too.large" ? 413 : duplicate ? 409 : expected ? 400 : 500)
    .json({
      error: duplicate ? "An account with this email already exists." : expected
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
