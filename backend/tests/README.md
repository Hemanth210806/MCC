# MCC Backend Test Suite

This directory contains automated unit and integration tests for Mysuru Civic Connect (MCC) covering all core domain services, GIS lookups, security rules, and API endpoints.

## Running Tests

From the `backend/` directory or project root:

```bash
# Run all tests with verbose output
pytest tests/ -v

# Run a specific test class or function
pytest tests/test_mcc.py::test_real_ward_lookup -v
```

## Test Coverage Summary

1. **`test_real_ward_lookup`**: Tests Shapely point-in-polygon resolution against verified real Mysuru City Corporation ward polygons (e.g. Ward 12 J P Nagar).
2. **`test_outside_mcc_boundary`**: Tests out-of-boundary protection ensuring points outside Mysuru urban boundaries are flagged (`outside_mcc_boundary: true`) and never falsely assigned.
3. **`test_haversine_distance` & `test_zero_distance`**: Tests great-circle distance computation in meters between GPS coordinates.
4. **`test_priority_engine_near_hospital` & `test_priority_engine_low_severity`**: Tests weighted priority rules engine, score computation, and reason list explanations.
5. **`test_routing_service`**: Tests automated config-driven mapping from category to department without manual assignment.
6. **`test_sla_due_date` & `test_valid_status_transitions`**: Tests SLA deadline calculations and strict state machine transitions (`SUBMITTED -> ASSIGNED -> IN_PROGRESS -> VERIFICATION_PENDING -> RESOLVED`), ensuring direct unauthorized transitions to `RESOLVED` are rejected.
7. **`test_recurring_issue_detection`**: Tests spatiotemporal recurrence detection for same-category issues within 50m of resolved complaints.
8. **`test_officer_cannot_access_admin_queue` & `test_admin_can_access_admin_queue`**: Tests JWT RBAC middleware ensuring role restrictions are strictly enforced.
9. **`test_file_complaint_api`**: End-to-end integration test of citizen submission endpoint with multipart image upload, classification, priority calculation, routing, and complaint ID generation.
