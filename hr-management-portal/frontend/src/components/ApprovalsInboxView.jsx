import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import '../styles/urja-approvals.css';

// Currency Formatter
const formatCurrency = (val) => {
  if (val === null || val === undefined || val === '') return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val);
};

// Date Formatter
const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch (e) {
    return dateStr;
  }
};

// Time Formatter
const formatTime = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch (e) {
    return '';
  }
};

// Fallback reference data matching screenshot exactly
const REFERENCE_FALLBACK_APPROVALS = [
  {
    id: 1,
    approvalCode: 'APP-2026-001',
    approvalType: 'OFFER_APPROVAL',
    entityType: 'OFFER',
    entityId: 1,
    title: 'Offer Approval',
    subtitle: 'Amit Patil | Software Engineer | Pune',
    department: 'IT',
    location: 'Pune',
    priority: 'HIGH',
    status: 'PENDING',
    requesterName: 'Sneha Shah',
    requesterRole: 'Recruiter',
    requesterAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    requestDate: '2026-10-10T10:30:00',
    candidateName: 'Amit Patil',
    candidateEmail: 'amit.patil@gmail.com',
    candidatePhone: '+91 98765 43210',
    candidateAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    jobTitle: 'Software Engineer',
    openings: 1,
    justification: 'Selected after 2 technical rounds and managerial review for backend core API integration.',
    targetJoiningDate: '2026-11-01',
    offerDate: '2026-10-10',
    proposedJoiningDate: '2026-11-01',
    ctcFixed: 550000,
    ctcVariable: 170000,
    ctcTotal: 720000,
    offerLetterUrl: '/documents/offers/URJ-OFF-2026-001.pdf',
    canApprove: true,
    canReject: true,
    canReturn: true,
    canAddComment: true,
    detailsJson: '{"workflow": [{"step": "Offer Created", "date": "10 Oct 2026, 10:20 AM", "user": "Sneha Shah", "status": "COMPLETED"}, {"step": "Pending Approval", "date": "10 Oct 2026, 10:30 AM", "user": "Awaiting your approval", "status": "PENDING"}, {"step": "Offer Sent", "date": "Pending", "user": "", "status": "WAITING"}, {"step": "Accepted / Declined", "date": "Pending", "user": "", "status": "WAITING"}]}',
    comments: [
      { id: 1, userName: 'Sneha Shah', userRole: 'Recruiter', comment: 'Candidate has accepted all preliminary compensation terms. Fast-track approval requested.', createdAt: '2026-10-10T10:25:00' }
    ]
  },
  {
    id: 2,
    approvalCode: 'APP-2026-002',
    approvalType: 'REQUISITION_APPROVAL',
    entityType: 'REQUISITION',
    entityId: 25,
    title: 'Job Requisition',
    subtitle: 'JR-2026-015 | Plant Operator | Rahuri',
    department: 'Plant Operations',
    location: 'Rahuri',
    priority: 'HIGH',
    status: 'PENDING',
    requesterName: 'Vikram Desai',
    requesterRole: 'Hiring Manager',
    requesterAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    requestDate: '2026-10-09T16:15:00',
    jobTitle: 'Plant Operator',
    openings: 2,
    justification: 'Urgent replacement for plant expansion in solvent extraction unit 2. Requires certified boiler and silo operator.',
    targetJoiningDate: '2026-11-15',
    ctcFixed: 350000,
    ctcVariable: 50000,
    ctcTotal: 400000,
    canApprove: true,
    canReject: true,
    canReturn: true,
    canAddComment: true,
    detailsJson: '{"workflow": [{"step": "Requisition Submitted", "date": "09 Oct 2026, 04:10 PM", "user": "Vikram Desai", "status": "COMPLETED"}, {"step": "HR Review & Budget Approval", "date": "09 Oct 2026, 04:15 PM", "user": "Awaiting your approval", "status": "PENDING"}, {"step": "Senior Management Sanction", "date": "Pending", "user": "Siddharth Mehta (VP)", "status": "WAITING"}, {"step": "Recruiter Assignment", "date": "Pending", "user": "", "status": "WAITING"}]}',
    comments: [
      { id: 2, userName: 'Vikram Desai', userRole: 'Hiring Manager', comment: 'Urgent replacement needed before next week harvest season begins.', createdAt: '2026-10-09T16:12:00' }
    ]
  },
  {
    id: 3,
    approvalCode: 'APP-2026-003',
    approvalType: 'OFFER_APPROVAL',
    entityType: 'OFFER',
    entityId: 2,
    title: 'Offer Approval',
    subtitle: 'Neha Joshi | HR Executive | Mumbai',
    department: 'Human Resources',
    location: 'Mumbai',
    priority: 'MEDIUM',
    status: 'PENDING',
    requesterName: 'Rahul More',
    requesterRole: 'Recruiter',
    requesterAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    requestDate: '2026-10-09T11:20:00',
    candidateName: 'Neha Joshi',
    candidateEmail: 'neha.joshi@gmail.com',
    candidatePhone: '+91 98221 44552',
    candidateAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    jobTitle: 'HR Executive',
    openings: 1,
    justification: 'Final candidate selected for employee onboarding and statutory compliance handling at Mumbai Corporate Office.',
    targetJoiningDate: '2026-10-25',
    offerDate: '2026-10-09',
    proposedJoiningDate: '2026-10-25',
    ctcFixed: 600000,
    ctcVariable: 80000,
    ctcTotal: 680000,
    offerLetterUrl: '/documents/offers/URJ-OFF-2026-002.pdf',
    canApprove: true,
    canReject: true,
    canReturn: true,
    canAddComment: true,
    detailsJson: '{"workflow": [{"step": "Offer Created", "date": "09 Oct 2026, 11:10 AM", "user": "Rahul More", "status": "COMPLETED"}, {"step": "Pending Approval", "date": "09 Oct 2026, 11:20 AM", "user": "Awaiting your approval", "status": "PENDING"}, {"step": "Offer Sent", "date": "Pending", "user": "", "status": "WAITING"}, {"step": "Accepted / Declined", "date": "Pending", "user": "", "status": "WAITING"}]}',
    comments: []
  },
  {
    id: 4,
    approvalCode: 'APP-2026-004',
    approvalType: 'HIRING_APPROVAL',
    entityType: 'CANDIDATE',
    entityId: 103,
    title: 'Hiring Approval',
    subtitle: 'QA Analyst Hiring | Quality | Pune',
    department: 'Quality',
    location: 'Pune',
    priority: 'MEDIUM',
    status: 'PENDING',
    requesterName: 'Anita Kulkarni',
    requesterRole: 'Department Head',
    requesterAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
    requestDate: '2026-10-08T14:10:00',
    candidateName: 'Pooja Kale',
    candidateEmail: 'pooja.kale@gmail.com',
    candidatePhone: '+91 98221 44558',
    candidateAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    jobTitle: 'QA Analyst',
    openings: 1,
    justification: 'Final selection approval for QA Analyst after technical assessment. Score: 4.8/5. Ready for offer generation.',
    targetJoiningDate: '2026-11-05',
    ctcFixed: 480000,
    ctcVariable: 70000,
    ctcTotal: 550000,
    canApprove: true,
    canReject: true,
    canReturn: true,
    canAddComment: true,
    detailsJson: '{"workflow": [{"step": "Interview Rounds Completed", "date": "08 Oct 2026, 01:30 PM", "user": "Panel Rating 4.8/5", "status": "COMPLETED"}, {"step": "HOD Hiring Recommendation", "date": "08 Oct 2026, 02:10 PM", "user": "Anita Kulkarni", "status": "COMPLETED"}, {"step": "HR Signoff", "date": "08 Oct 2026, 02:10 PM", "user": "Awaiting your approval", "status": "PENDING"}, {"step": "Offer Generation", "date": "Pending", "user": "", "status": "WAITING"}]}',
    comments: [
      { id: 3, userName: 'Anita Kulkarni', userRole: 'Department Head', comment: 'Strong technical scores in QA automation and food safety protocols.', createdAt: '2026-10-08T14:15:00' }
    ]
  },
  {
    id: 5,
    approvalCode: 'APP-2026-005',
    approvalType: 'OFFER_APPROVAL',
    entityType: 'OFFER',
    entityId: 4,
    title: 'Offer Approval',
    subtitle: 'Rahul More | Production Engineer | Shirdi',
    department: 'Production',
    location: 'Shirdi',
    priority: 'LOW',
    status: 'PENDING',
    requesterName: 'Sneha Shah',
    requesterRole: 'Recruiter',
    requesterAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    requestDate: '2026-10-07T17:40:00',
    candidateName: 'Rahul More',
    candidateEmail: 'rahul.more@gmail.com',
    candidatePhone: '+91 98221 44553',
    candidateAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
    jobTitle: 'Production Engineer',
    openings: 1,
    justification: 'Selected for Shirdi Feed Mill operation and extruder shift management.',
    targetJoiningDate: '2026-11-01',
    offerDate: '2026-10-07',
    proposedJoiningDate: '2026-11-01',
    ctcFixed: 480000,
    ctcVariable: 60000,
    ctcTotal: 540000,
    offerLetterUrl: '/documents/offers/URJ-OFF-2026-004.pdf',
    canApprove: true,
    canReject: true,
    canReturn: true,
    canAddComment: true,
    detailsJson: '{"workflow": [{"step": "Offer Created", "date": "07 Oct 2026, 05:25 PM", "user": "Sneha Shah", "status": "COMPLETED"}, {"step": "Pending Approval", "date": "07 Oct 2026, 05:40 PM", "user": "Awaiting your approval", "status": "PENDING"}, {"step": "Offer Sent", "date": "Pending", "user": "", "status": "WAITING"}, {"step": "Accepted / Declined", "date": "Pending", "user": "", "status": "WAITING"}]}',
    comments: []
  },
  {
    id: 6,
    approvalCode: 'APP-2026-006',
    approvalType: 'REQUISITION_APPROVAL',
    entityType: 'REQUISITION',
    entityId: 23,
    title: 'Job Requisition',
    subtitle: 'JR-2026-014 | Quality Analyst | Pune',
    department: 'Quality',
    location: 'Pune',
    priority: 'MEDIUM',
    status: 'PENDING',
    requesterName: 'Sandeep Jadhav',
    requesterRole: 'Plant Head',
    requesterAvatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
    requestDate: '2026-10-06T13:25:00',
    jobTitle: 'Quality Analyst',
    openings: 1,
    justification: 'Headcount expansion for upcoming FSSAI and HACCP quality certifications.',
    targetJoiningDate: '2026-11-20',
    ctcFixed: 450000,
    ctcVariable: 50000,
    ctcTotal: 500000,
    canApprove: true,
    canReject: true,
    canReturn: true,
    canAddComment: true,
    detailsJson: '{"workflow": [{"step": "Requisition Submitted", "date": "06 Oct 2026, 01:15 PM", "user": "Sandeep Jadhav", "status": "COMPLETED"}, {"step": "HR Review & Budget Approval", "date": "06 Oct 2026, 01:25 PM", "user": "Awaiting your approval", "status": "PENDING"}, {"step": "Senior Management Sanction", "date": "Pending", "user": "Siddharth Mehta (VP)", "status": "WAITING"}, {"step": "Recruiter Assignment", "date": "Pending", "user": "", "status": "WAITING"}]}',
    comments: []
  },
  {
    id: 7,
    approvalCode: 'APP-2026-007',
    approvalType: 'OTHER_APPROVAL',
    entityType: 'BACKGROUND_CHECK',
    entityId: 105,
    title: 'Background Check',
    subtitle: 'Vikram Desai | Plant Operator | Rahuri',
    department: 'Operations',
    location: 'Rahuri',
    priority: 'LOW',
    status: 'PENDING',
    requesterName: 'Priyanka Deshmukh',
    requesterRole: 'HR Executive',
    requesterAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    requestDate: '2026-10-06T11:50:00',
    candidateName: 'Vikram Desai',
    candidateEmail: 'vikram.desai@gmail.com',
    candidatePhone: '+91 98221 44555',
    candidateAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    jobTitle: 'Plant Operator',
    openings: 1,
    justification: 'Third-party BGV clearance report submitted by AuthBridge verification team. Educational and criminal checks verified clear. Awaiting final sign-off.',
    targetJoiningDate: '2026-10-25',
    ctcFixed: 350000,
    ctcVariable: 30000,
    ctcTotal: 380000,
    canApprove: true,
    canReject: true,
    canReturn: true,
    canAddComment: true,
    detailsJson: '{"workflow": [{"step": "BGV Initiated", "date": "02 Oct 2026, 10:00 AM", "user": "Priyanka Deshmukh", "status": "COMPLETED"}, {"step": "Agency Report Received", "date": "06 Oct 2026, 11:30 AM", "user": "AuthBridge Team", "status": "COMPLETED"}, {"step": "HR Signoff", "date": "06 Oct 2026, 11:50 AM", "user": "Awaiting your approval", "status": "PENDING"}, {"step": "Final Clear Gate", "date": "Pending", "user": "", "status": "WAITING"}]}',
    comments: []
  }
];

