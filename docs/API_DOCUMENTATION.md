# Mysuru Civic Connect (MCC) — REST API Documentation

Base URL: `http://localhost:5000/api`

---

## 1. Public & Citizen Endpoints

### 1.1 `GET /api/public/map-data`
Returns GeoJSON polygons for all 65 official MCC wards enriched with health scores and aggregate metrics, active DBSCAN hotspots, and generalized complaint markers for public map visualization.

- **Auth:** None (Public)
- **Response `200 OK`:**
```json
{
  "wards_geojson": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "properties": {
          "ward_id": 12,
          "ward_number": 12,
          "ward_name": "J P Nagar",
          "health_score": 88,
          "rating": "EXCELLENT",
          "total_complaints": 14,
          "resolved_count": 12,
          "overdue_count": 0,
          "high_priority_pending": 1
        },
        "geometry": { "type": "Polygon", "coordinates": [...] }
      }
    ]
  },
  "hotspots": [
    {
      "id": 1,
      "ward_id": 12,
      "ward_name": "J P Nagar",
      "category_name": "Garbage / Waste",
      "center_lat": 12.2785,
      "center_lng": 76.6520,
      "complaint_count": 5,
      "radius_m": 350.0,
      "active": true
    }
  ],
  "complaint_markers": [
    {
      "id": 1,
      "complaint_code": "MCC-2026-00001",
      "category_name": "Garbage / Waste",
      "status": "ASSIGNED",
      "priority": "HIGH",
      "latitude": 12.2785,
      "longitude": 76.6520,
      "ward_name": "J P Nagar"
    }
  ]
}
```

---

### 1.2 `GET /api/public/wards/:id/stats`
Returns detailed breakdown statistics for a specific ward.

- **Auth:** None
- **Response `200 OK`:**
```json
{
  "ward": {
    "id": 12,
    "ward_number": 12,
    "ward_name": "J P Nagar"
  },
  "health_score": 88,
  "rating": "EXCELLENT",
  "factors": {
    "total_complaints": 14,
    "resolved_count": 12,
    "resolution_rate_pct": 85.7,
    "overdue_count": 0,
    "high_priority_pending": 1,
    "recurring_issues_count": 0
  }
}
```

---

### 1.3 `POST /api/complaints`
Registers a citizen civic complaint with multipart photo and geolocation. Automatically runs AI classification, point-in-polygon ward assignment, location-aware priority engine, and department routing.

- **Auth:** None (Guest filing)
- **Content-Type:** `multipart/form-data`
- **Body:**
  - `photo`: File (image/jpeg, image/png, image/webp)
  - `latitude`: Float (e.g. `12.2785`)
  - `longitude`: Float (e.g. `76.6520`)
  - `gps_accuracy_m`: Float (optional)
  - `citizen_name`: String (optional)
  - `citizen_phone`: String (optional)
  - `citizen_email`: String (optional)
  - `description`: String (optional)
- **Response `201 Created`:**
```json
{
  "message": "Complaint successfully filed",
  "complaint_code": "MCC-2026-00098",
  "ward_name": "J P Nagar",
  "outside_mcc_boundary": false,
  "category_name": "Garbage / Waste",
  "ai_confidence": 0.94,
  "department_name": "Solid Waste Management",
  "priority": "HIGH",
  "priority_reasons": [
    "Base severity for Garbage / Waste: +30",
    "Within 100m of Demonstration School (RIE) Mysuru (school) (65m): +30",
    "3 similar complaints nearby: +15"
  ],
  "sla_due_at": "2026-09-14T14:30:00.000Z",
  "tracking_url": "/track?code=MCC-2026-00098&phone=9845012345"
}
```

---

### 1.4 `GET /api/complaints/track?code=:code&phone=:phone`
Tracks a complaint's live status, photo evidence, and full history timeline. Requires registered mobile number for privacy.

