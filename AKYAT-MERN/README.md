# AKYAT PH Activity 1.1

A standalone MERN version of the AKYAT PH capstone, with both of its sides: hikers find a trail and book seats, and tour operators publish trips and see those bookings land. Pages follow the capstone's design and Stitch screens. The main Next.js/Supabase capstone is untouched.

## Run the app

Requires Node.js 22.12+ (Node 24 recommended), npm, and a running MongoDB. Run from this folder:

```powershell
npm install
npm run server
```

Keep that terminal open. In a second terminal in this folder:

```powershell
npm run dev
```

Open http://127.0.0.1:5180 (use this address, not `localhost`: reset links and Google sign-in return to `127.0.0.1`, and a signed-in session belongs to the address it was created on). A signed-in browser tab keeps its session across reloads.

After pulling a change to `server/`, stop `npm run server` (Ctrl+C) and start it again; Node doesn't reload server code on its own.

## Connect MongoDB

1. Run a local MongoDB instance, or use your own MongoDB connection string.
2. Copy `.env.example` to `.env` in this folder and set `MONGODB_URI`. Do not commit credentials. Without `.env`, the API uses `mongodb://127.0.0.1:27017/akyat_activity`.
3. The default API port is 4100; if you change it, update the proxy target in `vite.config.js` too.

The database starts empty. Operators create trips through the portal; the sample trips in `src/data.js` are never copied into MongoDB. If the API isn't running, Discover shows those sample trips instead and booking is turned off.

## Two kinds of account

Like the capstone, everyone signs in through the same page, and the account type decides what you see.

- **Hiker** (*Book climbs*): Discover, trail pages, booking, and My bookings. Signing in from **Sign in** or **Book this trip** picks this type.
- **Operator** (*Run tours*): the operator portal. Signing in from **For operators** picks this type.

The type is chosen once, at sign-up. The API enforces it: hikers get **403** from operator routes, and operators can't book. Accounts created before account types existed are treated as operators.

## Screens and actions

**Hikers**

- **Discover:** destination, province, difficulty, and summit-height filters; six trail cards matching the capstone catalog, each showing its next open departure from any operator. The two trails without local photos use a green placeholder.
- **Trail page:** photo header, difficulty, elevation, and duration, then **Choose a departure** with every operator's open trips, seats left, and prices. The selected trip shows its operator, meeting point, and notes, and **Book this trip** sits beside it (a bottom bar on phones). Signed-out hikers are sent to sign in and brought back to the booking.
- **Who's climbing:** pick 1–10 hikers, enter each name as it appears on an ID, check the fare, and confirm.
- **My bookings:** upcoming bookings, then past and cancelled ones.
- **Booking page:** reference, status, your party, meeting point, operator, and fare. Cancel it before the trip starts to release the seats.

**Operators**

- **Operator portal:** follows the capstone's `/operator` dashboard: a sidebar with the operator card, **New Expedition**, and Overview / Expeditions / Trails navigation (a scrolling top bar on phones).
- **Overview:** a greeting, four stat cards (upcoming expeditions, seats booked this month, drafts to publish, bookings value this month), the upcoming expeditions table with All / This weekend / Needs action tabs, an action queue, **Live bookings**, and the workspace data card. The portal checks for new bookings every 10 seconds, so a hiker's booking appears without reloading.
- **Expeditions:** every trip with Upcoming / Drafts / Past / Cancelled / All tabs, search, sorting by date or price, and CSV export.
- **Expedition page:** the **Manifest** (who booked, their hikers, reference, and status), trail photo and facts, operator notes, seats, pricing, and meeting point. Edit it, publish a draft, cancel an open trip, move a cancelled one back to drafts, or delete it.
- **Create / edit:** the capstone's three-step form (trail, schedule and seats, meeting point and notes) beside a live hiker preview and a checklist. **Publish expedition** saves it as Open; **Save draft** keeps it a Draft.
- **Trails:** the four Cordillera routes; **Plan this route** starts a new expedition with the trail filled in.

The UI says "expedition" like the capstone; the API and database call them trips. "Full" and "Completed" are worked out from seats and dates, not stored.

### Booking rules

- Only bookings change a trip's seat count. Operators set the number of seats, but never fewer than are already booked.
- Seats are taken in one atomic MongoDB update that only matches while the trip is open, hasn't started, and has room, so a trip can't be overbooked even when two hikers book the last seat at once.
- Booking closes once a trip starts. Hikers can cancel their own booking until then, which releases the seats.
- Cancelling a trip cancels its bookings, and hikers see it as cancelled by the operator. A trip with confirmed bookings can't go back to draft or be deleted until it is cancelled.
- No payment is taken. Totals are what the hikers would pay.

## API and database

React calls a Node.js/Express API through Vite's `/api` proxy. Mongoose stores `users`, `trips`, and `bookings` in MongoDB, plus `sessions`, password resets, and Google sign-in state that expire on their own. Trail IDs refer to the four catalog entries in `src/data.js`.