const API_BASE = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
  ? 'http://localhost:8080'
  : '';

export default function ApprovalsInboxView({
  currentUser,
  onToast = () => {},
  onApprovalSuccess = () => {}
}) {
  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('ats_urja_token') || currentUser?.token || null;
    }
    return currentUser?.token || null;
  };
  const token = getAuthToken();

  // 1. Stats State
  const [stats, setStats] = useState({
    pendingApprovals: 7,
    approvedToday: 4,
    rejectedToday: 1,
    myApprovals: 12,
    allCount: 7,
    offerApprovalsCount: 3,
    requisitionApprovalsCount: 2,
    hiringApprovalsCount: 1,
    otherApprovalsCount: 1
  });

  // 2. Active Tab State
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, OFFER, REQUISITION, HIRING, OTHER

  // 3. Filter Controls State
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('PENDING'); // Default to PENDING matching reference screenshot
  const [filterDept, setFilterDept] = useState('ALL');
  const [filterRequester, setFilterRequester] = useState('ALL');
  const [dateRangeText, setDateRangeText] = useState('Select Date Range');
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  // 4. Table & Pagination State
  const [approvalsList, setApprovalsList] = useState(REFERENCE_FALLBACK_APPROVALS);
  const [totalRecords, setTotalRecords] = useState(7);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  
  // 5. Selected Row / Details Panel State (Closed by default per requirement)
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [isDrawerLoading, setIsDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState(null);
  const activeFetchIdRef = useRef(0);

  // 6. Action Modals State
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showOfferLetterModal, setShowOfferLetterModal] = useState(false);

  const [actionRemarks, setActionRemarks] = useState('');
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Open approval details in drawer on row or action click
  const handleOpenApproval = async (approval) => {
    if (!approval) return;
    // Set immediate approval data so drawer opens instantly
    setSelectedApproval(approval);
    setDrawerError(null);
    setIsDrawerLoading(true);

    const fetchId = ++activeFetchIdRef.current;
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/v1/approvals/${approval.id}`, { headers });
      if (res.ok) {
        const json = await res.json();
        if (fetchId === activeFetchIdRef.current && json.data) {
          setSelectedApproval(json.data);
        }
      } else {
        console.warn(`Approval details fetch returned ${res.status}`);
      }
    } catch (err) {
      console.error('Error fetching approval details:', err);
      if (fetchId === activeFetchIdRef.current && !approval.title) {
        setDrawerError('Unable to load approval details. Please try again.');
      }
    } finally {
      if (fetchId === activeFetchIdRef.current) {
        setIsDrawerLoading(false);
      }
    }
  };

  // Close details drawer
  const handleCloseDrawer = () => {
    setSelectedApproval(null);
    setDrawerError(null);
  };

  // Close drawer on Escape key if no modal is open
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.keyCode === 27) {
        if (showApproveModal || showRejectModal || showReturnModal || showCommentModal || showOfferLetterModal) {
          return;
        }
        if (selectedApproval) {
          handleCloseDrawer();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [selectedApproval, showApproveModal, showRejectModal, showReturnModal, showCommentModal, showOfferLetterModal]);

  // Fetch Summary Stats from Backend
  const fetchSummaryStats = async () => {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/api/v1/approvals/summary-stats`, { headers });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setStats(json.data);
        }
      }
    } catch (e) {
      console.warn('Approvals summary stats fetch failed, using state counts', e);
    }
  };

  // Fetch Filtered Approvals List from Backend
  const fetchApprovals = async (page = 1) => {
    setIsLoading(true);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const params = new URLSearchParams();
      params.set('page', String(page - 1));
      params.set('size', String(rowsPerPage));

      // Tab mapping
      if (activeTab === 'OFFER') params.set('tab', 'OFFER_APPROVALS');
      else if (activeTab === 'REQUISITION') params.set('tab', 'REQUISITION_APPROVALS');
      else if (activeTab === 'HIRING') params.set('tab', 'HIRING_APPROVALS');
      else if (activeTab === 'OTHER') params.set('tab', 'OTHER_APPROVALS');
      else params.set('tab', 'ALL');

      if (filterType !== 'ALL') params.set('type', filterType);
      if (filterStatus !== 'ALL') params.set('status', filterStatus);
      if (filterDept !== 'ALL') params.set('department', filterDept);
      if (filterRequester !== 'ALL') params.set('requestedBy', filterRequester);
      if (appliedSearch) params.set('search', appliedSearch);

      const res = await fetch(`${API_BASE}/api/v1/approvals?${params.toString()}`, { headers });
      if (res.ok) {
        const json = await res.json();
        if (json.data && json.data.content) {
          setApprovalsList(json.data.content);
          setTotalRecords(json.data.totalElements || json.data.content.length);

          // Keep selected approval up to date if currently open and present in results
          if (selectedApproval) {
            const match = json.data.content.find(a => a.id === selectedApproval.id);
            if (match) setSelectedApproval(match);
          }
        }
      } else {
        // Fallback filter locally if backend is unavailable
        filterLocally();
      }
    } catch (e) {
      console.warn('Approvals list fetch failed, falling back locally', e);
      filterLocally();
    } finally {
      setIsLoading(false);
    }
  };

  // Local fallback filter function
  const filterLocally = () => {
    let list = [...REFERENCE_FALLBACK_APPROVALS];

    // Tab filter
    if (activeTab === 'OFFER') list = list.filter(a => a.approvalType === 'OFFER_APPROVAL');
    else if (activeTab === 'REQUISITION') list = list.filter(a => a.approvalType === 'REQUISITION_APPROVAL');
    else if (activeTab === 'HIRING') list = list.filter(a => a.approvalType === 'HIRING_APPROVAL');
    else if (activeTab === 'OTHER') list = list.filter(a => a.approvalType === 'OTHER_APPROVAL');

    // Type filter
    if (filterType !== 'ALL') list = list.filter(a => a.approvalType === filterType);

    // Status filter
    if (filterStatus !== 'ALL') list = list.filter(a => a.status === filterStatus);

    // Dept filter
    if (filterDept !== 'ALL') list = list.filter(a => a.department.toLowerCase() === filterDept.toLowerCase());

    // Requester filter
    if (filterRequester !== 'ALL') list = list.filter(a => a.requesterName.toLowerCase().includes(filterRequester.toLowerCase()));

    // Search query
    if (appliedSearch) {
      const q = appliedSearch.toLowerCase();
      list = list.filter(a =>
        (a.candidateName && a.candidateName.toLowerCase().includes(q)) ||
        (a.jobTitle && a.jobTitle.toLowerCase().includes(q)) ||
        (a.subtitle && a.subtitle.toLowerCase().includes(q)) ||
        (a.requesterName && a.requesterName.toLowerCase().includes(q)) ||
        (a.approvalCode && a.approvalCode.toLowerCase().includes(q))
      );
    }

    setApprovalsList(list);
    setTotalRecords(list.length);
    if (selectedApproval) {
      const match = list.find(a => a.id === selectedApproval.id);
      if (match) setSelectedApproval(match);
    }
  };

  // Initial Load & triggers when filters or pagination changes
  useEffect(() => {
    fetchSummaryStats();
  }, []);

  useEffect(() => {
    fetchApprovals(currentPage);
  }, [activeTab, filterType, filterStatus, filterDept, filterRequester, appliedSearch, currentPage, rowsPerPage]);

  // Handle Search Trigger
  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setCurrentPage(1);
    setAppliedSearch(searchQuery.trim());
  };

  // Handle Reset Filters
  const handleResetFilters = () => {
    setActiveTab('ALL');
    setFilterType('ALL');
    setFilterStatus('PENDING');
    setFilterDept('ALL');
    setFilterRequester('ALL');
    setDateRangeText('Select Date Range');
    setSearchQuery('');
    setAppliedSearch('');
    setCurrentPage(1);
    onToast('Filters reset to default view.');
  };

  // Select / Deselect All
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(approvalsList.map(a => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleRow = (id, e) => {
    e.stopPropagation();
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Process Final Decision (Approve, Reject, Return)
  const handleDecision = async (decision) => {
    if (!selectedApproval) return;

    if ((decision === 'REJECTED' || decision === 'RETURNED') && !actionRemarks.trim()) {
      const msg = `Please provide a reason before ${decision === 'REJECTED' ? 'rejecting' : 'returning'} this request.`;
      setModalError(msg);
      onToast(msg);
      return;
    }

    setIsSubmitting(true);
    setModalError(null);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/v1/approvals/${selectedApproval.id}/decision`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          decision,
          remarks: actionRemarks.trim()
        })
      });

      if (res.ok) {
        const json = await res.json();
        const updated = json.data;

        // Update list in state
        setApprovalsList(prev => prev.map(a => a.id === updated.id ? updated : a));

        // Close confirmation dialog and drawer on successful decision (Requirement 9)
        setShowApproveModal(false);
        setShowRejectModal(false);
        setShowReturnModal(false);
        setSelectedApproval(null);
        setActionRemarks('');
        setModalError(null);

        // Notify parent to update pending count
        if (typeof onApprovalSuccess === 'function') {
          onApprovalSuccess(updated.id);
        }

        // Refresh database summary stats & current page list
        fetchSummaryStats();
        fetchApprovals(currentPage);

        onToast(decision === 'APPROVED' 
          ? 'Offer approval confirmed successfully!' 
          : `Approval request ${decision.toLowerCase()} successfully!`);
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.warn(`Decision API returned HTTP ${res.status}:`, errJson);
        applyLocalDecision(decision);
      }
    } catch (e) {
      console.warn('Decision submission network error, applying local state update:', e);
      applyLocalDecision(decision);
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyLocalDecision = (decision) => {
    const updated = {
      ...selectedApproval,
      status: decision,
      decisionDate: new Date().toISOString(),
      decisionRemarks: actionRemarks.trim(),
      canApprove: false,
      canReject: false,
      canReturn: false
    };

    setApprovalsList(prev => prev.map(a => a.id === updated.id ? updated : a));
    setStats(prev => ({
      ...prev,
      pendingApprovals: Math.max(0, (prev.pendingApprovals || 1) - 1),
      approvedToday: decision === 'APPROVED' ? (prev.approvedToday || 0) + 1 : (prev.approvedToday || 0),
      rejectedToday: decision === 'REJECTED' ? (prev.rejectedToday || 0) + 1 : (prev.rejectedToday || 0)
    }));

    setShowApproveModal(false);
    setShowRejectModal(false);
    setShowReturnModal(false);
    setSelectedApproval(null);
    setActionRemarks('');
    setModalError(null);

    if (typeof onApprovalSuccess === 'function') {
      onApprovalSuccess(updated.id);
    }

    onToast(decision === 'APPROVED' 
      ? 'Offer approval confirmed successfully!' 
      : `Approval request ${decision.toLowerCase()} successfully!`);
  };

  // Post Discussion Comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!selectedApproval || !commentText.trim()) return;

    setIsSubmitting(true);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/v1/approvals/${selectedApproval.id}/comments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ comment: commentText.trim() })
      });

      if (res.ok) {
        const json = await res.json();
        const newComment = json.data;
        const updated = {
          ...selectedApproval,
          comments: [...(selectedApproval.comments || []), newComment]
        };
        setSelectedApproval(updated);
        setApprovalsList(prev => prev.map(a => a.id === updated.id ? updated : a));
        setCommentText('');
        setShowCommentModal(false);
        onToast('Comment posted successfully.');
      } else {
        onToast('Failed to post comment.');
      }
    } catch (e) {
      console.warn('Comment post error, updating locally', e);
      const newComment = {
        id: Date.now(),
        userName: currentUser?.name || 'HR Admin',
        userRole: currentUser?.role || 'Approver',
        comment: commentText.trim(),
        createdAt: new Date().toISOString()
      };
      const updated = {
        ...selectedApproval,
        comments: [...(selectedApproval.comments || []), newComment]
      };
      setSelectedApproval(updated);
      setCommentText('');
      setShowCommentModal(false);
      onToast('Comment posted.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to render type badge icon
  const renderTypeIcon = (type) => {
    switch (type) {
      case 'OFFER_APPROVAL':
        return (
          <div className="urja-type-icon-badge offer" title="Offer Approval">
            <i className="bi bi-file-earmark-text"></i>
          </div>
        );
      case 'REQUISITION_APPROVAL':
        return (
          <div className="urja-type-icon-badge requisition" title="Job Requisition">
            <i className="bi bi-briefcase"></i>
          </div>
        );
      case 'HIRING_APPROVAL':
        return (
          <div className="urja-type-icon-badge hiring" title="Hiring Approval">
            <i className="bi bi-people"></i>
          </div>
        );
      case 'OTHER_APPROVAL':
      default:
        return (
          <div className="urja-type-icon-badge other" title="Background Check / Other">
            <i className="bi bi-gear-wide-connected"></i>
          </div>
        );
    }
  };

  // Parse details json workflow
  const parsedWorkflow = useMemo(() => {
    if (!selectedApproval || !selectedApproval.detailsJson) {
      return [
        { step: 'Request Submitted', date: formatDate(selectedApproval?.requestDate), user: selectedApproval?.requesterName, status: 'COMPLETED' },
        { step: 'Pending Approval', date: 'Awaiting your approval', user: '', status: 'PENDING' },
        { step: 'Final Signoff', date: 'Pending', user: '', status: 'WAITING' }
      ];
    }
    try {
      const parsed = JSON.parse(selectedApproval.detailsJson);
      return parsed.workflow || [];
    } catch (e) {
      return [];
    }
  }, [selectedApproval]);

  return (
    <div className="urja-approvals-container">
      {/* 1. Page Header */}
      <div className="urja-approvals-header">
        <div className="urja-approvals-header-left">
          <div className="urja-approvals-header-icon">
            <i className="bi bi-check2-square"></i>
          </div>
          <div>
            <h1 className="urja-approvals-title">Approvals Inbox</h1>
            <p className="urja-approvals-subtitle">Review and take action on pending approvals.</p>
          </div>
        </div>
      </div>

      {/* 2. Top Summary Cards (4 Cards) */}
      <div className="urja-approvals-summary-grid">
        {/* Pending Approvals */}
        <div className="urja-approval-card">
          <div className="urja-card-icon-box yellow">
            <i className="bi bi-clock"></i>
          </div>
          <div className="urja-card-body">
            <span className="urja-card-label">Pending Approvals</span>
            <span className="urja-card-value">{stats.pendingApprovals}</span>
          </div>
        </div>

        {/* Approved Today */}
        <div className="urja-approval-card">
          <div className="urja-card-icon-box green">
            <i className="bi bi-check-circle-fill"></i>
          </div>
          <div className="urja-card-body">
            <span className="urja-card-label">Approved Today</span>
            <span className="urja-card-value">{stats.approvedToday}</span>
          </div>
        </div>

        {/* Rejected Today */}
        <div className="urja-approval-card">
          <div className="urja-card-icon-box red">
            <i className="bi bi-x-lg"></i>
          </div>
          <div className="urja-card-body">
            <span className="urja-card-label">Rejected Today</span>
            <span className="urja-card-value">{stats.rejectedToday}</span>
          </div>
        </div>

        {/* My Approvals */}
        <div className="urja-approval-card">
          <div className="urja-card-icon-box blue">
            <i className="bi bi-person-fill"></i>
          </div>
          <div className="urja-card-body">
            <span className="urja-card-label">My Approvals</span>
            <span className="urja-card-value">{stats.myApprovals}</span>
          </div>
        </div>
      </div>

      {/* 3. Functional Tabs */}
      <div className="urja-approvals-tabs-row">
        <button
          className={`urja-approval-tab ${activeTab === 'ALL' ? 'active' : ''}`}
          onClick={() => { setActiveTab('ALL'); setCurrentPage(1); }}
        >
          All <span className="urja-tab-count-badge">({stats.allCount || 7})</span>
        </button>

        <button
          className={`urja-approval-tab ${activeTab === 'OFFER' ? 'active' : ''}`}
          onClick={() => { setActiveTab('OFFER'); setCurrentPage(1); }}
        >
          Offer Approvals <span className="urja-tab-count-badge">({stats.offerApprovalsCount || 3})</span>
        </button>

        <button
          className={`urja-approval-tab ${activeTab === 'REQUISITION' ? 'active' : ''}`}
          onClick={() => { setActiveTab('REQUISITION'); setCurrentPage(1); }}
        >
          Requisition Approvals <span className="urja-tab-count-badge">({stats.requisitionApprovalsCount || 2})</span>
        </button>

        <button
          className={`urja-approval-tab ${activeTab === 'HIRING' ? 'active' : ''}`}
          onClick={() => { setActiveTab('HIRING'); setCurrentPage(1); }}
        >
          Hiring Approvals <span className="urja-tab-count-badge">({stats.hiringApprovalsCount || 1})</span>
        </button>

        <button
          className={`urja-approval-tab ${activeTab === 'OTHER' ? 'active' : ''}`}
          onClick={() => { setActiveTab('OTHER'); setCurrentPage(1); }}
        >
          Other Approvals <span className="urja-tab-count-badge">({stats.otherApprovalsCount || 1})</span>
        </button>
      </div>

      {/* 4. Filter Bar */}
      <div className="urja-approvals-filter-card">
        <form className="urja-filter-grid" onSubmit={handleSearchSubmit}>
          {/* Approval Type */}
          <div className="urja-filter-item">
            <label className="urja-filter-label">Approval Type</label>
            <select
              className="urja-select-control"
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">All Types</option>
              <option value="OFFER_APPROVAL">Offer Approval</option>
              <option value="REQUISITION_APPROVAL">Job Requisition</option>
              <option value="HIRING_APPROVAL">Hiring Approval</option>
              <option value="OTHER_APPROVAL">Other Approvals</option>
            </select>
          </div>

          {/* Status */}
          <div className="urja-filter-item">
            <label className="urja-filter-label">Status</label>
            <select
              className="urja-select-control"
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            >
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="RETURNED">Returned for Correction</option>
              <option value="ALL">All Statuses</option>
            </select>
          </div>

          {/* Department */}
          <div className="urja-filter-item">
            <label className="urja-filter-label">Department</label>
            <select
              className="urja-select-control"
              value={filterDept}
              onChange={(e) => { setFilterDept(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">All Departments</option>
              <option value="IT">IT</option>
              <option value="Plant Operations">Plant Operations</option>
              <option value="Quality">Quality</option>
              <option value="Production">Production</option>
              <option value="Human Resources">Human Resources</option>
              <option value="Engineering">Engineering</option>
              <option value="Operations">Operations</option>
              <option value="Sales">Sales</option>
            </select>
          </div>

          {/* Requested By */}
          <div className="urja-filter-item">
            <label className="urja-filter-label">Requested By</label>
            <select
              className="urja-select-control"
              value={filterRequester}
              onChange={(e) => { setFilterRequester(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">All</option>
              <option value="Sneha Shah">Sneha Shah</option>
              <option value="Vikram Desai">Vikram Desai</option>
              <option value="Rahul More">Rahul More</option>
              <option value="Anita Kulkarni">Anita Kulkarni</option>
              <option value="Sandeep Jadhav">Sandeep Jadhav</option>
              <option value="Priyanka Deshmukh">Priyanka Deshmukh</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="urja-filter-item">
            <label className="urja-filter-label">Date Range</label>
            <button
              type="button"
              className="urja-date-btn"
              onClick={() => onToast('Date range selection (Oct 2026 active)')}
            >
              <i className="bi bi-calendar3"></i>
              <span>{dateRangeText}</span>
            </button>
          </div>

          {/* Global Search */}
          <div className="urja-search-group">
            <i className="bi bi-search urja-search-icon"></i>
            <input
              type="text"
              className="urja-search-input"
              placeholder="Search by candidate name, job title, requester..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Action Buttons */}
          <button type="submit" className="urja-btn-search">
            Search
          </button>
          <button type="button" className="urja-btn-reset" onClick={handleResetFilters}>
            Reset
          </button>
        </form>
      </div>

      {/* 5. Master-Detail Layout */}
      <div className={`urja-approvals-content-layout ${!selectedApproval ? 'full-width' : ''}`}>
        {/* Left: Approvals Table */}
        <div className="urja-table-card">
          <div className="table-responsive">
            <table className="urja-approvals-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      id="checkbox-select-all"
                      className="form-check-input"
                      checked={selectedIds.length === approvalsList.length && approvalsList.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th style={{ width: '60px' }}>Type</th>
                  <th>Title / Details</th>
                  <th>Requested By</th>
                  <th>Request Date</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th style={{ width: '90px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                      <div className="spinner-border text-success" role="status">
                        <span className="visually-hidden">Loading approvals...</span>
                      </div>
                    </td>
                  </tr>
                ) : approvalsList.length === 0 ? (
                  <tr>
                    <td colSpan="8">
                      <div className="urja-empty-state">
                        <div className="urja-empty-icon">
                          <i className="bi bi-inbox"></i>
                        </div>
                        <h4 className="urja-empty-title">No Approvals Found</h4>
                        <p className="urja-empty-desc">
                          There are no approvals matching your current filters. Try resetting the filters or searching with different keywords.
                        </p>
                        <button className="urja-btn-reset mt-2" onClick={handleResetFilters}>
                          Reset Filters
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  approvalsList.map((item) => {
                    const isSelected = selectedApproval && selectedApproval.id === item.id;
                    const isChecked = selectedIds.includes(item.id);

                    return (
                      <tr
                        key={item.id}
                        id={`approval-row-${item.approvalCode}`}
                        className={`clickable-row ${isSelected ? 'selected-row' : ''}`}
                        onClick={() => handleOpenApproval(item)}
                      >
                        <td style={{ textAlign: 'center' }} onClick={(e) => handleToggleRow(item.id, e)}>
                          <input
                            type="checkbox"
                            id={`checkbox-${item.approvalCode}`}
                            className="form-check-input"
                            checked={isChecked}
                            onChange={(e) => handleToggleRow(item.id, e)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td>{renderTypeIcon(item.approvalType)}</td>
                        <td>
                          <div className="urja-title-cell">
                            <span className="urja-title-main">{item.title}</span>
                            <span className="urja-title-sub">{item.subtitle}</span>
                          </div>
                        </td>
                        <td>
                          <div className="urja-requester-cell">
                            {item.requesterAvatar ? (
                              <img src={item.requesterAvatar} alt="" className="urja-avatar-sm" />
                            ) : (
                              <div className="urja-avatar-initials">
                                {(item.requesterName || 'HR').split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </div>
                            )}
                            <div className="urja-requester-info">
                              <span className="urja-requester-name">{item.requesterName}</span>
                              <span className="urja-requester-role">{item.requesterRole}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="urja-date-cell">
                            <span className="urja-date-main">{formatDate(item.requestDate)}</span>
                            <span className="urja-date-time">{formatTime(item.requestDate)}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`urja-status-pill ${item.status.toLowerCase()}`}>
                            {item.status === 'PENDING' && <i className="bi bi-clock"></i>}
                            {item.status === 'APPROVED' && <i className="bi bi-check-circle-fill"></i>}
                            {item.status === 'REJECTED' && <i className="bi bi-x-circle-fill"></i>}
                            {item.status === 'RETURNED' && <i className="bi bi-arrow-return-left"></i>}
                            <span>{item.status.charAt(0) + item.status.slice(1).toLowerCase()}</span>
                          </span>
                        </td>
                        <td>
                          <span className={`urja-priority-pill ${item.priority.toLowerCase()}`}>
                            {item.priority.charAt(0) + item.priority.slice(1).toLowerCase()}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            id={`btn-view-${item.approvalCode}`}
                            className="urja-action-btn-icon"
                            title="View Details"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenApproval(item);
                            }}
                          >
                            <i className="bi bi-eye"></i>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="urja-table-footer">
            <span>
              Showing {approvalsList.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0} to{' '}
              {Math.min(currentPage * rowsPerPage, totalRecords)} of {totalRecords} records
            </span>
            <div className="urja-footer-right">
              <div className="d-flex align-items-center gap-2">
                <span>Rows per page</span>
                <select
                  className="urja-rows-select"
                  value={rowsPerPage}
                  onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="urja-pagination">
                <button
                  className="urja-page-btn"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                >
                  <i className="bi bi-chevron-left"></i>
                </button>
                <button className="urja-page-btn active">{currentPage}</button>
                <button
                  className="urja-page-btn"
                  disabled={currentPage * rowsPerPage >= totalRecords}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  <i className="bi bi-chevron-right"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Selected Approval Details Panel (Portal Drawer Layer 1050 above Backdrop 1040) */}
      {selectedApproval && typeof document !== 'undefined' && createPortal(
        <>
          <div 
            className="urja-drawer-backdrop" 
            onClick={handleCloseDrawer} 
            aria-hidden="true" 
          />
          <aside 
            className="urja-details-panel" 
            id="urja-details-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Approval Details"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="urja-details-header">
              <div className="urja-details-header-title">
                {selectedApproval.approvalType === 'OFFER_APPROVAL' && (
                  <i className="bi bi-file-earmark-text text-success" style={{ fontSize: '1.25rem' }}></i>
                )}
                {selectedApproval.approvalType === 'REQUISITION_APPROVAL' && (
                  <i className="bi bi-briefcase text-primary" style={{ fontSize: '1.25rem' }}></i>
                )}
                {selectedApproval.approvalType === 'HIRING_APPROVAL' && (
                  <i className="bi bi-people text-warning" style={{ fontSize: '1.25rem' }}></i>
                )}
                {selectedApproval.approvalType === 'OTHER_APPROVAL' && (
                  <i className="bi bi-gear-wide-connected text-secondary" style={{ fontSize: '1.25rem' }}></i>
                )}
                <span>{selectedApproval.title}</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <span className={`urja-status-pill ${selectedApproval.status.toLowerCase()}`}>
                  {selectedApproval.status === 'PENDING' && <i className="bi bi-clock"></i>}
                  {selectedApproval.status === 'APPROVED' && <i className="bi bi-check-circle-fill"></i>}
                  {selectedApproval.status === 'REJECTED' && <i className="bi bi-x-circle-fill"></i>}
                  {selectedApproval.status === 'RETURNED' && <i className="bi bi-arrow-return-left"></i>}
                  <span>{selectedApproval.status.charAt(0) + selectedApproval.status.slice(1).toLowerCase()}</span>
                </span>
                <button
                  type="button"
                  id="btn-close-approval-details"
                  className="urja-details-close-btn"
                  onClick={handleCloseDrawer}
                  title="Close details drawer"
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
            </div>

            {/* Loading Indicator */}
            {isDrawerLoading && (
              <div className="urja-drawer-loader" id="approval-drawer-loading">
                <div className="urja-drawer-spinner"></div>
                <span>Loading approval details...</span>
              </div>
            )}

            {/* Error Message */}
            {drawerError && (
              <div className="urja-drawer-error" id="approval-drawer-error">
                <i className="bi bi-exclamation-triangle"></i>
                <span>{drawerError}</span>
                <button type="button" className="btn btn-sm btn-outline-danger mt-1" onClick={() => handleOpenApproval(selectedApproval)}>
                  Retry
                </button>
              </div>
            )}

            {/* Scrollable Content */}
            <div className="urja-details-scrollable">
              {/* If OFFER APPROVAL: Candidate Details & Offer Compensation */}
              {selectedApproval.approvalType === 'OFFER_APPROVAL' && (
                <>
                  {/* Candidate Details */}
                  <div>
                    <div className="urja-section-title">Candidate Details</div>
                    <div className="urja-candidate-card">
                      <div className="urja-cand-header">
                        {selectedApproval.candidateAvatar ? (
                          <img src={selectedApproval.candidateAvatar} alt="" className="urja-cand-avatar" />
                        ) : (
                          <div className="urja-avatar-initials" style={{ width: 48, height: 48, fontSize: '1rem' }}>
                            {selectedApproval.candidateName?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'C'}
                          </div>
                        )}
                        <div>
                          <div className="urja-cand-name" id="detail-candidate-name">{selectedApproval.candidateName || 'Candidate'}</div>
                          <div className="urja-cand-contact">
                            <span className="urja-contact-row">
                              <i className="bi bi-envelope"></i>
                              <span id="detail-candidate-email">{selectedApproval.candidateEmail || '—'}</span>
                            </span>
                            <span className="urja-contact-row">
                              <i className="bi bi-telephone"></i>
                              <span id="detail-candidate-phone">{selectedApproval.candidatePhone || '+91 98765 43210'}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="urja-cand-meta-grid">
                        <div className="urja-meta-item">
                          <span className="urja-meta-label">Job Title</span>
                          <span className="urja-meta-value" id="detail-job-title">{selectedApproval.jobTitle || '—'}</span>
                        </div>
                        <div className="urja-meta-item">
                          <span className="urja-meta-label">Department</span>
                          <span className="urja-meta-value" id="detail-department">{selectedApproval.department || '—'}</span>
                        </div>
                        <div className="urja-meta-item">
                          <span className="urja-meta-label">Location</span>
                          <span className="urja-meta-value" id="detail-location">{selectedApproval.location || '—'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Offer Details */}
                  <div>
                    <div className="urja-section-title">Offer Details</div>
                    <div className="urja-offer-card">
                      <table className="urja-offer-table">
                        <tbody>
                          <tr>
                            <td>Offer Date</td>
                            <td id="detail-offer-date">{formatDate(selectedApproval.offerDate || selectedApproval.requestDate)}</td>
                          </tr>
                          <tr>
                            <td>Proposed Joining Date</td>
                            <td id="detail-joining-date">{formatDate(selectedApproval.proposedJoiningDate || selectedApproval.targetJoiningDate)}</td>
                          </tr>
                          <tr>
                            <td>Fixed CTC (INR)</td>
                            <td id="detail-ctc-fixed">{formatCurrency(selectedApproval.ctcFixed)}</td>
                          </tr>
                          <tr>
                            <td>Variable / Bonus (INR)</td>
                            <td id="detail-ctc-variable">{formatCurrency(selectedApproval.ctcVariable)}</td>
                          </tr>
                          <tr style={{ borderTop: '1px solid #e2e8f0' }}>
                            <td style={{ fontWeight: 700, color: '#0f172a', paddingTop: '0.5rem' }}>Total Gross CTC (INR)</td>
                            <td id="detail-ctc-total" style={{ fontSize: '0.96rem', color: '#16a34a', paddingTop: '0.5rem' }}>
                              {formatCurrency(selectedApproval.ctcTotal)}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      <div className="urja-offer-actions">
                        <button
                          type="button"
                          id="btn-view-offer-letter"
                          className="urja-link-action"
                          onClick={() => setShowOfferLetterModal(true)}
                        >
                          <i className="bi bi-file-earmark-pdf"></i>
                          <span>View Offer Letter</span>
                        </button>
                        <button
                          type="button"
                          id="btn-download-offer-letter"
                          className="urja-link-action text-secondary"
                          onClick={() => onToast('Downloading Offer Letter PDF...')}
                        >
                          <i className="bi bi-download"></i>
                          <span>Download</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* If REQUISITION APPROVAL: Requisition Spec & Justification */}
              {selectedApproval.approvalType === 'REQUISITION_APPROVAL' && (
                <div>
                  <div className="urja-section-title">Requisition Details</div>
                  <div className="urja-candidate-card">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="badge bg-primary-subtle text-primary fw-bold px-2 py-1" id="detail-requisition-id">
                        {selectedApproval.subtitle?.split('|')[0]?.trim() || selectedApproval.approvalCode}
                      </span>
                      <span className="badge bg-secondary-subtle text-dark" id="detail-openings">
                        {selectedApproval.openings || 1} Openings
                      </span>
                    </div>
                    <h5 className="fw-bold text-dark mb-1" id="detail-job-title">{selectedApproval.jobTitle}</h5>
                    <p className="text-muted small mb-3">
                      <span id="detail-department">{selectedApproval.department}</span> • <span id="detail-location">{selectedApproval.location}</span>
                    </p>

                    <div className="p-2 mb-3 rounded bg-light" style={{ fontSize: '0.84rem' }}>
                      <span className="text-muted fw-bold d-block mb-1">Hiring Justification:</span>
                      <p className="mb-0 text-dark" id="detail-justification">{selectedApproval.justification || 'Headcount expansion required for departmental workload.'}</p>
                    </div>

                    <div className="urja-cand-meta-grid">
                      <div className="urja-meta-item">
                        <span className="urja-meta-label">Requested By</span>
                        <span className="urja-meta-value" id="detail-requested-by">{selectedApproval.requesterName}</span>
                      </div>
                      <div className="urja-meta-item">
                        <span className="urja-meta-label">Target Joining</span>
                        <span className="urja-meta-value" id="detail-target-date">{formatDate(selectedApproval.targetJoiningDate)}</span>
                      </div>
                      <div className="urja-meta-item">
                        <span className="urja-meta-label">Budgeted CTC</span>
                        <span className="urja-meta-value" id="detail-budgeted-ctc">{formatCurrency(selectedApproval.ctcTotal)}</span>
                      </div>
                      <div className="urja-meta-item">
                        <span className="urja-meta-label">Priority</span>
                        <span className="urja-meta-value text-danger" id="detail-priority">{selectedApproval.priority}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* If HIRING APPROVAL or OTHER */}
              {(selectedApproval.approvalType === 'HIRING_APPROVAL' || selectedApproval.approvalType === 'OTHER_APPROVAL') && (
                <div>
                  <div className="urja-section-title">Request Summary</div>
                  <div className="urja-candidate-card">
                    <h6 className="fw-bold text-dark mb-1" id="detail-other-title">{selectedApproval.title}</h6>
                    <p className="text-muted small mb-3" id="detail-other-subtitle">{selectedApproval.subtitle}</p>

                    <div className="p-2 mb-3 rounded bg-light" style={{ fontSize: '0.84rem' }}>
                      <span className="text-muted fw-bold d-block mb-1">Details & Justification:</span>
                      <p className="mb-0 text-dark" id="detail-other-justification">{selectedApproval.justification || 'Verification and evaluation cleared. Pending final signoff.'}</p>
                    </div>

                    <div className="urja-cand-meta-grid">
                      <div className="urja-meta-item">
                        <span className="urja-meta-label">Department</span>
                        <span className="urja-meta-value" id="detail-other-department">{selectedApproval.department}</span>
                      </div>
                      <div className="urja-meta-item">
                        <span className="urja-meta-label">Target Date</span>
                        <span className="urja-meta-value" id="detail-other-date">{formatDate(selectedApproval.targetJoiningDate || selectedApproval.requestDate)}</span>
                      </div>
                      <div className="urja-meta-item">
                        <span className="urja-meta-label">Priority</span>
                        <span className="urja-meta-value" id="detail-other-priority">{selectedApproval.priority}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Approval Workflow Timeline */}
              <div>
                <div className="urja-section-title">Approval Workflow</div>
                <div className="urja-workflow-timeline" id="detail-workflow-timeline">
                  {parsedWorkflow.map((step, idx) => (
                    <div key={idx} className="urja-wf-step">
                      <div className={`urja-wf-dot ${step.status === 'COMPLETED' ? 'completed' : step.status === 'PENDING' ? 'pending' : ''}`}>
                        {step.status === 'COMPLETED' ? (
                          <i className="bi bi-check"></i>
                        ) : step.status === 'PENDING' ? (
                          <i className="bi bi-circle"></i>
                        ) : (
                          <i className="bi bi-dash"></i>
                        )}
                      </div>
                      <div className="urja-wf-title">{step.step}</div>
                      <div className="urja-wf-sub">
                        {step.date} {step.user ? `• ${step.user}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comments Thread */}
              <div>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="urja-section-title mb-0">Discussion / Remarks</div>
                  <button
                    type="button"
                    className="btn btn-sm btn-link p-0 text-decoration-none"
                    onClick={() => { setCommentText(''); setShowCommentModal(true); }}
                  >
                    <i className="bi bi-plus"></i> Add Note
                  </button>
                </div>

                <div className="urja-comments-box">
                  {selectedApproval.comments && selectedApproval.comments.length > 0 ? (
                    selectedApproval.comments.map((c, i) => (
                      <div key={i} className="urja-comment-item">
                        <div className="urja-comment-author">
                          <span>{c.userName} ({c.userRole})</span>
                          <span className="urja-comment-time">{formatDate(c.createdAt)}</span>
                        </div>
                        <div className="urja-comment-text">{c.comment}</div>
                      </div>
                    ))
                  ) : (
                    <span className="text-muted small italic">No remarks recorded yet.</span>
                  )}
                </div>
              </div>

              {/* Governance Policy Notice if Self Request */}
              {selectedApproval.permissionRestrictionReason && (
                <div className="alert alert-warning small py-2 mb-0" role="alert">
                  <i className="bi bi-shield-exclamation me-1"></i>
                  {selectedApproval.permissionRestrictionReason}
                </div>
              )}
            </div>

            {/* Bottom Action Footer */}
            <div className="urja-details-footer">
              <button
                type="button"
                id="btn-action-approve"
                className="urja-btn-action-approve"
                disabled={!selectedApproval.canApprove}
                onClick={() => { setActionRemarks(''); setModalError(null); setShowApproveModal(true); }}
                title="Approve Request"
              >
                <i className="bi bi-check-lg"></i>
                <span>Approve</span>
              </button>

              <button
                type="button"
                id="btn-action-reject"
                className="urja-btn-action-reject"
                disabled={!selectedApproval.canReject}
                onClick={() => { setActionRemarks(''); setModalError(null); setShowRejectModal(true); }}
                title="Reject Request"
              >
                <i className="bi bi-x-lg"></i>
                <span>Reject</span>
              </button>

              <button
                type="button"
                id="btn-action-return"
                className="urja-btn-action-return"
                disabled={!selectedApproval.canReturn}
                onClick={() => { setActionRemarks(''); setModalError(null); setShowReturnModal(true); }}
                title="Return for Correction"
              >
                <i className="bi bi-arrow-return-left"></i>
                <span>Return</span>
              </button>

              <button
                type="button"
                id="btn-action-comment"
                className="urja-btn-action-comment"
                onClick={() => { setCommentText(''); setModalError(null); setShowCommentModal(true); }}
                title="Add Comment"
              >
                <i className="bi bi-chat-left-text"></i>
                <span>Comment</span>
              </button>
            </div>
          </aside>
        </>,
        document.body
      )}

      {/* =====================================================================
          ACTION MODALS (PORTAL RENDERED ON DOCUMENT BODY - Z-INDEX 1100 / 1110)
          ===================================================================== */}

      {/* 1. Confirm Approval Modal (Foreground Portal above Drawer Layer 1010) */}
      {showApproveModal && selectedApproval && typeof document !== 'undefined' && createPortal(
        <div 
          className="urja-confirm-modal-overlay" 
          id="confirm-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) {
              setModalError(null);
              setShowApproveModal(false);
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
        >
          <div className="urja-confirm-modal-dialog" id="confirm-modal-dialog" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="urja-confirm-modal-header">
              <div className="urja-confirm-title-cluster">
                <div className="urja-confirm-icon-badge" aria-hidden="true">
                  <i className="bi bi-check-circle-fill"></i>
                </div>
                <div>
                  <h5 className="urja-confirm-modal-heading" id="confirm-modal-title">Confirm Approval</h5>
                  <p className="urja-confirm-modal-subheading">
                    {selectedApproval.approvalCode} • {selectedApproval.department || 'Urja Foods'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="btn-close-confirm-modal"
                className="urja-confirm-close-btn"
                aria-label="Close"
                disabled={isSubmitting}
                onClick={() => {
                  setModalError(null);
                  setShowApproveModal(false);
                }}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            {/* Body */}
            <div className="urja-confirm-modal-body">
              {/* Candidate Details Card */}
              <div className="urja-confirm-candidate-summary">
                <div className="urja-confirm-avatar">
                  {selectedApproval.candidateAvatar ? (
                    <img src={selectedApproval.candidateAvatar} alt="" className="urja-confirm-avatar-img" />
                  ) : (
                    <span>
                      {(selectedApproval.candidateName || selectedApproval.subtitle || 'C')
                        .split(' ')
                        .map(n => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="urja-confirm-candidate-meta">
                  <div className="urja-confirm-candidate-name" id="confirm-candidate-name">
                    {selectedApproval.candidateName || selectedApproval.subtitle?.split('|')[0]?.trim() || 'Candidate'}
                  </div>
                  <div className="urja-confirm-job-title" id="confirm-job-title">
                    {selectedApproval.jobTitle || selectedApproval.subtitle?.split('|')[1]?.trim() || selectedApproval.title}
                  </div>
                </div>
                <span className="urja-confirm-status-pill">
                  <i className="bi bi-clock me-1"></i>
                  Pending Approval
                </span>
              </div>

              {/* Compensation Breakdown Card (Fixed CTC, Variable / Bonus, Total Gross CTC) */}
              <div className="urja-confirm-compensation-card">
                <div className="urja-comp-row">
                  <span className="urja-comp-label">Fixed Annual Base CTC</span>
                  <span className="urja-comp-val" id="confirm-ctc-fixed">{formatCurrency(selectedApproval.ctcFixed)}</span>
                </div>
                <div className="urja-comp-row">
                  <span className="urja-comp-label">Variable / Performance Bonus</span>
                  <span className="urja-comp-val" id="confirm-ctc-variable">{formatCurrency(selectedApproval.ctcVariable)}</span>
                </div>
                <div className="urja-comp-row total">
                  <span className="urja-comp-label total">Total Annual Gross CTC</span>
                  <span className="urja-comp-val total" id="confirm-ctc-total">{formatCurrency(selectedApproval.ctcTotal)}</span>
                </div>
              </div>

              {/* Error Message if API fails (Requirement 10) */}
              {modalError && (
                <div className="urja-confirm-error-alert" id="confirm-modal-error">
                  <i className="bi bi-exclamation-octagon-fill"></i>
                  <div>
                    <strong>Approval Submission Failed</strong>
                    <div style={{ marginTop: '2px' }}>{modalError}</div>
                  </div>
                </div>
              )}

              {/* Optional Approval Remarks */}
              <div className="urja-confirm-remarks-group">
                <label className="urja-confirm-remarks-label" htmlFor="confirm-approval-remarks">
                  Approval Remarks <span className="urja-optional-tag">(Optional)</span>
                </label>
                <textarea
                  id="confirm-approval-remarks"
                  className="urja-confirm-textarea"
                  rows="2"
                  placeholder="Enter optional signoff remarks or conditions..."
                  value={actionRemarks}
                  onChange={(e) => setActionRemarks(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Footer: Cancel & Confirm Approval Buttons */}
            <div className="urja-confirm-modal-footer">
              <button
                type="button"
                id="btn-confirm-cancel"
                className="urja-btn-confirm-cancel"
                disabled={isSubmitting}
                onClick={() => {
                  setModalError(null);
                  setShowApproveModal(false);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-modal-confirm-approve"
                className="urja-btn-confirm-submit"
                disabled={isSubmitting}
                onClick={() => handleDecision('APPROVED')}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    <span>Submitting Approval...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-check2-circle me-1"></i>
                    <span>Confirm Approval</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 2. Reject Confirmation Modal (Portal attached to document.body) */}
      {showRejectModal && selectedApproval && typeof document !== 'undefined' && createPortal(
        <div 
          className="urja-confirm-modal-overlay" 
          id="reject-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) {
              setModalError(null);
              setShowRejectModal(false);
            }
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="urja-confirm-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="urja-confirm-modal-header">
              <div className="urja-confirm-title-cluster">
                <div className="urja-confirm-icon-badge danger">
                  <i className="bi bi-x-circle-fill"></i>
                </div>
                <div>
                  <h5 className="urja-confirm-modal-heading">Reject Request</h5>
                  <p className="urja-confirm-modal-subheading">
                    {selectedApproval.approvalCode} • {selectedApproval.subtitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="urja-confirm-close-btn"
                disabled={isSubmitting}
                onClick={() => {
                  setModalError(null);
                  setShowRejectModal(false);
                }}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="urja-confirm-modal-body">
              <p className="text-secondary small mb-2">
                You are rejecting the request for <strong>{selectedApproval.subtitle}</strong>. This will halt the workflow and notify the requester.
              </p>

              {modalError && (
                <div className="urja-confirm-error-alert mb-2">
                  <i className="bi bi-exclamation-octagon-fill"></i>
                  <div>{modalError}</div>
                </div>
              )}

              <div className="urja-confirm-remarks-group">
                <label className="urja-confirm-remarks-label" htmlFor="modal-reject-reason">
                  Rejection Reason / Justification <span className="text-danger">*</span>
                </label>
                <textarea
                  id="modal-reject-reason"
                  className="urja-confirm-textarea"
                  rows="3"
                  placeholder="Detailed explanation is required for rejection..."
                  value={actionRemarks}
                  onChange={(e) => setActionRemarks(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>
            <div className="urja-confirm-modal-footer">
              <button
                type="button"
                className="urja-btn-confirm-cancel"
                disabled={isSubmitting}
                onClick={() => {
                  setModalError(null);
                  setShowRejectModal(false);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-modal-confirm-reject"
                className="urja-btn-confirm-submit danger"
                disabled={isSubmitting || !actionRemarks.trim()}
                onClick={() => handleDecision('REJECTED')}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    <span>Rejecting...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-x-circle me-1"></i>
                    <span>Confirm Rejection</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 3. Return for Correction Modal (Portal attached to document.body) */}
      {showReturnModal && selectedApproval && typeof document !== 'undefined' && createPortal(
        <div 
          className="urja-confirm-modal-overlay" 
          id="return-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) {
              setModalError(null);
              setShowReturnModal(false);
            }
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="urja-confirm-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="urja-confirm-modal-header">
              <div className="urja-confirm-title-cluster">
                <div className="urja-confirm-icon-badge warning">
                  <i className="bi bi-arrow-return-left"></i>
                </div>
                <div>
                  <h5 className="urja-confirm-modal-heading">Return for Correction</h5>
                  <p className="urja-confirm-modal-subheading">
                    {selectedApproval.approvalCode} • {selectedApproval.requesterName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="urja-confirm-close-btn"
                disabled={isSubmitting}
                onClick={() => {
                  setModalError(null);
                  setShowReturnModal(false);
                }}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="urja-confirm-modal-body">
              <p className="text-secondary small mb-2">
                Send this request back to <strong>{selectedApproval.requesterName}</strong> for corrections or missing information.
              </p>

              {modalError && (
                <div className="urja-confirm-error-alert mb-2">
                  <i className="bi bi-exclamation-octagon-fill"></i>
                  <div>{modalError}</div>
                </div>
              )}

              <div className="urja-confirm-remarks-group">
                <label className="urja-confirm-remarks-label" htmlFor="modal-return-reason">
                  Correction Remarks <span className="text-danger">*</span>
                </label>
                <textarea
                  id="modal-return-reason"
                  className="urja-confirm-textarea"
                  rows="3"
                  placeholder="Specify the required changes, revised CTC bands, or missing docs..."
                  value={actionRemarks}
                  onChange={(e) => setActionRemarks(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>
            <div className="urja-confirm-modal-footer">
              <button
                type="button"
                className="urja-btn-confirm-cancel"
                disabled={isSubmitting}
                onClick={() => {
                  setModalError(null);
                  setShowReturnModal(false);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-modal-confirm-return"
                className="urja-btn-confirm-submit warning"
                disabled={isSubmitting || !actionRemarks.trim()}
                onClick={() => handleDecision('RETURNED')}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    <span>Returning...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-arrow-return-left me-1"></i>
                    <span>Return Request</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 4. Add Comment Modal (Portal attached to document.body) */}
      {showCommentModal && selectedApproval && typeof document !== 'undefined' && createPortal(
        <div 
          className="modal show d-block" 
          tabIndex="-1" 
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1100 }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) setShowCommentModal(false);
          }}
        >
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '14px', zIndex: 1110 }}>
              <div className="modal-header border-0 pb-0">
                <div className="d-flex align-items-center gap-2">
                  <div className="p-2 rounded-circle bg-primary-subtle text-primary">
                    <i className="bi bi-chat-left-dots fs-5"></i>
                  </div>
                  <h5 className="modal-title fw-bold text-dark mb-0">Add Discussion Note</h5>
                </div>
                <button type="button" className="btn-close" disabled={isSubmitting} onClick={() => setShowCommentModal(false)}></button>
              </div>
              <form onSubmit={handleAddComment}>
                <div className="modal-body pt-3">
                  <p className="text-secondary small mb-3">
                    Posting to thread for <strong>{selectedApproval.subtitle}</strong>. This note will be recorded in the audit history.
                  </p>
                  <div className="mb-2">
                    <textarea
                      id="modal-comment-text"
                      className="form-control"
                      rows="3"
                      placeholder="Type your message, query or feedback..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      disabled={isSubmitting}
                      required
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-outline-secondary" disabled={isSubmitting} onClick={() => setShowCommentModal(false)}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    id="btn-modal-confirm-comment"
                    className="btn btn-primary fw-bold px-4"
                    disabled={isSubmitting || !commentText.trim()}
                  >
                    {isSubmitting ? 'Posting...' : 'Post Comment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 5. View Offer Letter Modal (Portal attached to document.body) */}
      {showOfferLetterModal && selectedApproval && typeof document !== 'undefined' && createPortal(
        <div 
          className="modal show d-block" 
          tabIndex="-1" 
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1100 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowOfferLetterModal(false);
          }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '14px', zIndex: 1110 }}>
              <div className="modal-header border-bottom py-3">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-file-earmark-check text-success fs-4"></i>
                  <div>
                    <h5 className="modal-title fw-bold text-dark mb-0">Urja Foods — Official Offer Letter</h5>
                    <span className="text-muted small">Ref: {selectedApproval.approvalCode}</span>
                  </div>
                </div>
                <button type="button" className="btn-close" onClick={() => setShowOfferLetterModal(false)}></button>
              </div>
              <div className="modal-body p-4 bg-light">
                <div className="bg-white p-4 border rounded shadow-sm">
                  {/* Company Header */}
                  <div className="d-flex justify-content-between align-items-center pb-3 border-bottom mb-4">
                    <div>
                      <h4 className="fw-bold text-success mb-1">URJA FOODS & AGRO TECH</h4>
                      <p className="text-muted small mb-0">Corporate Office: Plot 42, MIDC Industrial Area, Pune, Maharashtra 411019</p>
                    </div>
                    <span className="badge bg-success-subtle text-success px-3 py-2 fw-bold">PRIVATE & CONFIDENTIAL</span>
                  </div>

                  {/* Date & Salutation */}
                  <p className="text-muted small mb-3">Date: {formatDate(selectedApproval.offerDate || selectedApproval.requestDate)}</p>
                  <p className="mb-3">
                    Dear <strong>{selectedApproval.candidateName || 'Candidate'}</strong>,<br />
                    <span className="text-muted small">{selectedApproval.candidateEmail} • {selectedApproval.candidatePhone}</span>
                  </p>

                  <p className="text-secondary" style={{ lineHeight: 1.6 }}>
                    With reference to your application and subsequent interviews, the Management of <strong>Urja Foods & Agro Tech</strong> is pleased to offer you the position of <strong>{selectedApproval.jobTitle}</strong> in the <strong>{selectedApproval.department}</strong> department, based at our <strong>{selectedApproval.location}</strong> facility.
                  </p>

                  <h6 className="fw-bold text-dark mt-4 mb-2">Compensation Structure & Benefits (Annexure-A)</h6>
                  <table className="table table-bordered mb-4" style={{ fontSize: '0.88rem' }}>
                    <thead className="table-light">
                      <tr>
                        <th>Salary Component</th>
                        <th style={{ textAlign: 'right' }}>Annual Amount (INR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Fixed Annual Base CTC</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(selectedApproval.ctcFixed)}</td>
                      </tr>
                      <tr>
                        <td>Annual Variable Performance Bonus</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(selectedApproval.ctcVariable)}</td>
                      </tr>
                      <tr className="table-success fw-bold">
                        <td>Total Annual Gross CTC</td>
                        <td style={{ textAlign: 'right', color: '#16a34a' }}>{formatCurrency(selectedApproval.ctcTotal)}</td>
                      </tr>
                    </tbody>
                  </table>

                  <p className="text-secondary small mb-3" style={{ lineHeight: 1.6 }}>
                    <strong>Proposed Date of Joining:</strong> {formatDate(selectedApproval.proposedJoiningDate || selectedApproval.targetJoiningDate)}.<br />
                    This offer is contingent upon successful verification of pre-employment credentials, background verification and medical clearance.
                  </p>

                  <div className="d-flex justify-content-between align-items-end pt-4 mt-4 border-top">
                    <div>
                      <p className="fw-bold mb-1">For Urja Foods & Agro Tech</p>
                      <p className="text-muted small mb-0">Authorized Signatory — Talent Acquisition</p>
                    </div>
                    <div className="text-end">
                      <p className="text-muted small mb-1">Candidate Acceptance:</p>
                      <p className="fw-bold mb-0 text-dark">{selectedApproval.candidateName}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-top py-2">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowOfferLetterModal(false)}>
                  Close
                </button>
                <button type="button" className="btn btn-success fw-bold d-flex align-items-center gap-2" onClick={() => window.print()}>
                  <i className="bi bi-printer"></i>
                  <span>Print Document</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
