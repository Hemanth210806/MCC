# Complaint Search Filter & Civic FAQ for Track Issue

Implementation plan to enhance the Track Issue view with a multi-criteria search/filter directory (by status, priority, and ward name) and an interactive civic FAQ component detailing resolution processes and SLA timelines.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following specifications were confirmed during the interactive interview:
> - **Search Presentation**: Dual mode featuring both direct Complaint ID tracking and a searchable, filterable complaint directory.
> - **FAQ Placement**: Interactive accordion located directly beneath the search/filter section on the Track Issue page.
> - **Resolution Process Format**: Structured as a step-by-step lifecycle detailing SLA turnaround hours for each municipal issue category.

---

## 1. Overview & Core Concept

- **What It Does**:
  1. Upgrades the `Track Issue` view with a dual-mode interface: Citizens can either track a specific complaint by ID/phone or explore a filterable directory of municipal complaints across Mysuru's 65 wards (filtered by Status, Priority, and Ward Name).
  2. Introduces a dedicated `CivicFAQ` accordion component that explains the resolution lifecycle, department responsibilities, and SLA turnaround times for Solid Waste, Potholes, Streetlights, and Water Leakages to proactively resolve citizen questions and reduce support calls.
- **Target Audience**: Citizens seeking grievance status updates, municipal observers tracking ward performance, and citizens wanting to understand MCC SLA redressal policies before filing reports.
- **Key Value**: Eliminates the frustration of needing an exact complaint code to explore civic activity in a neighborhood, while deflecting repetitive support inquiries through transparent SLA process documentation.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Direct Complaint Tracking (Tab 1)**:
   - Users enter their Complaint ID (e.g. `MCC-2026-00012`) and optional mobile number.
   - Live status timeline, priority reason chips, original vs. resolution evidence photos, and a 1–5 star rating submission form are presented.
2. **Searchable Complaints Directory (Tab 2)**:
   - Features a quick search bar with instant debounced text search (searching code, description, and ward name).
   - Filter chips / select controls:
     - **Status**: `All Statuses`, `Submitted`, `Assigned`, `In Progress`, `Verification Pending`, `Resolved`, `Overdue`.
     - **Priority**: `All Priorities`, `High (24h)`, `Medium (72h)`, `Low (168h)`.
     - **Ward**: Dropdown or text filter matching any of the 65 MCC wards.
   - Responsive complaint cards showing Complaint ID, category icon, ward tag, status pill, SLA due deadline, and a "View Progress" button that opens full timeline details.
3. **Frequently Asked Questions (Interactive Accordion)**:
   - Situated cleanly below the tracking cards with an emergency helpline banner.
   - Accordion items expandable with smooth animation:
     - *Garbage & Waste Redressal Lifecycle (24h - 72h SLA)*
     - *Pothole & Asphalt Repair Lifecycle (24h - 72h SLA)*
     - *Streetlight & Electrical Fixture Lifecycle (24h - 48h SLA)*
     - *Water Supply & Pipe Leakage Emergency Protocol (12h - 24h SLA)*
     - *SLA Escalation & Overdue Penalties for Field Teams*
     - *How to Reopen an Unsatisfactory Resolution*
   - Each FAQ item contains a visual 3-step timeline (`Dispatched -> Repaired with GPS -> Admin Audit`) and turnaround guarantees.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dual Tabbed Mode vs. Single Combined Form**
  - *Chosen Approach*: Clean segmented tab switcher (`Track by Complaint ID` | `Explore Ward Directory`).
  - *Why*: Prevents cluttering the quick 1-field citizen lookup with complex filter dropdowns, while giving users full exploratory power when desired.
- **Decision 2: Client-Side Debounced Filtering**
  - *Chosen Approach*: Filter against the persistent municipal database in `mockBackend.js` with zero server delay.
  - *Why*: Instantaneous response time as the user types or toggles status/priority pills, with support for all 65 wards.

---

## 4. Technical Architecture & Component Structure

### Architecture & Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     TrackComplaint Page                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │     Segmented Tab: [Track by ID] | [Search Directory] │  │
│  └───────────────────────────┬───────────────────────────┘  │
│                              │                              │
│         ┌────────────────────┴────────────────────┐         │
│         ▼                                         ▼         │
│  ┌─────────────────────┐          ┌──────────────────────┐  │
│  │ Single ID Search    │          │ Multi-Filter Controls│  │
│  │ (Code + Phone)      │          │ • Search text input  │  │
│  ├─────────────────────┤          │ • Status Dropdown    │  │
│  │ Status Timeline &   │          │ • Priority Dropdown  │  │
│  │ Evidence Photo View │          │ • Ward Selector      │  │
│  └─────────────────────┘          ├──────────────────────┤  │
│                                   │ Filtered Grid Cards  │  │
│                                   └──────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           CivicFAQ Component (Accordion)              │  │
│  │  • SWM / Garbage resolution process & 24h-72h SLA     │  │
│  │  • Roads / Potholes repair & distance check           │  │
│  │  • Streetlight repair & night verification            │  │
│  │  • Water pipeline burst rapid response (12h)          │  │
│  │  • SLA Overdue Escalation & Helpline Directory        │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Components & Routes to Update:
1. **`src/services/api.js`**: Add `GET /complaints/search` endpoint supporting `query`, `status`, `priority`, and `ward_id`/`ward_name` query parameters.
2. **`src/components/CivicFAQ.jsx`**: Create a modern, accessible accordion component with step-by-step resolution workflows, department SLAs, and helpline contacts.
3. **`src/pages/TrackComplaint.jsx`**: Integrate dual mode tabs, search/filter controls, complaint cards grid, and the `CivicFAQ` component.