| Method | Endpoint | Who | Result |
| --- | --- | --- | --- |
| POST | `/api/auth/signup` | Anyone | Create a hiker or operator account (`role`) |
| POST | `/api/auth/login` | Anyone | Sign in |
| GET | `/api/expeditions` | Anyone | Open trips from every operator, soonest first |
| GET | `/api/expeditions/:id` | Anyone | One open trip |
| POST | `/api/bookings` | Hiker | Book seats: `{ tripId, hikers: [names] }` |
| GET | `/api/bookings` | Hiker | Your bookings |
| GET | `/api/bookings/:id` | Hiker | One of your bookings |
| POST | `/api/bookings/:id/cancel` | Hiker | Cancel it and release the seats |
| GET | `/api/trips` | Operator | Your trips by departure date |
| POST | `/api/trips` | Operator | Validate and create a trip |
| PUT | `/api/trips/:id` | Operator | Validate and replace a trip's editable fields |
| DELETE | `/api/trips/:id` | Operator | Delete a trip with no confirmed bookings |
| GET | `/api/trips/:id/bookings` | Operator | The trip's manifest |
| GET | `/api/operator/bookings` | Operator | The newest bookings across your trips |

### Test it in Postman

Run `npm run server` with MongoDB running. Import `AKYAT-MERN.postman_collection.json` from this folder. In the collection's variables, set `password` to at least eight characters, and change `email` and `hikerEmail` to two addresses you haven't signed up with. Then send requests 1–13 in order. The collection saves both tokens, the trip ID, and the booking ID after each successful response.

1. Sign up an operator (`"role": "operator"`). Expect **201** with `user` and `token`.
2. Log in as the operator. Expect **200** with a new token.
3. `GET /api/trips` with the operator token. Expect **200** and `[]`.
4. `POST /api/trips` creates an Open trip. Expect **201**.
5. `PUT /api/trips/:id` changes its price and seats. Expect **200**.
6. Sign up a hiker (`"role": "hiker"`). Expect **201**.
7. `GET /api/expeditions`, with no token, lists the trip with its operator's name.
8. `POST /api/bookings` with the hiker token books two hikers. Expect **201** with a reference like `AKY-7K2M9Q`.
9. `GET /api/bookings` with the hiker token lists that booking.
10. `GET /api/trips/:id/bookings` with the operator token shows it on the manifest.
11. `POST /api/bookings/:id/cancel` with the hiker token. Expect **200** and `"status": "Cancelled"`.
12. `DELETE /api/trips/:id` with the operator token. Expect **204**.
13. `GET /api/trips` confirms removal.

Requests without a valid token receive **401**; the wrong account type receives **403**. Operators only see their own trips and manifests, and hikers only their own bookings. `GET /api/auth/me` returns the signed-in user, and `POST /api/auth/logout` ends the session. Take screenshots of your own Postman requests and responses for your activity submission.

### Password reset and Google sign-in

The **Forgot password?** link opens a reset form. For this local classroom app, `POST /api/auth/forgot-password` prints a one-use, 15-minute reset link in the `npm run server` terminal. Open that link in the browser and set a new password; existing sessions are invalidated. No email is sent.

**Continue with Google** uses Google's authorization-code flow. A new Google account gets the type selected on the sign-up form; an existing account keeps its type. To enable it, create a Google OAuth client of type **Web application**, add `http://127.0.0.1:4100/api/auth/google/callback` as an authorized redirect URI, and put its client ID and secret in this folder's `.env` file (copy `.env.example`). Restart `npm run server`. If Google requires test users while the consent screen is in testing, add your Google account there. Do not commit `.env`.

### Validation and privacy

Shared validation (`server/validation.js`) checks real calendar dates, supported status and duration values, text lengths, nonnegative prices, integer seat counts, party sizes of 1–10, and a name for every hiker. Unexpected fields are discarded.

Bookings store only the hikers' names. Birthdates, contact numbers, medical certificates, permits, and payments from the capstone are not part of this activity.

This is a local classroom app. The API binds to loopback and accepts browser requests only from its own UI. Passwords are hashed with scrypt, and sessions are seven-day bearer tokens stored as hashes. A real deployment would also need HTTPS, rate limiting, email for password resets, and operator verification.

## Verification

```powershell
npm test
npm run build
```

Verified on 2026-11-25 against a local MongoDB instance:

- 11 unit tests and a production build.
- Every endpoint, including the 401, 403, 404, and 409 errors, and two hikers booking the last seat at the same time (one succeeds, one gets "This trip is full").
- All 13 Postman requests, in order.
- In the browser: an operator signs up and publishes trips; a signed-out hiker opens a trail, is sent to sign up, books two seats, and sees the booking; the operator's overview shows it within 10 seconds without reloading, and the manifest lists it; the hiker cancels one booking; the operator cancels a trip and the hiker sees it as cancelled by the operator. Checked at desktop and phone widths.

Google sign-in has not been tested end to end because it needs your own OAuth client credentials in `.env`.

## Activity evidence

UI preview images are saved locally in `output/akyat-activity` and are excluded from Git. These are browser captures, not the full-desktop evidence requested in the assignment. For the final submission, capture your entire desktop while showing:

- Hiker side: Discover, a trail page, the "Who's climbing" checkout, My bookings, and a booking page.
- Operator side: Overview with Live bookings, Expeditions, an expedition page with its manifest, the create and edit form, and the delete confirmation.

Place those captures in the provided activity template. Database screenshots should use an actual connected database, not demo mode. The submission template and PDF are not included in this UI deliverable.
