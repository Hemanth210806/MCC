# Mysuru Civic Connect (MCC) 🏛️

### AI-Powered Civic Issue Reporting, Monitoring and Resolution System
**Mysuru City Corporation (ಮೈಸೂರು ಮಹಾನಗರ ಪಾಲಿಕೆ)**

---

## 🌟 Highlights & Key Features

- **65 Verified Real MCC Municipal Wards:** Real-world WGS84 GeoJSON boundaries from Mysore municipal demographic spatial layers (`2001_2011_Pop`).
- **Client-Side GIS & Priority Engine:** Configurable rules engine calculating proximity to 41 verified Mysuru schools, hospitals, colleges, and transit hubs, with incident density scoring and human-readable explanations.
- **Automated Department Routing & SLAs:** Instant config-driven dispatch to the responsible department (*Solid Waste Management*, *Roads & Infrastructure*, *Electrical & Street Lighting*, *Water Supply & Sewerage*) with 24h / 72h / 168h target SLAs.
- **Geotagged Resolution & Admin Verification:** Field Officers upload resolution proof with current GPS; system calculates Haversine distance from original complaint GPS; Admin verifies side-by-side before marking `RESOLVED`.
- **Public Interactive Map & Analytics:** 65-ward Leaflet map, DBSCAN spatial hotspot clustering, recurring issue detection, 0–100 Ward Civic Health Scores, and SLA overdue escalation.
- **Modern React + Vite Architecture:** Built as a high-performance React SPA with integrated local storage persistence and mock engine for instant offline prototyping.

---

## 🚀 Quick Start Guide

```bash
# Install dependencies
npm install

# Start development server on port 3000
npm run dev

# Build production bundle
npm run build
```

---

## 🔑 Demo Staff Login Credentials

1-click test fill buttons are available directly on the login page:

| Role | Email | Password | Access / Scope |
|---|---|---|---|
| **Administrator** | `admin@mcc.gov.in` | `Admin@123` | City-wide verification queue, analytics, hotspots, user management |
| **Field Officer (Roads)** | `roads.officer@mcc.gov.in` | `Officer@123` | Roads & Infrastructure dispatch board, start work, resolve |
| **Field Officer (SWM)** | `swm.officer@mcc.gov.in` | `Officer@123` | Solid Waste Management dispatch queue |
| **Field Officer (Electrical)**| `elec.officer@mcc.gov.in` | `Officer@123` | Street lighting & electrical repairs |
| **Field Officer (Water)** | `water.officer@mcc.gov.in` | `Officer@123` | Water supply & pipe leakages |
| **Ward Corporator** | `ward12.corporator@mcc.gov.in` | `Corporator@123` | Ward 12 (J P Nagar) civic health, analytics & alerts |
| **Ward Corporator** | `ward1.corporator@mcc.gov.in` | `Corporator@123` | Ward 1 (Agrahara) civic health |

*Note: Any citizen can file and track complaints without logging in.*

---

&copy; 2026 Mysuru City Corporation. All Rights Reserved.
