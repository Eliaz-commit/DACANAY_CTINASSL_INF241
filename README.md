# AKYAT PH Activity 1.1

A standalone MERN activity implementation of the AKYAT PH discovery page and operator workspace. The discovery page follows the supplied screenshots and the existing capstone's visual identity. The main Next.js/Supabase capstone is untouched.

## Run the UI

Requires Node.js 22.12+ (Node 24 recommended) and npm. Run from this folder:

```powershell
npm install
npm run dev
```

Open http://localhost:5180. The discovery page is public. **For operators** opens login/signup; MongoDB and the API server must be running to use the protected workspace. A signed-in browser tab keeps its session across reloads. The standalone demo data remains in the browser for the activity's demo mode.

## Connect MongoDB

1. Run a local MongoDB instance, or use your own MongoDB connection string.
2. Copy `.env.example` to `.env` in this folder and set `MONGODB_URI`. Do not commit credentials.
3. In a second terminal in this folder, run `npm run server`.
4. Keep `npm run dev` running in the first terminal.
5. Select **For operators → Sign up** in the UI, then create your operator account. The workspace connects to MongoDB after login.

The database starts empty. Create trips through the form; demo records are never silently copied into MongoDB. MongoDB documents persist separately from browser demo data. The default API port is 4100; if changed, update the proxy target in `vite.config.js` too.

This is a local classroom operator workspace. The API binds to loopback. Signup and login create hashed passwords and seven-day bearer sessions stored as token hashes in MongoDB. Trip API routes require a token and are scoped to the signed-in account. Production deployment would also need HTTPS, rate limiting, account recovery, and an operator approval process. Payments, real bookings, permits, and medical documents are not connected. Reserved seats are entered manually for this activity.

The discovery screen copies the capstone's presentation and trust copy as a UI reference. Its booking, permit-tracking, medical-file, and operator-verification claims are illustrative in this standalone activity; those workflows are not implemented here.

## Screens and actions

- **Discover:** destination, province, difficulty, and summit-height filters; six trail cards matching the capstone catalog; trail details and available demo departures. The two trails without local photos use a green placeholder.
- **Operator workspace:** open it through **For operators**; departures grouped by month, open seats, drafts, search, status filters, sorting, and CSV export. Select a departure to inspect its details beside the list.
- **Trail library:** four sample Cordillera routes; start a trip with a trail preselected.
- **Create / edit:** trip name, trail, date, duration, price, group capacity, reserved seats, status, meeting point, and notes.
- **Details / delete:** inspect the trip, edit it, or confirm permanent deletion. Trips with reserved seats show an additional warning.
- **Responsive layout:** the trip inspector stacks beneath the schedule on phones, with the same two-section navigation available at every width.

## API and database

React calls a Node.js/Express API through Vite's `/api` proxy. Mongoose stores trips in MongoDB's `trips` collection, with timestamps and a departure-date index. Trail IDs reference the four static catalog entries in `src/data.js`.

| Method | Endpoint | Result |
| --- | --- | --- |
| GET | `/api/trips` | List trips by departure date |
| POST | `/api/trips` | Validate and create a trip |
| PUT | `/api/trips/:id` | Validate and replace editable trip fields |
| DELETE | `/api/trips/:id` | Delete a trip |

### Test authentication in Postman

Run `npm run server` with MongoDB running. In Postman set `Content-Type: application/json` and use `http://127.0.0.1:4100` as the base URL.

You can import `AKYAT-MERN.postman_collection.json` from this folder instead of creating the requests manually. Set the collection's blank `password` variable to a password of at least eight characters, and change `email` to an address you have not used for signup. Then send requests 1–7 in order. The collection saves the bearer token and new trip ID automatically after successful responses.

1. `POST /api/auth/signup` with raw JSON `{"name":"Your Name","email":"you@example.com","password":"your-password-123"}`. Expect **201** with `user` and `token`.
2. `POST /api/auth/login` with `{"email":"you@example.com","password":"your-password-123"}`. Expect **200** with a new token.
3. For trip requests, choose **Authorization → Bearer Token** in Postman and paste the login token. `GET /api/trips` should return **200** and initially `[]`.
4. `POST /api/trips` with `{"title":"Pulag sunrise","trail":0,"date":"2027-01-15","duration":"Day hike","price":1500,"capacity":12,"booked":0,"status":"Open","meeting":"Baguio City","notes":"Bring a jacket."}`. Expect **201**. Copy the returned `id`.
5. `PUT /api/trips/<id>` with the same JSON and a changed `price` or `capacity`. Expect **200**.
6. `DELETE /api/trips/<id>`. Expect **204** with an empty response. `GET /api/trips` confirms removal.
7. `GET /api/auth/me` with the bearer token returns the user. `POST /api/auth/logout` with the token returns **204**; a later request with that token returns **401**.

### Password reset and Google sign-in

The **Forgot password?** link opens a reset form. For this local classroom app, `POST /api/auth/forgot-password` prints a one-use, 15-minute reset link in the `npm run server` terminal. Open that link in the browser and set a new password; existing sessions are invalidated. No email is sent. In Postman, send `{"email":"you@example.com"}` to the forgot endpoint and use the terminal link to test the reset page.

**Continue with Google** uses Google's authorization-code flow. To enable it, create a Google OAuth client of type **Web application**, add `http://127.0.0.1:4100/api/auth/google/callback` as an authorized redirect URI, and put its client ID and secret in this folder's `.env` file (copy `.env.example`). Restart `npm run server`. If Google requires test users while the consent screen is in testing, add your Google account there. The button shows a clear configuration error until those credentials are present. Do not commit `.env`.

Requests without a valid token receive **401**. Accounts only see their own trips. Take screenshots of your own Postman requests and responses for your activity submission.

Shared validation checks real calendar dates, supported status/duration values, text lengths, nonnegative prices, integer seat counts, and reserved seats not exceeding capacity. Unexpected fields are discarded. `Full` is calculated when an open trip has no seats remaining; it is not a stored status.

## Verification

```powershell
npm test
npm run build
```

Verified during implementation: production build and six validation/auth unit tests. The earlier discovery and workspace UI were browser checked before the authentication change; the new login/signup flow still needs a live MongoDB run.

MongoDB persistence and the new authentication endpoints have not been integration-tested because no MongoDB service was running on the development machine. To verify them, follow the Postman steps above with MongoDB connected, then repeat signup, login, trip creation, editing, reload, and deletion in the UI.

## Activity evidence

UI preview images are saved locally in `output/akyat-activity` and are excluded from Git. These are browser captures, not the full-desktop evidence requested in the assignment. For the final submission, capture your entire desktop while showing Overview, Trips, Explore trails, the create/edit forms, trip details, and deletion confirmation. Place those captures in the provided activity template. Database screenshots should use an actual connected database, not demo mode. The submission template and PDF are not included in this UI deliverable.
