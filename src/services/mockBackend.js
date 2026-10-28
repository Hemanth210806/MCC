// Authentic Client-Side Database & Civic Redressal Engine for Mysuru City Corporation
import wardsData from '../data/mysuru_wards.json';
import placesData from '../data/important_places.json';

const STORAGE_KEY = 'mcc_civic_database_v2';

// 4 Official MCC Departments
export const DEPARTMENTS = [
  { id: 1, name: 'Solid Waste Management', description: 'Handles garbage collection, street sweeping, dump sites, and waste processing.' },
  { id: 2, name: 'Roads & Infrastructure', description: 'Handles road repairs, potholes, pavements, and civil maintenance.' },
  { id: 3, name: 'Electrical & Street Lighting', description: 'Handles streetlights, high-mast lamps, poles, and public illumination.' },
  { id: 4, name: 'Water Supply & Sewerage', description: 'Handles water pipelines, leakages, valves, drainage, and sewage.' }
];

// 4 Official Categories
export const CATEGORIES = [
  { id: 1, name: 'Garbage / Waste', department_id: 1, base_score: 30 },
  { id: 2, name: 'Pothole / Road Damage', department_id: 2, base_score: 40 },
  { id: 3, name: 'Streetlight Failure', department_id: 3, base_score: 25 },
  { id: 4, name: 'Water Leakage', department_id: 4, base_score: 45 }
];