- **Auth:** None (Verified via code + phone)
- **Response `200 OK`:**
```json
{
  "complaint": {
    "complaint_code": "MCC-2026-00098",
    "status": "IN_PROGRESS",
    "priority": "HIGH",
    "category_name": "Garbage / Waste",
    "ward_name": "J P Nagar",
    "department_name": "Solid Waste Management",
    "sla_due_at": "2026-09-14T14:30:00.000Z",
    "timeline": [
      {
        "old_status": null,
        "new_status": "SUBMITTED",
        "created_at": "2026-09-13T10:00:00.000Z",
        "remarks": "Complaint registered by citizen with geolocation and photo."
      },
      {
        "old_status": "SUBMITTED",
        "new_status": "ASSIGNED",
        "created_at": "2026-09-13T10:05:00.000Z",
        "remarks": "Auto-routed to Solid Waste Management"
      }
    ]
  }
}
```

---

### 1.5 `POST /api/complaints/:id/feedback`
Submits star rating and feedback comments after resolution.

- **Auth:** None
- **Body:** `{ "rating": 5, "comment": "Work done quickly, area clean." }`
- **Response `201 Created`:** `{ "message": "Thank you! Your feedback has been recorded." }`

---

## 2. Authentication Endpoints

### 2.1 `POST /api/auth/login`
- **Body:** `{ "email": "admin@mcc.gov.in", "password": "Admin@123" }`
- **Response `200 OK`:**
```json
{
  "token": "eyJhbGciOi...",
  "user": {
    "id": 1,
    "name": "MCC Administrator",
    "email": "admin@mcc.gov.in",
    "role": "admin"
  }
}
```

### 2.2 `GET /api/auth/me`
- **Auth:** `Bearer <token>`
- **Response `200 OK`:** `{ "user": { ... } }`

---

## 3. Field Officer Endpoints

### 3.1 `GET /api/officer/complaints`
Returns complaints assigned to the officer's department.
- **Auth:** `Bearer <token>` (`field_officer` or `admin`)
- **Query Params:** `status=ASSIGNED`, `priority=HIGH`

### 3.2 `PATCH /api/officer/complaints/:id/start`
Moves status from `ASSIGNED` -> `IN_PROGRESS`.
- **Auth:** `Bearer <token>` (`field_officer` or `admin`)

### 3.3 `POST /api/officer/complaints/:id/resolve`
Uploads resolution evidence photo with current GPS. Backend computes Haversine distance from original complaint GPS and moves status to `VERIFICATION_PENDING`.
- **Auth:** `Bearer <token>` (`field_officer` or `admin`)
- **Body (`multipart/form-data`):**
  - `resolution_photo`: File
  - `latitude`: Float
  - `longitude`: Float
  - `notes`: String (optional)

---

## 4. Ward Corporator Endpoints

### 4.1 `GET /api/corporator/complaints`
Complaints strictly within the corporator's assigned ward.

### 4.2 `GET /api/corporator/ward-analytics`
Ward Civic Health Score (0-100), rating, and breakdown factors.

### 4.3 `GET /api/corporator/notifications`
Real-time alerts for new complaints and escalations in their ward.

---

## 5. Admin Endpoints

### 5.1 `GET /api/admin/verification-queue`
List of complaints in `VERIFICATION_PENDING` with side-by-side original vs resolution photos, GPS coords, and computed distance in meters.

### 5.2 `POST /api/admin/complaints/:id/verify`
- **Body:** `{ "decision": "approve" | "reject", "notes": "Verified against site" }`
- **Approve:** status -> `RESOLVED`, citizen notified.
- **Reject:** status -> `REOPENED`, notes recorded, sent back to officer queue.

### 5.3 `GET /api/admin/analytics/overview`
Overall city metrics: total complaints, resolution rate %, department SLA breakdown.

### 5.4 `GET /api/admin/analytics/hotspots` & `POST /api/admin/analytics/recalculate-hotspots`
Trigger or view DBSCAN spatial clusters.

### 5.5 `GET /api/admin/analytics/recurring-issues`
List of recurring civic problems (<50m proximity).

### 5.6 `GET /api/admin/analytics/sla-overdue`
Complaints exceeding SLA deadlines with automated escalation alerts.
