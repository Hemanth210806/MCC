import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { getImageUrl, getCategoryFallback } from '../utils/imageUrl';
import { 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Flame, 
  RefreshCw, 
  AlertTriangle, 
  BarChart3, 
  Users, 
  MapPin, 
  Check, 
  X, 
  Clock, 
  Building,
  Search,
  Filter,
  Phone,
  Mail,
  Camera,
  Send,
  UserCheck,
  Calendar,
  Eye,
  AlertOctagon,
  Award,
  TrendingUp,
  ArrowUpDown,
  ExternalLink,
  ChevronRight,
  UserPlus,
  Edit3,
  Save
} from 'lucide-react';
import { formatDateTime } from '../utils/exifHelper';

export default function AdminDashboard({ initialTab = 'verification' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [queue, setQueue] = useState([]);
  const [overview, setOverview] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [wardScores, setWardScores] = useState([]);
  const [overdueList, setOverdueList] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [assignmentList, setAssignmentList] = useState([]);
  const [wards, setWards] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [allComplaints, setAllComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  // Overview Tab Interactive Metric Filters
  const [overviewMetric, setOverviewMetric] = useState('ALL'); // 'ALL' | 'RESOLVED' | 'IN_PROGRESS' | 'OVERDUE'
  const [overviewSearch, setOverviewSearch] = useState('');
  const [overviewWardFilter, setOverviewWardFilter] = useState('ALL');
  const [overviewDeptFilter, setOverviewDeptFilter] = useState('ALL');
  const [overviewPriorityFilter, setOverviewPriorityFilter] = useState('ALL');

  // Verification modal / action
  const [selectedVerify, setSelectedVerify] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Overdue Tab Filters & Action States
  const [overdueSearch, setOverdueSearch] = useState('');
  const [overdueWardFilter, setOverdueWardFilter] = useState('ALL');
  const [overdueDeptFilter, setOverdueDeptFilter] = useState('ALL');
  const [sendingReminderId, setSendingReminderId] = useState(null);
  const [reminderStatusMap, setReminderStatusMap] = useState({});

  // Worker Directory & Statistics Filters
  const [workerSearch, setWorkerSearch] = useState('');
  const [workerWardFilter, setWorkerWardFilter] = useState('ALL');
  const [workerDeptFilter, setWorkerDeptFilter] = useState('ALL');
  const [workerSortBy, setWorkerSortBy] = useState('assigned_desc');
  const [workerActivityFilter, setWorkerActivityFilter] = useState('ALL');

  // Worker Performance Drill-down Modal
  const [selectedWorkerId, setSelectedWorkerId] = useState(null);
  const [workerDetailData, setWorkerDetailData] = useState(null);
  const [workerModalLoading, setWorkerModalLoading] = useState(false);
  const [modalComplaintFilter, setModalComplaintFilter] = useState('ALL');

  // Photo Lightbox modal
  const [lightboxImage, setLightboxImage] = useState(null);

  // Add / Transfer Ward Worker Member Modal State
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberWardId, setMemberWardId] = useState('');
  const [memberDeptId, setMemberDeptId] = useState('');
  const [memberWorkerName, setMemberWorkerName] = useState('');
  const [memberWorkerPhone, setMemberWorkerPhone] = useState('');
  const [memberTransferReason, setMemberTransferReason] = useState('Personnel Transfer');
  const [memberTransferNote, setMemberTransferNote] = useState('');
  const [memberLookupLoading, setMemberLookupLoading] = useState(false);
  const [memberSaving, setMemberSaving] = useState(false);
  const [memberSuccessMsg, setMemberSuccessMsg] = useState('');
  const [memberErrorMsg, setMemberErrorMsg] = useState('');
  const [currentLookupWorker, setCurrentLookupWorker] = useState(null);

  const fetchWorkerForWardDept = async (wardId, deptId) => {
    if (!wardId || !deptId) return;
    setMemberLookupLoading(true);
    setMemberErrorMsg('');
    try {
      const res = await api.get(`/admin/workers/lookup?ward_id=${wardId}&department_id=${deptId}`);
      if (res.data?.found && res.data.worker) {
        setCurrentLookupWorker(res.data.worker);
        setMemberWorkerName(res.data.worker.person_name || res.data.worker.name);
        setMemberWorkerPhone(res.data.worker.phone || '');
      } else {
        setCurrentLookupWorker(null);
        setMemberWorkerName('');
        setMemberWorkerPhone('');
      }
    } catch (err) {
      console.warn('Worker lookup error:', err);
    } finally {
      setMemberLookupLoading(false);
    }
  };

  const openMemberModal = (prefillWorker = null) => {
    setMemberSuccessMsg('');
    setMemberErrorMsg('');
    setMemberTransferReason('Personnel Transfer');
    setMemberTransferNote('');

    if (prefillWorker) {
      const wId = prefillWorker.ward_id || (wards[0]?.id || '');
      const dId = prefillWorker.department_id || (departments[0]?.id || '');
      setMemberWardId(wId);
      setMemberDeptId(dId);
      const fullName = prefillWorker.name || '';
      const cleanPersonName = fullName.replace(/\s*\([a-z0-9_]+_worker\)/i, '').trim();
      setMemberWorkerName(cleanPersonName);
      setMemberWorkerPhone(prefillWorker.phone || '');
      setCurrentLookupWorker(prefillWorker);
    } else {
      const initialWardId = wards[0]?.id || '';
      const initialDeptId = departments[0]?.id || '';
      setMemberWardId(initialWardId);
      setMemberDeptId(initialDeptId);
      setMemberWorkerName('');
      setMemberWorkerPhone('');
      setCurrentLookupWorker(null);
      if (initialWardId && initialDeptId) {
        fetchWorkerForWardDept(initialWardId, initialDeptId);
      }
    }
    setShowMemberModal(true);
  };

  const handleWardOrDeptChange = (newWardId, newDeptId) => {
    setMemberWardId(newWardId);
    setMemberDeptId(newDeptId);
    setMemberSuccessMsg('');
    setMemberErrorMsg('');
    fetchWorkerForWardDept(newWardId, newDeptId);
  };

  const handleSaveMember = async (e) => {
    if (e) e.preventDefault();
    if (!memberWardId || !memberDeptId) {
      setMemberErrorMsg('Please select both Ward and Department.');
      return;
    }
    if (!memberWorkerName.trim()) {
      setMemberErrorMsg('Please enter the worker name.');
      return;
    }

    setMemberSaving(true);
    setMemberErrorMsg('');
    setMemberSuccessMsg('');
    try {
      const res = await api.post('/admin/workers/manage-member', {
        ward_id: Number(memberWardId),
        department_id: Number(memberDeptId),
        name: memberWorkerName.trim(),
        phone: memberWorkerPhone.trim(),
        transfer_reason: memberTransferReason,
        transfer_note: memberTransferNote.trim()
      });

      setMemberSuccessMsg(res.data.message || 'Worker member updated successfully! All pages are now refreshed with the new details.');
      
      // Reload all admin datasets
      await loadData();

      // If selected worker scorecard modal is currently open, refresh it as well
      if (selectedWorkerId) {
        api.get(`/admin/workers/${selectedWorkerId}/performance`)
          .then(r => setWorkerDetailData(r.data))
          .catch(() => {});
      }

      setTimeout(() => {
        setShowMemberModal(false);
        setMemberSuccessMsg('');
      }, 1600);
    } catch (err) {
      setMemberErrorMsg(err.response?.data?.error || 'Failed to update worker details. Please try again.');
    } finally {
      setMemberSaving(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [qRes, ovRes, hRes, rRes, wRes, odRes, workerRes, assignmentRes, wardsRes, deptsRes, allComplaintsRes] = await Promise.allSettled([
        api.get('/admin/verification-queue'),
        api.get('/admin/analytics/overview'),
        api.get('/admin/analytics/hotspots'),
        api.get('/admin/analytics/recurring-issues'),
        api.get('/admin/analytics/ward-health-scores'),
        api.get('/admin/analytics/sla-overdue'),
        api.get('/admin/workers'),
        api.get('/admin/assignment-monitoring'),
        api.get('/admin/wards'),
        api.get('/admin/departments'),
        api.get('/admin/complaints')
      ]);

      if (qRes.status === 'fulfilled') setQueue(qRes.value.data.queue || []);
      if (ovRes.status === 'fulfilled') setOverview(ovRes.value.data);
      if (hRes.status === 'fulfilled') setHotspots(hRes.value.data.hotspots || []);
      if (rRes.status === 'fulfilled') setRecurring(rRes.value.data.recurring_issues || []);
      if (wRes.status === 'fulfilled') setWardScores(wRes.value.data.scores || []);
      if (odRes.status === 'fulfilled') setOverdueList(odRes.value.data.overdue_complaints || []);
      if (workerRes.status === 'fulfilled') setWorkers(workerRes.value.data.workers || []);
      if (assignmentRes.status === 'fulfilled') setAssignmentList(assignmentRes.value.data.complaints || []);
      if (wardsRes.status === 'fulfilled') setWards(wardsRes.value.data.wards || []);
      if (deptsRes.status === 'fulfilled') setDepartments(deptsRes.value.data.departments || []);
      if (allComplaintsRes?.status === 'fulfilled') setAllComplaints(allComplaintsRes.value.data.complaints || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch full scorecard & complaints with photos for a specific worker
  const openWorkerScorecard = async (workerId) => {
    setSelectedWorkerId(workerId);
    setWorkerModalLoading(true);
    setModalComplaintFilter('ALL');
    try {
      const res = await api.get(`/admin/workers/${workerId}/performance`);
      setWorkerDetailData(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to fetch worker performance scorecard');
      setSelectedWorkerId(null);
    } finally {
      setWorkerModalLoading(false);
    }
  };

  // Send urgent escalation reminder to assigned worker
  const handleSendReminder = async (complaintId, workerName) => {
    setSendingReminderId(complaintId);
    try {
      const res = await api.post(`/admin/complaints/${complaintId}/send-reminder`, {
        note: 'Urgent action required: This complaint has exceeded its SLA deadline and requires immediate resolution.'
      });
      setReminderStatusMap(prev => ({ ...prev, [complaintId]: 'Escalation Notice Sent!' }));
      setTimeout(() => {
        setReminderStatusMap(prev => {
          const updated = { ...prev };
          delete updated[complaintId];
          return updated;
        });
      }, 4000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send escalation notice');
    } finally {
      setSendingReminderId(null);
    }
  };

  // Reassign worker for a complaint
  const handleReassignWorker = async (complaintId, workerId) => {
    if (!workerId) return;
    try {
      await api.patch(`/admin/complaints/${complaintId}/assign-worker`, { worker_id: Number(workerId) });
      loadData();
      if (selectedWorkerId) {
        // Refresh modal if open
        const res = await api.get(`/admin/workers/${selectedWorkerId}/performance`);
        setWorkerDetailData(res.data);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Worker assignment failed');
    }
  };

  const handleVerify = async (decision) => {
    if (!selectedVerify) return;
    setActionLoading(true);
    try {
      await api.post(`/admin/complaints/${selectedVerify.complaint_id}/verify`, {
        decision: decision,
        notes: adminNotes
      });
      alert(`Resolution successfully ${decision === 'approve' ? 'APPROVED (Status: RESOLVED)' : 'REJECTED (Status: REOPENED)'}`);
      setSelectedVerify(null);
      setAdminNotes('');
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Verification action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecalculateHotspots = async () => {
    try {
      const res = await api.post('/admin/analytics/recalculate-hotspots');
      alert(res.data.message);
      loadData();
    } catch (err) {
      alert('Failed to recalculate hotspots');
    }
  };

  // All distinct wards list (from wards endpoint or inferred from workers)
  const allWardsList = useMemo(() => {
    if (wards && wards.length > 0) {
      return [...wards].sort((a, b) => a.ward_number - b.ward_number);
    }
    const map = new Map();
    workers.forEach(w => {
      if (w.ward_id && !map.has(w.ward_id)) {
        map.set(w.ward_id, { id: w.ward_id, ward_number: w.ward_number, ward_name: w.ward_name });
      }
    });
    return Array.from(map.values()).sort((a, b) => (a.ward_number || 0) - (b.ward_number || 0));
  }, [wards, workers]);

  // All distinct departments
  const allDeptsList = useMemo(() => {
    if (departments && departments.length > 0) return departments;
    const map = new Map();
    workers.forEach(w => {
      if (w.department_id && !map.has(w.department_id)) {
        map.set(w.department_id, { id: w.department_id, name: w.department_name });
      }
    });
    return Array.from(map.values());
  }, [departments, workers]);

  // Helper to normalize ward string for flexible matching
  const cleanWardStr = (str) => String(str || '').toLowerCase().replace(/ward\s*\d*[\.\s-]*/gi, '').replace(/[^a-z0-9]/g, '');

  const wardMatches = (itemWardNumber, itemWardId, itemWardName, filterVal) => {
    if (!filterVal || filterVal === 'ALL') return true;
    const fStr = String(filterVal).trim();
    const fDigits = (fStr.match(/\d+/) || [])[0];
    const itemDigits = (String(itemWardNumber || itemWardId || '').match(/\d+/) || [])[0];
    
    // 1. Direct number match (e.g. "61" === "61")
    if (fDigits && itemDigits && fDigits === itemDigits) return true;
    if (itemWardNumber && String(itemWardNumber) === fStr) return true;
    if (itemWardId && String(itemWardId) === fStr) return true;

    // 2. Normalized name match (e.g. "vidyaranyapuram" === "vidyaranyapuram")
    const cleanItem = cleanWardStr(itemWardName);
    const cleanFilter = cleanWardStr(fStr);
    if (cleanItem && cleanFilter && (cleanItem.includes(cleanFilter) || cleanFilter.includes(cleanItem))) return true;

    return false;
  };

  const deptMatches = (itemDeptId, itemDeptName, filterVal) => {
    if (!filterVal || filterVal === 'ALL') return true;
    const fStr = String(filterVal).toLowerCase().trim();
    if (itemDeptId && String(itemDeptId) === fStr) return true;
    const dName = String(itemDeptName || '').toLowerCase().trim();
    if (dName === fStr || dName.includes(fStr) || fStr.includes(dName)) return true;
    return false;
  };

  // Filtered Overview Complaints (interactive when clicking metric boxes)
  const filteredOverviewComplaints = useMemo(() => {
    return allComplaints.filter(c => {
      // 1. Status Filter based on clicked metric box
      if (overviewMetric === 'RESOLVED') {
        if (c.status !== 'RESOLVED') return false;
      } else if (overviewMetric === 'OVERDUE') {
        if (c.status !== 'OVERDUE') return false;
      } else if (overviewMetric === 'IN_PROGRESS') {
        if (!['IN_PROGRESS', 'ASSIGNED', 'VERIFICATION_PENDING', 'REOPENED'].includes(c.status)) return false;
      }

      // 2. Ward filter
      if (overviewWardFilter !== 'ALL' && !wardMatches(c.ward_number, c.ward_id, c.ward_name, overviewWardFilter)) {
        return false;
      }

      // 3. Department filter
      if (overviewDeptFilter !== 'ALL' && !deptMatches(c.department_id, c.department_name, overviewDeptFilter)) {
        return false;
      }

      // 4. Priority filter
      if (overviewPriorityFilter !== 'ALL' && c.priority !== overviewPriorityFilter) {
        return false;
      }

      // 5. Search query
      if (overviewSearch.trim()) {
        const q = overviewSearch.toLowerCase();
        const codeMatch = c.complaint_code?.toLowerCase().includes(q);
        const catMatch = c.category_name?.toLowerCase().includes(q);
        const wardMatch = c.ward_name?.toLowerCase().includes(q);
        const deptMatch = c.department_name?.toLowerCase().includes(q);
        const workerMatch = c.assigned_worker_name?.toLowerCase().includes(q);
        const citizenMatch = c.citizen_name?.toLowerCase().includes(q);
        if (!codeMatch && !catMatch && !wardMatch && !deptMatch && !workerMatch && !citizenMatch) return false;
      }
      return true;
    });
  }, [allComplaints, overviewMetric, overviewWardFilter, overviewDeptFilter, overviewPriorityFilter, overviewSearch]);

  // Filtered Overdue Complaints
  const filteredOverdueList = useMemo(() => {
    return overdueList.filter(c => {
      if (overdueWardFilter !== 'ALL' && !wardMatches(c.ward_number, c.ward_id, c.ward_name, overdueWardFilter)) {
        return false;
      }
      if (overdueDeptFilter !== 'ALL' && !deptMatches(c.department_id, c.department_name, overdueDeptFilter)) {
        return false;
      }
      if (overdueSearch.trim()) {
        const q = overdueSearch.toLowerCase();
        const codeMatch = c.complaint_code?.toLowerCase().includes(q);
        const catMatch = c.category_name?.toLowerCase().includes(q);
        const wardMatch = c.ward_name?.toLowerCase().includes(q);
        const deptMatch = c.department_name?.toLowerCase().includes(q);
        const workerMatch = c.assigned_worker_name?.toLowerCase().includes(q);
        if (!codeMatch && !catMatch && !wardMatch && !deptMatch && !workerMatch) return false;
      }
      return true;
    });
  }, [overdueList, overdueWardFilter, overdueDeptFilter, overdueSearch]);

  // Filtered & Sorted Workers List
  const filteredWorkers = useMemo(() => {
    let result = workers.filter(w => {
      if (workerWardFilter !== 'ALL' && !wardMatches(w.ward_number, w.ward_id, w.ward_name, workerWardFilter)) {
        return false;
      }
      if (workerDeptFilter !== 'ALL' && !deptMatches(w.department_id, w.department_name, workerDeptFilter)) {
        return false;
      }
      if (workerActivityFilter === 'active' && (!w.stats || w.stats.remaining_count === 0)) {
        return false;
      }
      if (workerActivityFilter === 'has_overdue' && (!w.stats || w.stats.overdue_count === 0)) {
        return false;
      }
      if (workerActivityFilter === 'resolved' && (!w.stats || w.stats.resolved_count === 0 || w.stats.remaining_count > 0)) {
        return false;
      }
      if (workerSearch.trim()) {
        const q = workerSearch.toLowerCase();
        const nameMatch = w.name?.toLowerCase().includes(q);
        const emailMatch = w.email?.toLowerCase().includes(q);
        const phoneMatch = w.phone?.toLowerCase().includes(q);
        const wardMatch = w.ward_name?.toLowerCase().includes(q);
        const deptMatch = w.department_name?.toLowerCase().includes(q);
        if (!nameMatch && !emailMatch && !phoneMatch && !wardMatch && !deptMatch) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      const aStats = a.stats || {};
      const bStats = b.stats || {};
      switch (workerSortBy) {
        case 'assigned_desc':
          return (bStats.total_assigned || 0) - (aStats.total_assigned || 0);
        case 'resolved_desc':
          return (bStats.resolved_count || 0) - (aStats.resolved_count || 0);
        case 'overdue_desc':
          return (bStats.overdue_count || 0) - (aStats.overdue_count || 0);
        case 'speed_asc':
          return ((aStats.avg_resolution_days || 999) - (bStats.avg_resolution_days || 999));
        case 'ward_asc':
          return (a.ward_number || 0) - (b.ward_number || 0);
        case 'name_asc':
          return (a.name || '').localeCompare(b.name || '');
        default:
          return 0;
      }
    });

    return result;
  }, [workers, workerWardFilter, workerDeptFilter, workerActivityFilter, workerSearch, workerSortBy]);

  return (
    <div className="container" style={{ padding: '30px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4b5e28' }}>
            MCC ADMINISTRATIVE CONTROL
          </span>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1f241a' }}>
            City Administration & Verification Console
          </h2>
        </div>

        {/* Tab Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setActiveTab('verification')}
            className={`btn ${activeTab === 'verification' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <CheckCircle2 size={16} /> Verification Queue ({queue.length})
          </button>
          <button 
            onClick={() => setActiveTab('overview')}
            className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <BarChart3 size={16} /> Overview
          </button>
          <button 
            onClick={() => setActiveTab('hotspots')}
            className={`btn ${activeTab === 'hotspots' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <Flame size={16} /> Hotspots ({hotspots.length})
          </button>
          <button 
            onClick={() => setActiveTab('recurring')}
            className={`btn ${activeTab === 'recurring' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <RefreshCw size={16} /> Recurring ({recurring.length})
          </button>
          <button 
            onClick={() => setActiveTab('overdue')}
            className={`btn ${activeTab === 'overdue' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <Clock size={16} /> Overdue ({overdueList.length})
          </button>
          <button 
            onClick={() => setActiveTab('workers')} 
            className={`btn ${activeTab === 'workers' ? 'btn-primary' : 'btn-outline'}`} 
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <Users size={16} /> Worker Directory & Scorecards ({workers.length})
          </button>
        </div>
      </div>

      {/* 1. Verification Queue Tab */}
      {activeTab === 'verification' && (
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1f241a', marginBottom: '14px' }}>
            Pending Resolution Approvals ({queue.length})
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#5e6654', marginBottom: '20px' }}>
            Field Officers must provide geotagged resolution photographs. Compare the initial complaint photo against resolution proof before approving.
          </p>

          {queue.length === 0 ? (
            <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#5e6654' }}>
              No resolutions currently pending verification. All officer reports are reviewed!
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
              {queue.map((item) => (
                <div key={item.complaint_id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5e6654' }}>{item.complaint_code}</span>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1f241a' }}>{item.category_name}</h4>
                      <div style={{ fontSize: '0.8rem', color: '#5e6654' }}>
                        Ward: <strong>{item.ward_name}</strong>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                        Submitted: <strong>{formatDateTime(item.submitted_at || item.created_at)}</strong>
                      </div>
                    </div>
                    <span className="badge badge-VERIFICATION_PENDING">Pending Verification</span>
                  </div>

                  {/* Side-by-side thumbnails */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#5e6654', marginBottom: '4px' }}>ORIGINAL ISSUE</div>
                      <div 
                        style={{ height: '120px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#e5dcbe', cursor: 'pointer' }}
                        onClick={() => setLightboxImage({ url: getImageUrl(item.original_photo, item.category_name, false), title: `${item.complaint_code} - Original Citizen Report` })}
                      >
                        <img 
                          src={getImageUrl(item.original_photo, item.category_name, false)} 
                          alt="Original" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => { 
                            const fb = getCategoryFallback(item.category_name, false);
                            if (e.target.src !== fb) e.target.src = fb;
                          }}
                        />
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                        GPS: {item.original_latitude?.toFixed(4)}, {item.original_longitude?.toFixed(4)}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#166534', marginBottom: '4px' }}>OFFICER RESOLUTION</div>
                      <div 
                        style={{ height: '120px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#e5dcbe', cursor: 'pointer' }}
                        onClick={() => setLightboxImage({ url: getImageUrl(item.resolution_photo, item.category_name, true), title: `${item.complaint_code} - Officer Resolution Evidence` })}
                      >
                        <img 
                          src={getImageUrl(item.resolution_photo, item.category_name, true)} 
                          alt="Resolution" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => { 
                            const fb = getCategoryFallback(item.category_name, true);
                            if (e.target.src !== fb) e.target.src = fb;
                          }}
                        />
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#166534', marginTop: '2px' }}>
                        Distance: <strong>{item.distance_from_original_m}m</strong>
                      </div>
                    </div>
                  </div>

                  {item.officer_notes && (
                    <div style={{ fontSize: '0.8rem', backgroundColor: '#fbf7ee', padding: '8px', borderRadius: '6px' }}>
                      <strong>Officer Note:</strong> {item.officer_notes}
                    </div>
                  )}

                  <button 
                    onClick={() => setSelectedVerify(item)}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '8px', fontSize: '0.85rem' }}
                  >
                    Inspect & Decide
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. Overview Tab with Interactive Metric Cards & Complaints Photo Explorer */}
      {activeTab === 'overview' && overview && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Interactive KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {/* 1. Total Complaints */}
            <div 
              className="card"
              onClick={() => setOverviewMetric('ALL')}
              style={{ 
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: overviewMetric === 'ALL' ? '2px solid #4b5e28' : '1px solid #e5dcbe',
                backgroundColor: overviewMetric === 'ALL' ? '#edf4e4' : '#ffffff',
                boxShadow: overviewMetric === 'ALL' ? '0 6px 14px rgba(75, 94, 40, 0.15)' : 'none',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.85rem', color: '#5e6654', fontWeight: 600 }}>Total Complaints</div>
                {overviewMetric === 'ALL' && <span className="badge" style={{ backgroundColor: '#4b5e28', color: '#fff', fontSize: '0.65rem' }}>Active View</span>}
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1f241a', marginTop: '4px' }}>{overview.total_complaints}</div>
              <div style={{ fontSize: '0.72rem', color: '#4b5e28', marginTop: '4px', fontWeight: 600 }}>
                👉 Click to inspect all registered issues
              </div>
            </div>

            {/* 2. Resolved */}
            <div 
              className="card"
              onClick={() => setOverviewMetric('RESOLVED')}
              style={{ 
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: overviewMetric === 'RESOLVED' ? '2px solid #16a34a' : '1px solid #e5dcbe',
                backgroundColor: overviewMetric === 'RESOLVED' ? '#f0fdf4' : '#ffffff',
                boxShadow: overviewMetric === 'RESOLVED' ? '0 6px 14px rgba(22, 163, 74, 0.15)' : 'none',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 600 }}>Resolved</div>
                {overviewMetric === 'RESOLVED' && <span className="badge" style={{ backgroundColor: '#16a34a', color: '#fff', fontSize: '0.65rem' }}>Active View</span>}
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#166534', marginTop: '4px' }}>{overview.resolved_count}</div>
              <div style={{ fontSize: '0.72rem', color: '#15803d', marginTop: '4px', fontWeight: 600 }}>
                👉 Click to inspect resolved with photos
              </div>
            </div>

            {/* 3. In Progress */}
            <div 
              className="card"
              onClick={() => setOverviewMetric('IN_PROGRESS')}
              style={{ 
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: overviewMetric === 'IN_PROGRESS' ? '2px solid #d97706' : '1px solid #e5dcbe',
                backgroundColor: overviewMetric === 'IN_PROGRESS' ? '#fffbeb' : '#ffffff',
                boxShadow: overviewMetric === 'IN_PROGRESS' ? '0 6px 14px rgba(217, 119, 6, 0.15)' : 'none',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.85rem', color: '#8f6a20', fontWeight: 600 }}>In Progress</div>
                {overviewMetric === 'IN_PROGRESS' && <span className="badge" style={{ backgroundColor: '#d97706', color: '#fff', fontSize: '0.65rem' }}>Active View</span>}
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#8f6a20', marginTop: '4px' }}>{overview.in_progress_count}</div>
              <div style={{ fontSize: '0.72rem', color: '#b45309', marginTop: '4px', fontWeight: 600 }}>
                👉 Click to inspect active tasks
              </div>
            </div>

            {/* 4. Overdue */}
            <div 
              className="card"
              onClick={() => setOverviewMetric('OVERDUE')}
              style={{ 
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: overviewMetric === 'OVERDUE' ? '2px solid #dc2626' : '1px solid #e5dcbe',
                backgroundColor: overviewMetric === 'OVERDUE' ? '#fef2f2' : '#ffffff',
                boxShadow: overviewMetric === 'OVERDUE' ? '0 6px 14px rgba(220, 38, 38, 0.15)' : 'none',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.85rem', color: '#dc2626', fontWeight: 600 }}>Overdue</div>
                {overviewMetric === 'OVERDUE' && <span className="badge" style={{ backgroundColor: '#dc2626', color: '#fff', fontSize: '0.65rem' }}>Active View</span>}
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>{overview.overdue_count}</div>
              <div style={{ fontSize: '0.72rem', color: '#b91c1c', marginTop: '4px', fontWeight: 600 }}>
                👉 Click to inspect SLA breached issues
              </div>
            </div>

            {/* 5. Resolution Rate */}
            <div 
              className="card"
              onClick={() => setOverviewMetric('RESOLVED')}
              style={{ 
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: '1px solid #e5dcbe'
              }}
            >
              <div style={{ fontSize: '0.85rem', color: '#4b5e28', fontWeight: 600 }}>Resolution Rate</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#4b5e28', marginTop: '4px' }}>{overview.resolution_rate_pct}%</div>
              <div style={{ fontSize: '0.72rem', color: '#5e6654', marginTop: '4px' }}>
                Citywide performance index
              </div>
            </div>
          </div>

          {/* DYNAMIC COMPLAINTS EXPLORER SECTION (Linked to the clicked box) */}
          <div style={{ borderTop: '2px solid #e5dcbe', paddingTop: '20px' }}>
            {/* Header with Title & Description */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1f241a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {overviewMetric === 'ALL' && <><Camera size={22} color="#4b5e28" /> All Registered Complaints with Photos ({filteredOverviewComplaints.length})</>}
                  {overviewMetric === 'RESOLVED' && <><CheckCircle2 size={22} color="#16a34a" /> Verified Resolved Complaints with Resolution Photos ({filteredOverviewComplaints.length})</>}
                  {overviewMetric === 'IN_PROGRESS' && <><Clock size={22} color="#d97706" /> In-Progress Civic Complaints ({filteredOverviewComplaints.length})</>}
                  {overviewMetric === 'OVERDUE' && <><AlertTriangle size={22} color="#dc2626" /> SLA Escalated Overdue Complaints ({filteredOverviewComplaints.length})</>}
                </h3>
                <div style={{ fontSize: '0.85rem', color: '#5e6654', marginTop: '3px' }}>
                  {overviewMetric === 'ALL' && 'Showing every civic complaint registered in Mysuru, including original citizen photos, assigned workers, and current live status.'}
                  {overviewMetric === 'RESOLVED' && 'Showing verified resolved complaints with side-by-side comparison of citizen initial photo and field officer resolution proof.'}
                  {overviewMetric === 'IN_PROGRESS' && 'Showing complaints currently assigned and being actively resolved by field workers.'}
                  {overviewMetric === 'OVERDUE' && 'Showing complaints that exceeded SLA target hours without resolution. Take direct administrative action below.'}
                </div>
              </div>
            </div>

            {/* Search and Filters for Overview Explorer */}
            <div className="card" style={{ padding: '14px 18px', marginBottom: '20px', backgroundColor: '#fcfaf5', border: '1px solid #e5dcbe' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', alignItems: 'center' }}>
                {/* Search query */}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b5e28', display: 'block', marginBottom: '4px' }}>
                    SEARCH COMPLAINTS
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Search ID, category, worker, citizen..."
                      value={overviewSearch}
                      onChange={(e) => setOverviewSearch(e.target.value)}
                      style={{ paddingLeft: '32px', fontSize: '0.85rem', width: '100%' }}
                    />
                  </div>
                </div>

                {/* Ward filter */}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b5e28', display: 'block', marginBottom: '4px' }}>
                    FILTER BY WARD ({allWardsList.length} Wards)
                  </label>
                  <select
                    className="form-select"
                    value={overviewWardFilter}
                    onChange={(e) => setOverviewWardFilter(e.target.value)}
                    style={{ fontSize: '0.85rem', width: '100%' }}
                  >
                    <option value="ALL">All Mysuru Wards</option>
                    {allWardsList.map(w => (
                      <option key={w.id || w.ward_number} value={w.ward_number || w.ward_name}>
                        Ward {w.ward_number}: {w.ward_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Department filter */}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b5e28', display: 'block', marginBottom: '4px' }}>
                    FILTER BY DEPARTMENT
                  </label>
                  <select
                    className="form-select"
                    value={overviewDeptFilter}
                    onChange={(e) => setOverviewDeptFilter(e.target.value)}
                    style={{ fontSize: '0.85rem', width: '100%' }}
                  >
                    <option value="ALL">All Departments</option>
                    {allDeptsList.map(d => (
                      <option key={d.id} value={d.id || d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>

                {/* Priority filter */}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b5e28', display: 'block', marginBottom: '4px' }}>
                    FILTER BY PRIORITY
                  </label>
                  <select
                    className="form-select"
                    value={overviewPriorityFilter}
                    onChange={(e) => setOverviewPriorityFilter(e.target.value)}
                    style={{ fontSize: '0.85rem', width: '100%' }}
                  >
                    <option value="ALL">All Priorities</option>
                    <option value="HIGH">High Priority</option>
                    <option value="MEDIUM">Medium Priority</option>
                    <option value="LOW">Low Priority</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '0.8rem', color: '#5e6654' }}>
                <span>Showing <strong>{filteredOverviewComplaints.length}</strong> complaints matching criteria.</span>
                {(overviewSearch || overviewWardFilter !== 'ALL' || overviewDeptFilter !== 'ALL' || overviewPriorityFilter !== 'ALL') && (
                  <button
                    onClick={() => { setOverviewSearch(''); setOverviewWardFilter('ALL'); setOverviewDeptFilter('ALL'); setOverviewPriorityFilter('ALL'); }}
                    style={{ background: 'none', border: 'none', color: '#4b5e28', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    Reset Explorer Filters
                  </button>
                )}
              </div>
            </div>

            {/* Complaints Cards Grid */}
            {filteredOverviewComplaints.length === 0 ? (
              <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#5e6654' }}>
                No complaints found matching this view and filter selection.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '18px' }}>
                {filteredOverviewComplaints.map((c) => {
                  const origImgPath = c.original_photo || (c.images && c.images.length > 0 ? c.images[0].image_path : null);
                  const resImgPath = c.resolution_photo || (c.resolution_evidence ? c.resolution_evidence.photo_path : null);
                  const origUrl = getImageUrl(origImgPath, c.category_name, false);
                  const resUrl = getImageUrl(resImgPath, c.category_name, true);
                  const assignedWorker = workers.find(w => w.id === c.assigned_worker_id);
                  const eligibleWorkers = workers.filter(w => !c.department_id || w.department_id === c.department_id);

                  return (
                    <div 
                      key={c.id} 
                      className="card" 
                      style={{ 
                        borderLeft: `5px solid ${c.status === 'RESOLVED' ? '#16a34a' : (c.status === 'OVERDUE' ? '#dc2626' : (c.status === 'IN_PROGRESS' ? '#d97706' : '#4b5e28'))}`,
                        display: 'flex', 
                        flexDirection: 'column', 
                        justifyContent: 'space-between',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                      }}
                    >
                      <div>
                        {/* Top Bar: Code & Status Badges */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155' }}>{c.complaint_code}</span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <span className={`badge badge-priority-${c.priority || 'HIGH'}`} style={{ fontSize: '0.65rem' }}>
                              {c.priority || 'HIGH'}
                            </span>
                            <span className={`badge badge-${c.status}`} style={{ fontSize: '0.65rem', fontWeight: 800 }}>
                              {c.status}
                            </span>
                          </div>
                        </div>

                        {/* Title: Category & Location */}
                        <h4 style={{ fontSize: '1.12rem', fontWeight: 800, color: '#1f241a', margin: '2px 0 4px 0' }}>
                          {c.category_name}
                        </h4>
                        <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '10px' }}>
                          Ward: <strong>{c.ward_name || `Ward ${c.ward_number}`}</strong> | Dept: <strong>{c.department_name}</strong>
                        </div>

                        {/* PHOTOGRAPHS DISPLAY (Citizen Report Photo & Officer Resolution Proof) */}
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: c.status === 'RESOLVED' && resImgPath ? '1fr 1fr' : '1fr', 
                          gap: '10px', 
                          marginBottom: '12px' 
                        }}>
                          {/* Citizen Report Photo */}
                          <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                              📸 CITIZEN COMPLAINT PHOTO
                            </div>
                            <div 
                              style={{ 
                                height: '130px', 
                                borderRadius: '8px', 
                                overflow: 'hidden', 
                                backgroundColor: '#f1f5f9', 
                                border: '1px solid #e2e8f0', 
                                cursor: 'pointer', 
                                position: 'relative' 
                              }}
                              onClick={() => setLightboxImage({ url: origUrl, title: `${c.complaint_code} - Original Citizen Report` })}
                            >
                              <img 
                                src={origUrl} 
                                alt="Citizen Report" 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => { 
                                  const fb = getCategoryFallback(c.category_name, false);
                                  if (e.target.src !== fb) e.target.src = fb;
                                }}
                              />
                              <div style={{ position: 'absolute', bottom: '3px', right: '3px', backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <Eye size={10} /> View
                              </div>
                            </div>
                          </div>

                          {/* Officer Resolution Proof Photo (if resolved) */}
                          {c.status === 'RESOLVED' && resImgPath && (
                            <div>
                              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#166534', marginBottom: '4px' }}>
                                ✅ RESOLUTION PROOF PHOTO
                              </div>
                              <div 
                                style={{ 
                                  height: '130px', 
                                  borderRadius: '8px', 
                                  overflow: 'hidden', 
                                  backgroundColor: '#f1f5f9', 
                                  border: '1px solid #bbf7d0', 
                                  cursor: 'pointer', 
                                  position: 'relative' 
                                }}
                                onClick={() => setLightboxImage({ url: resUrl, title: `${c.complaint_code} - Field Officer Resolution Proof` })}
                              >
                                <img 
                                src={resUrl} 
                                alt="Resolution Proof" 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => { 
                                  const fb = getCategoryFallback(c.category_name, true);
                                  if (e.target.src !== fb) e.target.src = fb;
                                }}
                              />
                              <div style={{ position: 'absolute', bottom: '3px', right: '3px', backgroundColor: 'rgba(22, 101, 52, 0.85)', color: '#fff', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px' }}>
                                Verified
                              </div>
                            </div>
                          </div>
                          )}
                        </div>

                        {/* ASSIGNED FIELD WORKER BOX */}
                        <div style={{ 
                          backgroundColor: c.assigned_worker_name ? '#f8fafc' : '#fff1f2', 
                          border: `1px solid ${c.assigned_worker_name ? '#e2e8f0' : '#fecdd3'}`, 
                          borderRadius: '8px', 
                          padding: '8px 10px',
                          marginBottom: '10px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                              ASSIGNED WORKER:
                            </span>
                            {c.assigned_worker_id && (
                              <button
                                onClick={() => openWorkerScorecard(c.assigned_worker_id)}
                                style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}
                              >
                                Scorecard ↗
                              </button>
                            )}
                          </div>

                          {c.assigned_worker_name ? (
                            <div>
                              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                                👷 {c.assigned_worker_name}
                              </div>
                              <div style={{ display: 'flex', gap: '10px', marginTop: '3px', fontSize: '0.72rem', color: '#475569', flexWrap: 'wrap' }}>
                                {c.assigned_worker_phone && (
                                  <a href={`tel:${c.assigned_worker_phone}`} style={{ color: '#166534', fontWeight: 600, textDecoration: 'none' }}>
                                    📞 {c.assigned_worker_phone}
                                  </a>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e11d48' }}>
                              ⚠️ Unassigned - Field Worker Not Dispatched
                            </div>
                          )}
                        </div>

                        {/* DURATION & TIMELINE BADGE */}
                        {c.time_taken_str && (
                          <div style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: 700, 
                            marginBottom: '10px',
                            color: c.status === 'RESOLVED' ? '#166534' : (c.status === 'OVERDUE' ? '#dc2626' : '#2563eb')
                          }}>
                            ⏱️ {c.time_taken_str}
                          </div>
                        )}
                      </div>

                      {/* ACTIONS BAR */}
                      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          Reported: {formatDateTime(c.created_at)}
                        </div>

                        {c.status === 'OVERDUE' && c.assigned_worker_id && (
                          <button
                            type="button"
                            disabled={sendingReminderId === c.id}
                            onClick={() => handleSendReminder(c.id, c.assigned_worker_name)}
                            className="btn btn-outline"
                            style={{ padding: '3px 8px', fontSize: '0.72rem', color: '#dc2626', borderColor: '#fca5a5' }}
                          >
                            <Send size={11} /> Send Notice
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Hotspots Tab */}
      {activeTab === 'hotspots' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1f241a' }}>
                Civic Hotspot Clusters (DBSCAN)
              </h3>
              <div style={{ fontSize: '0.85rem', color: '#5e6654' }}>
                Geospatial clusters of persistent civic complaints detected via density-based spatial clustering.
              </div>
            </div>
            <button 
              onClick={handleRecalculateHotspots}
              className="btn btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              <RefreshCw size={15} /> Recalculate Hotspots
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {hotspots.map((h) => (
              <div key={h.id} className="card" style={{ borderLeft: '4px solid #dc2626' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626' }}>🔥 DBSCAN CLUSTER</span>
                  <span className="badge badge-priority-HIGH" style={{ fontSize: '0.65rem' }}>Active</span>
                </div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1f241a' }}>{h.category_name}</h4>
                <div style={{ fontSize: '0.85rem', color: '#475569', margin: '4px 0' }}>Ward: <strong>{h.ward_name}</strong></div>
                <div style={{ fontSize: '0.8rem', color: '#5e6654' }}>
                  Complaints Clustered: <strong>{h.complaint_count}</strong><br />
                  Radius: <strong>{Math.round(h.radius_m)} meters</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Recurring Issues Tab */}
      {activeTab === 'recurring' && (
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1f241a', marginBottom: '8px' }}>
            Geographic Recurring Issues
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#5e6654', marginBottom: '16px' }}>
            Complaints of the same category reported within 50m of a previously resolved complaint within 90 days.
          </p>

          <div className="card" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5dcbe', textAlign: 'left', color: '#5e6654' }}>
                  <th style={{ padding: '10px' }}>Category</th>
                  <th style={{ padding: '10px' }}>New Complaint</th>
                  <th style={{ padding: '10px' }}>Previously Resolved</th>
                  <th style={{ padding: '10px' }}>Proximity Distance</th>
                  <th style={{ padding: '10px' }}>Detected Date</th>
                </tr>
              </thead>
              <tbody>
                {recurring.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f3eddc' }}>
                    <td style={{ padding: '10px', fontWeight: 600, color: '#8f6a20' }}>{r.category_name}</td>
                    <td style={{ padding: '10px', fontWeight: 700 }}>{r.new_complaint_code}</td>
                    <td style={{ padding: '10px', color: '#16a34a' }}>{r.previous_complaint_code}</td>
                    <td style={{ padding: '10px' }}>
                      <span className="badge badge-priority-HIGH" style={{ fontSize: '0.7rem' }}>
                        {r.distance_m} meters
                      </span>
                    </td>
                    <td style={{ padding: '10px', color: '#5e6654' }}>
                      {formatDateTime(r.detected_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. SLA Escalated Overdue Tab (Upgraded with Assigned Worker, Photo Thumbnails, Reassignment & Urgent Escalation) */}
      {activeTab === 'overdue' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={22} color="#dc2626" /> SLA Escalated Overdue Complaints ({overdueList.length})
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#5e6654', marginTop: '4px' }}>
                Complaints that breached their SLA deadlines. Admin has full oversight to inspect the issue photo, identify the assigned field worker, reassign duties, or issue urgent escalation notices.
              </p>
            </div>
          </div>

          {/* Overdue Search and Filter Engine */}
          <div className="card" style={{ padding: '14px 18px', marginBottom: '20px', backgroundColor: '#fff9f9', border: '1px solid #fecaca' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', alignItems: 'center' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7f1d1d', display: 'block', marginBottom: '4px' }}>
                  SEARCH OVERDUE ISSUES
                </label>
                <div style={{ position: 'relative' }}>
                  <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search by code, category, worker..."
                    value={overdueSearch}
                    onChange={(e) => setOverdueSearch(e.target.value)}
                    style={{ paddingLeft: '32px', fontSize: '0.85rem', width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7f1d1d', display: 'block', marginBottom: '4px' }}>
                  FILTER BY WARD ({allWardsList.length} Wards)
                </label>
                <select
                  className="form-select"
                  value={overdueWardFilter}
                  onChange={(e) => setOverdueWardFilter(e.target.value)}
                  style={{ fontSize: '0.85rem', width: '100%' }}
                >
                  <option value="ALL">All Mysuru Wards ({overdueList.length})</option>
                  {allWardsList.map(w => (
                    <option key={w.id || w.ward_number} value={w.ward_number || w.ward_name}>
                      Ward {w.ward_number}: {w.ward_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7f1d1d', display: 'block', marginBottom: '4px' }}>
                  FILTER BY DEPARTMENT
                </label>
                <select
                  className="form-select"
                  value={overdueDeptFilter}
                  onChange={(e) => setOverdueDeptFilter(e.target.value)}
                  style={{ fontSize: '0.85rem', width: '100%' }}
                >
                  <option value="ALL">All Departments</option>
                  {allDeptsList.map(d => (
                    <option key={d.id} value={d.id || d.name}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '0.8rem', color: '#991b1b' }}>
              <span>Showing <strong>{filteredOverdueList.length}</strong> overdue complaints matching filter criteria.</span>
              {(overdueSearch || overdueWardFilter !== 'ALL' || overdueDeptFilter !== 'ALL') && (
                <button
                  onClick={() => { setOverdueSearch(''); setOverdueWardFilter('ALL'); setOverdueDeptFilter('ALL'); }}
                  style={{ background: 'none', border: 'none', color: '#b91c1c', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Reset Overdue Filters
                </button>
              )}
            </div>
          </div>

          {/* Overdue Cards Grid */}
          {filteredOverdueList.length === 0 ? (
            <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#5e6654' }}>
              No overdue complaints found matching the selected filter criteria.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '18px' }}>
              {filteredOverdueList.map((c) => {
                const origImgPath = c.images && c.images.length > 0 ? c.images[0].image_path : null;
                const photoUrl = getImageUrl(origImgPath, c.category_name, false);
                const assignedWorker = workers.find(w => w.id === c.assigned_worker_id);
                const eligibleWorkers = workers.filter(w => !c.department_id || w.department_id === c.department_id);

                return (
                  <div 
                    key={c.id} 
                    className="card" 
                    style={{ 
                      borderLeft: '5px solid #dc2626', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'space-between',
                      boxShadow: '0 2px 8px rgba(220, 38, 38, 0.08)' 
                    }}
                  >
                    <div>
                      {/* Top Bar: Code & Overdue Badge */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155' }}>{c.complaint_code}</span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <span className={`badge badge-priority-${c.priority || 'HIGH'}`} style={{ fontSize: '0.65rem' }}>
                            {c.priority || 'HIGH'}
                          </span>
                          <span className="badge badge-OVERDUE" style={{ fontSize: '0.65rem', fontWeight: 800 }}>
                            OVERDUE
                          </span>
                        </div>
                      </div>

                      {/* Complaint Category and Location */}
                      <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1f241a', margin: '2px 0 6px 0' }}>
                        {c.category_name}
                      </h4>
                      <div style={{ fontSize: '0.82rem', color: '#475569', marginBottom: '8px' }}>
                        Ward: <strong>{c.ward_name || `Ward ${c.ward_number}`}</strong> | Dept: <strong>{c.department_name}</strong>
                      </div>

                      {/* Photo Thumbnail + SLA Timeline Section */}
                      <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '10px', marginBottom: '12px' }}>
                        {/* Photo Thumbnail with Lightbox click */}
                        <div 
                          style={{ 
                            height: '95px', 
                            borderRadius: '8px', 
                            overflow: 'hidden', 
                            backgroundColor: '#f1f5f9', 
                            border: '1px solid #e2e8f0',
                            position: 'relative',
                            cursor: 'pointer' 
                          }}
                          onClick={() => setLightboxImage({ url: photoUrl, title: `${c.complaint_code} - ${c.category_name}` })}
                          title="Click to inspect original complaint photo"
                        >
                          <img 
                            src={photoUrl} 
                            alt={c.category_name} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => { 
                              const fb = getCategoryFallback(c.category_name, false);
                              if (e.target.src !== fb) e.target.src = fb;
                            }}
                          />
                          <div style={{ 
                            position: 'absolute', 
                            bottom: '2px', 
                            right: '2px', 
                            backgroundColor: 'rgba(0,0,0,0.6)', 
                            color: '#fff', 
                            padding: '2px 5px', 
                            borderRadius: '4px', 
                            fontSize: '0.65rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}>
                            <Eye size={10} /> View
                          </div>
                        </div>

                        {/* SLA Details */}
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>SLA Target Due:</div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#dc2626' }}>
                            {formatDateTime(c.sla_due_at)}
                          </div>
                          {c.created_at && (
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>
                              Created: {formatDateTime(c.created_at)}
                            </div>
                          )}
                          <div style={{ fontSize: '0.72rem', color: '#b91c1c', marginTop: '4px', fontWeight: 600 }}>
                            ⚠️ SLA Threshold Breached
                          </div>
                        </div>
                      </div>

                      {/* ASSIGNED WORKER HIGHLIGHT BOX */}
                      <div style={{ 
                        backgroundColor: c.assigned_worker_name ? '#f8fafc' : '#fff1f2', 
                        border: `1px solid ${c.assigned_worker_name ? '#e2e8f0' : '#fecdd3'}`, 
                        borderRadius: '8px', 
                        padding: '10px 12px',
                        marginBottom: '12px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                            ASSIGNED FIELD WORKER:
                          </span>
                          {c.assigned_worker_id && (
                            <button
                              onClick={() => openWorkerScorecard(c.assigned_worker_id)}
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                color: '#2563eb', 
                                fontSize: '0.72rem', 
                                fontWeight: 600, 
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              View Stats <ExternalLink size={11} />
                            </button>
                          )}
                        </div>

                        {c.assigned_worker_name ? (
                          <div>
                            <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                              👷 {c.assigned_worker_name}
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '0.75rem', color: '#475569', flexWrap: 'wrap' }}>
                              {c.assigned_worker_phone && (
                                <a 
                                  href={`tel:${c.assigned_worker_phone}`} 
                                  style={{ color: '#166534', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <Phone size={12} /> {c.assigned_worker_phone}
                                </a>
                              )}
                              {assignedWorker?.email && (
                                <span style={{ color: '#64748b' }}>
                                  ✉️ {assignedWorker.email}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e11d48' }}>
                            ⚠️ Unassigned - Field Worker Not Dispatched
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ADMIN ACTION CONTROLS */}
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {/* Reassign Worker Dropdown */}
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <select 
                          className="form-select" 
                          value={c.assigned_worker_id || ''} 
                          onChange={(e) => handleReassignWorker(c.id, e.target.value)}
                          style={{ fontSize: '0.8rem', padding: '6px 8px', flex: 1 }}
                        >
                          <option value="">Reassign Worker...</option>
                          {eligibleWorkers.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name} ({w.ward_name || `Ward ${w.ward_number}`})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Send Urgent Escalation Reminder Button */}
                      {c.assigned_worker_id && (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            type="button"
                            disabled={sendingReminderId === c.id}
                            onClick={() => handleSendReminder(c.id, c.assigned_worker_name)}
                            className="btn btn-outline"
                            style={{ 
                              width: '100%', 
                              padding: '6px 10px', 
                              fontSize: '0.8rem', 
                              borderColor: '#dc2626', 
                              color: '#dc2626',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            <Send size={13} /> {sendingReminderId === c.id ? 'Sending Escalation...' : '⚠️ Send Urgent Escalation Notice'}
                          </button>
                        </div>
                      )}

                      {/* Reminder status message banner */}
                      {reminderStatusMap[c.id] && (
                        <div style={{ 
                          backgroundColor: '#ecfdf5', 
                          color: '#065f46', 
                          border: '1px solid #a7f3d0', 
                          borderRadius: '4px', 
                          padding: '4px 8px', 
                          fontSize: '0.75rem', 
                          textAlign: 'center',
                          fontWeight: 600
                        }}>
                          ✓ {reminderStatusMap[c.id]}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. Worker Directory & Statistics Hub (All 65 Wards, Indian Names, Performance Scorecards & Full Complaint Photos) */}
      {activeTab === 'workers' && (
        <div>
          {/* Section Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
            <div style={{ flex: '1 1 300px' }}>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1f241a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={22} color="#4b5e28" /> Field Worker Directory & Performance Scorecards ({workers.length})
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#5e6654', marginTop: '4px' }}>
                Full administrative access to all 65 Mysuru ward department workers. Filter by ward, department, or performance to inspect resolution speeds, active workloads, and original/resolution photographic proof.
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={() => openMemberModal()}
                className="btn btn-primary"
                style={{
                  padding: '9px 16px',
                  backgroundColor: '#4b5e28',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 8px rgba(75, 94, 40, 0.25)',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                <UserPlus size={18} /> Add / Transfer Worker Member
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            <div className="card" style={{ padding: '14px', backgroundColor: '#f8fafc' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>TOTAL FIELD WORKERS</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>{workers.length}</div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Across 65 Mysuru Wards</div>
            </div>
            <div className="card" style={{ padding: '14px', backgroundColor: '#f0fdf4' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534' }}>TOTAL RESOLVED COMPLAINTS</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#166534' }}>
                {workers.reduce((acc, w) => acc + (w.stats?.resolved_count || 0), 0)}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#15803d' }}>Verified by MCC</div>
            </div>
            <div className="card" style={{ padding: '14px', backgroundColor: '#fffbeb' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b45309' }}>IN PROGRESS / PENDING</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#b45309' }}>
                {workers.reduce((acc, w) => acc + (w.stats?.remaining_count || 0), 0)}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#d97706' }}>Active in field</div>
            </div>
            <div className="card" style={{ padding: '14px', backgroundColor: '#fef2f2' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626' }}>OVERDUE COMPLAINTS</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#dc2626' }}>
                {workers.reduce((acc, w) => acc + (w.stats?.overdue_count || 0), 0)}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#b91c1c' }}>Breached SLA</div>
            </div>
          </div>

          {/* ADVANCED FILTER & SEARCH ENGINE */}
          <div className="card" style={{ padding: '18px', marginBottom: '22px', backgroundColor: '#fcfaf5', border: '1px solid #e5dcbe' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              {/* Search input */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b5e28', display: 'block', marginBottom: '4px' }}>
                  SEARCH WORKER
                </label>
                <div style={{ position: 'relative' }}>
                  <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search name, phone, email..."
                    value={workerSearch}
                    onChange={(e) => setWorkerSearch(e.target.value)}
                    style={{ paddingLeft: '32px', fontSize: '0.85rem', width: '100%' }}
                  />
                </div>
              </div>

              {/* Ward Filter (All 65 Wards) */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b5e28', display: 'block', marginBottom: '4px' }}>
                  FILTER BY WARD ({allWardsList.length} Wards)
                </label>
                <select
                  className="form-select"
                  value={workerWardFilter}
                  onChange={(e) => setWorkerWardFilter(e.target.value)}
                  style={{ fontSize: '0.85rem', width: '100%' }}
                >
                  <option value="ALL">All 65 Mysuru Wards</option>
                  {allWardsList.map(w => (
                    <option key={w.id || w.ward_number} value={w.ward_number || w.ward_name}>
                      Ward {w.ward_number}: {w.ward_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Department Filter */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b5e28', display: 'block', marginBottom: '4px' }}>
                  FILTER BY DEPARTMENT
                </label>
                <select
                  className="form-select"
                  value={workerDeptFilter}
                  onChange={(e) => setWorkerDeptFilter(e.target.value)}
                  style={{ fontSize: '0.85rem', width: '100%' }}
                >
                  <option value="ALL">All Departments</option>
                  {allDeptsList.map(d => (
                    <option key={d.id} value={d.id || d.name}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Activity / Workload Filter */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b5e28', display: 'block', marginBottom: '4px' }}>
                  ACTIVITY / WORKLOAD
                </label>
                <select
                  className="form-select"
                  value={workerActivityFilter}
                  onChange={(e) => setWorkerActivityFilter(e.target.value)}
                  style={{ fontSize: '0.85rem', width: '100%' }}
                >
                  <option value="ALL">All Workers ({workers.length})</option>
                  <option value="active">Active Assignments Only</option>
                  <option value="has_overdue">Has Overdue Complaints ⚠️</option>
                  <option value="resolved">High Performers (Resolved)</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b5e28', display: 'block', marginBottom: '4px' }}>
                  SORT WORKERS BY
                </label>
                <select
                  className="form-select"
                  value={workerSortBy}
                  onChange={(e) => setWorkerSortBy(e.target.value)}
                  style={{ fontSize: '0.85rem', width: '100%' }}
                >
                  <option value="assigned_desc">Most Assigned Complaints</option>
                  <option value="overdue_desc">Most Overdue Complaints</option>
                  <option value="resolved_desc">Most Resolved Complaints</option>
                  <option value="speed_asc">Fastest Resolution Speed</option>
                  <option value="ward_asc">Ward Number (1 to 65)</option>
                  <option value="name_asc">Worker Name (A to Z)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', fontSize: '0.8rem', color: '#5e6654' }}>
              <span>Showing <strong>{filteredWorkers.length}</strong> of <strong>{workers.length}</strong> field workers.</span>
              {(workerSearch || workerWardFilter !== 'ALL' || workerDeptFilter !== 'ALL' || workerActivityFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setWorkerSearch('');
                    setWorkerWardFilter('ALL');
                    setWorkerDeptFilter('ALL');
                    setWorkerActivityFilter('ALL');
                  }}
                  style={{ background: 'none', border: 'none', color: '#4b5e28', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Reset All Filters
                </button>
              )}
            </div>
          </div>

          {/* Workers Scorecards Grid */}
          {filteredWorkers.length === 0 ? (
            <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#5e6654' }}>
              No workers match the selected filters.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '18px' }}>
              {filteredWorkers.map((w) => {
                const st = w.stats || { total_assigned: 0, resolved_count: 0, remaining_count: 0, overdue_count: 0, avg_resolution_days: 0, resolution_rate: 0 };
                return (
                  <div 
                    key={w.id} 
                    className="card" 
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'space-between',
                      borderTop: `4px solid ${st.overdue_count > 0 ? '#dc2626' : '#4b5e28'}`,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                    }}
                  >
                    <div>
                      {/* Worker Header: Name, Department Badge, Ward */}
                      <div style={{ marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap' }}>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1f241a', flex: '1 1 180px', wordBreak: 'break-word', lineHeight: 1.35 }}>
                            {w.name}
                          </h4>
                          <span 
                            className="badge" 
                            style={{ 
                              backgroundColor: '#edf4e4', 
                              color: '#3c4c1f', 
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              maxWidth: '100%',
                              wordBreak: 'break-word',
                              whiteSpace: 'normal',
                              textAlign: 'right',
                              flexShrink: 0
                            }}
                          >
                            {w.department_name || 'Civic Services'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#5e6654', marginTop: '6px' }}>
                          Ward {w.ward_number || 'N/A'}: <strong>{w.ward_name}</strong>
                        </div>
                      </div>

                      {/* Contact Info */}
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '14px', fontSize: '0.75rem', color: '#475569', flexWrap: 'wrap' }}>
                        {w.phone && (
                          <a href={`tel:${w.phone}`} style={{ color: '#166534', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Phone size={12} /> {w.phone}
                          </a>
                        )}
                        {w.email && (
                          <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Mail size={12} /> {w.email}
                          </span>
                        )}
                      </div>

                      {/* STATS SCORECARD METRICS (Solved, Remaining, Days, Overdue) */}
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(4, 1fr)', 
                        gap: '6px', 
                        backgroundColor: '#f8fafc', 
                        borderRadius: '8px', 
                        padding: '10px 8px', 
                        marginBottom: '14px',
                        textAlign: 'center',
                        border: '1px solid #e2e8f0'
                      }}>
                        <div>
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b' }}>ASSIGNED</div>
                          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>{st.total_assigned}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#166534' }}>SOLVED</div>
                          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#166534' }}>{st.resolved_count}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#b45309' }}>REMAINING</div>
                          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#b45309' }}>{st.remaining_count}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#dc2626' }}>OVERDUE</div>
                          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#dc2626' }}>{st.overdue_count}</div>
                        </div>
                      </div>

                      {/* Speed and Resolution Rate */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#475569', marginBottom: '8px' }}>
                        <span>Avg Resolution Speed:</span>
                        <strong style={{ color: '#2563eb' }}>
                          {st.avg_resolution_days > 0 ? `${st.avg_resolution_days} days` : (st.resolved_count > 0 ? '< 1 day' : 'N/A')}
                        </strong>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#475569', marginBottom: '4px' }}>
                        <span>Resolution Success Rate:</span>
                        <strong style={{ color: st.resolution_rate >= 70 ? '#166534' : (st.resolution_rate >= 40 ? '#b45309' : '#dc2626') }}>
                          {st.resolution_rate}%
                        </strong>
                      </div>

                      {/* Progress bar */}
                      <div style={{ height: '6px', borderRadius: '3px', backgroundColor: '#e2e8f0', overflow: 'hidden', marginBottom: '14px' }}>
                        <div 
                          style={{ 
                            width: `${st.resolution_rate}%`, 
                            height: '100%', 
                            backgroundColor: st.resolution_rate >= 70 ? '#16a34a' : (st.resolution_rate >= 40 ? '#f59e0b' : '#ef4444') 
                          }} 
                        />
                      </div>
                    </div>

                    {/* Action buttons: Drill-down & Rename/Transfer */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                      <button
                        type="button"
                        onClick={() => openWorkerScorecard(w.id)}
                        className="btn btn-outline"
                        style={{ 
                          flex: '1 1 auto',
                          padding: '8px 10px', 
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <Camera size={14} /> Performance & Photos
                      </button>
                      <button
                        type="button"
                        onClick={() => openMemberModal(w)}
                        className="btn btn-olive"
                        style={{ 
                          padding: '8px 12px', 
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          backgroundColor: '#4b5e28',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                        title="Rename or update contact number upon transfer/personnel change"
                      >
                        <Edit3 size={14} /> Rename / Transfer
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 7. WORKER DRILL-DOWN PERFORMANCE & COMPLAINT PHOTOS MODAL */}
      {selectedWorkerId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div className="card" style={{ maxWidth: '900px', width: '100%', maxHeight: '94vh', overflowY: 'auto', padding: '24px' }}>
            {workerModalLoading || !workerDetailData ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px auto', color: '#4b5e28' }} />
                <div style={{ fontWeight: 700, color: '#1f241a' }}>Loading Worker Scorecard & Complaint Photos...</div>
              </div>
            ) : (
              <div>
                {/* Modal Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '16px' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#4b5e28', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      WORKER PERFORMANCE SCORECARD & EVIDENCE
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', margin: '4px 0' }}>
                      <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        {workerDetailData.worker.name}
                      </h3>
                      <button
                        type="button"
                        onClick={() => openMemberModal(workerDetailData.worker)}
                        style={{
                          padding: '4px 10px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          backgroundColor: '#edf4e4',
                          color: '#3c4c1f',
                          border: '1px solid #b8df9c',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          cursor: 'pointer'
                        }}
                        title="Rename person or update contact number upon personnel changes"
                      >
                        <Edit3 size={13} /> Rename / Transfer
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '14px', fontSize: '0.82rem', color: '#475569', flexWrap: 'wrap' }}>
                      <span>Ward: <strong>{workerDetailData.worker.ward_name || `Ward ${workerDetailData.worker.ward_number}`}</strong></span>
                      <span>Department: <strong>{workerDetailData.worker.department_name}</strong></span>
                      {workerDetailData.worker.phone && (
                        <span>Phone: <a href={`tel:${workerDetailData.worker.phone}`} style={{ color: '#166534', fontWeight: 600 }}>{workerDetailData.worker.phone}</a></span>
                      )}
                      {workerDetailData.worker.email && (
                        <span>Email: <strong>{workerDetailData.worker.email}</strong></span>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => { setSelectedWorkerId(null); setWorkerDetailData(null); }} 
                    style={{ background: 'none', border: 'none', fontSize: '1.6rem', color: '#94a3b8', cursor: 'pointer', lineHeight: 1 }}
                  >
                    &times;
                  </button>
                </div>

                {/* KPI Metrics Ribbon */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                  <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b' }}>TOTAL ASSIGNED</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{workerDetailData.stats.total_assigned}</div>
                  </div>
                  <div style={{ backgroundColor: '#f0fdf4', padding: '12px', borderRadius: '8px', textAlign: 'center', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#166534' }}>SOLVED</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#166534' }}>{workerDetailData.stats.resolved_count}</div>
                  </div>
                  <div style={{ backgroundColor: '#fffbeb', padding: '12px', borderRadius: '8px', textAlign: 'center', border: '1px solid #fde68a' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#b45309' }}>REMAINING</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#b45309' }}>{workerDetailData.stats.remaining_count}</div>
                  </div>
                  <div style={{ backgroundColor: '#fef2f2', padding: '12px', borderRadius: '8px', textAlign: 'center', border: '1px solid #fecaca' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#dc2626' }}>OVERDUE</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#dc2626' }}>{workerDetailData.stats.overdue_count}</div>
                  </div>
                  <div style={{ backgroundColor: '#eff6ff', padding: '12px', borderRadius: '8px', textAlign: 'center', border: '1px solid #bfdbfe' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#2563eb' }}>AVG SPEED</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1d4ed8' }}>
                      {workerDetailData.stats.avg_resolution_days > 0 ? `${workerDetailData.stats.avg_resolution_days} d` : (workerDetailData.stats.resolved_count > 0 ? '< 1 d' : 'N/A')}
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#faf5ff', padding: '12px', borderRadius: '8px', textAlign: 'center', border: '1px solid #e9d5ff' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#7e22ce' }}>SUCCESS RATE</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#7e22ce' }}>{workerDetailData.stats.resolution_rate_percent}%</div>
                  </div>
                </div>

                {/* Sub-filter tabs inside modal */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1f241a' }}>
                    Assigned Complaints & Photographic Proofs ({workerDetailData.complaints.length})
                  </h4>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => setModalComplaintFilter('ALL')}
                      className={`btn ${modalComplaintFilter === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                    >
                      All ({workerDetailData.complaints.length})
                    </button>
                    <button
                      onClick={() => setModalComplaintFilter('RESOLVED')}
                      className={`btn ${modalComplaintFilter === 'RESOLVED' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                    >
                      Solved ({workerDetailData.complaints.filter(c => c.status === 'RESOLVED').length})
                    </button>
                    <button
                      onClick={() => setModalComplaintFilter('REMAINING')}
                      className={`btn ${modalComplaintFilter === 'REMAINING' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                    >
                      Remaining ({workerDetailData.complaints.filter(c => c.status !== 'RESOLVED').length})
                    </button>
                    <button
                      onClick={() => setModalComplaintFilter('OVERDUE')}
                      className={`btn ${modalComplaintFilter === 'OVERDUE' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                    >
                      Overdue ({workerDetailData.complaints.filter(c => c.status === 'OVERDUE').length})
                    </button>
                  </div>
                </div>

                {/* List of complaints with photos and days taken */}
                {workerDetailData.complaints.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                    No complaints currently assigned to this worker.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {workerDetailData.complaints
                      .filter(c => {
                        if (modalComplaintFilter === 'RESOLVED') return c.status === 'RESOLVED';
                        if (modalComplaintFilter === 'REMAINING') return c.status !== 'RESOLVED';
                        if (modalComplaintFilter === 'OVERDUE') return c.status === 'OVERDUE';
                        return true;
                      })
                      .map((c) => {
                        const origUrl = getImageUrl(c.original_photo, c.category_name, false);
                        const resUrl = getImageUrl(c.resolution_photo, c.category_name, true);

                        return (
                          <div 
                            key={c.id} 
                            style={{ 
                              border: `1px solid ${c.status === 'OVERDUE' ? '#fecaca' : (c.status === 'RESOLVED' ? '#bbf7d0' : '#e2e8f0')}`, 
                              borderRadius: '10px', 
                              padding: '14px', 
                              backgroundColor: c.status === 'OVERDUE' ? '#fffafb' : (c.status === 'RESOLVED' ? '#fcfdfc' : '#ffffff')
                            }}
                          >
                            {/* Card Top: Code, Category, Status */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                              <div>
                                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>{c.complaint_code}</span>
                                <h5 style={{ fontSize: '1rem', fontWeight: 800, color: '#1f241a', margin: '2px 0' }}>
                                  {c.category_name}
                                </h5>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                  Ward: <strong>{c.ward_name || `Ward ${c.ward_number}`}</strong> | Priority: <strong>{c.priority}</strong>
                                </div>
                              </div>

                              <div style={{ textAlign: 'right' }}>
                                <span className={`badge badge-${c.status}`} style={{ fontSize: '0.7rem' }}>
                                  {c.status}
                                </span>
                                {c.time_taken_str && (
                                  <div style={{ 
                                    fontSize: '0.75rem', 
                                    fontWeight: 700, 
                                    marginTop: '4px',
                                    color: c.status === 'RESOLVED' ? '#166534' : (c.status === 'OVERDUE' ? '#dc2626' : '#2563eb')
                                  }}>
                                    ⏱️ {c.time_taken_str}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Side-by-side Photographs: Original Citizen Report & Worker Resolution Proof */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', margin: '12px 0' }}>
                              {/* Original Photo */}
                              <div>
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                                  📸 CITIZEN COMPLAINT PHOTO
                                </div>
                                <div 
                                  style={{ height: '140px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#e2e8f0', cursor: 'pointer', position: 'relative' }}
                                  onClick={() => setLightboxImage({ url: origUrl, title: `${c.complaint_code} - Original Citizen Report` })}
                                >
                                  <img 
                                    src={origUrl} 
                                    alt="Original issue" 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={(e) => { 
                                      const fb = getCategoryFallback(c.category_name, false);
                                      if (e.target.src !== fb) e.target.src = fb;
                                    }}
                                  />
                                  <span style={{ position: 'absolute', bottom: '4px', right: '4px', backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px' }}>
                                    Zoom
                                  </span>
                                </div>
                              </div>

                              {/* Resolution Photo */}
                              <div>
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: c.resolution_photo ? '#166534' : '#64748b', marginBottom: '4px' }}>
                                  {c.resolution_photo ? '✅ FIELD RESOLUTION PROOF PHOTO' : '⏳ RESOLUTION PROOF (PENDING FIELD WORK)'}
                                </div>
                                {c.resolution_photo ? (
                                  <div 
                                    style={{ height: '140px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#e2e8f0', cursor: 'pointer', position: 'relative' }}
                                    onClick={() => setLightboxImage({ url: resUrl, title: `${c.complaint_code} - Worker Resolution Proof` })}
                                  >
                                    <img 
                                      src={resUrl} 
                                      alt="Resolution evidence" 
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                      onError={(e) => { 
                                        const fb = getCategoryFallback(c.category_name, true);
                                        if (e.target.src !== fb) e.target.src = fb;
                                      }}
                                    />
                                    <span style={{ position: 'absolute', bottom: '4px', right: '4px', backgroundColor: 'rgba(22, 101, 52, 0.8)', color: '#fff', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px' }}>
                                      Verified Evidence
                                    </span>
                                  </div>
                                ) : (
                                  <div style={{ height: '140px', borderRadius: '6px', backgroundColor: '#f1f5f9', border: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.75rem', padding: '12px', textAlign: 'center' }}>
                                    <Camera size={24} style={{ marginBottom: '6px' }} />
                                    <span>Resolution photo will be uploaded once field worker resolves this issue.</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Additional metadata: Dates & Quick Action */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '8px', flexWrap: 'wrap', gap: '8px' }}>
                              <div>
                                <span>Reported: {formatDateTime(c.created_at)}</span>
                                {c.sla_due_at && (
                                  <span style={{ marginLeft: '12px', color: c.status === 'OVERDUE' ? '#dc2626' : '#64748b' }}>
                                    SLA Due: {formatDateTime(c.sla_due_at)}
                                  </span>
                                )}
                              </div>

                              {c.status === 'OVERDUE' && (
                                <button
                                  type="button"
                                  onClick={() => handleSendReminder(c.id, workerDetailData.worker.name)}
                                  className="btn btn-outline"
                                  style={{ padding: '3px 8px', fontSize: '0.72rem', color: '#dc2626', borderColor: '#fca5a5' }}
                                >
                                  ⚠️ Send Urgent Notice
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 8. Lightbox Zoom Modal for High-Resolution Photos */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              backgroundColor: '#1e293b', 
              color: '#fff', 
              borderRadius: '12px', 
              maxWidth: '850px', 
              width: '100%', 
              overflow: 'hidden',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)'
            }}
          >
            <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{lightboxImage.title}</span>
              <button 
                onClick={() => setLightboxImage(null)} 
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.4rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>
            <div style={{ maxHeight: '75vh', overflow: 'hidden', backgroundColor: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img 
                src={lightboxImage.url} 
                alt="Enlarged view" 
                style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 9. Inspection & Decision Modal for Verification Queue */}
      {selectedVerify && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="card" style={{ maxWidth: '780px', width: '100%', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b5e28' }}>ADMIN RESOLUTION VERIFICATION</span>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1f241a' }}>
                  {selectedVerify.complaint_code}: {selectedVerify.category_name}
                </h3>
                <div style={{ fontSize: '0.82rem', color: '#5e6654' }}>
                  Ward: <strong>{selectedVerify.ward_name}</strong> | Officer: <strong>{selectedVerify.officer_name}</strong>
                </div>
              </div>
              <button 
                onClick={() => setSelectedVerify(null)} 
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', color: '#94a3b8' }}
              >
                &times;
              </button>
            </div>

            {/* Side-by-side Evidence Display */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div style={{ backgroundColor: '#fbf7ee', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#475569', marginBottom: '6px' }}>
                  ORIGINAL CITIZEN REPORT
                </div>
                <div style={{ height: '220px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#e5dcbe' }}>
                  <img 
                    src={getImageUrl(selectedVerify.original_photo, selectedVerify.category_name, false)} 
                    alt="Original" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { 
                      const fb = getCategoryFallback(selectedVerify.category_name, false);
                      if (e.target.src !== fb) e.target.src = fb;
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.75rem', color: '#5e6654', marginTop: '6px' }}>
                  GPS: {selectedVerify.original_latitude?.toFixed(5)}, {selectedVerify.original_longitude?.toFixed(5)}
                </div>
              </div>

              <div style={{ backgroundColor: '#f0fdf4', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#166534', marginBottom: '6px' }}>
                  FIELD OFFICER RESOLUTION PROOF
                </div>
                <div style={{ height: '220px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#e5dcbe' }}>
                  <img 
                    src={getImageUrl(selectedVerify.resolution_photo, selectedVerify.category_name, true)} 
                    alt="Resolution" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { 
                      const fb = getCategoryFallback(selectedVerify.category_name, true);
                      if (e.target.src !== fb) e.target.src = fb;
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.75rem', color: '#166534', marginTop: '6px' }}>
                  Resolution GPS: {selectedVerify.resolution_latitude?.toFixed(5)}, {selectedVerify.resolution_longitude?.toFixed(5)}
                </div>
              </div>
            </div>

            {/* Computed Distance Banner */}
            <div style={{
              backgroundColor: selectedVerify.distance_from_original_m <= 50 ? '#edf7e7' : '#f7efd2',
              border: `1px solid ${selectedVerify.distance_from_original_m <= 50 ? '#86efac' : '#fde047'}`,
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>Calculated Geotag Distance:</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: selectedVerify.distance_from_original_m <= 50 ? '#166534' : '#8f6a20' }}>
                  {selectedVerify.distance_from_original_m} meters from original site
                </div>
              </div>
              <span className="badge" style={{ backgroundColor: '#ffffff' }}>
                {selectedVerify.distance_from_original_m <= 50 ? 'Within Geofence (Accurate)' : 'Extended Radius'}
              </span>
            </div>

            {/* Admin Notes */}
            <div className="form-group">
              <label className="form-label">Admin Verification Notes / Instructions</label>
              <textarea 
                className="form-textarea" 
                rows="2" 
                placeholder="Enter notes on verification decision (e.g. Cleared verified against landmarks)..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button 
                type="button" 
                onClick={() => setSelectedVerify(null)} 
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button 
                type="button" 
                disabled={actionLoading}
                onClick={() => handleVerify('reject')} 
                className="btn btn-danger"
              >
                <X size={16} /> Reject & Reopen
              </button>
              <button 
                type="button" 
                disabled={actionLoading}
                onClick={() => handleVerify('approve')} 
                className="btn btn-success"
              >
                <Check size={16} /> Approve as Resolved
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MANAGE / ADD / TRANSFER WARD WORKER MEMBER MODAL */}
      {showMemberModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '16px'
        }}>
          <div className="card" style={{
            maxWidth: '620px',
            width: '100%',
            maxHeight: '92vh',
            overflowY: 'auto',
            padding: '26px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1.5px solid #d4af37',
            boxShadow: '0 12px 36px rgba(0,0,0,0.25)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1.5px solid #e8dfc9', paddingBottom: '14px', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#4b5e28', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <UserPlus size={15} /> MCC PERSONNEL & STAFF MANAGEMENT
                </span>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1f241a', margin: '4px 0' }}>
                  Manage Ward Department Worker
                </h3>
                <p style={{ fontSize: '0.80rem', color: '#5e6654', margin: 0, lineHeight: 1.4 }}>
                  Select the ward and department to view current worker details, rename personnel, or update contact numbers upon transfers, retirements, or staff changes.
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setShowMemberModal(false)} 
                style={{ background: 'none', border: 'none', fontSize: '1.6rem', color: '#94a3b8', cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}
              >
                &times;
              </button>
            </div>

            {/* Alert Messages */}
            {memberSuccessMsg && (
              <div style={{
                backgroundColor: '#f0fdf4',
                border: '1.5px solid #86efac',
                color: '#166534',
                padding: '12px 14px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <CheckCircle2 size={18} color="#16a34a" style={{ flexShrink: 0 }} />
                <span>{memberSuccessMsg}</span>
              </div>
            )}

            {memberErrorMsg && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1.5px solid #fca5a5',
                color: '#991b1b',
                padding: '12px 14px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <ShieldAlert size={18} color="#dc2626" style={{ flexShrink: 0 }} />
                <span>{memberErrorMsg}</span>
              </div>
            )}

            {/* Current Status Preview Box */}
            <div style={{
              backgroundColor: '#fcfaf5',
              border: '1.5px solid #e5dcbe',
              borderRadius: '9px',
              padding: '12px 14px',
              marginBottom: '18px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#4b5e28', textTransform: 'uppercase' }}>
                  CURRENT DESIGNATED WORKER
                </span>
                {memberLookupLoading ? (
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Checking directory...</span>
                ) : currentLookupWorker ? (
                  <span className="badge" style={{ backgroundColor: '#edf4e4', color: '#3c4c1f', fontSize: '0.70rem', fontWeight: 700 }}>
                    Active Assignment
                  </span>
                ) : (
                  <span className="badge" style={{ backgroundColor: '#fef3c7', color: '#92400e', fontSize: '0.70rem', fontWeight: 700 }}>
                    New Assignment
                  </span>
                )}
              </div>

              {currentLookupWorker ? (
                <div>
                  <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#1f241a' }}>
                    {currentLookupWorker.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#555e4c', marginTop: '2px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    <span>Phone: <strong>{currentLookupWorker.phone || 'None registered'}</strong></span>
                    <span>•</span>
                    <span>Email: <strong>{currentLookupWorker.email}</strong></span>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '0.80rem', color: '#64748b', fontStyle: 'italic' }}>
                  No existing worker record found for this ward and department. Saving will create and register a new designated worker.
                </div>
              )}
            </div>

            {/* Form Inputs */}
            <form onSubmit={handleSaveMember}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                {/* Ward Selection */}
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38481d', display: 'block', marginBottom: '5px' }}>
                    SELECT WARD ({wards.length} Wards) *
                  </label>
                  <select
                    className="form-select"
                    value={memberWardId}
                    onChange={(e) => handleWardOrDeptChange(e.target.value, memberDeptId)}
                    style={{ width: '100%', fontSize: '0.86rem', padding: '9px 10px' }}
                    required
                  >
                    <option value="">-- Choose Ward --</option>
                    {[...wards].sort((a,b) => (a.ward_number || 0) - (b.ward_number || 0)).map((wd) => (
                      <option key={wd.id} value={wd.id}>
                        Ward {wd.ward_number}: {wd.ward_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Department Selection */}
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38481d', display: 'block', marginBottom: '5px' }}>
                    SELECT DEPARTMENT *
                  </label>
                  <select
                    className="form-select"
                    value={memberDeptId}
                    onChange={(e) => handleWardOrDeptChange(memberWardId, e.target.value)}
                    style={{ width: '100%', fontSize: '0.86rem', padding: '9px 10px' }}
                    required
                  >
                    <option value="">-- Choose Department --</option>
                    {departments.map((dp) => (
                      <option key={dp.id} value={dp.id}>
                        {dp.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Worker Name Input */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38481d', display: 'block', marginBottom: '5px' }}>
                  WORKER FULL NAME (NEW / REASSIGNED) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Gowda, Girish Nayak..."
                  value={memberWorkerName}
                  onChange={(e) => setMemberWorkerName(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', fontSize: '0.88rem', padding: '9px 12px' }}
                />
                <div style={{ fontSize: '0.72rem', color: '#68755c', marginTop: '3px' }}>
                  Enter personal name. The system automatically maintains the department bracket identifier for administrative consistency.
                </div>
              </div>

              {/* Contact Phone Input */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38481d', display: 'block', marginBottom: '5px' }}>
                  CONTACT MOBILE PHONE NUMBER
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9845011223"
                  value={memberWorkerPhone}
                  onChange={(e) => setMemberWorkerPhone(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', fontSize: '0.88rem', padding: '9px 12px' }}
                />
                <div style={{ fontSize: '0.72rem', color: '#68755c', marginTop: '3px' }}>
                  Mobile number for dispatch alerts, SMS notifications, and public verification.
                </div>
              </div>

              {/* Reason for Change */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38481d', display: 'block', marginBottom: '5px' }}>
                  PERSONNEL CHANGE REASON
                </label>
                <select
                  className="form-select"
                  value={memberTransferReason}
                  onChange={(e) => setMemberTransferReason(e.target.value)}
                  style={{ width: '100%', fontSize: '0.86rem', padding: '9px 10px' }}
                >
                  <option value="Personnel Transfer">Personnel Transfer / Routine Ward Rotation</option>
                  <option value="Staff Replacement / Retirement">Staff Replacement / Retirement / Deceased</option>
                  <option value="New Recruitment">New Field Staff Recruitment</option>
                  <option value="Promotion / Reassignment">Promotion / Departmental Reassignment</option>
                  <option value="Name & Contact Correction">Name & Contact Information Correction</option>
                </select>
              </div>

              {/* Administrative Transfer Note */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38481d', display: 'block', marginBottom: '5px' }}>
                  ADMINISTRATIVE NOTES (OPTIONAL)
                </label>
                <textarea
                  className="form-textarea"
                  rows="2"
                  placeholder="e.g. Transferred from Ward 12 as per MCC circular order..."
                  value={memberTransferNote}
                  onChange={(e) => setMemberTransferNote(e.target.value)}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
              </div>

              {/* Modal Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowMemberModal(false)}
                  className="btn btn-outline"
                  disabled={memberSaving}
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={memberSaving || memberLookupLoading}
                  className="btn btn-olive"
                  style={{
                    padding: '8px 18px',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    backgroundColor: '#4b5e28',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(75, 94, 40, 0.25)'
                  }}
                >
                  <Save size={16} /> {memberSaving ? 'Saving & Updating All Pages...' : 'Save & Update Worker Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