// Haversine Distance in meters
export function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Ray-casting Point-in-Polygon for GeoJSON
function pointInRing(lat, lng, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = ((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function pointInPolygonGeometry(lat, lng, geom) {
  if (!geom) return false;
  if (geom.type === 'Polygon') {
    if (!pointInRing(lat, lng, geom.coordinates[0])) return false;
    for (let h = 1; h < geom.coordinates.length; h++) {
      if (pointInRing(lat, lng, geom.coordinates[h])) return false;
    }
    return true;
  }
  if (geom.type === 'MultiPolygon') {
    for (const poly of geom.coordinates) {
      if (pointInRing(lat, lng, poly[0])) return true;
    }
  }
  return false;
}

// Ward Reverse GIS Lookup
export function lookupWard(lat, lng) {
  const features = wardsData.features || [];
  // 1. Exact match
  for (const f of features) {
    if (pointInPolygonGeometry(lat, lng, f.geometry)) {
      return {
        outside_mcc_boundary: false,
        ward_number: f.properties.ward_number,
        ward_name: f.properties.ward_name,
        ward_id: f.properties.ward_id || f.properties.ward_number
      };
    }
  }

  // 2. Centerline tolerance (within ~400 meters of closest ward boundary)
  let closest = null;
  let minDist = Infinity;
  for (const f of features) {
    const coords = f.geometry.type === 'Polygon' ? f.geometry.coordinates[0] : (f.geometry.coordinates[0]?.[0] || []);
    for (let k = 0; k < coords.length; k += 5) {
      const d = haversineMeters(lat, lng, coords[k][1], coords[k][0]);
      if (d < minDist) {
        minDist = d;
        closest = f;
      }
    }
  }

  if (closest && minDist <= 400) {
    return {
      outside_mcc_boundary: false,
      ward_number: closest.properties.ward_number,
      ward_name: closest.properties.ward_name,
      ward_id: closest.properties.ward_id || closest.properties.ward_number
    };
  }

  return {
    outside_mcc_boundary: true,
    ward_number: null,
    ward_name: null,
    ward_id: null
  };
}

// Priority Engine
export function computePriority(categoryName, lat, lng, nearbyComplaints = []) {
  let score = 0;
  const reasons = [];

  const catObj = CATEGORIES.find(c => c.name.toLowerCase() === (categoryName || '').toLowerCase()) || CATEGORIES[0];
  score += catObj.base_score;
  reasons.push(`Base severity for ${catObj.name}: +${catObj.base_score}`);

  // Proximity to verified important places
  const places = placesData.features || [];
  let minSchoolHospDist = Infinity;
  let nearestSchoolHosp = '';
  let minCollegeDist = Infinity;
  let nearestCollege = '';
  let minBusDist = Infinity;
  let nearestBus = '';

  for (const p of places) {
    const coords = p.geometry.coordinates;
    const dist = haversineMeters(lat, lng, coords[1], coords[0]);
    const type = p.properties.type;
    const name = p.properties.name;

    if (type === 'school' || type === 'hospital') {
      if (dist < minSchoolHospDist) {
        minSchoolHospDist = dist;
        nearestSchoolHosp = `${name} (${type})`;
      }
    } else if (type === 'college') {
      if (dist < minCollegeDist) {
        minCollegeDist = dist;
        nearestCollege = name;
      }
    } else if (type === 'bus_stop' || type === 'railway_station') {
      if (dist < minBusDist) {
        minBusDist = dist;
        nearestBus = name;
      }
    }
  }

  if (minSchoolHospDist <= 100) {
    score += 30;
    reasons.push(`Within 100m of ${nearestSchoolHosp} (${Math.round(minSchoolHospDist)}m): +30`);
  } else if (minSchoolHospDist <= 300) {
    score += 15;
    reasons.push(`Within 300m of ${nearestSchoolHosp} (${Math.round(minSchoolHospDist)}m): +15`);
  }

  if (minCollegeDist <= 200) {
    score += 10;
    reasons.push(`Within 200m of ${nearestCollege} (${Math.round(minCollegeDist)}m): +10`);
  }

  if (minBusDist <= 300) {
    score += 5;
    reasons.push(`Within 300m of ${nearestBus} (${Math.round(minBusDist)}m): +5`);
  }

  // Density bonus: similar complaints within 300m
  const similarNearby = nearbyComplaints.filter(c => 
    c.category_id === catObj.id &&
    c.status !== 'RESOLVED' &&
    haversineMeters(lat, lng, c.latitude, c.longitude) <= 300
  ).length;

  if (similarNearby > 0) {
    const bonus = Math.min(similarNearby * 5, 25);
    score += bonus;
    reasons.push(`${similarNearby} similar reports nearby within 300m: +${bonus}`);
  }

  let priority = 'LOW';
  let slaHours = 168; // 7 days
  if (score >= 70) {
    priority = 'HIGH';
    slaHours = 24; // 24 hours
  } else if (score >= 40) {
    priority = 'MEDIUM';
    slaHours = 72; // 72 hours
  }

  return { priority, score, reasons, slaHours };
}

// DBSCAN Hotspot Clustering
export function runDBSCAN(complaints, epsMeters = 350, minPts = 3) {
  const activeComplaints = complaints.filter(c => c.status !== 'RESOLVED' && c.status !== 'REJECTED');
  const clusters = [];
  const visited = new Set();
  const clustered = new Set();

  function getNeighbors(target) {
    return activeComplaints.filter(c => 
      c.id !== target.id &&
      c.category_id === target.category_id &&
      haversineMeters(target.latitude, target.longitude, c.latitude, c.longitude) <= epsMeters
    );
  }

  let clusterId = 1;
  for (const c of activeComplaints) {
    if (visited.has(c.id)) continue;
    visited.add(c.id);

    const neighbors = getNeighbors(c);
    if (neighbors.length < minPts - 1) continue; // Not a core point

    const currentCluster = [c];
    clustered.add(c.id);
    const queue = [...neighbors];

    for (let i = 0; i < queue.length; i++) {
      const neighbor = queue[i];
      if (!visited.has(neighbor.id)) {
        visited.add(neighbor.id);
        const subNeighbors = getNeighbors(neighbor);
        if (subNeighbors.length >= minPts - 1) {
          queue.push(...subNeighbors.filter(sn => !queue.some(q => q.id === sn.id)));
        }
      }
      if (!clustered.has(neighbor.id)) {
        currentCluster.push(neighbor);
        clustered.add(neighbor.id);
      }
    }

    if (currentCluster.length >= minPts) {
      const avgLat = currentCluster.reduce((sum, item) => sum + item.latitude, 0) / currentCluster.length;
      const avgLng = currentCluster.reduce((sum, item) => sum + item.longitude, 0) / currentCluster.length;
      clusters.push({
        id: clusterId++,
        ward_id: currentCluster[0].ward_id,
        category_id: currentCluster[0].category_id,
        category_name: currentCluster[0].category_name,
        center_lat: avgLat,
        center_lng: avgLng,
        complaint_count: currentCluster.length,
        radius_m: epsMeters,
        detected_at: new Date().toISOString(),
        active: true
      });
    }
  }

  return clusters;
}

// Ward Civic Health Scoring (0 - 100)
export function computeWardHealthScores(complaints) {
  const wards = wardsData.features || [];
  return wards.map(feat => {
    const p = feat.properties;
    const wardId = p.ward_id || p.ward_number;
    const wardComplaints = complaints.filter(c => (c.ward_id || c.ward_number) === wardId);
    const total = wardComplaints.length;

    if (total === 0) {
      return {
        ward_id: wardId,
        ward_number: p.ward_number,
        ward_name: p.ward_name,
        health_score: 100,
        rating: 'EXCELLENT',
        factors: {
          total_complaints: 0,
          resolved_count: 0,
          resolution_rate_pct: 100,
          overdue_count: 0,
          high_priority_pending: 0,
          recurring_issues_count: 0,
          resolution_bonus: 15
        }
      };
    }

    const resolvedCount = wardComplaints.filter(c => c.status === 'RESOLVED').length;
    const resolutionRate = (resolvedCount / total) * 100;
    const overdueCount = wardComplaints.filter(c => c.status === 'OVERDUE' || (c.status !== 'RESOLVED' && new Date(c.sla_due_at) < new Date())).length;
    const highPriorityPending = wardComplaints.filter(c => c.priority === 'HIGH' && c.status !== 'RESOLVED').length;
    
    // Check recurring
    let recurringCount = 0;
    for (let i = 0; i < wardComplaints.length; i++) {
      for (let j = i + 1; j < wardComplaints.length; j++) {
        const c1 = wardComplaints[i];
        const c2 = wardComplaints[j];
        if (c1.category_id === c2.category_id && haversineMeters(c1.latitude, c1.longitude, c2.latitude, c2.longitude) <= 50) {
          recurringCount++;
          break;
        }
      }
    }

    const resBonus = resolutionRate >= 80 ? 15 : (resolutionRate >= 60 ? 10 : 0);
    const rawScore = 100 - (overdueCount * 5) - (highPriorityPending * 4) - (recurringCount * 3) + resBonus;
    const finalScore = Math.max(0, Math.min(100, Math.round(rawScore)));

    let rating = 'CRITICAL';
    if (finalScore >= 80) rating = 'EXCELLENT';
    else if (finalScore >= 60) rating = 'GOOD';
    else if (finalScore >= 40) rating = 'AVERAGE';

    return {
      ward_id: wardId,
      ward_number: p.ward_number,
      ward_name: p.ward_name,
      health_score: finalScore,
      rating,
      factors: {
        total_complaints: total,
        resolved_count: resolvedCount,
        resolution_rate_pct: Math.round(resolutionRate * 10) / 10,
        overdue_count: overdueCount,
        high_priority_pending: highPriorityPending,
        recurring_issues_count: recurringCount,
        resolution_bonus: resBonus
      }
    };
  });
}

// Generate Realistic Demo Complaints
function generateInitialComplaints() {
  const wards = wardsData.features || [];
  const complaints = [];
  const now = Date.now();

  const photoFallbacks = {
    1: { issue: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=600', res: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600' },
    2: { issue: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', res: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600' },
    3: { issue: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=600', res: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=600' },
    4: { issue: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600', res: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600' }
  };

  const descriptions = {
    1: ['Overflowing municipal waste bin near market entrance', 'Piled up wet and dry waste on the pedestrian walkway', 'Open roadside dumping attracting stray animals'],
    2: ['Deep crater pothole causing vehicular traffic slowing', 'Damaged asphalt after pipeline dig-up', 'Multiple potholes dangerous for two-wheelers during rain'],
    3: ['Streetlight pole dark for over 4 consecutive nights', 'Flickering LED lamp and broken fixture on main cross road', 'Damaged junction box with exposed electrical wiring'],
    4: ['High-pressure drinking water main line burst on main road', 'Leaking distribution valve wasting municipal potable water', 'Underground pipe rupture flooding local storm drain']
  };

  for (let i = 1; i <= 96; i++) {
    // Focus in real central Mysuru wards
    const targetWard = wards[(i * 3) % wards.length];
    const wardProps = targetWard.properties;
    const geom = targetWard.geometry;
    
    // Pick point inside or near centroid of polygon
    const ring = geom.type === 'Polygon' ? geom.coordinates[0] : geom.coordinates[0][0];
    const centerPoint = ring[Math.floor(ring.length / 2)] || [76.645, 12.298];
    const jitterLat = (Math.sin(i * 17) * 0.003);
    const jitterLng = (Math.cos(i * 23) * 0.003);
    const lat = centerPoint[1] + jitterLat;
    const lng = centerPoint[0] + jitterLng;

    const catId = ((i % 4) + 1);
    const cat = CATEGORIES.find(c => c.id === catId);
    const dept = DEPARTMENTS.find(d => d.id === cat.department_id);

    let status = 'ASSIGNED';
    let daysAgo = 1;
    let priority = i % 3 === 0 ? 'HIGH' : (i % 2 === 0 ? 'MEDIUM' : 'LOW');

    if (i <= 26) {
      status = 'RESOLVED';
      daysAgo = 8 + (i % 20);
    } else if (i <= 46) {
      status = 'IN_PROGRESS';
      daysAgo = 2 + (i % 3);
    } else if (i <= 61) {
      status = 'VERIFICATION_PENDING';
      daysAgo = 2;
    } else if (i <= 76) {
      status = 'OVERDUE';
      priority = 'HIGH';
      daysAgo = 6;
    } else {
      status = 'ASSIGNED';
      daysAgo = 0.5;
    }

    const createdAt = new Date(now - daysAgo * 86400000).toISOString();
    const slaHours = priority === 'HIGH' ? 24 : (priority === 'MEDIUM' ? 72 : 168);
    const slaDueAt = new Date(new Date(createdAt).getTime() + slaHours * 3600000).toISOString();

    const descList = descriptions[catId];
    const description = `${descList[i % descList.length]} in ${wardProps.ward_name}.`;

    const code = `MCC-2026-${String(i).padStart(5, '0')}`;
    const images = [
      {
        id: i,
        image_path: photoFallbacks[catId].issue,
        created_at: createdAt
      }
    ];

    let resolutionEvidence = null;
    if (status === 'RESOLVED' || status === 'VERIFICATION_PENDING') {
      const resLat = lat + 0.00015;
      const resLng = lng + 0.00018;
      resolutionEvidence = {
        id: i,
        complaint_id: i,
        officer_id: 1,
        officer_name: 'Suresh Gowda',
        photo_path: photoFallbacks[catId].res,
        latitude: resLat,
        longitude: resLng,
        distance_from_original_m: Math.round(haversineMeters(lat, lng, resLat, resLng) * 10) / 10,
        submitted_at: new Date(new Date(createdAt).getTime() + 18 * 3600000).toISOString(),
        verification_status: status === 'RESOLVED' ? 'approved' : 'pending',
        verification_notes: status === 'RESOLVED' 
          ? 'Site inspection complete. Problem repaired according to municipal standards.' 
          : 'Repairs completed by Field Squad. Awaiting Admin verification.',
        verified_by_admin_id: status === 'RESOLVED' ? 1 : null,
        verified_at: status === 'RESOLVED' ? new Date(new Date(createdAt).getTime() + 24 * 3600000).toISOString() : null
      };
    }

    const history = [
      { id: 1, status: 'SUBMITTED', remarks: 'Citizen grievance filed and geotagged.', created_at: createdAt },
      { id: 2, status: 'ASSIGNED', remarks: `Routed to ${dept.name} automatically based on SLA schedule.`, created_at: new Date(new Date(createdAt).getTime() + 600000).toISOString() }
    ];

    if (status === 'IN_PROGRESS' || status === 'VERIFICATION_PENDING' || status === 'RESOLVED') {
      history.push({ id: 3, status: 'IN_PROGRESS', remarks: 'Field Officer dispatched to location. Work initiated.', created_at: new Date(new Date(createdAt).getTime() + 3600000).toISOString() });
    }
    if (status === 'VERIFICATION_PENDING' || status === 'RESOLVED') {
      history.push({ id: 4, status: 'VERIFICATION_PENDING', remarks: 'Resolution proof submitted by Field Officer with live GPS.', created_at: new Date(new Date(createdAt).getTime() + 18 * 3600000).toISOString() });
    }
    if (status === 'RESOLVED') {
      history.push({ id: 5, status: 'RESOLVED', remarks: 'Admin verified side-by-side evidence and marked issue as RESOLVED.', created_at: new Date(new Date(createdAt).getTime() + 24 * 3600000).toISOString() });
    }

    const feedback = status === 'RESOLVED' && i % 2 === 0 ? {
      rating: 5,
      comment: 'Prompt resolution by Mysuru City Corporation team! Thank you.',
      created_at: new Date(new Date(createdAt).getTime() + 26 * 3600000).toISOString()
    } : null;

    complaints.push({
      id: i,
      complaint_code: code,
      citizen_name: `Citizen ${i}`,
      citizen_phone: `98450${String(i).padStart(5, '0')}`,
      citizen_email: `citizen${i}@gmail.com`,
      category_id: catId,
      category_name: cat.name,
      department_id: dept.id,
      department_name: dept.name,
      ward_id: wardProps.ward_id || wardProps.ward_number,
      ward_number: wardProps.ward_number,
      ward_name: wardProps.ward_name,
      latitude: lat,
      longitude: lng,
      gps_accuracy_m: 8.5,
      description,
      priority,
      priority_score: priority === 'HIGH' ? 85 : (priority === 'MEDIUM' ? 55 : 30),
      priority_reasons: [
        `Base severity for ${cat.name}`,
        ...(priority === 'HIGH' ? ['Proximity to medical/educational institution (<200m)', 'High incident density zone'] : [])
      ],
      status,
      sla_hours: slaHours,
      sla_due_at: slaDueAt,
      created_at: createdAt,
      updated_at: createdAt,
      images,
      resolution_evidence: resolutionEvidence,
      history,
      feedback
    });
  }

  return complaints;
}

// Staff Accounts
export const USERS = [
  { id: 100, name: 'Hemanth K M', email: 'hemanthkm2006@gmail.com', password: 'Admin@123', role: 'admin', isOwner: true, phone: '9880010001', title: 'Website Owner & Chief Commissioner' },
  { id: 1, name: 'MCC Administrator', email: 'admin@mcc.gov.in', password: 'Admin@123', role: 'admin', phone: '9880012345' },
  { id: 2, name: 'Suresh Gowda', email: 'roads.officer@mcc.gov.in', password: 'Officer@123', role: 'field_officer', department_id: 2, department_name: 'Roads & Infrastructure', phone: '9880033001' },
  { id: 3, name: 'Ramesh Kumar', email: 'swm.officer@mcc.gov.in', password: 'Officer@123', role: 'field_officer', department_id: 1, department_name: 'Solid Waste Management', phone: '9880022001' },
  { id: 4, name: 'Vijay Bhaskar', email: 'elec.officer@mcc.gov.in', password: 'Officer@123', role: 'field_officer', department_id: 3, department_name: 'Electrical & Street Lighting', phone: '9880044001' },
  { id: 5, name: 'Manjunath Swamy', email: 'water.officer@mcc.gov.in', password: 'Officer@123', role: 'field_officer', department_id: 4, department_name: 'Water Supply & Sewerage', phone: '9880055001' },
  { id: 6, name: 'Corporator J P Nagar', email: 'ward12.corporator@mcc.gov.in', password: 'Corporator@123', role: 'corporator', ward_id: 12, ward_number: 12, ward_name: 'J P Nagar', phone: '9881290000' },
  { id: 7, name: 'Corporator Agrahara', email: 'ward1.corporator@mcc.gov.in', password: 'Corporator@123', role: 'corporator', ward_id: 1, ward_number: 1, ward_name: 'Agrahara', phone: '9880190000' }
];

// Initialize and retrieve state from localStorage
export function getDb() {
  let dbStr = null;
  try {
    dbStr = localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    console.warn('localStorage not accessible:', e);
  }

  if (dbStr) {
    try {
      const parsed = JSON.parse(dbStr);
      if (!parsed.users || !Array.isArray(parsed.users) || parsed.users.length === 0) {
        parsed.users = USERS;
        saveDb(parsed);
      }
      return parsed;
    } catch (e) {
      console.warn('Invalid JSON in DB storage, resetting...');
    }
  }

  const initialComplaints = generateInitialComplaints();
  const initialHotspots = runDBSCAN(initialComplaints);

  const initialDb = {
    complaints: initialComplaints,
    hotspots: initialHotspots,
    users: USERS,
    auditLogs: [],
    notifications: [
      { id: 1, recipient_type: 'corporator', message: 'SLA Escalation Alert: 2 high priority complaints pending in Ward 12.', created_at: new Date().toISOString() },
      { id: 2, recipient_type: 'corporator', message: 'Ward Civic Health Score updated to 88 (GOOD).', created_at: new Date(Date.now() - 86400000).toISOString() }
    ]
  };

  saveDb(initialDb);
  return initialDb;
}

export function saveDb(db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
}

// Reset Database to Seed State
export function resetDatabase() {
  localStorage.removeItem(STORAGE_KEY);
  return getDb();
}
