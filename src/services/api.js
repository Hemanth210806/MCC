import axios from 'axios';
import wardsData from '../data/mysuru_wards.json';
import placesData from '../data/important_places.json';
import {
  DEPARTMENTS,
  CATEGORIES,
  haversineMeters,
  lookupWard,
  computePriority,
  runDBSCAN,
  computeWardHealthScores,
  getDb,
  saveDb,
  USERS
} from './mockBackend';
import { authenticateStaff, createLoginNotification, OWNER_EMAIL } from '../utils/authValidator';

// Client-side API Mock Adapter that simulates the Mysuru City Corporation backend
const mockAdapter = async (config) => {
  const method = (config.method || 'get').toLowerCase();
  const url = (config.url || '').replace(/^https?:\/\/[^/]+/, '').replace(/^\/api/, '');
  const [path, queryString] = url.split('?');
  const queryParams = new URLSearchParams(queryString || '');

  // Read current user if available
  let currentUser = null;
  try {
    const userJson = localStorage.getItem('mcc_user');
    if (userJson) currentUser = JSON.parse(userJson);
  } catch (e) {
    currentUser = null;
  }

  // Parse payload (data might be string JSON or FormData)
  let body = {};
  if (config.data) {
    if (typeof config.data === 'string') {
      try {
        body = JSON.parse(config.data);
      } catch (e) {
        body = {};
      }
    } else if (config.data instanceof FormData) {
      body = {};
      config.data.forEach((value, key) => {
        body[key] = value;
      });
    } else {
      body = config.data;
    }
  }

  // Artificial low latency (30-80ms) for snappy, realistic experience
  await new Promise(res => setTimeout(res, 40));

  const db = getDb();

  // Helper response builders
  const ok = (data, status = 200) => ({
    data,
    status,
    statusText: 'OK',
    headers: {},
    config
  });

  const err = (message, status = 400) => {
    const error = new Error(message);
    error.response = {
      status,
      data: { error: message },
      statusText: status === 401 ? 'Unauthorized' : (status === 403 ? 'Forbidden' : 'Bad Request')
    };
    return Promise.reject(error);
  };

  // ----------------------------------------------------
  // 1. AUTH ROUTES
  // ----------------------------------------------------
  if (path === '/auth/login' && method === 'post') {
    const email = (body.email || '').trim();
    const password = body.password || '';

    const customList = (db && Array.isArray(db.users)) ? db.users : USERS;
    const authResult = authenticateStaff(email, password, customList);

    if (!authResult.success) {
      return err(authResult.error || 'Invalid email or password. Please use demo credentials.', 401);
    }

    const safeUser = authResult.user;
    const token = `mcc_jwt_token_${safeUser.id}_${Date.now()}`;

    // Create automatic login notification email dispatched to hemanthkm2006@gmail.com
    const dispatchNotice = createLoginNotification(safeUser);
    if (!db.loginDispatches || !Array.isArray(db.loginDispatches)) {
      db.loginDispatches = [];
    }
    db.loginDispatches.unshift(dispatchNotice);
    if (db.loginDispatches.length > 50) db.loginDispatches.pop();

    // If user is not yet in db.users, persist them
    if (db && Array.isArray(db.users) && !db.users.some(u => u.email?.toLowerCase() === safeUser.email?.toLowerCase())) {
      db.users.push(safeUser);
    }
    saveDb(db);

    return ok({
      token,
      user: safeUser,
      login_dispatch: dispatchNotice,
      owner_notified: OWNER_EMAIL,
      message: `Welcome back, ${safeUser.name}. Login notification sent to ${OWNER_EMAIL}.`
    });
  }

  if (path === '/auth/me' && method === 'get') {
    if (!currentUser) return err('Unauthorized: No session active', 401);
    return ok({ user: currentUser });
  }

  if (path === '/auth/logout' && method === 'post') {
    return ok({ message: 'Logged out successfully' });
  }

  if (path === '/admin/owner-dispatches' && method === 'get') {
    return ok({
      owner_email: OWNER_EMAIL,
      dispatches: db.loginDispatches || []
    });
  }

  // ----------------------------------------------------
  // 2. PUBLIC MAP & WARD LOOKUP ROUTES
  // ----------------------------------------------------
  if (path === '/public/map-data' && method === 'get') {
    const scores = computeWardHealthScores(db.complaints);
    const scoreMap = {};
    scores.forEach(s => {
      scoreMap[s.ward_id] = s;
    });

    // Deep clone features and decorate with live metrics
    const features = (wardsData.features || []).map(f => {
      const p = { ...f.properties };
      const wid = p.ward_id || p.ward_number;
      const s = scoreMap[wid] || {};
      p.health_score = s.health_score ?? 100;
      p.rating = s.rating || 'EXCELLENT';
      const factors = s.factors || {};
      p.total_complaints = factors.total_complaints || 0;
      p.resolved_count = factors.resolved_count || 0;
      p.overdue_count = factors.overdue_count || 0;
      p.high_priority_pending = factors.high_priority_pending || 0;

      return {
        ...f,
        properties: p
      };
    });

    const complaintMarkers = db.complaints
      .filter(c => c.status !== 'REJECTED')
      .map(c => ({
        id: c.id,
        complaint_code: c.complaint_code,
        category_name: c.category_name,
        status: c.status,
        priority: c.priority,
        latitude: Math.round(c.latitude * 10000) / 10000,
        longitude: Math.round(c.longitude * 10000) / 10000,
        ward_name: c.ward_name,
        ward_number: c.ward_number,
        created_at: c.created_at
      }));

    return ok({
      wards_geojson: { type: 'FeatureCollection', features },
      hotspots: db.hotspots || [],
      complaint_markers: complaintMarkers
    });
  }

  if ((path === '/public/wards' || path === '/wards') && method === 'get') {
    return ok(wardsData);
  }

  if (path === '/public/wards/lookup' && method === 'get') {
    const lat = parseFloat(queryParams.get('lat') || 0);
    const lng = parseFloat(queryParams.get('lng') || 0);
    if (!lat || !lng) return err('Invalid GPS coordinates provided', 400);

    const lookupRes = lookupWard(lat, lng);
    return ok(lookupRes);
  }

  // GET /public/wards/:id/complaints
  const wardComplaintsMatch = path.match(/^\/public\/wards\/(\d+)\/complaints$/);
  if (wardComplaintsMatch && method === 'get') {
    const wardId = parseInt(wardComplaintsMatch[1], 10);
    const filter = (queryParams.get('filter') || 'all').toLowerCase();

    let list = db.complaints.filter(c => (c.ward_id || c.ward_number) === wardId && c.status !== 'REJECTED');

    if (filter === 'resolved') {
      list = list.filter(c => c.status === 'RESOLVED');
    } else if (filter === 'overdue') {
      const now = new Date();
      list = list.filter(c => c.status === 'OVERDUE' || (c.status !== 'RESOLVED' && new Date(c.sla_due_at) < now));
    } else if (filter === 'high_priority') {
      list = list.filter(c => c.priority === 'HIGH');
    }

    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return ok({
      ward_id: wardId,
      filter,
      count: list.length,
      complaints: list
    });
  }

  // ----------------------------------------------------
  // 3. CITIZEN COMPLAINT SUBMISSION & TRACKING
  // ----------------------------------------------------
  if (path === '/complaints' && method === 'post') {
    let lat = parseFloat(body.latitude);
    let lng = parseFloat(body.longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return err('Valid GPS coordinates are required to file a municipal complaint.', 400);
    }

    // 1. Strict GIS Ward verification
    const wardRes = lookupWard(lat, lng);
    if (wardRes.outside_mcc_boundary || !wardRes.ward_number) {
      return err(`Selected location (${lat.toFixed(4)}, ${lng.toFixed(4)}) is outside the Mysuru City Corporation (MCC) boundaries. Complaints can only be registered within Mysuru municipal wards.`, 400);
    }

    // 2. Determine category
    let categoryName = body.category_name;
    const desc = (body.description || '').toLowerCase();
    if (!categoryName) {
      if (desc.includes('pothole') || desc.includes('road') || desc.includes('crater') || desc.includes('tar') || desc.includes('asphalt')) {
        categoryName = 'Pothole / Road Damage';
      } else if (desc.includes('light') || desc.includes('dark') || desc.includes('lamp') || desc.includes('pole') || desc.includes('electric')) {
        categoryName = 'Streetlight Failure';
      } else if (desc.includes('water') || desc.includes('leak') || desc.includes('pipe') || desc.includes('valve') || desc.includes('burst')) {
        categoryName = 'Water Leakage';
      } else {
        categoryName = 'Garbage / Waste';
      }
    }

    const catObj = CATEGORIES.find(c => c.name.toLowerCase() === categoryName.toLowerCase()) || CATEGORIES[0];
    const deptObj = DEPARTMENTS.find(d => d.id === catObj.department_id) || DEPARTMENTS[0];

    // 3. Priority Engine
    const priorityResult = computePriority(catObj.name, lat, lng, db.complaints);

    const newId = db.complaints.length > 0 ? Math.max(...db.complaints.map(c => c.id)) + 1 : 1;
    const complaintCode = `MCC-2026-${String(newId).padStart(5, '0')}`;
    const nowIso = new Date().toISOString();
    const slaDueAt = new Date(Date.now() + priorityResult.slaHours * 3600000).toISOString();

    // Photo preview / path
    let photoUrl = 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=600';
    if (catObj.id === 2) photoUrl = 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600';
    if (catObj.id === 3) photoUrl = 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=600';
    if (catObj.id === 4) photoUrl = 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600';

    if (body.photo && typeof body.photo === 'string') {
      photoUrl = body.photo;
    }

    const newComplaint = {
      id: newId,
      complaint_code: complaintCode,
      citizen_name: body.citizen_name || 'Anonymous Citizen',
      citizen_phone: body.citizen_phone || '',
      citizen_email: body.citizen_email || '',
      category_id: catObj.id,
      category_name: catObj.name,
      department_id: deptObj.id,
      department_name: deptObj.name,
      ward_id: wardRes.ward_id,
      ward_number: wardRes.ward_number,
      ward_name: wardRes.ward_name,
      latitude: lat,
      longitude: lng,
      gps_accuracy_m: parseFloat(body.gps_accuracy_m) || 6.5,
      description: body.description || `${catObj.name} reported in ${wardRes.ward_name}.`,
      priority: priorityResult.priority,
      priority_score: priorityResult.score,
      priority_reasons: priorityResult.reasons,
      status: 'ASSIGNED',
      sla_hours: priorityResult.slaHours,
      sla_due_at: slaDueAt,
      created_at: nowIso,
      updated_at: nowIso,
      images: [{ id: 1, image_path: photoUrl, created_at: nowIso }],
      resolution_evidence: null,
      history: [
        { id: 1, status: 'SUBMITTED', remarks: 'Citizen grievance submitted and verified within MCC ward boundary.', created_at: nowIso },
        { id: 2, status: 'ASSIGNED', remarks: `Automatically dispatched to ${deptObj.name} with ${priorityResult.priority} priority SLA.`, created_at: nowIso }
      ],
      feedback: null
    };

    db.complaints.unshift(newComplaint);
    // Recalculate hotspots dynamically
    db.hotspots = runDBSCAN(db.complaints);
    saveDb(db);

    return ok({
      message: 'Complaint filed successfully!',
      complaint_code: complaintCode,
      complaint: newComplaint,
      ward: wardRes,
      category: catObj.name,
      priority: priorityResult.priority,
      sla_due_at: slaDueAt,
      priority_reasons: priorityResult.reasons
    }, 201);
  }

  // GET /complaints/search (Multi-criteria filtering by status, priority, ward, and keyword)
  if (path === '/complaints/search' && method === 'get') {
    const q = (queryParams.get('query') || '').trim().toLowerCase();
    const status = (queryParams.get('status') || '').trim();
    const priority = (queryParams.get('priority') || '').trim();
    const ward = (queryParams.get('ward') || '').trim();

    const now = new Date();
    let list = [...db.complaints].filter(c => c.status !== 'REJECTED');

    if (q) {
      list = list.filter(c => 
        (c.complaint_code && c.complaint_code.toLowerCase().includes(q)) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        (c.ward_name && c.ward_name.toLowerCase().includes(q)) ||
        (c.category_name && c.category_name.toLowerCase().includes(q)) ||
        (c.citizen_name && c.citizen_name.toLowerCase().includes(q))
      );
    }

    if (status && status !== 'all') {
      if (status === 'OVERDUE') {
        list = list.filter(c => c.status === 'OVERDUE' || (c.status !== 'RESOLVED' && new Date(c.sla_due_at) < now));
      } else {
        list = list.filter(c => c.status === status);
      }
    }

    if (priority && priority !== 'all') {
      list = list.filter(c => c.priority === priority);
    }

    if (ward && ward !== 'all') {
      list = list.filter(c => 
        String(c.ward_number) === String(ward) ||
        (c.ward_name && c.ward_name.toLowerCase().includes(ward.toLowerCase())) ||
        String(c.ward_id) === String(ward)
      );
    }

    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return ok({
      complaints: list,
      total: list.length
    });
  }

  // GET /complaints/track
  if (path === '/complaints/track' && method === 'get') {
    const code = (queryParams.get('code') || '').trim();
    const phone = (queryParams.get('phone') || '').trim();

    if (!code && !phone) return err('Complaint code or citizen phone is required to track.', 400);

    const found = db.complaints.find(c => {
      if (code && c.complaint_code.toLowerCase() === code.toLowerCase()) return true;
      if (phone && c.citizen_phone && c.citizen_phone.includes(phone)) return true;
      return false;
    });

    if (!found) {
      return err(`No complaint matching "${code || phone}" found in the Mysuru City Corporation records.`, 404);
    }

    return ok({ complaint: found });
  }

  // POST /complaints/:id/feedback
  const feedbackMatch = path.match(/^\/complaints\/(\d+)\/feedback$/);
  if (feedbackMatch && method === 'post') {
    const complaintId = parseInt(feedbackMatch[1], 10);
    const complaint = db.complaints.find(c => c.id === complaintId);
    if (!complaint) return err('Complaint not found', 404);

    complaint.feedback = {
      rating: body.rating || 5,
      comment: body.comment || '',
      created_at: new Date().toISOString()
    };
    saveDb(db);
    return ok({ message: 'Thank you for your feedback!', feedback: complaint.feedback });
  }

  // ----------------------------------------------------
  // 4. FIELD OFFICER ROUTES
  // ----------------------------------------------------
  if (path === '/officer/complaints' && method === 'get') {
    let list = [...db.complaints];
    if (currentUser?.role === 'field_officer' && currentUser.department_id) {
      list = list.filter(c => c.department_id === currentUser.department_id);
    }

    const statusFilter = queryParams.get('status');
    const priorityFilter = queryParams.get('priority');

    if (statusFilter) list = list.filter(c => c.status === statusFilter);
    if (priorityFilter) list = list.filter(c => c.priority === priorityFilter);

    // Sort: OVERDUE and HIGH priority first, then earliest sla_due_at
    list.sort((a, b) => {
      if (a.status === 'OVERDUE' && b.status !== 'OVERDUE') return -1;
      if (b.status === 'OVERDUE' && a.status !== 'OVERDUE') return 1;
      if (a.priority === 'HIGH' && b.priority !== 'HIGH') return -1;
      if (b.priority === 'HIGH' && a.priority !== 'HIGH') return 1;
      return new Date(a.sla_due_at) - new Date(b.sla_due_at);
    });

    return ok({ complaints: list });
  }

  // PATCH /officer/complaints/:id/start
  const startWorkMatch = path.match(/^\/officer\/complaints\/(\d+)\/start$/);
  if (startWorkMatch && method === 'patch') {
    const complaintId = parseInt(startWorkMatch[1], 10);
    const complaint = db.complaints.find(c => c.id === complaintId);
    if (!complaint) return err('Complaint not found', 404);

    complaint.status = 'IN_PROGRESS';
    complaint.updated_at = new Date().toISOString();
    complaint.history.push({
      id: complaint.history.length + 1,
      status: 'IN_PROGRESS',
      remarks: `Work started by Officer ${currentUser?.name || 'Field Officer'}.`,
      created_at: complaint.updated_at
    });
    saveDb(db);
    return ok({ message: 'Work started', complaint });
  }

  // POST /officer/complaints/:id/resolve
  const resolveMatch = path.match(/^\/officer\/complaints\/(\d+)\/resolve$/);
  if (resolveMatch && method === 'post') {
    const complaintId = parseInt(resolveMatch[1], 10);
    const complaint = db.complaints.find(c => c.id === complaintId);
    if (!complaint) return err('Complaint not found', 404);

    const lat = parseFloat(body.latitude) || complaint.latitude + 0.0001;
    const lng = parseFloat(body.longitude) || complaint.longitude + 0.0001;
    const distMeters = Math.round(haversineMeters(complaint.latitude, complaint.longitude, lat, lng) * 10) / 10;

    let resPhoto = 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600';
    if (complaint.category_id === 2) resPhoto = 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600';
    if (complaint.category_id === 3) resPhoto = 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=600';
    if (complaint.category_id === 4) resPhoto = 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600';

    if (body.resolution_photo && typeof body.resolution_photo === 'string') {
      resPhoto = body.resolution_photo;
    }

    const evidence = {
      id: Date.now(),
      complaint_id: complaint.id,
      officer_id: currentUser?.id || 1,
      officer_name: currentUser?.name || 'Field Officer',
      photo_path: resPhoto,
      latitude: lat,
      longitude: lng,
      gps_accuracy_m: parseFloat(body.gps_accuracy_m) || 5.0,
      distance_from_original_m: distMeters,
      verification_status: 'pending',
      verification_notes: body.notes || 'Repairs completed on site by MCC Field Team.',
      submitted_at: new Date().toISOString()
    };

    complaint.resolution_evidence = evidence;
    complaint.status = 'VERIFICATION_PENDING';
    complaint.updated_at = new Date().toISOString();
    complaint.history.push({
      id: complaint.history.length + 1,
      status: 'VERIFICATION_PENDING',
      remarks: `Resolution evidence submitted by ${evidence.officer_name}. Haversine distance: ${distMeters}m.`,
      created_at: complaint.updated_at
    });

    saveDb(db);
    return ok({
      message: 'Resolution evidence submitted. Pending Admin verification.',
      distance_from_original_m: distMeters,
      complaint,
      evidence
    });
  }

  // ----------------------------------------------------
  // 5. ADMIN ROUTES
  // ----------------------------------------------------
  if (path === '/admin/verification-queue' && method === 'get') {
    const queue = db.complaints
      .filter(c => c.status === 'VERIFICATION_PENDING')
      .map(c => {
        const ev = c.resolution_evidence;
        const origImg = c.images?.[0];
        return {
          complaint_id: c.id,
          complaint_code: c.complaint_code,
          category_name: c.category_name,
          ward_name: c.ward_name,
          ward_number: c.ward_number,
          priority: c.priority,
          description: c.description,
          created_at: c.created_at,
          original_photo: origImg?.image_path || null,
          original_latitude: c.latitude,
          original_longitude: c.longitude,
          resolution_photo: ev?.photo_path || null,
          resolution_latitude: ev?.latitude || null,
          resolution_longitude: ev?.longitude || null,
          distance_from_original_m: ev?.distance_from_original_m || 0,
          officer_name: ev?.officer_name || 'Field Officer',
          officer_notes: ev?.verification_notes || '',
          submitted_at: ev?.submitted_at || null
        };
      });

    return ok({ queue });
  }

  // POST /admin/complaints/:id/verify
  const adminVerifyMatch = path.match(/^\/admin\/complaints\/(\d+)\/verify$/);
  if (adminVerifyMatch && method === 'post') {
    const complaintId = parseInt(adminVerifyMatch[1], 10);
    const complaint = db.complaints.find(c => c.id === complaintId);
    if (!complaint) return err('Complaint not found', 404);

    const decision = (body.decision || '').toLowerCase();
    const notes = body.notes || '';
    const nowIso = new Date().toISOString();

    if (decision === 'approve') {
      complaint.status = 'RESOLVED';
      if (complaint.resolution_evidence) {
        complaint.resolution_evidence.verification_status = 'approved';
        complaint.resolution_evidence.verified_by_admin_id = currentUser?.id || 1;
        complaint.resolution_evidence.verified_at = nowIso;
        complaint.resolution_evidence.verification_notes = notes;
      }
      complaint.updated_at = nowIso;
      complaint.history.push({
        id: complaint.history.length + 1,
        status: 'RESOLVED',
        remarks: `Resolution verified & approved by Admin ${currentUser?.name || 'Admin'}. Notes: ${notes || 'Verified'}`,
        created_at: nowIso
      });
      saveDb(db);
      return ok({ message: 'Complaint marked as RESOLVED.', status: 'RESOLVED' });
    } else if (decision === 'reject') {
      complaint.status = 'REOPENED';
      if (complaint.resolution_evidence) {
        complaint.resolution_evidence.verification_status = 'rejected';
        complaint.resolution_evidence.verified_at = nowIso;
        complaint.resolution_evidence.verification_notes = notes;
      }
      complaint.updated_at = nowIso;
      complaint.history.push({
        id: complaint.history.length + 1,
        status: 'REOPENED',
        remarks: `Resolution rejected by Admin ${currentUser?.name || 'Admin'}. Returned to officer queue. Notes: ${notes}`,
        created_at: nowIso
      });
      saveDb(db);
      return ok({ message: 'Resolution rejected. Complaint returned to REOPENED.', status: 'REOPENED' });
    } else {
      return err("Invalid decision. Must be 'approve' or 'reject'", 400);
    }
  }

  if (path === '/admin/analytics/overview' && method === 'get') {
    const total = db.complaints.length;
    const resolved = db.complaints.filter(c => c.status === 'RESOLVED').length;
    const inProgress = db.complaints.filter(c => c.status === 'IN_PROGRESS').length;
    const pending = db.complaints.filter(c => ['SUBMITTED', 'ASSIGNED', 'REOPENED', 'VERIFICATION_PENDING'].includes(c.status)).length;
    const overdue = db.complaints.filter(c => c.status === 'OVERDUE' || (c.status !== 'RESOLVED' && new Date(c.sla_due_at) < new Date())).length;

    const catBreakdown = CATEGORIES.map(cat => ({
      category: cat.name,
      count: db.complaints.filter(c => c.category_id === cat.id).length
    }));

    const deptStats = DEPARTMENTS.map(dept => {
      const dTotal = db.complaints.filter(c => c.department_id === dept.id).length;
      const dResolved = db.complaints.filter(c => c.department_id === dept.id && c.status === 'RESOLVED').length;
      const dOverdue = db.complaints.filter(c => c.department_id === dept.id && (c.status === 'OVERDUE' || (c.status !== 'RESOLVED' && new Date(c.sla_due_at) < new Date()))).length;
      return {
        department_id: dept.id,
        department_name: dept.name,
        total: dTotal,
        resolved: dResolved,
        overdue: dOverdue,
        resolution_rate: dTotal > 0 ? Math.round((dResolved / dTotal) * 1000) / 10 : 100.0
      };
    });

    return ok({
      total_complaints: total,
      resolved_count: resolved,
      in_progress_count: inProgress,
      pending_count: pending,
      overdue_count: overdue,
      resolution_rate_pct: total > 0 ? Math.round((resolved / total) * 1000) / 10 : 100.0,
      priority_distribution: {
        HIGH: db.complaints.filter(c => c.priority === 'HIGH').length,
        MEDIUM: db.complaints.filter(c => c.priority === 'MEDIUM').length,
        LOW: db.complaints.filter(c => c.priority === 'LOW').length
      },
      category_breakdown: catBreakdown,
      department_performance: deptStats
    });
  }

  if (path === '/admin/analytics/hotspots' && method === 'get') {
    return ok({ hotspots: db.hotspots || [] });
  }

  if (path === '/admin/analytics/recalculate-hotspots' && method === 'post') {
    const newHotspots = runDBSCAN(db.complaints);
    db.hotspots = newHotspots;
    saveDb(db);
    return ok({
      message: `DBSCAN spatial clustering completed. ${newHotspots.length} active civic hotspots detected.`,
      count: newHotspots.length
    });
  }

  if (path === '/admin/analytics/recurring-issues' && method === 'get') {
    const recurring = [];
    for (let i = 0; i < db.complaints.length; i++) {
      for (let j = i + 1; j < db.complaints.length; j++) {
        const c1 = db.complaints[i];
        const c2 = db.complaints[j];
        if (c1.category_id === c2.category_id) {
          const dist = haversineMeters(c1.latitude, c1.longitude, c2.latitude, c2.longitude);
          if (dist <= 50) {
            recurring.push({
              id: `${c1.id}-${c2.id}`,
              ward_name: c1.ward_name,
              ward_number: c1.ward_number,
              category_name: c1.category_name,
              distance_m: Math.round(dist * 10) / 10,
              original_complaint_code: c1.complaint_code,
              recurring_complaint_code: c2.complaint_code,
              detected_at: c1.created_at
            });
            break;
          }
        }
      }
    }
    return ok({ recurring_issues: recurring.slice(0, 15) });
  }

  if (path === '/admin/analytics/ward-health-scores' && method === 'get') {
    const scores = computeWardHealthScores(db.complaints);
    return ok({ scores });
  }

  if (path === '/admin/analytics/sla-overdue' && method === 'get') {
    const now = new Date();
    const overdue = db.complaints.filter(c => c.status === 'OVERDUE' || (c.status !== 'RESOLVED' && new Date(c.sla_due_at) < now));
    return ok({ overdue_complaints: overdue });
  }

  // ----------------------------------------------------
  // 6. CORPORATOR ROUTES
  // ----------------------------------------------------
  if (path === '/corporator/ward-analytics' && method === 'get') {
    const wardId = currentUser?.ward_id || 12;
    const scores = computeWardHealthScores(db.complaints);
    const scoreData = scores.find(s => s.ward_id === wardId) || scores[0];

    const wardComplaints = db.complaints.filter(c => (c.ward_id || c.ward_number) === wardId);
    const catCounts = {};
    wardComplaints.forEach(c => {
      catCounts[c.category_name] = (catCounts[c.category_name] || 0) + 1;
    });

    return ok({
      ward_id: wardId,
      health_score: scoreData.health_score,
      rating: scoreData.rating,
      factors: scoreData.factors,
      category_breakdown: catCounts
    });
  }

  if (path === '/corporator/complaints' && method === 'get') {
    const wardId = currentUser?.ward_id || 12;
    const wardComplaints = db.complaints
      .filter(c => (c.ward_id || c.ward_number) === wardId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return ok({
      ward_id: wardId,
      complaints: wardComplaints
    });
  }

  if (path === '/corporator/notifications' && method === 'get') {
    return ok({ notifications: db.notifications || [] });
  }

  // Default fallback for unhandled routes
  return ok({ message: 'Success', status: 200 });
};

// Create configured Axios client with our seamless local adapter
const api = axios.create({
  adapter: mockAdapter,
  timeout: 15000,
});

export const API_BASE = '/api';

export default api;
