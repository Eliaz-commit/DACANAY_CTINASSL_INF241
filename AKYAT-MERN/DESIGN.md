# AKYAT PH activity design

The public discovery screen follows the user-provided AKYAT PH screenshots. It uses a full-width Pulag mountain hero, overlapping search form, trust strip, and three-column trail cards. The six catalog entries match the capstone seed. Four use existing local photographs; Batulao and Daraitan show a deliberate image placeholder. On phones, the search form and cards stack while retaining the same filters. The operator link opens the separate trip CRUD workspace described below.

This independent Activity 1.1 workspace inherits the capstone's Cordillera Canopy identity. It serves hiking operators planning trips and demonstrates trip CRUD; it does not represent a connected booking service.

## Visual system

- Primary forest green: `#1b4332`; heading ink: `#182f23`; body ink: `#1f2937`.
- Page background: `#f8f9fa`; white surfaces; borders: `#e4e9e5`; selected navigation: `#edf4ee`.
- Inter supplies body and control text. Plus Jakarta Sans supplies headings and brand typography. These fonts deliberately preserve the established AKYAT PH identity.
- Real mountain photographs connect the operator workspace to Pulag, Ulap, and Ugo. Dark green image overlays maintain readable hero copy.
- Lucide line icons, restrained rounded corners, thin borders, and generous whitespace support a calm working interface.
- Status badges pair text with green (Open), amber (Full), gray (Draft), and red (Cancelled). Destructive actions use red and require confirmation.

## Implemented layouts

The redesigned workspace uses a trip schedule grouped by departure month. Selecting a trip updates a persistent detail inspector with the route image and full operating details. A compact operations strip reports upcoming departures, open seats, and drafts. The trail library is a separate route-selection surface. The top bar contains AKYAT PH identity and the workspace data mode.

Below 1100px, the detail inspector stacks beneath the schedule. Below 700px, the filters and search controls wrap, trip rows retain a compact date and availability summary, and trail library entries stack. The page remains within the viewport.

Native dialogs contain create/edit forms, details, deletion confirmation, workspace data, and guidance. Forms use visible labels, bounded numeric inputs, shared validation, and explicit saving/error feedback. Dialog height is constrained to the viewport. Keyboard focus indicators, a skip link, meaningful image descriptions, status announcements, and reduced-motion overrides are included.

## Data and verification boundary

The demo is explicitly labeled and persists sample trips in browser storage. MongoDB mode is a separate connection through the local Express API. Reserved seats are entered manually. Authentication, payments, and live bookings are outside this activity.

The reviewed desktop overview, phone overview, and create-trip screenshots preserve the inherited visual direction. Screenshot inspection and source review support the UI scope; they do not verify MongoDB persistence or constitute an exhaustive accessibility audit.
