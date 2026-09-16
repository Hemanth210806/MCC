# Mysuru Civic Connect (MCC) — Database Schema Documentation

The system uses a fully normalized relational database schema implemented via SQLAlchemy ORM, compatible with MySQL 8.0 and SQLite.

---

## 1. Table Definitions

### `users`
Stores authenticated municipal staff accounts (Admins, Field Officers, Ward Corporators).
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Unique user ID |
| `name` | VARCHAR(120) | NOT NULL | Full staff name |
| `email` | VARCHAR(120) | NOT NULL, UNIQUE, INDEX | Official email login |
| `phone` | VARCHAR(20) | NULLABLE | Contact telephone |
| `password_hash` | VARCHAR(255) | NOT NULL | bcrypt salted hash |
| `role` | VARCHAR(30) | NOT NULL | `field_officer`, `corporator`, `admin` |
| `department_id` | INTEGER | FOREIGN KEY -> departments.id | Assigned department (for officers) |
| `ward_id` | INTEGER | FOREIGN KEY -> wards.id | Assigned ward (for corporators) |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Registration date |

---

### `wards`
Stores the official 65 Mysuru City Corporation municipal wards.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Internal primary key |
| `ward_number` | INTEGER | NOT NULL, UNIQUE, INDEX | Municipal Ward Number (1 - 65) |
| `ward_name` | VARCHAR(120) | NOT NULL | Ward Name (e.g., J P Nagar) |
| `geometry` | JSON | NOT NULL | Verified GeoJSON polygon/multipolygon |
| `corporator_user_id`| INTEGER | FOREIGN KEY -> users.id | Assigned Ward Corporator |

---

### `departments` & `categories`
| Table | Key Columns | Description |
|---|---|---|
| `departments` | `id`, `name`, `description` | SWM, Roads, Electrical, Water |
| `categories` | `id`, `name`, `description` | Garbage, Potholes, Streetlights, Water Leakage |
| `category_department_map` | `id`, `category_id`, `department_id` | Deterministic automatic department routing |

---

### `important_locations`
Used by the priority engine for location-aware proximity scoring.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Unique place ID |
| `name` | VARCHAR(150) | NOT NULL | Location name |
| `type` | VARCHAR(50) | NOT NULL | `school`, `hospital`, `college`, `bus_stop`, `railway_station`, `govt_office` |
| `latitude` | FLOAT | NOT NULL | WGS84 Latitude |
| `longitude` | FLOAT | NOT NULL | WGS84 Longitude |

---

### `complaints`
Core civic complaint table.
| Column | Type | Description |
|---|---|---|
| `id` | INTEGER | Primary Key |
| `complaint_code` | VARCHAR(30) | Format: `MCC-YYYY-NNNNN` (Unique, Indexed) |
| `citizen_name` | VARCHAR(120) | Optional citizen name |
| `citizen_phone` | VARCHAR(20) | Mobile number for tracking verification |
| `citizen_email` | VARCHAR(120) | Optional contact email |
| `description` | TEXT | Issue description |
| `category_id` | INTEGER | Foreign Key -> `categories.id` |
| `ai_predicted_category_id` | INTEGER | Foreign Key -> `categories.id` |
| `ai_confidence` | FLOAT | Computer vision confidence (0.00 - 1.00) |
| `ai_low_confidence` | BOOLEAN | Flagged if confidence < threshold (0.60) |
| `ai_classification_status` | VARCHAR(30) | `CLASSIFIED`, `LOW_CONFIDENCE`, `REVIEW_REQUIRED` |
| `ai_model_version` | VARCHAR(50) | Model version tag |
| `latitude` | FLOAT | WGS84 Latitude from Geolocation |
| `longitude` | FLOAT | WGS84 Longitude from Geolocation |
| `gps_accuracy_m` | FLOAT | Geolocation accuracy in meters |
| `ward_id` | INTEGER | Auto-assigned via point-in-polygon |
| `department_id` | INTEGER | Auto-routed department |
| `priority` | VARCHAR(20) | `LOW`, `MEDIUM`, `HIGH` |
| `priority_score` | INTEGER | Numeric weighted score |
| `priority_reasons` | JSON | Array of string explanations |
| `status` | VARCHAR(30) | `SUBMITTED`, `ASSIGNED`, `IN_PROGRESS`, `VERIFICATION_PENDING`, `RESOLVED`, `REOPENED`, `OVERDUE` |
| `sla_due_at` | DATETIME | Calculated target resolution deadline |
| `is_demo_data` | BOOLEAN | Distinguishes demo complaints |
| `created_at` / `updated_at` | DATETIME | Timestamps |

---

### `resolution_evidence`
Geotagged proof submitted by Field Officers and verified by Admin.
| Column | Type | Description |
|---|---|---|
| `id` | INTEGER | Primary Key |
| `complaint_id` | INTEGER | Unique Foreign Key -> `complaints.id` |
| `officer_id` | INTEGER | Foreign Key -> `users.id` |
| `photo_path` | VARCHAR(255) | Storage path of resolution photo |
| `latitude` | FLOAT | Resolution GPS Latitude |
| `longitude` | FLOAT | Resolution GPS Longitude |
| `distance_from_original_m` | FLOAT | Haversine distance in meters |
| `verification_status` | VARCHAR(20) | `pending`, `approved`, `rejected` |
| `verified_by_admin_id` | INTEGER | Foreign Key -> `users.id` |
| `verification_notes` | TEXT | Admin feedback notes |
| `submitted_at` / `verified_at` | DATETIME | Timestamps |

---

### Additional Tables
- **`complaint_images`**: Images attached to complaints (`ORIGINAL`, `OTHER`).
- **`complaint_status_history`**: Audit trail of every status transition with user IDs and remarks.
- **`notifications`**: In-app notifications for corporators, officers, departments, and citizens.
- **`feedback`**: Citizen ratings (1-5) and feedback comments post-resolution.
- **`hotspots`**: DBSCAN spatial clusters per category and ward (`center_lat`, `center_lng`, `radius_m`, `complaint_count`).
- **`recurring_issues`**: Links new complaints to resolved ones within 50m and 90 days.
- **`sla_rules`**: Configurable resolution hours per priority level (`HIGH`=24h, `MEDIUM`=72h, `LOW`=168h).
- **`audit_logs`**: Admin actions, verification decisions, and user management events.
