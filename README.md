# Mysuru Civic Connect (MCC) 🏛️

### AI-Powered Civic Issue Reporting, Monitoring and Resolution System
**Mysuru City Corporation (ಮೈಸೂರು ಮಹಾನಗರ ಪಾಲಿಕೆ)**

---

## 🌟 Highlights & Key Features

- **65 Verified Real MCC Municipal Wards:** Real-world WGS84 GeoJSON boundaries from Mysore municipal demographic spatial layers (`2001_2011_Pop`). Full provenance in `backend/data/source/README.md`.
- **Deep Learning Computer Vision:** Transfer learning on MobileNetV2 for 4 municipal categories (*Garbage / Waste*, *Pothole / Road Damage*, *Streetlight Failure*, *Water Leakage*) trained exclusively on real Kaggle public datasets (no synthetic images).
- **Location-Aware Priority Engine:** Configurable rules engine scoring proximity to schools, hospitals, colleges, transit stops, and nearby report density with human-readable explanations.
- **Automated Department Routing & SLAs:** Instant config-driven dispatch to the responsible department (*Solid Waste Management*, *Roads & Infrastructure*, *Electrical & Lighting*, *Water Supply & Sewerage*) with 24h/72h/168h target SLAs.
- **Geotagged Resolution & Admin Verification:** Field Officers upload resolution proof with current GPS; system calculates Haversine distance from original complaint GPS; Admin verifies side-by-side before marking `RESOLVED`.
- **Public Interactive Map & Analytics:** 65-ward Leaflet map, DBSCAN spatial hotspot clustering, recurring issue detection, 0–100 Ward Civic Health Scores, and SLA overdue escalation.

---

## 🚀 Quick Start Guide (Local Setup)

### Prerequisites
- Python 3.10+
- Node.js v18+ & npm
- (Optional) MySQL 8.0 (System includes automatic SQLite zero-config fallback)

---

### 1. Backend Setup

```bash
# Navigate to backend directory
cd mysuru-civic-connect/backend

# Install Python dependencies
pip install -r requirements.txt

# Seed the database with 65 real MCC wards, users, departments, and ~95 demo complaints
python seed/seed_data.py

# Start the Flask API server (runs on http://localhost:5000)
python run.py
```

---

### 2. Frontend Setup

```bash
# In a new terminal, navigate to frontend directory
cd mysuru-civic-connect/frontend

# Install dependencies (if not already installed)
npm install --legacy-peer-deps

# Start Vite React development server (runs on http://localhost:5173)
npm run dev
```

Open `http://localhost:5173` in your browser!

---

## 🔑 Demo Staff Login Credentials

The seed script automatically initializes authentic staff accounts with 1-click test fill buttons on the login page:

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

## 🧪 Running Automated Tests

Run the automated `pytest` test suite:

```bash
cd mysuru-civic-connect/backend
pytest tests/ -v
```

Tests cover:
- Real MCC ward point-in-polygon resolution (e.g. Ward 12 J P Nagar)
- Out-of-boundary protection and rejection
- Haversine distance calculations
- Priority engine rules, scoring, and explanations
- Department routing
- Strict SLA state transitions (`SUBMITTED -> ASSIGNED -> IN_PROGRESS -> VERIFICATION_PENDING -> RESOLVED`)
- Spatiotemporal recurring issue detection
- JWT role-based access control (RBAC)
- Full citizen complaint submission API integration

---

## 📊 End-to-End Workflow Demonstration

1. **Public Map (`/map`):** Explore all 65 MCC wards, color-coded by Ward Civic Health Score, with DBSCAN hotspot circles.
2. **Citizen Complaint (`/file-complaint`):** Upload photo, click *"Use My Current Location"* (or drag the pin on the Leaflet map preview), submit. Instant Complaint ID (e.g. `MCC-2026-00098`), assigned ward, AI classification, priority reasons, and SLA deadline.
3. **Field Officer Action (`/login` -> Officer):** View department queue, click *"Start Work"*, complete repair, upload resolution photo with current GPS. System computes Haversine distance from original complaint.
4. **Admin Verification (`/login` -> Admin):** View Verification Queue side-by-side (original photo/GPS vs resolution photo/GPS/distance). Click *"Approve"* -> complaint marked `RESOLVED`.
5. **Citizen Tracking & Feedback (`/track`):** Enter Complaint ID + phone -> view live status timeline and resolution photo -> submit 1–5 star rating and feedback comment.
6. **Analytics & Hotspots:** View DBSCAN spatial clusters, recurring issues table, and Ward Civic Health Score breakdown factors.

---

## 🚢 Production Deployment Notes

- **Backend:** Deploy on any standard Python WSGI environment (e.g., Gunicorn on Render, Railway, AWS ECS, or DigitalOcean App Platform) connecting to managed MySQL 8.0.
- **Frontend:** Build static bundle using `npm run build` and deploy to Vercel, Netlify, Cloudflare Pages, or AWS S3 + CloudFront.
- **Storage:** For cloud production, swap local `/uploads` in `StorageService` for AWS S3 or Google Cloud Storage.

---

&copy; 2026 Mysuru City Corporation. AI-Powered Civic Connect System.
