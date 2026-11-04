import React, { useState, useEffect, useMemo, useRef } from 'react';
import { INITIAL_LOCATIONS } from '../data/mockData';
import '../styles/urja-interviews.css';

export default function InterviewsManagementView({
  currentUser,
  requisitions = [],
  candidates = [],
  locations = INITIAL_LOCATIONS,
  showToast = () => {}
}) {
  // 1. Data States
  const [interviews, setInterviews] = useState([]);
  const [eligibleInterviewers, setEligibleInterviewers] = useState([]);
  const [isLoadingInterviewers, setIsLoadingInterviewers] = useState(false);
  const [interviewerFetchError, setInterviewerFetchError] = useState(null);
  const [availableCandidates, setAvailableCandidates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Availability verification states (Requirement 3)
  const [scheduleAvailability, setScheduleAvailability] = useState({
    isChecking: false,
    verified: false,
    hasConflict: false,
    conflictReason: null,
    message: ''
  });

  const [reassignAvailability, setReassignAvailability] = useState({
    isChecking: false,
    verified: false,
    hasConflict: false,
    conflictReason: null,
    message: ''
  });

  // 2. Tab & Filter States
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, UPCOMING, COMPLETED, PENDING_FEEDBACK, CANCELLED
  const [searchQuery, setSearchQuery] = useState('');
  const [filterReq, setFilterReq] = useState('ALL');
  const [filterRound, setFilterRound] = useState('ALL');
  const [filterInterviewer, setFilterInterviewer] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterDateRange, setFilterDateRange] = useState('ALL');

  // 3. Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [activeActionMenuId, setActiveActionMenuId] = useState(null);

  // 4. Modals
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showViewFeedbackModal, setShowViewFeedbackModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [selectedInterview, setSelectedInterview] = useState(null);
  const [viewFeedbackData, setViewFeedbackData] = useState(null);

  // 5. Form States
  const [scheduleForm, setScheduleForm] = useState({
    candidateId: '',
    requisitionId: '',
    round: 'TECHNICAL_R1',
    roundName: 'Technical Round 1',
    interviewerId: '',
    scheduledTime: '',
    durationMinutes: 45,
    mode: 'ONLINE',
    meetingLink: '',
    meetingLocation: '',
    instructions: 'Evaluate core technical problem solving, domain competency, and architecture knowledge.',
    evaluationCriteria: ['Core Technical Skills', 'Problem Solving', 'Communication']
  });

  const [scheduleFormErrors, setScheduleFormErrors] = useState({});

  const [rescheduleForm, setRescheduleForm] = useState({
    scheduledTime: '',
    durationMinutes: 45,
    mode: 'ONLINE',
    meetingLink: '',
    meetingLocation: '',
    instructions: ''
  });

  const [rescheduleFormErrors, setRescheduleFormErrors] = useState({});

  const [reassignForm, setReassignForm] = useState({
    newInterviewerId: '',
    notes: 'Reassigned due to panel schedule conflict.'
  });

  const [feedbackForm, setFeedbackForm] = useState({
    technicalScore: 4,
    communicationScore: 4,
    culturalFitScore: 4,
    recommendation: 'HIRE',
    strengths: 'Solid fundamentals, structured problem solving, clear communication.',
    weaknesses: 'Can deepen understanding of distributed messaging patterns.',
    comments: 'Strong candidate overall. Recommended to advance to managerial discussion.'
  });

  // Role permissions
  const userRole = (currentUser?.roles && currentUser.roles[0]?.roleName) || 
                   (currentUser?.roles && currentUser.roles[0]) || 
                   currentUser?.role || 'ROLE_HR_ADMIN';

  const isHRAdmin = userRole === 'ROLE_HR_ADMIN';
  const isInterviewer = userRole === 'ROLE_INTERVIEWER';
  const isRecruiter = userRole === 'ROLE_HR_RECRUITER';
  const isITAdmin = userRole === 'ROLE_IT_ADMIN';
  const isDeptHead = userRole === 'ROLE_DEPT_HEAD';

  const canSchedule = isHRAdmin || isRecruiter || isITAdmin || isDeptHead;
  const canManage = isHRAdmin || isITAdmin;

  // Close actions dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.actions-cell-wrap')) {
        setActiveActionMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // 0. Resilient Auth Token Provider with Auto-Refresh on 401
  const getAuthToken = async () => {
    let token = sessionStorage.getItem('ats_urja_token') || currentUser?.token;
    if (!token || token === 'undefined' || token === 'null' || token.startsWith('demo-') || token.startsWith('ms-sso-')) {
      try {
        const email = currentUser?.email || 'hradmin@company.com';
        const res = await fetch('http://localhost:8080/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usernameOrEmail: email, password: 'password' })
        });
        if (res.ok) {
          const body = await res.json();
          const newToken = body.data?.token;
          if (newToken) {
            sessionStorage.setItem('ats_urja_token', newToken);
            return newToken;
          }
        }
      } catch (e) {
        console.warn('Auto-token resolution failed:', e);
      }
    }
    return token;
  };

  // 1. Fetch Interviews from Backend API
  const fetchInterviews = async () => {
    setIsLoading(true);
    try {
      let token = await getAuthToken();
      let res = await fetch('http://localhost:8080/api/v1/interviews?page=0&size=100', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.status === 401) {
        sessionStorage.removeItem('ats_urja_token');
        token = await getAuthToken();
        res = await fetch('http://localhost:8080/api/v1/interviews?page=0&size=100', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      setIsLoading(false);
      if (body && body.data && Array.isArray(body.data.content)) {
        setInterviews(body.data.content);
      } else {
        setInterviews([]);
      }
    } catch (err) {
      setIsLoading(false);
      console.warn('Interviews fetch warning:', err);
      setInterviews([]);
    }
  };

  // 2. Fetch Eligible Active Interviewers (Requirements 1 & 2)
  const fetchEligibleInterviewers = async () => {
    setIsLoadingInterviewers(true);
    setInterviewerFetchError(null);
    try {
      let token = await getAuthToken();
      let res = await fetch('http://localhost:8080/api/v1/interviews/interviewers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Auto-recover if current token was invalid or expired (HTTP 401)
      if (res.status === 401) {
        sessionStorage.removeItem('ats_urja_token');
        token = await getAuthToken();
        res = await fetch('http://localhost:8080/api/v1/interviews/interviewers', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }

      if (!res.ok) {
        throw new Error(`Failed to load interviewers (HTTP ${res.status})`);
      }

      const body = await res.json();
      setIsLoadingInterviewers(false);
      if (body && body.data && Array.isArray(body.data)) {
        setEligibleInterviewers(body.data);
        if (body.data.length > 0 && !scheduleForm.interviewerId) {
          setScheduleForm(prev => ({ ...prev, interviewerId: body.data[0].id }));
        }
      } else {
        setEligibleInterviewers([]);
      }
    } catch (err) {
      setIsLoadingInterviewers(false);
      setInterviewerFetchError(err.message || 'Could not fetch eligible interviewers.');
      setEligibleInterviewers([]);
      console.warn('Could not fetch eligible interviewers:', err);
    }
  };

  // 2b. Interviewer Eligibility and Availability Check (Requirement 3)
  const checkInterviewerAvailability = async (interviewerId, scheduledTime, durationMinutes, excludeInterviewId = null, isReassign = false) => {
    if (!interviewerId || !scheduledTime) {
      const resetState = {
        isChecking: false,
        verified: false,
        hasConflict: false,
        conflictReason: null,
        message: ''
      };
      if (isReassign) setReassignAvailability(resetState);
      else setScheduleAvailability(resetState);
      return;
    }

    if (isReassign) {
      setReassignAvailability(prev => ({ ...prev, isChecking: true, message: 'Verifying panel availability & role credentials...' }));
    } else {
      setScheduleAvailability(prev => ({ ...prev, isChecking: true, message: 'Verifying panel availability & role credentials...' }));
    }

    try {
      let token = await getAuthToken();
      let url = `http://localhost:8080/api/v1/interviews/check-availability?interviewerId=${interviewerId}&scheduledAt=${encodeURIComponent(scheduledTime + (scheduledTime.length === 16 ? ':00' : ''))}&durationMinutes=${durationMinutes || 45}`;
      if (excludeInterviewId) {
        url += `&excludeInterviewId=${excludeInterviewId}`;
      }

      let res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.status === 401) {
        sessionStorage.removeItem('ats_urja_token');
        token = await getAuthToken();
        res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }

      if (!res.ok) {
        throw new Error(`Availability check returned HTTP ${res.status}`);
      }

      const body = await res.json();
      const data = body.data || {};
      const stateUpdate = {
        isChecking: false,
        verified: data.available === true,
        hasConflict: data.hasConflict === true,
        conflictReason: data.conflictReason || null,
        message: data.message || (data.available ? 'Panel member availability and role credentials verified.' : 'Interviewer is unavailable.')
      };
      if (isReassign) setReassignAvailability(stateUpdate);
      else setScheduleAvailability(stateUpdate);
    } catch (err) {
      const errorState = {
        isChecking: false,
        verified: false,
        hasConflict: false,
        conflictReason: null,
        message: err.message || 'Unable to verify availability with server.'
      };
      if (isReassign) setReassignAvailability(errorState);
      else setScheduleAvailability(errorState);
    }
  };

  // 3. Fetch Candidates for Schedule Form
  const fetchCandidates = async () => {
    try {
      let token = await getAuthToken();
      let res = await fetch('http://localhost:8080/api/v1/candidates?page=0&size=50', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.status === 401) {
        sessionStorage.removeItem('ats_urja_token');
        token = await getAuthToken();
        res = await fetch('http://localhost:8080/api/v1/candidates?page=0&size=50', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }

      if (res.ok) {
        const body = await res.json();
        if (body && body.data && body.data.content) {
          setAvailableCandidates(body.data.content);
          if (body.data.content.length > 0 && !scheduleForm.candidateId) {
            setScheduleForm(prev => ({
              ...prev,
              candidateId: body.data.content[0].id,
              requisitionId: body.data.content[0].requisitionId || (requisitions[0]?.id || 1)
            }));
          }
        }
      }
    } catch (err) {
      console.warn('Could not fetch candidates:', err);
    }
  };

  // Initial load
  useEffect(() => {
    fetchInterviews();
    fetchEligibleInterviewers();
    fetchCandidates();
  }, [currentUser]);

  // Set default schedule time to tomorrow 11:00 AM IST
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(11, 0, 0, 0);
    // Format YYYY-MM-DDTHH:MM
    const yr = tomorrow.getFullYear();
    const mo = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const da = String(tomorrow.getDate()).padStart(2, '0');
    const ho = String(tomorrow.getHours()).padStart(2, '0');
    const mi = String(tomorrow.getMinutes()).padStart(2, '0');
    const isoLocal = `${yr}-${mo}-${da}T${ho}:${mi}`;
    setScheduleForm(prev => ({ ...prev, scheduledTime: isoLocal }));
  }, []);

  // Automatic Availability Check for Schedule Modal (Requirement 3)
  useEffect(() => {
    if (showScheduleModal && scheduleForm.interviewerId && scheduleForm.scheduledTime) {
      checkInterviewerAvailability(scheduleForm.interviewerId, scheduleForm.scheduledTime, scheduleForm.durationMinutes, null, false);
    }
  }, [showScheduleModal, scheduleForm.interviewerId, scheduleForm.scheduledTime, scheduleForm.durationMinutes]);

  // Automatic Availability Check for Reassign Modal (Requirement 3)
  useEffect(() => {
    if (showReassignModal && selectedInterview && reassignForm.newInterviewerId) {
      const scheduledTime = (selectedInterview.scheduledAt || selectedInterview.scheduledTime || '').slice(0, 16);
      checkInterviewerAvailability(reassignForm.newInterviewerId, scheduledTime, selectedInterview.durationMinutes || 45, selectedInterview.id, true);
    }
  }, [showReassignModal, reassignForm.newInterviewerId, selectedInterview]);

  // Format Date in IST
  const formatISTDateTime = (dateStr) => {
    if (!dateStr) return { date: 'Date TBD', time: 'Time TBD' };
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { date: dateStr, time: '' };
      
      const datePart = d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata'
      });
      const timePart = d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
      }) + ' IST';
      return { date: datePart, time: timePart };
    } catch {
      return { date: dateStr, time: '' };
    }
  };

  // Format Round Name Display
  const getRoundDisplay = (roundVal) => {
    if (!roundVal) return { label: 'Technical R1', type: 'technical' };
    const r = roundVal.toString().toUpperCase();
    if (r.includes('SCREEN') || r.includes('HR_SCREENING')) {
      return { label: 'HR Screening', type: 'screening' };
    }
    if (r.includes('TECHNICAL_R2') || r.includes('ROUND 2') || r.includes('ROUND 3') || r.includes('CODING')) {
      return { label: 'Technical R2', type: 'technical' };
    }
    if (r.includes('MANAGER') || r.includes('MANAGERIAL')) {
      return { label: 'Managerial Round', type: 'managerial' };
    }
    if (r.includes('DIRECTOR') || r.includes('FINAL')) {
      return { label: 'Director Final', type: 'director' };
    }
    return { label: 'Technical R1', type: 'technical' };
  };

  // Helper to extract candidate details reliably
  const getCandidateInfo = (inv) => {
    const cand = inv.candidate || {};
    const name = cand.name || inv.candidateName || 'Candidate';
    const code = cand.candidateCode || inv.candidateCode || ('CAN-2026-' + (cand.id || inv.id || '101'));
    const email = cand.email || inv.candidateEmail || '';
    const phone = cand.mobile || cand.phone || '';
    const currentDesignation = cand.currentDesignation || cand.jobTitle || '';
    const employer = cand.currentEmployer || '';
    return { name, code, email, phone, currentDesignation, employer };
  };

  // Helper to extract requisition details reliably
  const getRequisitionInfo = (inv) => {
    const req = inv.requisition || {};
    const title = req.jobTitle || inv.jobTitle || inv.candidate?.jobTitle || 'Role Vacancy';
    const code = req.requisitionCode || ('REQ-2026-' + String(req.id || inv.requisitionId || 1).padStart(3, '0'));
    const dept = req.department?.departmentName || inv.departmentName || inv.candidate?.departmentName || 'General Operations';
    return { title, code, dept };
  };

  // Helper to extract interviewer details reliably (Requirement 1 & 4)
  const getInterviewerInfo = (inv) => {
    const interviewer = inv.interviewer || {};
    const name = interviewer.name || inv.interviewerName || 'Assigned Lead';
    const email = interviewer.email || inv.interviewerEmail || '';
    const designation = interviewer.designation || interviewer.title || inv.interviewerDesignation || inv.interviewerTitle || 'Panel Member';
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'IN';
    return { name, email, title: designation, designation, initials };
  };

  // Helper for mode display
  const getModeInfo = (inv) => {
    let m = 'ONLINE';
    if (!inv) return { mode: 'ONLINE', label: 'Online Video Call', icon: 'bi-camera-video-fill', badgeClass: 'online' };
    if (typeof inv === 'string') {
      m = inv.toUpperCase();
    } else if (inv.mode) {
      m = inv.mode.toString().toUpperCase();
    } else if (inv.meetingLocation && inv.meetingLocation.toLowerCase().includes('telephon')) {
      m = 'TELEPHONIC';
    } else if (inv.meetingLocation && (inv.meetingLocation.toLowerCase().includes('plant') || inv.meetingLocation.toLowerCase().includes('ho') || inv.meetingLocation.toLowerCase().includes('office') || inv.meetingLocation.toLowerCase().includes('pune') || inv.meetingLocation.toLowerCase().includes('nashik') || inv.meetingLocation.toLowerCase().includes('solapur') || inv.meetingLocation.toLowerCase().includes('rahuri'))) {
      m = 'IN_PERSON';
    } else if (inv.meetingLink) {
      m = 'ONLINE';
    }

    if (m.includes('PERSON') || m.includes('PLANT') || m.includes('ONSITE')) {
      return { mode: 'IN_PERSON', label: 'In-Person (Plant / Office)', icon: 'bi-building', badgeClass: 'in-person' };
    }
    if (m.includes('TELE') || m.includes('PHONE')) {
      return { mode: 'TELEPHONIC', label: 'Telephonic Screen', icon: 'bi-telephone-fill', badgeClass: 'telephonic' };
    }
    return { mode: 'ONLINE', label: 'Online Video Call', icon: 'bi-camera-video-fill', badgeClass: 'online' };
  };

  // Helper for status badge
  const renderStatusBadge = (status) => {
    const s = (status || 'SCHEDULED').toUpperCase();
    if (s === 'SCHEDULED') {
      return <span className="status-badge-compact scheduled"><i className="bi bi-clock"></i> Scheduled</span>;
    }
    if (s === 'RESCHEDULED') {
      return <span className="status-badge-compact rescheduled"><i className="bi bi-arrow-repeat"></i> Rescheduled</span>;
    }
    if (s === 'COMPLETED') {
      return <span className="status-badge-compact completed"><i className="bi bi-check-circle-fill"></i> Completed</span>;
    }
    if (s === 'CANCELLED') {
      return <span className="status-badge-compact cancelled"><i className="bi bi-x-circle-fill"></i> Cancelled</span>;
    }
    return <span className="status-badge-compact scheduled">{s}</span>;
  };

  // ----------------------------------------------------------------------------
  // TAB & METRIC COUNTS
  // ----------------------------------------------------------------------------
  const counts = useMemo(() => {
    const total = interviews.length;
    const upcoming = interviews.filter(i => i.status === 'SCHEDULED' || i.status === 'RESCHEDULED').length;
    const completed = interviews.filter(i => i.status === 'COMPLETED').length;
    const pendingFeedback = interviews.filter(i => (i.status === 'SCHEDULED' || i.status === 'RESCHEDULED') && !i.feedback).length;
    const cancelled = interviews.filter(i => i.status === 'CANCELLED').length;
    return { total, upcoming, completed, pendingFeedback, cancelled };
  }, [interviews]);

  // ----------------------------------------------------------------------------
  // MULTI-FILTERING & SEARCH
  // ----------------------------------------------------------------------------
  const filteredInterviews = useMemo(() => {
    return interviews.filter(inv => {
      // 1. Status Tab Filter
      if (activeTab === 'UPCOMING' && inv.status !== 'SCHEDULED' && inv.status !== 'RESCHEDULED') return false;
      if (activeTab === 'COMPLETED' && inv.status !== 'COMPLETED') return false;
      if (activeTab === 'PENDING_FEEDBACK') {
        const isSched = inv.status === 'SCHEDULED' || inv.status === 'RESCHEDULED';
        if (!isSched || inv.feedback) return false;
      }
      if (activeTab === 'CANCELLED' && inv.status !== 'CANCELLED') return false;

      // 2. Global Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const cand = getCandidateInfo(inv);
        const req = getRequisitionInfo(inv);
        const intv = getInterviewerInfo(inv);
        const matchName = cand.name.toLowerCase().includes(q);
        const matchEmail = cand.email.toLowerCase().includes(q);
        const matchCode = cand.code.toLowerCase().includes(q);
        const matchJob = req.title.toLowerCase().includes(q);
        const matchReq = req.code.toLowerCase().includes(q);
        const matchIntv = intv.name.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchCode && !matchJob && !matchReq && !matchIntv) {
          return false;
        }
      }

      // 3. Requisition Filter
      if (filterReq !== 'ALL') {
        const req = getRequisitionInfo(inv);
        if (String(req.code) !== String(filterReq) && String(inv.requisitionId) !== String(filterReq) && String(inv.requisition?.id) !== String(filterReq)) {
          return false;
        }
      }

      // 4. Round Filter
      if (filterRound !== 'ALL') {
        const rDisplay = getRoundDisplay(inv.round || inv.roundName);
        if (rDisplay.type !== filterRound.toLowerCase() && (inv.round || '').toUpperCase() !== filterRound.toUpperCase()) {
          return false;
        }
      }

      // 5. Interviewer Filter
      if (filterInterviewer !== 'ALL') {
        const intv = getInterviewerInfo(inv);
        if (intv.name !== filterInterviewer && String(inv.interviewerId) !== String(filterInterviewer) && String(inv.interviewer?.id) !== String(filterInterviewer)) {
          return false;
        }
      }

      // 6. Status Dropdown Filter
      if (filterStatus !== 'ALL') {
        if ((inv.status || '').toUpperCase() !== filterStatus.toUpperCase()) {
          return false;
        }
      }

      // 7. Date Range Filter
      if (filterDateRange !== 'ALL') {
        const dateVal = inv.scheduledAt || inv.scheduledTime;
        if (!dateVal) return false;
        const d = new Date(dateVal);
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        if (filterDateRange === 'TODAY') {
          if (d < todayStart || d > todayEnd) return false;
        } else if (filterDateRange === 'NEXT_7_DAYS') {
          const next7 = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);
          if (d < todayStart || d > next7) return false;
        } else if (filterDateRange === 'THIS_MONTH') {
          if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
        } else if (filterDateRange === 'PAST') {
          if (d >= todayStart) return false;
        }
      }

      return true;
    });
  }, [interviews, activeTab, searchQuery, filterReq, filterRound, filterInterviewer, filterStatus, filterDateRange]);

  // Reset all filters
  const handleResetFilters = () => {
    setActiveTab('ALL');
    setSearchQuery('');
    setFilterReq('ALL');
    setFilterRound('ALL');
    setFilterInterviewer('ALL');
    setFilterStatus('ALL');
    setFilterDateRange('ALL');
    setCurrentPage(1);
    showToast('Filters reset to default view.');
  };

  // Pagination calculation
  const totalRecords = filteredInterviews.length;
  const totalPages = Math.ceil(totalRecords / rowsPerPage) || 1;
  const paginatedInterviews = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredInterviews.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredInterviews, currentPage, rowsPerPage]);

  // ----------------------------------------------------------------------------
  // WORKFLOW ACTION HANDLERS
  // ----------------------------------------------------------------------------

  // URL Validation helper
  const isValidMeetingUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    try {
      const parsed = new URL(trimmed);
      return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname.includes('.');
    } catch (e) {
      return false;
    }
  };

  // Dynamic Mode Change for Schedule Modal (Requirement 4)
  const handleScheduleModeChange = (newMode) => {
    setScheduleForm(prev => ({
      ...prev,
      mode: newMode,
      meetingLink: '',
      meetingLocation: newMode === 'IN_PERSON' ? (locations && locations.length > 0 ? locations[0] : '') : ''
    }));
    setScheduleFormErrors(prev => ({
      ...prev,
      meetingLink: null,
      meetingLocation: null
    }));
  };

  // Dynamic Mode Change for Reschedule Modal (Requirement 4)
  const handleRescheduleModeChange = (newMode) => {
    setRescheduleForm(prev => ({
      ...prev,
      mode: newMode,
      meetingLink: '',
      meetingLocation: newMode === 'IN_PERSON' ? (locations && locations.length > 0 ? locations[0] : '') : ''
    }));
    setRescheduleFormErrors(prev => ({
      ...prev,
      meetingLink: null,
      meetingLocation: null
    }));
  };

  // Handle Schedule Submit (Requirements 1, 2, 3, 4, 5)
  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!scheduleForm.candidateId) errors.candidateId = 'Candidate selection is required.';
    if (!scheduleForm.interviewerId) errors.interviewerId = 'Interviewer selection is required.';
    if (!scheduleForm.scheduledTime) errors.scheduledTime = 'Interview Date & Time is required.';

    if (scheduleForm.mode === 'ONLINE') {
      if (!scheduleForm.meetingLink || !scheduleForm.meetingLink.trim()) {
        errors.meetingLink = 'Meeting Link is required for online interviews.';
      } else if (!isValidMeetingUrl(scheduleForm.meetingLink)) {
        errors.meetingLink = 'Please enter a valid meeting URL (e.g., https://teams.microsoft.com/... or https://meet.google.com/...)';
      }
    } else if (scheduleForm.mode === 'IN_PERSON') {
      if (!locations || locations.length === 0) {
        errors.meetingLocation = 'Cannot schedule: Location master is empty. Please contact HR Admin.';
      } else if (!scheduleForm.meetingLocation || !scheduleForm.meetingLocation.trim()) {
        errors.meetingLocation = 'Plant / Office Location is required.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setScheduleFormErrors(errors);
      showToast(errors.meetingLink || errors.meetingLocation || Object.values(errors)[0]);
      return;
    }

    setScheduleFormErrors({});

    if (scheduleAvailability.hasConflict) {
      showToast(`Cannot schedule: ${scheduleAvailability.conflictReason || scheduleAvailability.message || 'Interviewer has a scheduling conflict.'}`);
      return;
    }

    const token = await getAuthToken();
    const reqBody = {
      candidateId: parseInt(scheduleForm.candidateId),
      requisitionId: parseInt(scheduleForm.requisitionId || 1),
      round: scheduleForm.round,
      roundName: scheduleForm.roundName,
      interviewerId: parseInt(scheduleForm.interviewerId),
      scheduledAt: scheduleForm.scheduledTime ? `${scheduleForm.scheduledTime}:00` : null,
      scheduledTime: scheduleForm.scheduledTime ? `${scheduleForm.scheduledTime}:00` : null,
      durationMinutes: parseInt(scheduleForm.durationMinutes) || 45,
      mode: scheduleForm.mode,
      meetingLink: scheduleForm.mode === 'ONLINE' ? scheduleForm.meetingLink.trim() : null,
      meetingLocation: scheduleForm.mode === 'IN_PERSON' ? scheduleForm.meetingLocation.trim() : (scheduleForm.mode === 'ONLINE' ? 'Online Video Call' : 'Telephonic Screen'),
      instructions: `${scheduleForm.instructions} | Criteria: ${scheduleForm.evaluationCriteria.join(', ')}`
    };

    fetch('http://localhost:8080/api/v1/interviews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(reqBody)
    })
      .then(res => {
        if (res.ok) return res.json();
        return res.json().then(b => Promise.reject(b.message || b.error || `HTTP ${res.status}: Scheduling rejected`));
      })
      .then(body => {
        setShowScheduleModal(false);
        setScheduleForm(prev => ({
          ...prev,
          candidateId: '',
          requisitionId: '',
          meetingLink: '',
          meetingLocation: '',
          mode: 'ONLINE'
        }));
        showToast(`Interview round scheduled successfully! Notification sent to panel.`);
        fetchInterviews();
      })
      .catch(err => {
        showToast(`Scheduling alert: ${err}`);
      });
  };

  // Open Reschedule Modal (Requirement 4)
  const handleOpenReschedule = (inv) => {
    setSelectedInterview(inv);
    const existingTime = (inv.scheduledAt || inv.scheduledTime) ? (inv.scheduledAt || inv.scheduledTime).slice(0, 16) : '';
    let invMode = 'ONLINE';
    if (inv.mode) {
      const upper = inv.mode.toString().toUpperCase();
      if (upper.includes('PERSON') || upper.includes('PLANT') || upper.includes('ONSITE')) invMode = 'IN_PERSON';
      else if (upper.includes('TELE') || upper.includes('PHONE')) invMode = 'TELEPHONIC';
      else invMode = 'ONLINE';
    } else if (inv.meetingLocation && inv.meetingLocation.toLowerCase().includes('telephon')) {
      invMode = 'TELEPHONIC';
    } else if (inv.meetingLocation && (inv.meetingLocation.toLowerCase().includes('plant') || inv.meetingLocation.toLowerCase().includes('ho') || inv.meetingLocation.toLowerCase().includes('office'))) {
      invMode = 'IN_PERSON';
    } else if (inv.meetingLink) {
      invMode = 'ONLINE';
    }

    setRescheduleForm({
      scheduledTime: existingTime,
      durationMinutes: inv.durationMinutes || 45,
      mode: invMode,
      meetingLink: invMode === 'ONLINE' ? (inv.meetingLink || '') : '',
      meetingLocation: invMode === 'IN_PERSON' ? (inv.meetingLocation || (locations && locations[0]) || '') : '',
      instructions: inv.instructions || ''
    });
    setRescheduleFormErrors({});
    setActiveActionMenuId(null);
    setShowRescheduleModal(true);
  };

  // Handle Reschedule Submit (Requirements 1, 2, 3, 4, 5)
  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInterview) return;

    const errors = {};
    if (!rescheduleForm.scheduledTime) errors.scheduledTime = 'New Scheduled Date & Time is required.';

    if (rescheduleForm.mode === 'ONLINE') {
      if (!rescheduleForm.meetingLink || !rescheduleForm.meetingLink.trim()) {
        errors.meetingLink = 'Meeting Link is required for online interviews.';
      } else if (!isValidMeetingUrl(rescheduleForm.meetingLink)) {
        errors.meetingLink = 'Please enter a valid meeting URL (e.g., https://teams.microsoft.com/... or https://meet.google.com/...)';
      }
    } else if (rescheduleForm.mode === 'IN_PERSON') {
      if (!locations || locations.length === 0) {
        errors.meetingLocation = 'Cannot reschedule: Location master is empty. Please contact HR Admin.';
      } else if (!rescheduleForm.meetingLocation || !rescheduleForm.meetingLocation.trim()) {
        errors.meetingLocation = 'Plant / Office Location is required.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setRescheduleFormErrors(errors);
      showToast(errors.meetingLink || errors.meetingLocation || Object.values(errors)[0]);
      return;
    }

    setRescheduleFormErrors({});

    const token = await getAuthToken();
    const reqBody = {
      scheduledAt: rescheduleForm.scheduledTime ? `${rescheduleForm.scheduledTime}:00` : null,
      newScheduledTime: rescheduleForm.scheduledTime ? `${rescheduleForm.scheduledTime}:00` : null,
      durationMinutes: parseInt(rescheduleForm.durationMinutes) || 45,
      mode: rescheduleForm.mode,
      meetingLink: rescheduleForm.mode === 'ONLINE' ? rescheduleForm.meetingLink.trim() : null,
      meetingLocation: rescheduleForm.mode === 'IN_PERSON' ? rescheduleForm.meetingLocation.trim() : (rescheduleForm.mode === 'ONLINE' ? 'Online Video Call' : 'Telephonic Screen'),
      reason: rescheduleForm.instructions || 'Rescheduled to accommodate panel & candidate calendar'
    };

    fetch(`http://localhost:8080/api/v1/interviews/${selectedInterview.id}/reschedule`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(reqBody)
    })
      .then(res => {
        if (res.ok) return res.json();
        return res.json().then(b => Promise.reject(b.message || b.error || `HTTP ${res.status}: Reschedule failed`));
      })
      .then(() => {
        setShowRescheduleModal(false);
        const cand = getCandidateInfo(selectedInterview);
        showToast(`Interview round rescheduled for ${cand.name}.`);
        fetchInterviews();
      })
      .catch(err => {
        showToast(`Reschedule alert: ${err}`);
      });
  };

  // Open Reassign Modal
  const handleOpenReassign = (inv) => {
    setSelectedInterview(inv);
    fetchEligibleInterviewers();
    const candidateId = eligibleInterviewers.find(u => u.id !== inv.interviewer?.id)?.id || eligibleInterviewers[0]?.id || '';
    setReassignForm({
      newInterviewerId: candidateId,
      notes: 'Reassigned due to panel member schedule conflict.'
    });
    setActiveActionMenuId(null);
    setShowReassignModal(true);
  };

  // Handle Reassign Submit (Requirements 3, 4, 8)
  const handleReassignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInterview || !reassignForm.newInterviewerId) return;

    if (reassignAvailability.hasConflict) {
      showToast(`Cannot reassign: ${reassignAvailability.conflictReason || reassignAvailability.message || 'New interviewer has a scheduling conflict.'}`);
      return;
    }

    const token = await getAuthToken();
    fetch(`http://localhost:8080/api/v1/interviews/${selectedInterview.id}/reassign`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        newInterviewerId: parseInt(reassignForm.newInterviewerId),
        reason: reassignForm.notes
      })
    })
      .then(res => {
        if (res.ok) return res.json();
        return res.json().then(b => Promise.reject(b.message || b.error || `HTTP ${res.status}: Reassignment failed`));
      })
      .then(body => {
        setShowReassignModal(false);
        showToast(`Interview successfully reassigned. New panel task created.`);
        fetchInterviews();
      })
      .catch(err => {
        showToast(`Reassign alert: ${err}`);
      });
  };

  // Handle Cancel Interview
  const handleCancelInterview = async (inv) => {
    const cand = getCandidateInfo(inv);
    if (!window.confirm(`Are you sure you want to cancel the interview round for ${cand.name}?`)) return;

    const token = await getAuthToken();
    fetch(`http://localhost:8080/api/v1/interviews/${inv.id}/cancel`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        if (res.ok) {
          showToast(`Interview round for ${cand.name} cancelled.`);
          fetchInterviews();
        } else {
          showToast('Could not cancel interview');
        }
      })
      .catch(() => showToast('Error cancelling interview'));
    setActiveActionMenuId(null);
  };

  // Open Feedback Modal
  const handleOpenFeedback = (inv) => {
    setSelectedInterview(inv);
    setFeedbackForm({
      technicalScore: 4,
      communicationScore: 4,
      culturalFitScore: 5,
      recommendation: 'HIRE',
      strengths: 'Demonstrated solid grasp of key principles, structured thought process, and good team attitude.',
      weaknesses: 'Minor room for growth in high-concurrency microservices design.',
      comments: 'Recommended to proceed to the next hiring stage.'
    });
    setActiveActionMenuId(null);
    setShowFeedbackModal(true);
  };

  // Handle Submit Feedback
  const handleFeedbackSubmit = (e) => {
    e.preventDefault();
    if (!selectedInterview) return;

    const token = sessionStorage.getItem('ats_urja_token') || currentUser?.token;
    fetch(`http://localhost:8080/api/v1/interviews/${selectedInterview.id}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        technicalRating: feedbackForm.technicalScore,
        technicalScore: feedbackForm.technicalScore,
        communicationRating: feedbackForm.communicationScore,
        communicationScore: feedbackForm.communicationScore,
        cultureFitRating: feedbackForm.culturalFitScore,
        culturalFitScore: feedbackForm.culturalFitScore,
        recommendation: feedbackForm.recommendation,
        strengths: feedbackForm.strengths,
        weaknesses: feedbackForm.weaknesses,
        detailedComments: feedbackForm.comments,
        comments: feedbackForm.comments
      })
    })
      .then(res => {
        if (res.ok) return res.json();
        return res.json().then(b => Promise.reject(b.message || 'Feedback submission failed'));
      })
      .then(body => {
        setShowFeedbackModal(false);
        showToast(`Evaluation scorecard submitted! Recommendation: ${feedbackForm.recommendation}`);
        fetchInterviews();
      })
      .catch(err => {
        showToast(`Feedback alert: ${err}`);
      });
  };

  // View Submitted Feedback
  const handleOpenViewFeedback = (inv) => {
    setSelectedInterview(inv);
    setActiveActionMenuId(null);

    // If feedback is already attached to entity
    if (inv.feedback) {
      setViewFeedbackData(inv.feedback);
      setShowViewFeedbackModal(true);
      return;
    }

    const token = sessionStorage.getItem('ats_urja_token') || currentUser?.token;
    fetch(`http://localhost:8080/api/v1/interviews/${inv.id}/feedback`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Feedback not available');
      })
      .then(body => {
        if (body && body.data) {
          setViewFeedbackData(body.data);
          setShowViewFeedbackModal(true);
        }
      })
      .catch(() => {
        showToast('Feedback evaluation is pending submission by the assigned panel.');
      });
  };

  // View Details Modal
  const handleOpenDetails = (inv) => {
    setSelectedInterview(inv);
    setActiveActionMenuId(null);
    setShowDetailsModal(true);
  };

  // Toggle criteria selection in schedule modal
  const handleToggleCriteria = (item) => {
    setScheduleForm(prev => {
      const exists = prev.evaluationCriteria.includes(item);
      return {
        ...prev,
        evaluationCriteria: exists 
          ? prev.evaluationCriteria.filter(c => c !== item)
          : [...prev.evaluationCriteria, item]
      };
    });
  };

  return (
    <div className="urja-interviews-root">
      
      {/* ------------------------------------------------------------------------
          1. PAGE HEADER ROW: Title, Subtitle, Refresh, and + Schedule Button
          ------------------------------------------------------------------------ */}
      <div className="urja-interviews-header">
        <div className="urja-interviews-title-group">
          <div className="urja-interviews-header-icon">
            <i className="bi bi-calendar-check-fill"></i>
          </div>
          <div>
            <h1 className="urja-interviews-title">Interview Assignment & Round Tracking</h1>
            <p className="urja-interviews-subtitle">
              Assign interview rounds, coordinate panel members, manage schedules, and track feedback.
            </p>
          </div>
        </div>

        <div className="urja-interviews-actions">
          <button 
            id="btn-refresh-interviews"
            type="button" 
            className={`urja-btn-refresh ${isLoading ? 'spinning' : ''}`}
            onClick={fetchInterviews}
            disabled={isLoading}
            title="Refresh interview pipeline data"
          >
            <i className="bi bi-arrow-clockwise"></i>
            <span>Refresh</span>
          </button>

          {canSchedule && (
            <button 
              id="btn-schedule-round"
              type="button" 
              className="urja-btn-schedule-primary"
              onClick={() => {
                fetchEligibleInterviewers();
                fetchCandidates();
                setShowScheduleModal(true);
              }}
            >
              <i className="bi bi-plus-circle-fill"></i>
              <span>+ Schedule Interview Round</span>
            </button>
          )}
        </div>
      </div>

      {/* IT Admin Privacy Notice (if IT Admin views without policy) */}
      {isITAdmin && interviews.length === 0 && (
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px', padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <i className="bi bi-shield-lock-fill" style={{ color: '#D97706', fontSize: '1.25rem' }}></i>
            <div>
              <strong style={{ color: '#92400E', fontSize: '0.9rem' }}>Candidate Data Privacy Policy Enforced</strong>
              <div style={{ color: '#B45309', fontSize: '0.8rem', marginTop: '2px' }}>
                Per Urja Foods compliance guidelines, IT Administrator access to interview assignments, evaluator notes, and candidate feedback is restricted. To grant access for system debugging, enable <code>it_admin_feedback_access</code> in <strong>Access Policies</strong>.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------
          2. SUMMARY KPI CARDS (4 Responsive Cards)
          ------------------------------------------------------------------------ */}
      <div className="urja-interviews-kpi-grid">
        
        {/* Card 1: Total Authorized Rounds */}
        <div 
          className={`urja-kpi-card ${activeTab === 'ALL' ? 'active-kpi' : ''}`}
          onClick={() => setActiveTab('ALL')}
          title="Show all interview rounds"
        >
          <div className="urja-kpi-icon-badge indigo">
            <i className="bi bi-layers-fill"></i>
          </div>
          <div className="urja-kpi-content">
            <span className="urja-kpi-label">Total Authorized Rounds</span>
            <span className="urja-kpi-value">{counts.total}</span>
            <span className="urja-kpi-desc">
              {isInterviewer ? 'Assigned to your panel' : 'Across all hiring pipelines'}
            </span>
          </div>
        </div>

        {/* Card 2: Scheduled / Upcoming */}
        <div 
          className={`urja-kpi-card ${activeTab === 'UPCOMING' ? 'active-kpi' : ''}`}
          onClick={() => setActiveTab('UPCOMING')}
          title="Show upcoming scheduled rounds"
        >
          <div className="urja-kpi-icon-badge blue">
            <i className="bi bi-calendar2-check-fill"></i>
          </div>
          <div className="urja-kpi-content">
            <span className="urja-kpi-label">Scheduled / Upcoming</span>
            <span className="urja-kpi-value" style={{ color: '#2563EB' }}>{counts.upcoming}</span>
            <span className="urja-kpi-desc">Awaiting candidate & panel session</span>
          </div>
        </div>

        {/* Card 3: Completed Rounds */}
        <div 
          className={`urja-kpi-card ${activeTab === 'COMPLETED' ? 'active-kpi' : ''}`}
          onClick={() => setActiveTab('COMPLETED')}
          title="Show completed rounds with scorecards"
        >
          <div className="urja-kpi-icon-badge green">
            <i className="bi bi-check-circle-fill"></i>
          </div>
          <div className="urja-kpi-content">
            <span className="urja-kpi-label">Completed Rounds</span>
            <span className="urja-kpi-value" style={{ color: '#16A34A' }}>{counts.completed}</span>
            <span className="urja-kpi-desc">Evaluation scorecards submitted</span>
          </div>
        </div>

        {/* Card 4: Pending Feedback Tasks */}
        <div 
          className={`urja-kpi-card ${activeTab === 'PENDING_FEEDBACK' ? 'active-kpi' : ''}`}
          onClick={() => setActiveTab('PENDING_FEEDBACK')}
          title="Show rounds requiring interviewer feedback"
        >
          <div className="urja-kpi-icon-badge amber">
            <i className="bi bi-hourglass-split"></i>
          </div>
          <div className="urja-kpi-content">
            <span className="urja-kpi-label">Pending Feedback Tasks</span>
            <span className="urja-kpi-value" style={{ color: '#D97706' }}>{counts.pendingFeedback}</span>
            <span className="urja-kpi-desc">Awaiting evaluator scorecards</span>
          </div>
        </div>

      </div>

      {/* ------------------------------------------------------------------------
          3. INTERVIEW STATUS TABS & MULTI-FILTER BAR
          ------------------------------------------------------------------------ */}
      <div>
        {/* Status Tabs Bar */}
        <div className="urja-interviews-tabs-bar urja-status-tabs-container">
          <button 
            type="button" 
            className={`urja-status-tab-btn ${activeTab === 'ALL' ? 'active' : ''}`}
            onClick={() => { setActiveTab('ALL'); setCurrentPage(1); }}
          >
            <i className="bi bi-grid-fill"></i>
            <span>All Interviews</span>
            <span className="urja-tab-counter">{counts.total}</span>
          </button>

          <button 
            type="button" 
            className={`urja-status-tab-btn ${activeTab === 'UPCOMING' ? 'active' : ''}`}
            onClick={() => { setActiveTab('UPCOMING'); setCurrentPage(1); }}
          >
            <i className="bi bi-clock-fill"></i>
            <span>Upcoming</span>
            <span className="urja-tab-counter">{counts.upcoming}</span>
          </button>

          <button 
            type="button" 
            className={`urja-status-tab-btn ${activeTab === 'COMPLETED' ? 'active' : ''}`}
            onClick={() => { setActiveTab('COMPLETED'); setCurrentPage(1); }}
          >
            <i className="bi bi-patch-check-fill"></i>
            <span>Completed</span>
            <span className="urja-tab-counter">{counts.completed}</span>
          </button>

          <button 
            type="button" 
            className={`urja-status-tab-btn ${activeTab === 'PENDING_FEEDBACK' ? 'active' : ''}`}
            onClick={() => { setActiveTab('PENDING_FEEDBACK'); setCurrentPage(1); }}
          >
            <i className="bi bi-hourglass-bottom"></i>
            <span>Pending Feedback</span>
            <span className="urja-tab-counter">{counts.pendingFeedback}</span>
          </button>

          <button 
            type="button" 
            className={`urja-status-tab-btn ${activeTab === 'CANCELLED' ? 'active' : ''}`}
            onClick={() => { setActiveTab('CANCELLED'); setCurrentPage(1); }}
          >
            <i className="bi bi-x-circle-fill"></i>
            <span>Cancelled</span>
            <span className="urja-tab-counter">{counts.cancelled}</span>
          </button>
        </div>

        {/* Multi-Filter Controls */}
        <div className="urja-filters-card">
          <div className="urja-filters-grid">
            
            {/* Search Input */}
            <div className="urja-filter-field">
              <label htmlFor="filter-search-input" className="urja-filter-label">Search Candidate / Job</label>
              <div className="urja-filter-input-wrap">
                <i className="bi bi-search"></i>
                <input 
                  id="filter-search-input"
                  type="text" 
                  className="urja-filter-input"
                  placeholder="Candidate name, code, email, title..."
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                />
              </div>
            </div>

            {/* Requisition Dropdown */}
            <div className="urja-filter-field">
              <label htmlFor="filter-req-select" className="urja-filter-label">Job Requisition</label>
              <select 
                id="filter-req-select"
                className="urja-filter-select"
                value={filterReq}
                onChange={e => { setFilterReq(e.target.value); setCurrentPage(1); }}
              >
                <option value="ALL">All Requisitions</option>
                {requisitions.map(r => (
                  <option key={r.id} value={r.requisitionCode || r.code || r.id}>
                    {r.requisitionCode || r.code || `REQ-${r.id}`} — {r.jobTitle || r.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Round Dropdown */}
            <div className="urja-filter-field">
              <label htmlFor="filter-round-select" className="urja-filter-label">Interview Round</label>
              <select 
                id="filter-round-select"
                className="urja-filter-select"
                value={filterRound}
                onChange={e => { setFilterRound(e.target.value); setCurrentPage(1); }}
              >
                <option value="ALL">All Rounds</option>
                <option value="screening">HR Screening</option>
                <option value="technical">Technical Round (R1/R2)</option>
                <option value="managerial">Managerial Round</option>
                <option value="director">Director Final</option>
              </select>
            </div>

            {/* Assigned Interviewer Dropdown */}
            <div className="urja-filter-field">
              <label htmlFor="filter-interviewer-select" className="urja-filter-label">Interviewer</label>
              <select 
                id="filter-interviewer-select"
                className="urja-filter-select"
                value={filterInterviewer}
                onChange={e => { setFilterInterviewer(e.target.value); setCurrentPage(1); }}
              >
                <option value="ALL">All Interviewers</option>
                {eligibleInterviewers.map(u => (
                  <option key={u.id} value={u.name}>
                    {u.name} — {u.designation || u.title || 'Panel Member'}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Dropdown */}
            <div className="urja-filter-field">
              <label htmlFor="filter-status-select" className="urja-filter-label">Status</label>
              <select 
                id="filter-status-select"
                className="urja-filter-select"
                value={filterStatus}
                onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
              >
                <option value="ALL">All Statuses</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="RESCHEDULED">Rescheduled</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* Date Range Dropdown */}
            <div className="urja-filter-field">
              <label htmlFor="filter-date-select" className="urja-filter-label">Date Range</label>
              <select 
                id="filter-date-select"
                className="urja-filter-select"
                value={filterDateRange}
                onChange={e => { setFilterDateRange(e.target.value); setCurrentPage(1); }}
              >
                <option value="ALL">All Dates</option>
                <option value="TODAY">Today</option>
                <option value="NEXT_7_DAYS">Next 7 Days</option>
                <option value="THIS_MONTH">This Month</option>
                <option value="PAST">Past Dates</option>
              </select>
            </div>

            {/* Reset Filters */}
            <button 
              id="btn-reset-filters"
              type="button" 
              className="urja-btn-reset-filters"
              onClick={handleResetFilters}
              title="Clear all filters and search query"
            >
              <i className="bi bi-x-circle"></i>
              <span>Reset Filters</span>
            </button>

          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------------
          4. INTERVIEWS ASSIGNMENT TABLE
          ------------------------------------------------------------------------ */}
      <div className="urja-table-card">
        <div className="urja-table-responsive">
          <table className="urja-interviews-table">
            <thead>
              <tr>
                <th style={{ width: '20%' }}>Candidate</th>
                <th style={{ width: '18%' }}>Job Requisition</th>
                <th style={{ width: '12%' }}>Interview Round</th>
                <th style={{ width: '13%' }}>Date & Time (IST)</th>
                <th style={{ width: '10%' }}>Mode</th>
                <th style={{ width: '12%' }}>Meeting Link</th>
                <th style={{ width: '15%' }}>Assigned Interviewer</th>
                <th style={{ width: '10%' }}>Status</th>
                <th style={{ width: '12%' }}>Feedback / Outcome</th>
                <th style={{ width: '8%', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="10">
                    <div className="urja-empty-state-box">
                      <div className="spinner-border text-success" role="status" style={{ width: '2.5rem', height: '2.5rem' }}>
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <h4 className="urja-empty-title mt-3">Loading Authorized Interviews...</h4>
                      <p className="urja-empty-text">Fetching live interview schedules, panel assignments and candidate records from database.</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedInterviews.length === 0 ? (
                <tr>
                  <td colSpan="10">
                    <div className="urja-empty-state-box">
                      <div className="urja-empty-icon-circle">
                        <i className="bi bi-calendar-x"></i>
                      </div>
                      <h4 className="urja-empty-title">No Interview Records Found</h4>
                      <p className="urja-empty-text">
                        {isInterviewer 
                          ? 'You currently have no interview rounds assigned to your evaluation panel.' 
                          : 'No interview assignments match your active search and filter criteria. You can schedule a new interview round.'}
                      </p>
                      {canSchedule && (
                        <button 
                          type="button" 
                          className="urja-btn-schedule-primary"
                          onClick={() => {
                            fetchEligibleInterviewers();
                            fetchCandidates();
                            setShowScheduleModal(true);
                          }}
                        >
                          <i className="bi bi-calendar-plus-fill"></i>
                          <span>+ Schedule Interview Round</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedInterviews.map((inv) => {
                  const cand = getCandidateInfo(inv);
                  const req = getRequisitionInfo(inv);
                  const intv = getInterviewerInfo(inv);
                  const roundDisplay = getRoundDisplay(inv.round || inv.roundName);
                  const dt = formatISTDateTime(inv.scheduledAt || inv.scheduledTime);
                  const modeInfo = getModeInfo(inv);
                  const isCompleted = inv.status === 'COMPLETED';
                  const isCancelled = inv.status === 'CANCELLED';
                  const link = inv.meetingLink;

                  const isAssignedToCurrent = currentUser?.id === inv.interviewer?.id || 
                                              currentUser?.email === inv.interviewer?.email ||
                                              currentUser?.username === inv.interviewer?.username;

                  const hasFeedback = !!inv.feedback || !!inv.rating;
                  const overallScore = inv.feedback?.overallRating || inv.rating;
                  const rec = inv.feedback?.recommendation || inv.recommendation;

                  return (
                    <tr key={inv.id}>
                      
                      {/* 1. Candidate Cell */}
                      <td>
                        <div className="cand-avatar-wrap">
                          <div className="cand-avatar-initials">
                            {cand.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                          </div>
                          <div className="cand-name-title">
                            <span 
                              className="cand-name-text" 
                              style={{ cursor: 'pointer' }}
                              onClick={() => handleOpenDetails(inv)}
                              title="Click to view candidate interview brief"
                            >
                              {cand.name}
                            </span>
                            <span className="cand-code-badge">{cand.code}</span>
                            {cand.email && (
                              <span className="cand-contact-sub">
                                <i className="bi bi-envelope me-1"></i>{cand.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Job Requisition Cell */}
                      <td>
                        <div className="req-job-title">{req.title}</div>
                        <span className="cand-code-badge" style={{ background: '#EFF6FF', color: '#1D4ED8', borderColor: '#BFDBFE' }}>
                          {req.code}
                        </span>
                        <div className="req-dept-pill">
                          <i className="bi bi-building me-1"></i>{req.dept}
                        </div>
                      </td>

                      {/* 3. Interview Round Cell */}
                      <td>
                        <span className={`round-pill ${roundDisplay.type}`}>
                          <i className="bi bi-tag-fill"></i>
                          {roundDisplay.label}
                        </span>
                      </td>

                      {/* 4. Date & Time (IST) */}
                      <td>
                        <div className="time-ist-block">
                          <span className="time-date-text">
                            <i className="bi bi-calendar3 me-1 text-muted"></i>
                            {dt.date}
                          </span>
                          <span className="time-clock-text">
                            <i className="bi bi-clock-fill"></i>
                            {dt.time}
                          </span>
                          <span className="duration-pill">
                            {inv.durationMinutes || 45} mins
                          </span>
                        </div>
                      </td>

                      {/* 5. Interview Mode */}
                      <td>
                        <span className={`mode-badge ${modeInfo.badgeClass || ''}`}>
                          <i className={`bi ${modeInfo.icon}`}></i>
                          {modeInfo.label}
                        </span>
                      </td>

                      {/* 6. Meeting Link / Location / Telephonic */}
                      <td>
                        {(() => {
                          if (modeInfo.mode === 'ONLINE' && inv.meetingLink && inv.meetingLink.startsWith('http')) {
                            return (
                              <a 
                                href={inv.meetingLink} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="meeting-link-action"
                                title={inv.meetingLink}
                                id={`table-join-btn-${inv.id}`}
                              >
                                <i className="bi bi-box-arrow-up-right me-1"></i>
                                <span>Join Meeting</span>
                              </a>
                            );
                          } else if (modeInfo.mode === 'IN_PERSON') {
                            return (
                              <span className="location-cell-badge" title={inv.meetingLocation || 'Plant / Office Location'}>
                                <i className="bi bi-geo-alt-fill text-success me-1"></i>
                                <span>{inv.meetingLocation || 'Plant / Office'}</span>
                              </span>
                            );
                          } else if (modeInfo.mode === 'TELEPHONIC') {
                            const candPhone = cand.phone || inv.candidatePhone || inv.candidate?.phone;
                            return (
                              <span className="telephonic-cell-badge" title={candPhone ? `Phone: ${candPhone}` : 'Registered candidate contact'}>
                                <i className="bi bi-telephone-fill text-primary me-1"></i>
                                <span>{candPhone || 'Phone on file'}</span>
                              </span>
                            );
                          } else {
                            return (
                              <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                                {inv.meetingLocation || inv.meetingLink || '—'}
                              </span>
                            );
                          }
                        })()}
                      </td>

                      {/* 7. Assigned Interviewer */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                          <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#F1F5F9', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.74rem', border: '1px solid #CBD5E1' }}>
                            {intv.initials}
                          </div>
                          <div>
                            <strong style={{ fontSize: '0.84rem', color: '#0F172A', display: 'block' }}>{intv.name}</strong>
                            <small style={{ fontSize: '0.72rem', color: '#64748B' }}>{intv.title}</small>
                          </div>
                        </div>
                      </td>

                      {/* 8. Status */}
                      <td>
                        {renderStatusBadge(inv.status)}
                      </td>

                      {/* 9. Feedback / Outcome */}
                      <td>
                        <div className="feedback-outcome-cell">
                          {hasFeedback ? (
                            <>
                              <div className="stars-score-display">
                                <i className="bi bi-star-fill"></i>
                                <span>{overallScore} / 5</span>
                              </div>
                              {rec && (
                                <span className={`recommendation-badge ${(rec.toLowerCase().replace(/\s+/g, '_'))}`}>
                                  {rec.replace('_', ' ')}
                                </span>
                              )}
                            </>
                          ) : isCompleted ? (
                            <span style={{ fontSize: '0.75rem', color: '#16A34A', fontWeight: 600 }}>
                              <i className="bi bi-check2-all me-1"></i>Conducted
                            </span>
                          ) : isCancelled ? (
                            <span style={{ fontSize: '0.74rem', color: '#94A3B8' }}>N/A</span>
                          ) : (
                            <span style={{ fontSize: '0.74rem', color: '#D97706', fontWeight: 600 }}>
                              <i className="bi bi-hourglass-split me-1"></i>Pending
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 10. Actions Column */}
                      <td style={{ textAlign: 'right' }}>
                        <div className="actions-cell-wrap">
                          
                          {/* Quick Action Buttons */}
                          {isInterviewer && isAssignedToCurrent && !isCompleted && !isCancelled && (
                            <button 
                              type="button" 
                              className="urja-btn-modal-submit"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                              onClick={() => handleOpenFeedback(inv)}
                              title="Submit candidate evaluation scorecard"
                            >
                              <i className="bi bi-pencil-square me-1"></i>
                              <span>Scorecard</span>
                            </button>
                          )}

                          {hasFeedback && (
                            <button 
                              type="button" 
                              className="urja-btn-modal-cancel"
                              style={{ padding: '0.32rem 0.65rem', fontSize: '0.76rem' }}
                              onClick={() => handleOpenViewFeedback(inv)}
                              title="View evaluation scorecard"
                            >
                              <i className="bi bi-file-earmark-text me-1 text-success"></i>
                              <span>Scorecard</span>
                            </button>
                          )}

                          {/* Three-Dot Dropdown Toggle */}
                          <button 
                            type="button" 
                            className="urja-action-icon-btn"
                            onClick={() => setActiveActionMenuId(activeActionMenuId === inv.id ? null : inv.id)}
                            title="More authorized actions"
                          >
                            <i className="bi bi-three-dots-vertical"></i>
                          </button>

                          {/* Action Dropdown Menu */}
                          {activeActionMenuId === inv.id && (
                            <div className="urja-actions-dropdown-menu">
                              <button 
                                type="button" 
                                className="urja-menu-item"
                                onClick={() => handleOpenDetails(inv)}
                              >
                                <i className="bi bi-eye"></i>
                                <span>View Full Details</span>
                              </button>

                              {hasFeedback && (
                                <button 
                                  type="button" 
                                  className="urja-menu-item"
                                  onClick={() => handleOpenViewFeedback(inv)}
                                >
                                  <i className="bi bi-file-earmark-check text-success"></i>
                                  <span>View Scorecard</span>
                                </button>
                              )}

                              {!isCompleted && !isCancelled && (isInterviewer || canManage) && (
                                <button 
                                  type="button" 
                                  className="urja-menu-item"
                                  onClick={() => handleOpenFeedback(inv)}
                                >
                                  <i className="bi bi-pencil-square text-success"></i>
                                  <span>Submit Feedback</span>
                                </button>
                              )}

                              {canManage && !isCompleted && !isCancelled && (
                                <>
                                  <div className="urja-menu-divider"></div>
                                  <button 
                                    type="button" 
                                    className="urja-menu-item"
                                    onClick={() => handleOpenReschedule(inv)}
                                  >
                                    <i className="bi bi-clock-history text-primary"></i>
                                    <span>Reschedule Round</span>
                                  </button>
                                  <button 
                                    type="button" 
                                    className="urja-menu-item"
                                    onClick={() => handleOpenReassign(inv)}
                                  >
                                    <i className="bi bi-person-gear text-purple"></i>
                                    <span>Reassign Interviewer</span>
                                  </button>
                                  <div className="urja-menu-divider"></div>
                                  <button 
                                    type="button" 
                                    className="urja-menu-item danger"
                                    onClick={() => handleCancelInterview(inv)}
                                  >
                                    <i className="bi bi-x-circle"></i>
                                    <span>Cancel Interview</span>
                                  </button>
                                </>
                              )}
                            </div>
                          )}

                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ----------------------------------------------------------------------
            5. PAGINATION & ROWS-PER-PAGE BAR
            ---------------------------------------------------------------------- */}
        {totalRecords > 0 && (
          <div className="urja-pagination-bar">
            <div>
              Showing <strong>{Math.min(totalRecords, (currentPage - 1) * rowsPerPage + 1)}</strong> to{' '}
              <strong>{Math.min(totalRecords, currentPage * rowsPerPage)}</strong> of{' '}
              <strong>{totalRecords}</strong> authorized interview records
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div className="urja-rows-per-page">
                <span>Rows per page:</span>
                <select 
                  className="urja-rows-select"
                  value={rowsPerPage}
                  onChange={e => {
                    setRowsPerPage(parseInt(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="urja-page-nav-btns">
                <button 
                  type="button" 
                  className="urja-page-nav-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                >
                  <i className="bi bi-chevron-left me-1"></i> Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map(p => (
                  <button 
                    key={p} 
                    type="button" 
                    className={`urja-page-nav-btn ${p === currentPage ? 'active' : ''}`}
                    onClick={() => setCurrentPage(p)}
                  >
                    {p}
                  </button>
                ))}
                {totalPages > 5 && <span className="text-muted px-1">...</span>}
                <button 
                  type="button" 
                  className="urja-page-nav-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                >
                  Next <i className="bi bi-chevron-right ms-1"></i>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL 1: SCHEDULE INTERVIEW ROUND FORM (Requirement 8)
          ========================================================================= */}
      {showScheduleModal && (
        <div className="urja-modal-overlay" onClick={() => setShowScheduleModal(false)}>
          <div className="urja-modal-card" onClick={e => e.stopPropagation()}>
            
            <div className="urja-modal-header">
              <div className="urja-modal-title-wrap">
                <div className="urja-modal-icon-badge">
                  <i className="bi bi-calendar-plus-fill"></i>
                </div>
                <div>
                  <h3 className="urja-modal-title">Schedule Interview Round</h3>
                  <p className="urja-modal-subtitle">Assign candidates to active panel members and configure session logistics.</p>
                </div>
              </div>
              <button 
                type="button" 
                className="urja-modal-close-btn" 
                onClick={() => setShowScheduleModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} noValidate>
              <div className="urja-modal-body">
                
                {/* 1. Candidate Selection */}
                <div>
                  <label htmlFor="sched-candidate" className="form-label small fw-bold text-dark">Select Candidate *</label>
                  <select 
                    id="sched-candidate"
                    className="urja-filter-select"
                    value={scheduleForm.candidateId}
                    onChange={e => {
                      const cid = e.target.value;
                      const cand = availableCandidates.find(c => c.id === parseInt(cid));
                      setScheduleForm(prev => ({
                        ...prev,
                        candidateId: cid,
                        requisitionId: cand?.requisitionId || prev.requisitionId || (requisitions[0]?.id || 1)
                      }));
                    }}
                    required
                  >
                    <option value="">-- Choose Candidate from Pipeline --</option>
                    {availableCandidates.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.candidateCode || `CAN-${c.id}`}) — {c.jobTitle || 'Role'} ({c.departmentName || 'General'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Job Requisition & Round */}
                <div className="row g-3">
                  <div className="col-md-6">
                    <label htmlFor="sched-requisition" className="form-label small fw-bold text-dark">Job Requisition *</label>
                    <select 
                      id="sched-requisition"
                      className="urja-filter-select"
                      value={scheduleForm.requisitionId}
                      onChange={e => setScheduleForm(prev => ({ ...prev, requisitionId: e.target.value }))}
                      required
                    >
                      <option value="">-- Link Requisition --</option>
                      {requisitions.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.requisitionCode || r.code || `REQ-${r.id}`} — {r.jobTitle || r.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="sched-round" className="form-label small fw-bold text-dark">Interview Round *</label>
                    <select 
                      id="sched-round"
                      className="urja-filter-select"
                      value={scheduleForm.round}
                      onChange={e => {
                        const val = e.target.value;
                        const labelMap = {
                          'HR_SCREENING': 'HR Screening',
                          'TECHNICAL_R1': 'Technical Round 1',
                          'TECHNICAL_R2': 'Technical Round 2',
                          'MANAGERIAL': 'Managerial Round',
                          'DIRECTOR_FINAL': 'Director Final Discussion'
                        };
                        setScheduleForm(prev => ({
                          ...prev,
                          round: val,
                          roundName: labelMap[val] || val
                        }));
                      }}
                      required
                    >
                      <option value="HR_SCREENING">HR Screening & Background</option>
                      <option value="TECHNICAL_R1">Round 1: Technical & Problem Solving</option>
                      <option value="TECHNICAL_R2">Round 2: Architecture & Hands-on</option>
                      <option value="MANAGERIAL">Round 3: Managerial & Cultural Fit</option>
                      <option value="DIRECTOR_FINAL">Round 4: Final Executive Discussion</option>
                    </select>
                  </div>
                </div>

                {/* 3. Date, Time & Timezone Badge */}
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <label htmlFor="sched-datetime" className="form-label small fw-bold text-dark mb-0">Interview Date & Time *</label>
                      <span className="badge bg-success-subtle text-success border border-success-subtle urja-tz-badge" style={{ fontSize: '0.68rem' }}>
                        <i className="bi bi-clock me-1"></i>Asia/Kolkata (IST)
                      </span>
                    </div>
                    <input 
                      id="sched-datetime"
                      type="datetime-local" 
                      className="urja-filter-input"
                      style={{ paddingLeft: '0.75rem' }}
                      value={scheduleForm.scheduledTime}
                      onChange={e => setScheduleForm(prev => ({ ...prev, scheduledTime: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="sched-duration" className="form-label small fw-bold text-dark">Expected Duration</label>
                    <select 
                      id="sched-duration"
                      className="urja-filter-select"
                      value={scheduleForm.durationMinutes}
                      onChange={e => setScheduleForm(prev => ({ ...prev, durationMinutes: parseInt(e.target.value) }))}
                    >
                      <option value={30}>30 Minutes</option>
                      <option value={45}>45 Minutes (Standard)</option>
                      <option value={60}>60 Minutes (Comprehensive)</option>
                      <option value={90}>90 Minutes (Deep Dive)</option>
                    </select>
                  </div>
                </div>

                {/* 4. Interview Mode & Dynamic Location/Link Fields */}
                <div className="row g-3">
                  <div className="col-md-4">
                    <label htmlFor="sched-mode" className="form-label small fw-bold text-dark">Interview Mode *</label>
                    <select 
                      id="sched-mode"
                      className="urja-filter-select"
                      value={scheduleForm.mode}
                      onChange={e => handleScheduleModeChange(e.target.value)}
                    >
                      <option value="ONLINE">Online Video Call</option>
                      <option value="IN_PERSON">In-Person (Plant / Office)</option>
                      <option value="TELEPHONIC">Telephonic Screen</option>
                    </select>
                  </div>

                  {/* Mode 1: ONLINE -> Meeting Link */}
                  {scheduleForm.mode === 'ONLINE' && (
                    <div className="col-md-8" id="sched-field-online">
                      <label htmlFor="sched-meeting-link" className="form-label small fw-bold text-dark">
                        Meeting Link *
                      </label>
                      <input 
                        id="sched-meeting-link"
                        type="url" 
                        className={`urja-filter-input ${scheduleFormErrors.meetingLink ? 'border-danger' : ''}`}
                        style={{ paddingLeft: '0.75rem' }}
                        value={scheduleForm.meetingLink}
                        onChange={e => {
                          const val = e.target.value;
                          setScheduleForm(prev => ({ ...prev, meetingLink: val }));
                          if (scheduleFormErrors.meetingLink && val.trim() && isValidMeetingUrl(val)) {
                            setScheduleFormErrors(prev => ({ ...prev, meetingLink: null }));
                          }
                        }}
                        placeholder="https://teams.microsoft.com/... or https://meet.google.com/..."
                        required
                      />
                      {scheduleFormErrors.meetingLink && (
                        <div id="sched-meeting-link-error" className="text-danger small mt-1 d-flex align-items-center">
                          <i className="bi bi-exclamation-circle-fill me-1"></i>
                          <span>{scheduleFormErrors.meetingLink}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mode 2: IN_PERSON -> Plant / Office Location */}
                  {scheduleForm.mode === 'IN_PERSON' && (
                    <div className="col-md-8" id="sched-field-inperson">
                      <label htmlFor="sched-meeting-location" className="form-label small fw-bold text-dark">
                        Plant / Office Location *
                      </label>
                      {locations && locations.length > 0 ? (
                        <>
                          <select 
                            id="sched-meeting-location"
                            className={`urja-filter-select ${scheduleFormErrors.meetingLocation ? 'border-danger' : ''}`}
                            value={scheduleForm.meetingLocation}
                            onChange={e => {
                              const val = e.target.value;
                              setScheduleForm(prev => ({ ...prev, meetingLocation: val }));
                              if (scheduleFormErrors.meetingLocation && val.trim()) {
                                setScheduleFormErrors(prev => ({ ...prev, meetingLocation: null }));
                              }
                            }}
                            required
                          >
                            <option value="">-- Choose Plant / Office Location --</option>
                            {locations.map(loc => (
                              <option key={loc} value={loc}>{loc}</option>
                            ))}
                          </select>
                          {scheduleFormErrors.meetingLocation && (
                            <div id="sched-location-error" className="text-danger small mt-1 d-flex align-items-center">
                              <i className="bi bi-exclamation-circle-fill me-1"></i>
                              <span>{scheduleFormErrors.meetingLocation}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div id="sched-empty-locations-alert" className="alert alert-warning py-2 px-3 small d-flex align-items-center mb-0" role="alert">
                          <i className="bi bi-exclamation-triangle-fill text-warning me-2 fs-6"></i>
                          <div>
                            <strong>No locations configured:</strong> Location master is empty. Please contact HR Admin to configure valid plant/office sites.
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mode 3: TELEPHONIC -> Both fields hidden */}
                  {scheduleForm.mode === 'TELEPHONIC' && (
                    <div className="col-md-8" id="sched-field-telephonic">
                      <label className="form-label small fw-bold text-dark">Telephonic Screen Details</label>
                      <div className="alert alert-success py-2 px-3 small d-flex align-items-center mb-0" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534', minHeight: '38px' }}>
                        <i className="bi bi-telephone-inbound-fill me-2 fs-6"></i>
                        <div>
                          <strong>Telephonic Mode:</strong> No meeting link or physical plant location required. Panel lead dials candidate at registered mobile number.
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. Assigned Active Interviewer (Requirements 1, 2, 3) */}
                <div>
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <label htmlFor="sched-interviewer" className="form-label small fw-bold text-dark mb-0">
                      Assigned Active Interviewer *
                      {isLoadingInterviewers && <span className="spinner-border spinner-border-sm text-success ms-2" role="status"></span>}
                    </label>
                    {eligibleInterviewers.length > 0 && (
                      <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                        {eligibleInterviewers.length} active leads authorized
                      </span>
                    )}
                  </div>

                  {interviewerFetchError ? (
                    <div id="sched-fetch-error" className="alert alert-danger py-2 px-3 small d-flex align-items-center mb-2" role="alert">
                      <i className="bi bi-exclamation-triangle-fill me-2"></i>
                      <div className="flex-grow-1">
                        <strong>Error fetching interviewers:</strong> {interviewerFetchError}
                      </div>
                      <button type="button" className="btn btn-sm btn-outline-danger py-0 px-2 ms-2" onClick={fetchEligibleInterviewers}>Retry</button>
                    </div>
                  ) : eligibleInterviewers.length === 0 && !isLoadingInterviewers ? (
                    <div id="no-interviewers-msg" className="alert alert-warning py-2 px-3 small d-flex align-items-center mb-2" role="alert">
                      <i className="bi bi-exclamation-triangle-fill me-2 text-warning"></i>
                      <div>No active interviewers available. Please contact HR Admin.</div>
                    </div>
                  ) : null}

                  <select 
                    id="sched-interviewer"
                    className={`urja-filter-select ${scheduleAvailability.hasConflict ? 'border-danger text-danger' : ''}`}
                    value={scheduleForm.interviewerId}
                    onChange={e => setScheduleForm(prev => ({ ...prev, interviewerId: e.target.value }))}
                    required
                    disabled={isLoadingInterviewers || (eligibleInterviewers.length === 0 && !interviewerFetchError)}
                  >
                    {eligibleInterviewers.length === 0 ? (
                      <option value="">No active interviewers available. Please contact HR Admin.</option>
                    ) : (
                      <>
                        <option value="">-- Choose Active Panel Lead --</option>
                        {eligibleInterviewers.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name} — {u.designation || u.title || 'Panel Member'} ({u.email})
                          </option>
                        ))}
                      </>
                    )}
                  </select>

                  {/* Dynamic Availability and Credential Verification (Requirement 3) */}
                  {scheduleForm.interviewerId && (
                    <div className="mt-1">
                      {scheduleAvailability.isChecking ? (
                        <small className="text-muted d-flex align-items-center" style={{ fontSize: '0.74rem' }}>
                          <span className="spinner-border spinner-border-sm me-1" role="status" style={{ width: '0.7rem', height: '0.7rem' }}></span>
                          Verifying panel member availability & role credentials...
                        </small>
                      ) : scheduleAvailability.hasConflict ? (
                        <div id="sched-conflict-alert" className="alert alert-danger py-1 px-2 mt-1 mb-0 small" style={{ fontSize: '0.74rem' }}>
                          <i className="bi bi-exclamation-octagon-fill me-1"></i>
                          <strong>Schedule Conflict:</strong> {scheduleAvailability.conflictReason || scheduleAvailability.message}
                        </div>
                      ) : scheduleAvailability.verified ? (
                        <small id="sched-verified-badge" className="text-success d-block" style={{ fontSize: '0.74rem' }}>
                          <i className="bi bi-shield-check me-1"></i> Panel member availability and role credentials verified.
                        </small>
                      ) : scheduleAvailability.message ? (
                        <small className="text-danger d-block" style={{ fontSize: '0.74rem' }}>
                          <i className="bi bi-x-circle me-1"></i> {scheduleAvailability.message}
                        </small>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* 6. Evaluation Criteria Checklist */}
                <div>
                  <label className="form-label small fw-bold text-dark mb-1">Evaluation Focus Areas & Criteria</label>
                  <div className="urja-criteria-pill-group">
                    {[
                      'Core Technical Skills',
                      'Problem Solving',
                      'Architecture & Coding',
                      'Domain Knowledge',
                      'Communication',
                      'Cultural Fit',
                      'Leadership Potential'
                    ].map(crit => {
                      const isSel = scheduleForm.evaluationCriteria.includes(crit);
                      return (
                        <span 
                          key={crit}
                          className={`urja-criteria-pill ${isSel ? 'selected' : ''}`}
                          onClick={() => handleToggleCriteria(crit)}
                        >
                          <i className={`bi ${isSel ? 'bi-check-circle-fill' : 'bi-plus'} me-1`}></i>
                          {crit}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* 7. Instructions */}
                <div>
                  <label htmlFor="sched-instructions" className="form-label small fw-bold text-dark">Interview Instructions for Panel & Candidate</label>
                  <textarea 
                    id="sched-instructions"
                    className="urja-filter-input"
                    style={{ paddingLeft: '0.75rem', minHeight: '65px' }}
                    rows="2"
                    value={scheduleForm.instructions}
                    onChange={e => setScheduleForm(prev => ({ ...prev, instructions: e.target.value }))}
                    placeholder="Specific questions to cover, assessment topics, or cutoff thresholds..."
                  />
                </div>

              </div>

              <div className="urja-modal-footer">
                <button 
                  type="button" 
                  className="urja-btn-modal-cancel"
                  onClick={() => setShowScheduleModal(false)}
                >
                  Cancel
                </button>
                <button 
                  id="btn-schedule-submit"
                  type="submit" 
                  className="urja-btn-modal-submit"
                  disabled={scheduleAvailability.hasConflict || scheduleAvailability.isChecking || eligibleInterviewers.length === 0}
                  style={scheduleAvailability.hasConflict || eligibleInterviewers.length === 0 ? { opacity: 0.55, cursor: 'not-allowed' } : {}}
                >
                  <i className="bi bi-check2-circle me-1"></i>
                  Save & Assign Interview Round
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: RESCHEDULE INTERVIEW MODAL
          ========================================================================= */}
      {showRescheduleModal && selectedInterview && (
        <div className="urja-modal-overlay" onClick={() => setShowRescheduleModal(false)}>
          <div className="urja-modal-card" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="urja-modal-header">
              <div className="urja-modal-title-wrap">
                <div className="urja-modal-icon-badge" style={{ background: '#FEF3C7', color: '#D97706' }}>
                  <i className="bi bi-clock-history"></i>
                </div>
                <div>
                  <h3 className="urja-modal-title">Reschedule Interview Round</h3>
                  <p className="urja-modal-subtitle">Update date, time, and notify panel and candidate.</p>
                </div>
              </div>
              <button type="button" className="urja-modal-close-btn" onClick={() => setShowRescheduleModal(false)}>✕</button>
            </div>

            <form onSubmit={handleRescheduleSubmit} noValidate>
              <div className="urja-modal-body">
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.85rem' }}>
                  <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.92rem' }}>
                    {getCandidateInfo(selectedInterview).name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px' }}>
                    {getRoundDisplay(selectedInterview.round).label} • Assigned to {getInterviewerInfo(selectedInterview).name}
                  </div>
                </div>

                <div>
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <label className="form-label small fw-bold text-dark mb-0">New Scheduled Date & Time *</label>
                    <span className="badge bg-success-subtle text-success border border-success-subtle" style={{ fontSize: '0.68rem' }}>
                      Asia/Kolkata (IST)
                    </span>
                  </div>
                  <input 
                    type="datetime-local" 
                    className="urja-filter-input"
                    style={{ paddingLeft: '0.75rem' }}
                    value={rescheduleForm.scheduledTime}
                    onChange={e => setRescheduleForm(prev => ({ ...prev, scheduledTime: e.target.value }))}
                    required
                  />
                </div>

                <div className="row g-3">
                  <div className="col-md-6">
                    <label htmlFor="resched-mode" className="form-label small fw-bold text-dark">Interview Mode *</label>
                    <select 
                      id="resched-mode"
                      className="urja-filter-select"
                      value={rescheduleForm.mode}
                      onChange={e => handleRescheduleModeChange(e.target.value)}
                    >
                      <option value="ONLINE">Online Video Call</option>
                      <option value="IN_PERSON">In-Person (Plant / Office)</option>
                      <option value="TELEPHONIC">Telephonic Screen</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-dark">Duration</label>
                    <select 
                      className="urja-filter-select"
                      value={rescheduleForm.durationMinutes}
                      onChange={e => setRescheduleForm(prev => ({ ...prev, durationMinutes: parseInt(e.target.value) }))}
                    >
                      <option value={30}>30 mins</option>
                      <option value={45}>45 mins</option>
                      <option value={60}>60 mins</option>
                      <option value={90}>90 mins</option>
                    </select>
                  </div>
                </div>

                {/* Mode-specific dynamic fields in Reschedule Modal */}
                {rescheduleForm.mode === 'ONLINE' && (
                  <div id="resched-field-online">
                    <label htmlFor="resched-meeting-link" className="form-label small fw-bold text-dark">Meeting Link *</label>
                    <input 
                      id="resched-meeting-link"
                      type="url" 
                      className={`urja-filter-input ${rescheduleFormErrors.meetingLink ? 'border-danger' : ''}`}
                      style={{ paddingLeft: '0.75rem' }}
                      value={rescheduleForm.meetingLink}
                      onChange={e => {
                        const val = e.target.value;
                        setRescheduleForm(prev => ({ ...prev, meetingLink: val }));
                        if (rescheduleFormErrors.meetingLink && val.trim() && isValidMeetingUrl(val)) {
                          setRescheduleFormErrors(prev => ({ ...prev, meetingLink: null }));
                        }
                      }}
                      placeholder="https://teams.microsoft.com/... or https://meet.google.com/..."
                      required
                    />
                    {rescheduleFormErrors.meetingLink && (
                      <div id="resched-meeting-link-error" className="text-danger small mt-1 d-flex align-items-center">
                        <i className="bi bi-exclamation-circle-fill me-1"></i>
                        <span>{rescheduleFormErrors.meetingLink}</span>
                      </div>
                    )}
                  </div>
                )}

                {rescheduleForm.mode === 'IN_PERSON' && (
                  <div id="resched-field-inperson">
                    <label htmlFor="resched-meeting-location" className="form-label small fw-bold text-dark">Plant / Office Location *</label>
                    {locations && locations.length > 0 ? (
                      <>
                        <select 
                          id="resched-meeting-location"
                          className={`urja-filter-select ${rescheduleFormErrors.meetingLocation ? 'border-danger' : ''}`}
                          value={rescheduleForm.meetingLocation}
                          onChange={e => {
                            const val = e.target.value;
                            setRescheduleForm(prev => ({ ...prev, meetingLocation: val }));
                            if (rescheduleFormErrors.meetingLocation && val.trim()) {
                              setRescheduleFormErrors(prev => ({ ...prev, meetingLocation: null }));
                            }
                          }}
                          required
                        >
                          <option value="">-- Choose Plant / Office Location --</option>
                          {locations.map(loc => (
                            <option key={loc} value={loc}>{loc}</option>
                          ))}
                        </select>
                        {rescheduleFormErrors.meetingLocation && (
                          <div id="resched-location-error" className="text-danger small mt-1 d-flex align-items-center">
                            <i className="bi bi-exclamation-circle-fill me-1"></i>
                            <span>{rescheduleFormErrors.meetingLocation}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div id="resched-empty-locations-alert" className="alert alert-warning py-2 px-3 small d-flex align-items-center mb-0" role="alert">
                        <i className="bi bi-exclamation-triangle-fill text-warning me-2"></i>
                        <div>
                          <strong>No locations configured:</strong> Location master is empty. Please contact HR Admin.
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {rescheduleForm.mode === 'TELEPHONIC' && (
                  <div id="resched-field-telephonic" className="alert alert-success py-2 px-3 small d-flex align-items-center mb-0" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534' }}>
                    <i className="bi bi-telephone-inbound-fill me-2 fs-6"></i>
                    <div>
                      <strong>Telephonic Mode:</strong> No meeting link or physical plant location required.
                    </div>
                  </div>
                )}

                <div>
                  <label className="form-label small fw-bold text-dark">Reason / Note for Calendar Update</label>
                  <input 
                    type="text" 
                    className="urja-filter-input"
                    style={{ paddingLeft: '0.75rem' }}
                    value={rescheduleForm.instructions}
                    onChange={e => setRescheduleForm(prev => ({ ...prev, instructions: e.target.value }))}
                    placeholder="e.g. Panel travel conflict / candidate request"
                  />
                </div>
              </div>

              <div className="urja-modal-footer">
                <button type="button" className="urja-btn-modal-cancel" onClick={() => setShowRescheduleModal(false)}>Cancel</button>
                <button type="submit" className="urja-btn-modal-submit" style={{ background: '#D97706' }}>
                  <i className="bi bi-clock-history me-1"></i>
                  Confirm Reschedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: REASSIGN INTERVIEWER MODAL
          ========================================================================= */}
      {showReassignModal && selectedInterview && (
        <div className="urja-modal-overlay" onClick={() => setShowReassignModal(false)}>
          <div className="urja-modal-card" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="urja-modal-header">
              <div className="urja-modal-title-wrap">
                <div className="urja-modal-icon-badge" style={{ background: '#F3E8FF', color: '#9333EA' }}>
                  <i className="bi bi-person-gear"></i>
                </div>
                <div>
                  <h3 className="urja-modal-title">Reassign Panel Interviewer</h3>
                  <p className="urja-modal-subtitle">Transfer round evaluation to another active staff member.</p>
                </div>
              </div>
              <button type="button" className="urja-modal-close-btn" onClick={() => setShowReassignModal(false)}>✕</button>
            </div>

            <form onSubmit={handleReassignSubmit}>
              <div className="urja-modal-body">
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.85rem' }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748B' }}>Current Assigned Panel:</div>
                  <strong style={{ fontSize: '0.9rem', color: '#0F172A' }}>{getInterviewerInfo(selectedInterview).name}</strong>
                  <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '2px' }}>
                    Candidate: <strong>{getCandidateInfo(selectedInterview).name}</strong> ({getRoundDisplay(selectedInterview.round).label})
                  </div>
                </div>

                {/* Select New Panel Member (Requirements 1, 2, 3, 8) */}
                <div>
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <label htmlFor="reassign-interviewer" className="form-label small fw-bold text-dark mb-0">
                      Select New Panel Member *
                      {isLoadingInterviewers && <span className="spinner-border spinner-border-sm text-purple ms-2" role="status"></span>}
                    </label>
                    {eligibleInterviewers.length > 0 && (
                      <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                        {eligibleInterviewers.length} active leads authorized
                      </span>
                    )}
                  </div>

                  {interviewerFetchError ? (
                    <div id="reassign-fetch-error" className="alert alert-danger py-2 px-3 small d-flex align-items-center mb-2" role="alert">
                      <i className="bi bi-exclamation-triangle-fill me-2"></i>
                      <div className="flex-grow-1">
                        <strong>Error fetching interviewers:</strong> {interviewerFetchError}
                      </div>
                      <button type="button" className="btn btn-sm btn-outline-danger py-0 px-2 ms-2" onClick={fetchEligibleInterviewers}>Retry</button>
                    </div>
                  ) : eligibleInterviewers.length === 0 && !isLoadingInterviewers ? (
                    <div id="reassign-no-interviewers-msg" className="alert alert-warning py-2 px-3 small d-flex align-items-center mb-2" role="alert">
                      <i className="bi bi-exclamation-triangle-fill me-2 text-warning"></i>
                      <div>No active interviewers available. Please contact HR Admin.</div>
                    </div>
                  ) : null}

                  <select 
                    id="reassign-interviewer"
                    className={`urja-filter-select ${reassignAvailability.hasConflict ? 'border-danger text-danger' : ''}`}
                    value={reassignForm.newInterviewerId}
                    onChange={e => setReassignForm(prev => ({ ...prev, newInterviewerId: e.target.value }))}
                    required
                    disabled={isLoadingInterviewers || (eligibleInterviewers.length === 0 && !interviewerFetchError)}
                  >
                    {eligibleInterviewers.length === 0 ? (
                      <option value="">No active interviewers available. Please contact HR Admin.</option>
                    ) : (
                      <>
                        <option value="">-- Choose Eligible Interviewer --</option>
                        {eligibleInterviewers.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name} — {u.designation || u.title || 'Panel Member'} ({u.email})
                          </option>
                        ))}
                      </>
                    )}
                  </select>

                  {/* Dynamic Availability and Credential Verification for Reassignment */}
                  {reassignForm.newInterviewerId && (
                    <div className="mt-1">
                      {reassignAvailability.isChecking ? (
                        <small className="text-muted d-flex align-items-center" style={{ fontSize: '0.74rem' }}>
                          <span className="spinner-border spinner-border-sm me-1" role="status" style={{ width: '0.7rem', height: '0.7rem' }}></span>
                          Verifying new panel member availability & role credentials...
                        </small>
                      ) : reassignAvailability.hasConflict ? (
                        <div id="reassign-conflict-alert" className="alert alert-danger py-1 px-2 mt-1 mb-0 small" style={{ fontSize: '0.74rem' }}>
                          <i className="bi bi-exclamation-octagon-fill me-1"></i>
                          <strong>Schedule Conflict:</strong> {reassignAvailability.conflictReason || reassignAvailability.message}
                        </div>
                      ) : reassignAvailability.verified ? (
                        <small id="reassign-verified-badge" className="text-success d-block" style={{ fontSize: '0.74rem' }}>
                          <i className="bi bi-shield-check me-1"></i> Panel member availability and role credentials verified.
                        </small>
                      ) : reassignAvailability.message ? (
                        <small className="text-danger d-block" style={{ fontSize: '0.74rem' }}>
                          <i className="bi bi-x-circle me-1"></i> {reassignAvailability.message}
                        </small>
                      ) : null}
                    </div>
                  )}
                </div>

                <div>
                  <label className="form-label small fw-bold text-dark">Reassignment Note</label>
                  <textarea 
                    className="urja-filter-input"
                    style={{ paddingLeft: '0.75rem', minHeight: '60px' }}
                    rows="2"
                    value={reassignForm.notes}
                    onChange={e => setReassignForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Reason for changing interviewer..."
                  />
                </div>
              </div>

              <div className="urja-modal-footer">
                <button type="button" className="urja-btn-modal-cancel" onClick={() => setShowReassignModal(false)}>Cancel</button>
                <button 
                  id="btn-reassign-submit"
                  type="submit" 
                  className="urja-btn-modal-submit" 
                  disabled={reassignAvailability.hasConflict || reassignAvailability.isChecking || eligibleInterviewers.length === 0}
                  style={reassignAvailability.hasConflict || eligibleInterviewers.length === 0 ? { background: '#9333EA', opacity: 0.55, cursor: 'not-allowed' } : { background: '#9333EA' }}
                >
                  <i className="bi bi-person-check-fill me-1"></i>
                  Confirm Reassignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: SUBMIT EVALUATION FEEDBACK SCORECARD (Interviewer Workflow)
          ========================================================================= */}
      {showFeedbackModal && selectedInterview && (
        <div className="urja-modal-overlay" onClick={() => setShowFeedbackModal(false)}>
          <div className="urja-modal-card" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
            <div className="urja-modal-header">
              <div className="urja-modal-title-wrap">
                <div className="urja-modal-icon-badge" style={{ background: '#DCFCE7', color: '#15803D' }}>
                  <i className="bi bi-star-fill"></i>
                </div>
                <div>
                  <h3 className="urja-modal-title">Submit Evaluation Scorecard</h3>
                  <p className="urja-modal-subtitle">Candidate: {getCandidateInfo(selectedInterview).name} • {getRoundDisplay(selectedInterview.round).label}</p>
                </div>
              </div>
              <button type="button" className="urja-modal-close-btn" onClick={() => setShowFeedbackModal(false)}>✕</button>
            </div>

            <form onSubmit={handleFeedbackSubmit}>
              <div className="urja-modal-body">
                
                {/* Star Ratings */}
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label small fw-bold text-dark d-block">Technical Rating *</label>
                    <div className="urja-star-rating-box">
                      {[1, 2, 3, 4, 5].map(s => (
                        <i 
                          key={s} 
                          className={`bi bi-star-fill ${s <= feedbackForm.technicalScore ? 'text-warning' : 'text-muted'}`}
                          onClick={() => setFeedbackForm(prev => ({ ...prev, technicalScore: s }))}
                        ></i>
                      ))}
                      <span className="ms-1 fw-bold text-dark small">{feedbackForm.technicalScore} / 5</span>
                    </div>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label small fw-bold text-dark d-block">Communication *</label>
                    <div className="urja-star-rating-box">
                      {[1, 2, 3, 4, 5].map(s => (
                        <i 
                          key={s} 
                          className={`bi bi-star-fill ${s <= feedbackForm.communicationScore ? 'text-warning' : 'text-muted'}`}
                          onClick={() => setFeedbackForm(prev => ({ ...prev, communicationScore: s }))}
                        ></i>
                      ))}
                      <span className="ms-1 fw-bold text-dark small">{feedbackForm.communicationScore} / 5</span>
                    </div>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label small fw-bold text-dark d-block">Culture Fit *</label>
                    <div className="urja-star-rating-box">
                      {[1, 2, 3, 4, 5].map(s => (
                        <i 
                          key={s} 
                          className={`bi bi-star-fill ${s <= feedbackForm.culturalFitScore ? 'text-warning' : 'text-muted'}`}
                          onClick={() => setFeedbackForm(prev => ({ ...prev, culturalFitScore: s }))}
                        ></i>
                      ))}
                      <span className="ms-1 fw-bold text-dark small">{feedbackForm.culturalFitScore} / 5</span>
                    </div>
                  </div>
                </div>

                {/* Final Recommendation */}
                <div>
                  <label className="form-label small fw-bold text-dark mb-1">Final Hiring Recommendation *</label>
                  <div className="d-flex gap-2 flex-wrap">
                    {[
                      { val: 'STRONG_HIRE', label: 'Strong Hire', color: 'success' },
                      { val: 'HIRE', label: 'Hire', color: 'success' },
                      { val: 'HOLD', label: 'Hold / Re-evaluate', color: 'warning' },
                      { val: 'REJECT', label: 'Reject', color: 'danger' }
                    ].map(opt => (
                      <label 
                        key={opt.val} 
                        className={`btn btn-sm btn-outline-${opt.color} ${feedbackForm.recommendation === opt.val ? 'active fw-bold' : ''}`}
                        style={{ cursor: 'pointer' }}
                      >
                        <input 
                          type="radio" 
                          name="recommendation"
                          className="d-none"
                          checked={feedbackForm.recommendation === opt.val}
                          onChange={() => setFeedbackForm(prev => ({ ...prev, recommendation: opt.val }))}
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Strengths & Weaknesses */}
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-dark">Key Strengths Demonstrated</label>
                    <textarea 
                      className="urja-filter-input"
                      style={{ paddingLeft: '0.75rem', minHeight: '65px' }}
                      rows="2"
                      value={feedbackForm.strengths}
                      onChange={e => setFeedbackForm(prev => ({ ...prev, strengths: e.target.value }))}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-dark">Areas of Development / Concerns</label>
                    <textarea 
                      className="urja-filter-input"
                      style={{ paddingLeft: '0.75rem', minHeight: '65px' }}
                      rows="2"
                      value={feedbackForm.weaknesses}
                      onChange={e => setFeedbackForm(prev => ({ ...prev, weaknesses: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Detailed Comments */}
                <div>
                  <label className="form-label small fw-bold text-dark">Detailed Assessment Comments *</label>
                  <textarea 
                    className="urja-filter-input"
                    style={{ paddingLeft: '0.75rem', minHeight: '75px' }}
                    rows="3"
                    value={feedbackForm.comments}
                    onChange={e => setFeedbackForm(prev => ({ ...prev, comments: e.target.value }))}
                    required
                  />
                </div>

              </div>

              <div className="urja-modal-footer">
                <button type="button" className="urja-btn-modal-cancel" onClick={() => setShowFeedbackModal(false)}>Cancel</button>
                <button type="submit" className="urja-btn-modal-submit">
                  <i className="bi bi-check-circle-fill me-1"></i>
                  Submit Scorecard & Complete Round
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 5: VIEW SUBMITTED EVALUATION SCORECARD
          ========================================================================= */}
      {showViewFeedbackModal && selectedInterview && (
        <div className="urja-modal-overlay" onClick={() => setShowViewFeedbackModal(false)}>
          <div className="urja-modal-card" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <div className="urja-modal-header">
              <div className="urja-modal-title-wrap">
                <div className="urja-modal-icon-badge">
                  <i className="bi bi-file-earmark-check-fill"></i>
                </div>
                <div>
                  <h3 className="urja-modal-title">Evaluation Scorecard</h3>
                  <p className="urja-modal-subtitle">Submitted by {getInterviewerInfo(selectedInterview).name}</p>
                </div>
              </div>
              <button type="button" className="urja-modal-close-btn" onClick={() => setShowViewFeedbackModal(false)}>✕</button>
            </div>

            <div className="urja-modal-body">
              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 600 }}>CANDIDATE</div>
                  <strong style={{ fontSize: '1.05rem', color: '#14532D' }}>{getCandidateInfo(selectedInterview).name}</strong>
                  <div style={{ fontSize: '0.8rem', color: '#15803D' }}>{getRoundDisplay(selectedInterview.round).label}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 600 }}>RECOMMENDATION</div>
                  <span className={`recommendation-badge ${(viewFeedbackData?.recommendation || 'HIRE').toLowerCase().replace(/\s+/g, '_')}`} style={{ fontSize: '0.85rem' }}>
                    {(viewFeedbackData?.recommendation || 'HIRE').replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Score Ratings Breakdown */}
              <div className="row g-2 text-center">
                <div className="col-4">
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.65rem' }}>
                    <small className="text-muted d-block" style={{ fontSize: '0.72rem' }}>Technical</small>
                    <strong style={{ fontSize: '1.1rem', color: '#0F172A' }}>★ {viewFeedbackData?.technicalRating || 4} / 5</strong>
                  </div>
                </div>
                <div className="col-4">
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.65rem' }}>
                    <small className="text-muted d-block" style={{ fontSize: '0.72rem' }}>Communication</small>
                    <strong style={{ fontSize: '1.1rem', color: '#0F172A' }}>★ {viewFeedbackData?.communicationRating || 4} / 5</strong>
                  </div>
                </div>
                <div className="col-4">
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.65rem' }}>
                    <small className="text-muted d-block" style={{ fontSize: '0.72rem' }}>Culture Fit</small>
                    <strong style={{ fontSize: '1.1rem', color: '#0F172A' }}>★ {viewFeedbackData?.cultureFitRating || 5} / 5</strong>
                  </div>
                </div>
              </div>

              {/* Strengths & Weaknesses */}
              {viewFeedbackData?.strengths && (
                <div>
                  <strong className="small text-dark d-block">Key Strengths:</strong>
                  <p className="small text-muted mb-0">{viewFeedbackData.strengths}</p>
                </div>
              )}

              {viewFeedbackData?.weaknesses && (
                <div>
                  <strong className="small text-dark d-block">Development Areas:</strong>
                  <p className="small text-muted mb-0">{viewFeedbackData.weaknesses}</p>
                </div>
              )}

              {/* Detailed Comments */}
              <div>
                <strong className="small text-dark d-block">Evaluator Detailed Comments:</strong>
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.75rem', fontSize: '0.84rem', color: '#334155', lineHeight: 1.5 }}>
                  {viewFeedbackData?.detailedComments || viewFeedbackData?.comments || 'Strong performance throughout the round.'}
                </div>
              </div>

            </div>

            <div className="urja-modal-footer">
              <button type="button" className="urja-btn-modal-cancel" onClick={() => setShowViewFeedbackModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 6: VIEW FULL INTERVIEW DETAILS BRIEF
          ========================================================================= */}
      {showDetailsModal && selectedInterview && (
        <div className="urja-modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="urja-modal-card" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="urja-modal-header">
              <div className="urja-modal-title-wrap">
                <div className="urja-modal-icon-badge">
                  <i className="bi bi-info-circle-fill"></i>
                </div>
                <div>
                  <h3 className="urja-modal-title">Interview Round Brief</h3>
                  <p className="urja-modal-subtitle">Candidate: {getCandidateInfo(selectedInterview).name} • Requisition: {getRequisitionInfo(selectedInterview).code}</p>
                </div>
              </div>
              <button type="button" className="urja-modal-close-btn" onClick={() => setShowDetailsModal(false)}>✕</button>
            </div>

            <div className="urja-modal-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.85rem' }}>
                    <small className="text-muted d-block text-uppercase fw-bold" style={{ fontSize: '0.7rem' }}>Candidate</small>
                    <strong style={{ fontSize: '0.96rem', color: '#0F172A' }}>{getCandidateInfo(selectedInterview).name}</strong>
                    <div style={{ fontSize: '0.8rem', color: '#64748B' }}>{getCandidateInfo(selectedInterview).email}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B' }}>{getCandidateInfo(selectedInterview).phone}</div>
                    <span className="cand-code-badge mt-1">{getCandidateInfo(selectedInterview).code}</span>
                  </div>
                </div>
                <div className="col-md-6">
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.85rem' }}>
                    <small className="text-muted d-block text-uppercase fw-bold" style={{ fontSize: '0.7rem' }}>Position & Department</small>
                    <strong style={{ fontSize: '0.96rem', color: '#0F172A' }}>{getRequisitionInfo(selectedInterview).title}</strong>
                    <div style={{ fontSize: '0.8rem', color: '#64748B' }}>{getRequisitionInfo(selectedInterview).dept}</div>
                    <span className="cand-code-badge mt-1" style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
                      {getRequisitionInfo(selectedInterview).code}
                    </span>
                  </div>
                </div>
              </div>

              <div className="row g-3">
                <div className="col-md-6">
                  <small className="text-muted d-block fw-bold" style={{ fontSize: '0.74rem' }}>ROUND & STAGE</small>
                  <span className={`round-pill ${getRoundDisplay(selectedInterview.round).type} mt-1`}>
                    {getRoundDisplay(selectedInterview.round).label}
                  </span>
                </div>
                <div className="col-md-6">
                  <small className="text-muted d-block fw-bold" style={{ fontSize: '0.74rem' }}>DATE & TIME (IST)</small>
                  <div className="time-date-text mt-1">
                    <i className="bi bi-clock-fill text-success me-1"></i>
                    {formatISTDateTime(selectedInterview.scheduledAt || selectedInterview.scheduledTime).date} at {formatISTDateTime(selectedInterview.scheduledAt || selectedInterview.scheduledTime).time}
                  </div>
                </div>
              </div>

              <div>
                <small className="text-muted d-block fw-bold" style={{ fontSize: '0.74rem' }}>PANEL INTERVIEWER</small>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '4px' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#DCFCE7', color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                    {getInterviewerInfo(selectedInterview).initials}
                  </div>
                  <div>
                    <strong style={{ color: '#0F172A' }}>{getInterviewerInfo(selectedInterview).name}</strong>
                    <small className="text-muted d-block">{getInterviewerInfo(selectedInterview).title} • {getInterviewerInfo(selectedInterview).email}</small>
                  </div>
                </div>
              </div>

              {/* Mode & Location Details in Details Brief (Requirements 1, 2, 3) */}
              <div className="row g-3">
                <div className="col-md-6">
                  <small className="text-muted d-block fw-bold" style={{ fontSize: '0.74rem' }}>INTERVIEW MODE</small>
                  <span className={`mode-badge ${getModeInfo(selectedInterview).badgeClass || ''} mt-1`} style={{ display: 'inline-flex', padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}>
                    <i className={`bi ${getModeInfo(selectedInterview).icon} me-1`}></i>
                    {getModeInfo(selectedInterview).label}
                  </span>
                </div>

                <div className="col-md-6">
                  <small className="text-muted d-block fw-bold" style={{ fontSize: '0.74rem' }}>
                    {getModeInfo(selectedInterview).mode === 'ONLINE' ? 'MEETING LINK' : 
                     (getModeInfo(selectedInterview).mode === 'IN_PERSON' ? 'PLANT / OFFICE LOCATION' : 'TELEPHONIC CONTACT')}
                  </small>
                  <div className="mt-1">
                    {getModeInfo(selectedInterview).mode === 'ONLINE' ? (
                      selectedInterview.meetingLink && selectedInterview.meetingLink.startsWith('http') ? (
                        <a 
                          href={selectedInterview.meetingLink} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="meeting-link-action d-inline-flex align-items-center"
                          id="details-join-meeting-btn"
                        >
                          <i className="bi bi-box-arrow-up-right me-1"></i>
                          <span>Join Meeting</span>
                        </a>
                      ) : (
                        <span className="text-muted small">No valid meeting link provided</span>
                      )
                    ) : getModeInfo(selectedInterview).mode === 'IN_PERSON' ? (
                      <span className="location-cell-badge" style={{ fontSize: '0.84rem' }}>
                        <i className="bi bi-geo-alt-fill text-success me-1"></i>
                        {selectedInterview.meetingLocation || 'Plant / Office'}
                      </span>
                    ) : (
                      <span className="telephonic-cell-badge" style={{ fontSize: '0.84rem' }}>
                        <i className="bi bi-telephone-fill text-primary me-1"></i>
                        <span>{getCandidateInfo(selectedInterview).phone || 'Direct Call to Candidate Phone'}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {selectedInterview.instructions && (
                <div>
                  <small className="text-muted d-block fw-bold" style={{ fontSize: '0.74rem' }}>INSTRUCTIONS & CRITERIA</small>
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.65rem', fontSize: '0.82rem', color: '#334155' }}>
                    {selectedInterview.instructions}
                  </div>
                </div>
              )}

            </div>

            <div className="urja-modal-footer">
              <button type="button" className="urja-btn-modal-cancel" onClick={() => setShowDetailsModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
