import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import './styles/portal.css';
import './styles/urja-dashboard.css';
import LoginPage from './pages/LoginPage';
import IndianHeaderClock, { useIndianTime } from './components/IndianHeaderClock';
import MonthlyHiringTrendChart from './components/MonthlyHiringTrendChart';
import CandidateProfileResume from './components/CandidateProfileResume';
import CreateRequisitionWizard from './components/CreateRequisitionWizard';
import RequisitionDetailView from './components/RequisitionDetailView';
import JobRequisitionsView from './components/JobRequisitionsView';
import InterviewFeedbackModal from './components/InterviewFeedbackModal';
import CandidatesView from './components/CandidatesView';
import UserManagementView from './components/UserManagementView';
import AccessPoliciesView from './components/AccessPoliciesView';
import SystemAdministrationView from './components/SystemAdministrationView';
import InterviewsManagementView from './components/InterviewsManagementView';
import OffersOnboardingView from './components/OffersOnboardingView';
import ApprovalsInboxView from './components/ApprovalsInboxView';
import EmployeesManagementView from './components/EmployeesManagementView';
import TaskAssignmentView from './components/TaskAssignmentView';
import ReportsAnalyticsView from './components/ReportsAnalyticsView';
import './styles/urja-reports.css';
import './styles/urja-offers.css';
import './styles/urja-approvals.css';
import './styles/urja-employees.css';
import './styles/urja-tasks.css';

import {
  INITIAL_ROLES,
  INITIAL_USERS,
  INITIAL_DEPARTMENTS,
  INITIAL_LOCATIONS,
  INITIAL_REQUISITIONS,
  INITIAL_CANDIDATES,
  INITIAL_INTERVIEWS,
  INITIAL_OFFERS,
  INITIAL_EMPLOYEES,
  INITIAL_APPROVALS,
  INITIAL_TASKS,
  INITIAL_NOTIFICATIONS,
  INITIAL_BACKUPS,
  INITIAL_AUDIT_LOGS
} from './data/mockData';

// Role to Authorized Navigation Scope (Strict RBAC Route Protection)
const ROLE_PERMITTED_TABS = {
  'ROLE_IT_ADMIN': ['dashboard', 'requisitions', 'candidates', 'interviews', 'offers', 'employees', 'approvals', 'users', 'tasks', 'reports', 'talentPool', 'calendar', 'systemAdmin', 'settings'],
  'ROLE_HR_ADMIN': ['dashboard', 'requisitions', 'candidates', 'interviews', 'offers', 'employees', 'approvals', 'users', 'tasks', 'reports', 'talentPool', 'calendar', 'settings'],
  'ROLE_HRBP': ['dashboard', 'requisitions', 'candidates', 'interviews', 'offers', 'employees', 'approvals', 'users', 'tasks', 'reports', 'talentPool', 'calendar'],
  'ROLE_HR_RECRUITER': ['dashboard', 'requisitions', 'candidates', 'interviews', 'offers', 'approvals', 'tasks', 'reports', 'talentPool', 'calendar'],
  'ROLE_INTERVIEWER': ['dashboard', 'interviews', 'tasks', 'calendar'],
  'ROLE_DEPT_HEAD': ['dashboard', 'approvals', 'interviews', 'requisitions', 'employees'],
  'ROLE_APPROVING_MANAGER': ['dashboard', 'approvals', 'requisitions', 'employees'],
  'ROLE_SENIOR_MGMT': ['dashboard', 'approvals', 'reports', 'employees', 'requisitions']
};

// Role to Default Dashboard Resolver
const getRoleDefaultTab = (roleId) => {
  switch (roleId) {
    case 'ROLE_HR_RECRUITER':
      return 'requisitions';
    case 'ROLE_DEPT_HEAD':
    case 'ROLE_APPROVING_MANAGER':
    case 'ROLE_SENIOR_MGMT':
      return 'approvals';
    case 'ROLE_INTERVIEWER':
      return 'interviews';
    case 'ROLE_IT_ADMIN':
      return 'dashboard';
    case 'ROLE_HRBP':
    case 'ROLE_HR_ADMIN':
    default:
      return 'dashboard';
  }
};

export default function App() {
  // 1. Initial Authentication & Session Inspection
  // Every time the website is opened locally at root URL http://localhost:<port>/,
  // the first page displayed is ALWAYS the Login Page (Screen 1), then Dashboard after sign in.
  const getInitialAuthSession = () => {
    if (typeof window === 'undefined') return { user: null, isAuthenticated: false };

    // Clear legacy permanent localStorage login tokens so opening the website never bypasses Login
    try {
      localStorage.removeItem('ats_urja_user');
      localStorage.removeItem('ats_urja_token');
    } catch (e) {}

    const params = new URLSearchParams(window.location.search);
    const requestedTab = params.get('tab');

    // Explicit logout or login screen request via ?auth=false
    if (params.get('auth') === 'false') {
      try {
        sessionStorage.removeItem('ats_urja_user');
      } catch (e) {}
      return { user: null, isAuthenticated: false };
    }

    // Every time the website is opened at root URL (no tab query), ALWAYS display the Login Page first!
    if (!requestedTab) {
      try {
        sessionStorage.removeItem('ats_urja_user');
      } catch (e) {}
      return { user: null, isAuthenticated: false };
    }

    // Only if a specific tab was requested (e.g. page refresh during active session on ?tab=dashboard)
    try {
      const stored = sessionStorage.getItem('ats_urja_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && (parsed.role || parsed.email)) {
          return { user: parsed, isAuthenticated: true };
        }
      }
    } catch (e) {}

    // Direct access to protected tabs by unauthenticated users -> display Login Page
    return { user: null, isAuthenticated: false };
  };

  const initialSession = getInitialAuthSession();
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const initialRequestedTab = searchParams ? searchParams.get('tab') : null;

  // Authentication & Session State (Screen 1) - Defaults to FALSE for root URL landing
  const [isAuthenticated, setIsAuthenticated] = useState(initialSession.isAuthenticated);
  const [intendedRedirect, setIntendedRedirect] = useState(initialRequestedTab);

  // Active User & Persona State
  const [currentUser, setCurrentUser] = useState(() => {
    if (initialSession.user) {
      const match = INITIAL_USERS.find(u => 
        (initialSession.user.email && u.email.toLowerCase() === initialSession.user.email.toLowerCase()) || 
        u.role === initialSession.user.role
      );
      return match || { ...INITIAL_USERS[0], ...initialSession.user };
    }
    return INITIAL_USERS[0];
  });

  const [currentRoleId, setCurrentRoleId] = useState(() => {
    return initialSession.user?.role || INITIAL_USERS[0].role;
  });

  // Navigation State: if authenticated, use requested tab or role default tab; otherwise 'dashboard'
  const [activeTab, setActiveTab] = useState(() => {
    if (initialSession.isAuthenticated) {
      return initialRequestedTab || getRoleDefaultTab(initialSession.user?.role || INITIAL_USERS[0].role);
    }
    return 'dashboard';
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 992;
    }
    return false;
  });
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef(null);

  // Data Collections State
  const [requisitions, setRequisitions] = useState(INITIAL_REQUISITIONS);
  const [candidates, setCandidates] = useState(INITIAL_CANDIDATES);
  const [interviews, setInterviews] = useState(INITIAL_INTERVIEWS);
  const [offers, setOffers] = useState(INITIAL_OFFERS);
  const [employees, setEmployees] = useState(INITIAL_EMPLOYEES);
  const [approvals, setApprovals] = useState(INITIAL_APPROVALS);
  const [users, setUsers] = useState(INITIAL_USERS);
  const [auditLogs, setAuditLogs] = useState(INITIAL_AUDIT_LOGS);
  const [backups, setBackups] = useState(INITIAL_BACKUPS);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [unreadNotifCount, setUnreadNotifCount] = useState(() => {
    return INITIAL_NOTIFICATIONS.filter(n => n.unread !== false && n.readStatus !== 'READ' && !n.isRead).length;
  });
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(false);

  // Screen 3: Requisitions Filters & Pagination
  const [reqStatusFilter, setReqStatusFilter] = useState('ALL');
  const [filterDepartment, setFilterDepartment] = useState('ALL');
  const [filterLocation, setFilterLocation] = useState('ALL');
  const [filterStatusSelect, setFilterStatusSelect] = useState('ALL');
  const [selectedReqIds, setSelectedReqIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Screen 4: Create Requisition Wizard Modal
  const [showReqModal, setShowReqModal] = useState(false);

  // Screen 5: Requisition Details & Approval History View
  const [viewingReq, setViewingReq] = useState(null);

  // Screen 7: Candidate Profile & Resume Viewer
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  // Screen 9: Interview Feedback Modal
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackCandidate, setFeedbackCandidate] = useState(null);
  const [feedbackInterview, setFeedbackInterview] = useState(null);

  // Screen 10: Offers Filter
  const [offersFilter, setOffersFilter] = useState('OFFERS');

  // Screen 11: Talent Pool Filters
  const [talentSearch, setTalentSearch] = useState('');
  const [talentLocationFilter, setTalentLocationFilter] = useState('ALL');

  // Screen 12: Approvals Inbox Filter
  const [approvalsFilter, setApprovalsFilter] = useState('PENDING');

  // Screen 13: Employees Search & Add Modal
  const [empSearch, setEmpSearch] = useState('');
  const [showAddEmpModal, setShowAddEmpModal] = useState(false);
  const [newEmpForm, setNewEmpForm] = useState({ name: '', role: '', dept: 'Soya Division', location: 'Plant - Rahuri' });

  // Screen 14: Reports Subtab
  const [reportsSubTab, setReportsSubTab] = useState('trends');


  // Screen 17: Settings Subtab & Backup Runner
  const [settingsSubTab, setSettingsSubTab] = useState('audit');
  const [isBackingUp, setIsBackingUp] = useState(false);

  // Other Modals
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [dateRangeText, setDateRangeText] = useState('01 Oct 2026 - 31 Oct 2026');
  const [toastMessage, setToastMessage] = useState(null);

  // Real-time Live Indian Standard Time (IST, Asia/Kolkata) Hook
  const { date: liveDateString, time: liveTimeString, greeting: dynamicGreeting } = useIndianTime();

  // Extract authenticated user's first name for dynamic IST greeting
  const userFirstName = useMemo(() => {
    if (!currentUser) return '';
    const fullName = currentUser.name || currentUser.username || '';
    if (!fullName) return '';
    return fullName.trim().split(/\s+/)[0];
  }, [currentUser]);

  // Personalized Dashboard Data & Task Checklist State
  const [personalizedData, setPersonalizedData] = useState(null);
  const [taskCompletedState, setTaskCompletedState] = useState({});

  // Fetch authorized personalized dashboard statistics & activities from backend
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;
    const token = sessionStorage.getItem('ats_urja_token') || currentUser.token;
    if (!token) return;

    let isMounted = true;
    fetch('http://localhost:8080/api/v1/dashboard/personalized', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => {
      if (res.ok) return res.json();
      throw new Error(`Dashboard status: ${res.status}`);
    })
    .then(body => {
      if (isMounted && body && body.data) {
        setPersonalizedData(body.data);
      }
    })
    .catch(err => {
      console.warn('Personalized dashboard API issue, using authorized local fallback:', err);
    });

    return () => { isMounted = false; };
  }, [isAuthenticated, currentUser?.id, currentUser?.email, currentUser?.role]);

  // Live Audit Logs from Backend API
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;
    const token = sessionStorage.getItem('ats_urja_token') || currentUser.token;
    if (!token) return;

    fetch('http://localhost:8080/api/v1/admin/audit-logs', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : null)
      .then(body => {
        if (body && body.data && Array.isArray(body.data)) {
          const mapped = body.data.map(log => ({
            id: log.id,
            timestamp: log.timestamp ? new Date(log.timestamp).toLocaleString('en-IN') : 'Just now',
            actor: log.actorName || log.actorUsername || 'System',
            action: log.action,
            module: log.entityType || 'SYSTEM',
            details: log.details || '',
            status: 'Success'
          }));
          setAuditLogs(mapped);
        }
      })
      .catch(err => console.warn('Audit logs fetch issue:', err));
  }, [isAuthenticated, activeTab, settingsSubTab, currentUser]);

  // HRMS Notification System: Fetch alerts & unread counter from Backend MySQL API
  const fetchNotifications = useCallback(async () => {
    if (!currentUser) return;
    const token = sessionStorage.getItem('ats_urja_token') || currentUser.token;

    try {
      setIsLoadingNotifs(true);
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      // 1. Fetch unread count
      const countRes = await fetch('http://localhost:8080/api/v1/notifications/unread-count', { headers });
      if (countRes.ok) {
        const countData = await countRes.json();
        if (countData?.data?.unreadCount !== undefined) {
          setUnreadNotifCount(countData.data.unreadCount);
        }
      }

      // 2. Fetch notifications list
      const listRes = await fetch('http://localhost:8080/api/v1/notifications', { headers });
      if (listRes.ok) {
        const listData = await listRes.json();
        if (Array.isArray(listData?.data)) {
          setNotifications(listData.data);
          const unreadItems = listData.data.filter(n => n.readStatus === 'UNREAD' || (!n.isRead && n.unread !== false));
          setUnreadNotifCount(unreadItems.length);
        }
      }
    } catch (err) {
      console.warn('Could not fetch notifications from backend, using active fallback:', err);
    } finally {
      setIsLoadingNotifs(false);
    }
  }, [currentUser]);

  // Sync notifications whenever authenticated user / persona changes
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      fetchNotifications();
    }
  }, [isAuthenticated, currentUser?.id, currentUser?.email, currentUser?.role, fetchNotifications]);

  // Mark an individual notification as READ
  const handleMarkAsRead = async (notifId, e) => {
    if (e && e.stopPropagation) e.stopPropagation();

    const target = notifications.find(n => n.id === notifId);
    if (!target) return;

    // Check if already READ - do NOT decrease count again
    const isAlreadyRead = target.readStatus === 'READ' || target.isRead === true || target.unread === false;
    if (isAlreadyRead) return;

    // Immediate UI update without refreshing page
    setNotifications(prev => prev.map(n => {
      if (n.id === notifId) {
        return {
          ...n,
          isRead: true,
          readStatus: 'READ',
          unread: false
        };
      }
      return n;
    }));

    // Decrease notification bell unread count by exactly one
    setUnreadNotifCount(prev => Math.max(0, prev - 1));

    // Update read status in MySQL database via backend API
    const token = sessionStorage.getItem('ats_urja_token') || currentUser?.token;
    if (token) {
      try {
        const res = await fetch(`http://localhost:8080/api/v1/notifications/${notifId}/read`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (res.ok) {
          const body = await res.json();
          if (body?.data) {
            setNotifications(prev => prev.map(n => n.id === notifId ? {
              ...n,
              ...body.data,
              isRead: true,
              readStatus: 'READ',
              unread: false
            } : n));
          }
        }
      } catch (err) {
        console.warn('Failed to update notification read status on server:', err);
      }
    }
  };

  // Mark all unread notifications of the logged-in user as READ
  const handleMarkAllAsRead = async () => {
    const hasUnread = notifications.some(n => n.readStatus === 'UNREAD' || n.unread === true || (!n.isRead && n.readStatus !== 'READ'));
    if (!hasUnread && unreadNotifCount === 0) return;

    // Immediate UI update: all cards to gray and unread count to 0
    setNotifications(prev => prev.map(n => ({
      ...n,
      isRead: true,
      readStatus: 'READ',
      unread: false
    })));
    setUnreadNotifCount(0);

    // Update in MySQL database via backend API
    const token = sessionStorage.getItem('ats_urja_token') || currentUser?.token;
    if (token) {
      try {
        await fetch('http://localhost:8080/api/v1/notifications/read-all', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        showToast('All notifications marked as read');
      } catch (err) {
        console.warn('Failed to mark all notifications as read on backend:', err);
      }
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-collapse sidebar on smaller screens & listen for resize
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined' && window.innerWidth <= 992) {
        setSidebarCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Responsive tab navigation: switches tab and auto-closes drawer on mobile
  const handleNavTab = (tab) => {
    setActiveTab(tab);
    setViewingReq(null);
    setSelectedCandidate(null);
    if (typeof window !== 'undefined' && window.innerWidth <= 992) {
      setSidebarCollapsed(true);
    }
  };

  // Global Search Results Index
  const searchResults = useMemo(() => {
    if (!searchTerm || !searchTerm.trim()) {
      return { jobs: [], candidates: [], pages: [], totalCount: 0 };
    }
    const q = searchTerm.toLowerCase().trim();

    const jobs = requisitions.filter(r => 
      r.title.toLowerCase().includes(q) ||
      r.code.toLowerCase().includes(q) ||
      r.deptName.toLowerCase().includes(q) ||
      (r.location && r.location.toLowerCase().includes(q))
    ).slice(0, 4);

    const matchedCandidates = candidates.filter(c => 
      c.name.toLowerCase().includes(q) ||
      (c.dept && c.dept.toLowerCase().includes(q)) ||
      (c.reqCode && c.reqCode.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    ).slice(0, 4);

    const pages = [
      { name: 'Dashboard', tab: 'dashboard', icon: 'bi-grid-1x2' },
      { name: 'Job Requisitions', tab: 'requisitions', icon: 'bi-card-checklist' },
      { name: 'Candidates Management', tab: 'candidates', icon: 'bi-people' },
      { name: 'Interviews Scheduler', tab: 'interviews', icon: 'bi-calendar-plus' },
      { name: 'Offers & Onboarding', tab: 'offers', icon: 'bi-briefcase' },
      { name: 'Talent Pool', tab: 'talentPool', icon: 'bi-person-badge' },
      { name: 'Reports & Analytics', tab: 'reports', icon: 'bi-bar-chart-line' },
      { name: 'Approvals Inbox', tab: 'approvals', icon: 'bi-check2-square' },
      { name: 'Employee Directory', tab: 'employees', icon: 'bi-person-lines-fill' },
      { name: 'Calendar', tab: 'calendar', icon: 'bi-calendar4-week' },
      { name: 'User Management', tab: 'users', icon: 'bi-people-fill' },
      { name: 'Audit & Backup Settings', tab: 'settings', icon: 'bi-gear-wide-connected' }
    ].filter(p => p.name.toLowerCase().includes(q)).slice(0, 3);

    return {
      jobs,
      candidates: matchedCandidates,
      pages,
      totalCount: jobs.length + matchedCandidates.length + pages.length
    };
  }, [searchTerm, requisitions, candidates]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (!searchTerm.trim()) return;

    if (searchResults.jobs.length > 0) {
      setActiveTab('requisitions');
      setViewingReq(null);
      setIsSearchFocused(false);
      showToast(`Showing search results for "${searchTerm}" in Requisitions`);
    } else if (searchResults.candidates.length > 0) {
      setActiveTab('candidates');
      setSelectedCandidate(null);
      setIsSearchFocused(false);
      showToast(`Showing search results for "${searchTerm}" in Candidates`);
    } else {
      setActiveTab('requisitions');
      setIsSearchFocused(false);
    }
  };

  // Switch User Profile / Role
  const handleRoleChange = (roleId) => {
    setCurrentRoleId(roleId);
    const foundUser = users.find(u => u.role === roleId) || users[0];
    setCurrentUser(foundUser);
    const targetTab = getRoleDefaultTab(roleId);
    setActiveTab(targetTab);
    setShowProfileMenu(false);
    try {
      sessionStorage.setItem('ats_urja_user', JSON.stringify(foundUser));
    } catch (e) {}
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', `/?tab=${targetTab}`);
    }
    showToast(`Active view switched to: ${foundUser.name} (${foundUser.title})`);
  };

  // Switch Test Persona with Genuine Backend Token Generation & Cache Invalidation
  const handleSwitchAccount = async (targetUser) => {
    setShowProfileMenu(false);
    showToast(`Signing in as ${targetUser.name}...`);

    // Invalidate user-specific state & cache
    setPersonalizedData(null);
    setSelectedCandidate(null);
    setViewingReq(null);

    try {
      const res = await fetch('http://localhost:8080/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail: targetUser.email, password: 'password' })
      });

      if (res.ok) {
        const body = await res.json();
        const authData = body.data;
        const primaryRole = (authData.roles && authData.roles[0]) || authData.role || targetUser.role;
        const jwtToken = authData.accessToken || authData.token;
        const updatedUser = {
          ...targetUser,
          ...authData,
          role: primaryRole,
          roles: authData.roles || [primaryRole],
          token: jwtToken
        };

        sessionStorage.setItem('ats_urja_token', jwtToken);
        sessionStorage.setItem('ats_urja_user', JSON.stringify(updatedUser));
        setCurrentUser(updatedUser);
        setCurrentRoleId(primaryRole);
        const defaultTab = getRoleDefaultTab(primaryRole);
        setActiveTab(defaultTab);
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, '', `/?tab=${defaultTab}`);
        }
        showToast(`Signed in as: ${updatedUser.name} (${updatedUser.title || primaryRole})`);
        return;
      }
    } catch (err) {
      console.warn('Backend authentication switch issue:', err);
    }

    // Fallback if backend is momentarily unreachable
    const updatedUser = {
      ...targetUser,
      roles: [targetUser.role]
    };
    sessionStorage.setItem('ats_urja_user', JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);
    setCurrentRoleId(targetUser.role);
    const defaultTab = getRoleDefaultTab(targetUser.role);
    setActiveTab(defaultTab);
    showToast(`Active persona switched: ${updatedUser.name}`);
  };

  // Screen 3: Requisitions Filtered List
  const filteredRequisitions = useMemo(() => {
    return requisitions.filter(req => {
      // Status Tab filter
      if (reqStatusFilter === 'OPEN' && req.status !== 'Open') return false;
      if (reqStatusFilter === 'IN_APPROVAL' && req.status !== 'In Approval') return false;
      if (reqStatusFilter === 'FILLED' && req.status !== 'Filled') return false;
      if (reqStatusFilter === 'ON_HOLD' && req.status !== 'On Hold') return false;
      if (reqStatusFilter === 'CLOSED' && req.approvalStage !== 'Closed' && req.status !== 'Filled') return false;

      // Dropdown filters
      if (filterDepartment !== 'ALL' && req.deptName !== filterDepartment) return false;
      if (filterLocation !== 'ALL' && req.location !== filterLocation) return false;
      if (filterStatusSelect !== 'ALL' && req.status !== filterStatusSelect) return false;

      // Search term filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchTitle = req.title.toLowerCase().includes(term);
        const matchCode = req.code.toLowerCase().includes(term);
        const matchDept = req.deptName.toLowerCase().includes(term);
        const matchLoc = req.location && req.location.toLowerCase().includes(term);
        if (!matchTitle && !matchCode && !matchDept && !matchLoc) return false;
      }

      return true;
    });
  }, [requisitions, reqStatusFilter, filterDepartment, filterLocation, filterStatusSelect, searchTerm]);

  const paginatedRequisitions = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredRequisitions.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredRequisitions, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(filteredRequisitions.length / rowsPerPage) || 1;

  // Checkbox handlers for Requisitions
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedReqIds(paginatedRequisitions.map(r => r.id));
    } else {
      setSelectedReqIds([]);
    }
  };

  const handleToggleSelectOne = (id) => {
    setSelectedReqIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Screen 4: Create Requisition Submit Handler
  const handleCreateRequisitionSubmit = (newReqData) => {
    const newCode = `URJ-R-2026-0${requisitions.length + 10}`;
    const newReq = {
      id: requisitions.length + 1,
      code: newCode,
      title: newReqData.title,
      deptName: newReqData.deptName,
      location: newReqData.location,
      openings: newReqData.openings,
      status: 'In Approval',
      approvalStage: 'Pending with DGM',
      createdOn: liveDateString,
      targetDate: newReqData.targetDate,
      hiringManager: currentUser.name,
      priority: newReqData.priority,
      experience: newReqData.experience,
      budgetMin: newReqData.budgetMin,
      budgetMax: newReqData.budgetMax,
      description: newReqData.description
    };

    setRequisitions([newReq, ...requisitions]);
    
    // Also push to Approvals Queue (Screen 12)
    const newApprovalItem = {
      id: approvals.length + 1,
      reqCode: newCode,
      title: newReqData.title,
      requestedBy: currentUser.name,
      requestedOn: '21 Oct 2026',
      priority: newReqData.priority,
      status: 'Pending',
      dept: newReqData.deptName
    };
    setApprovals([newApprovalItem, ...approvals]);

    setShowReqModal(false);
    showToast(`Requisition ${newCode} created successfully! Routed for DGM approval.`);
  };

  // Screen 9: Interview Feedback Submit Handler
  const handleFeedbackSubmit = (feedbackData) => {
    setInterviews(prev => prev.map(inv => {
      if (inv.candidateId === feedbackData.candidateId) {
        return { ...inv, status: 'COMPLETED', feedback: feedbackData };
      }
      return inv;
    }));
    setShowFeedbackModal(false);
    showToast(`Evaluation score recorded: ${feedbackData.recommendation} (${feedbackData.ratings.overallRating}/5)`);
  };

  // Screen 12: 1-Click Approve / Reject Handler
  const handleQuickApproval = (item, decision) => {
    setApprovals(prev => prev.map(a => 
      a.id === item.id ? { ...a, status: decision === 'APPROVE' ? 'Approved' : 'Rejected' } : a
    ));

    // Also update Requisition status
    setRequisitions(prev => prev.map(r => {
      if (r.code === item.reqCode) {
        return {
          ...r,
          status: decision === 'APPROVE' ? 'Open' : 'Rejected',
          approvalStage: decision === 'APPROVE' ? 'Approved' : 'Rejected'
        };
      }
      return r;
    }));

    showToast(`${item.reqCode} ${decision === 'APPROVE' ? 'Approved (Status: Open)' : 'Rejected'}`);
  };

  // Screen 13: Add Employee Submit Handler
  const handleAddEmployee = (e) => {
    e.preventDefault();
    if (!newEmpForm.name || !newEmpForm.role) return;
    const newEmp = {
      id: employees.length + 1,
      code: `EMP00${employees.length + 1}`,
      name: newEmpForm.name,
      role: newEmpForm.role,
      dept: newEmpForm.dept,
      location: newEmpForm.location,
      status: 'Active',
      email: `${newEmpForm.name.toLowerCase().replace(/\s+/g, '.')}@urjafoods.com`,
      phone: '+91 98200 ' + Math.floor(10000 + Math.random() * 90000)
    };
    setEmployees([...employees, newEmp]);
    setShowAddEmpModal(false);
    setNewEmpForm({ name: '', role: '', dept: 'Soya Division', location: 'Plant - Rahuri' });
    showToast(`Employee ${newEmp.name} registered successfully!`);
  };

  // Screen 13: Toggle Employee Status
  const handleToggleEmpStatus = (empId) => {
    setEmployees(prev => prev.map(e => 
      e.id === empId ? { ...e, status: e.status === 'Active' ? 'Inactive' : 'Active' } : e
    ));
    showToast('Employee status toggled');
  };


  // Screen 17: Run Live Backup Simulation
  const handleRunBackup = () => {
    setIsBackingUp(true);
    showToast('Database snapshot initiated... Encrypting tables...');
    setTimeout(() => {
      const newBackup = {
        id: backups.length + 1,
        fileName: `urja_ats_db_backup_${new Date().toISOString().slice(0,10).replace(/-/g,'')}_live.sql.gz`,
        type: 'MANUAL',
        size: '15.4 MB',
        location: 's3://urja-foods-secure-backups/manual/',
        status: 'Success',
        checksum: 'sha256:' + Math.random().toString(36).substring(2, 10),
        date: 'Today, Just now',
        user: currentUser.name
      };
      setBackups([newBackup, ...backups]);
      setIsBackingUp(false);
      showToast('Database backup successfully archived to AWS S3!');
    }, 1800);
  };

  // Login Success Handler with Role-Based Dashboard Redirection (Requirement 4 & 5)
  const handleLoginSuccess = (authData) => {
    const primaryRole = (authData.roles && authData.roles[0]) || authData.role || 'ROLE_HR_ADMIN';
    const match = users.find(u => 
      (authData.email && u.email.toLowerCase() === authData.email.toLowerCase()) ||
      (authData.username && u.username === authData.username)
    );

    const fullUser = {
      id: authData.id || match?.id || 99,
      username: authData.username || match?.username || 'user',
      name: authData.name || match?.name || 'Urja Team Member',
      role: primaryRole,
      roles: authData.roles || [primaryRole],
      email: authData.email || match?.email || '',
      avatar: authData.profileImageUrl || match?.avatar || (primaryRole === 'ROLE_DEPT_HEAD' ? '/assets/images/man.jpg' : '/assets/images/woman.jpg'),
      profileImageUrl: authData.profileImageUrl || match?.avatar || (primaryRole === 'ROLE_DEPT_HEAD' ? '/assets/images/man.jpg' : '/assets/images/woman.jpg'),
      title: authData.title || match?.title || (primaryRole === 'ROLE_DEPT_HEAD' ? 'Department Head' : 'HR Executive'),
      dept: authData.dept || match?.dept || (primaryRole === 'ROLE_DEPT_HEAD' ? 'Operations & Supply Chain' : 'Human Resources'),
      token: authData.token,
      status: 'ACTIVE'
    };

    setCurrentUser(fullUser);
    setCurrentRoleId(primaryRole);

    try {
      sessionStorage.setItem('ats_urja_token', authData.token || '');
      sessionStorage.setItem('ats_urja_user', JSON.stringify(fullUser));
    } catch (e) {}

    // Determine target dashboard based on role and permissions
    const targetTab = intendedRedirect || 'dashboard';
    setActiveTab(targetTab);
    setIntendedRedirect(null);

    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', `/?tab=${targetTab}`);
    }

    setIsAuthenticated(true);
    showToast(`Welcome back, ${fullUser.name}!`);
  };

  // Sign Out Handler (Requirement 4 & 5)
  const handleSignOut = () => {
    const token = sessionStorage.getItem('ats_urja_token') || currentUser?.token;
    if (token) {
      fetch('http://localhost:8080/api/v1/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(() => {});
    }
    try {
      sessionStorage.removeItem('ats_urja_user');
      sessionStorage.removeItem('ats_urja_token');
      localStorage.removeItem('ats_urja_user');
      localStorage.removeItem('ats_urja_token');
    } catch (e) {}
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/');
    }
    setIntendedRedirect(null);
    setCurrentUser(null);
    setPersonalizedData(null);
    setIsAuthenticated(false);
    setShowProfileMenu(false);
    showToast('Signed out of Urja ATS');
  };

  // Pending Approvals Count for Sidebar Badge (Screen 12)
  const pendingApprovalsCount = approvals.filter(a => a.status === 'Pending').length;

  // Role-scoped sidebar menu items
  const sidebarNavItems = useMemo(() => {
    const userRoles = currentUser?.roles || (currentUser?.role ? [currentUser.role] : [currentRoleId]);

    if (userRoles.includes('ROLE_IT_ADMIN')) {
      return [
        { tab: 'dashboard', label: 'Dashboard', icon: 'bi-house-door-fill' },
        { tab: 'approvals', label: 'Approvals', icon: 'bi-check2-square', badge: pendingApprovalsCount },
        { tab: 'requisitions', label: 'Job Requisitions', icon: 'bi-briefcase' },
        { tab: 'candidates', label: 'Candidates', icon: 'bi-people' },
        { tab: 'interviews', label: 'Interviews', icon: 'bi-calendar3' },
        { tab: 'offers', label: 'Offers & Onboarding', icon: 'bi-file-earmark-check' },
        { tab: 'employees', label: 'Employees', icon: 'bi-person-lines-fill' },
        { tab: 'users', label: 'User Management', icon: 'bi-people-fill' },
        { tab: 'tasks', label: 'Task Assignment', icon: 'bi-list-check' },
        { tab: 'systemAdmin', label: 'System Administration', icon: 'bi-shield-lock-fill' },
        { tab: 'reports', label: 'HR Reports', icon: 'bi-bar-chart-line' },
        { tab: 'settings', label: 'Settings', icon: 'bi-gear' }
      ];
    }

    if (userRoles.includes('ROLE_INTERVIEWER') && !userRoles.includes('ROLE_HR_ADMIN')) {
      return [
        { tab: 'dashboard', label: 'Dashboard', icon: 'bi-house-door-fill' },
        { tab: 'interviews', label: 'My Interviews', icon: 'bi-calendar3' },
        { tab: 'tasks', label: 'My Tasks', icon: 'bi-list-check' },
        { tab: 'calendar', label: 'My Calendar', icon: 'bi-calendar4-week' }
      ];
    }

    if (userRoles.includes('ROLE_HR_RECRUITER')) {
      return [
        { tab: 'dashboard', label: 'Dashboard', icon: 'bi-house-door-fill' },
        { tab: 'approvals', label: 'Approvals', icon: 'bi-check2-square', badge: pendingApprovalsCount },
        { tab: 'requisitions', label: 'Job Requisitions', icon: 'bi-briefcase' },
        { tab: 'candidates', label: 'Candidates', icon: 'bi-people' },
        { tab: 'interviews', label: 'Interviews', icon: 'bi-calendar3' },
        { tab: 'offers', label: 'Offers & Onboarding', icon: 'bi-file-earmark-check' },
        { tab: 'tasks', label: 'My Tasks', icon: 'bi-list-check' },
        { tab: 'reports', label: 'Reports & Analytics', icon: 'bi-bar-chart-line' }
      ];
    }

    // Default for HR Admin / HRBP (Matches Requirement 3 exactly)
    const items = [
      { tab: 'dashboard', label: 'Dashboard', icon: 'bi-house-door-fill' },
      { tab: 'requisitions', label: 'Job Requisitions', icon: 'bi-briefcase' },
      { tab: 'candidates', label: 'Candidates', icon: 'bi-people' },
      { tab: 'interviews', label: 'Interviews', icon: 'bi-calendar3' },
      { tab: 'offers', label: 'Offers & Onboarding', icon: 'bi-file-earmark-check' },
      { tab: 'employees', label: 'Employees', icon: 'bi-person-lines-fill' },
      { tab: 'approvals', label: 'Approvals', icon: 'bi-check2-square', badge: pendingApprovalsCount },
      { tab: 'users', label: 'User Management', icon: 'bi-people-fill' },
      { tab: 'tasks', label: 'Task Assignment', icon: 'bi-list-check' },
      { tab: 'reports', label: 'HR Reports', icon: 'bi-bar-chart-line' }
    ];

    if (userRoles.includes('ROLE_IT_ADMIN')) {
      items.push({ tab: 'systemAdmin', label: 'System Administration', icon: 'bi-gear-fill' });
    }

    return items;
  }, [currentRoleId, currentUser?.role, currentUser?.roles, pendingApprovalsCount]);

  // Determine authorized personalized data (Backend API or Authorized Role Fallback)
  const isDeptHead = currentUser?.role === 'ROLE_DEPT_HEAD' || currentUser?.email?.includes('sanjay');

  const activeMetrics = personalizedData?.metrics || {
    activeRequisitions: isDeptHead ? 3 : 4,
    assignedCandidates: isDeptHead ? 9 : 12,
    interviewsThisWeek: isDeptHead ? 3 : 5,
    pendingOffers: isDeptHead ? 1 : 2
  };

  // Role-tailored 4 KPI Metric Cards on Dashboard
  const roleMetricCards = useMemo(() => {
    const role = (currentUser?.roles && currentUser.roles[0]) || currentUser?.role || currentRoleId;

    if (role === 'ROLE_IT_ADMIN') {
      return [
        { label: 'Total User Accounts', val: (users.length || 9), icon: 'bi-people-fill', color: 'green', tab: 'users' },
        { label: 'Active User Logins', val: (users.filter(u => u.status === 'ACTIVE').length || 8), icon: 'bi-person-check-fill', color: 'blue', tab: 'users' },
        { label: 'Access Policies Enforced', val: 6, icon: 'bi-shield-check', color: 'purple', tab: 'systemAdmin' },
        { label: 'Security & Audit Trails', val: (auditLogs.length || 9), icon: 'bi-shield-lock-fill', color: 'amber', tab: 'systemAdmin' }
      ];
    }

    if (role === 'ROLE_INTERVIEWER') {
      return [
        { label: 'My Assigned Interviews', val: activeMetrics.interviewsThisWeek, icon: 'bi-calendar-event-fill', color: 'purple', tab: 'interviews' },
        { label: 'Candidate Evaluations', val: activeMetrics.assignedCandidates, icon: 'bi-file-earmark-person-fill', color: 'blue', tab: 'interviews' },
        { label: 'Pending Feedback Tasks', val: activeMetrics.activeRequisitions, icon: 'bi-star-fill', color: 'amber', tab: 'interviews' },
        { label: 'Completed Rounds', val: activeMetrics.pendingOffers, icon: 'bi-check-circle-fill', color: 'green', tab: 'interviews' }
      ];
    }

    if (role === 'ROLE_HR_RECRUITER') {
      return [
        { label: 'Assigned Requisitions', val: activeMetrics.activeRequisitions, icon: 'bi-briefcase-fill', color: 'green', tab: 'requisitions' },
        { label: 'My Candidates Pipeline', val: activeMetrics.assignedCandidates, icon: 'bi-people-fill', color: 'blue', tab: 'candidates' },
        { label: 'Interviews in Progress', val: activeMetrics.interviewsThisWeek, icon: 'bi-calendar-event-fill', color: 'purple', tab: 'interviews' },
        { label: 'Offers & Shortlists', val: activeMetrics.pendingOffers, icon: 'bi-file-earmark-check-fill', color: 'amber', tab: 'reports' }
      ];
    }

    // Default HR Admin
    return [
      { label: 'Open Job Requisitions', val: activeMetrics.activeRequisitions, icon: 'bi-briefcase-fill', color: 'green', tab: 'requisitions' },
      { label: 'Total Active Candidates', val: activeMetrics.assignedCandidates, icon: 'bi-people-fill', color: 'blue', tab: 'candidates' },
      { label: 'Interviews This Week', val: activeMetrics.interviewsThisWeek, icon: 'bi-calendar-event-fill', color: 'purple', tab: 'interviews' },
      { label: 'Offers Pending Approval', val: activeMetrics.pendingOffers, icon: 'bi-file-earmark-check-fill', color: 'amber', tab: 'offers' }
    ];
  }, [currentRoleId, currentUser?.role, currentUser?.roles, activeMetrics, users, auditLogs.length]);

  const activeActivities = personalizedData?.recentActivities || (isDeptHead ? [
    { id: 'act-1', title: 'New candidate shortlisted', subtitle: 'Production Engineer – Plant Shirdi', timeAgo: '1 hour ago', iconColor: 'green' },
    { id: 'act-2', title: 'Technical interview scheduled', subtitle: 'Boiler Operator – Round 2', timeAgo: '4 hours ago', iconColor: 'purple' },
    { id: 'act-3', title: 'Offer approval pending', subtitle: 'Feedmill Plant Supervisor – Rahuri', timeAgo: '1 day ago', iconColor: 'amber' },
    { id: 'act-4', title: 'Feedback received', subtitle: 'Amit Joshi – Plant Operations', timeAgo: '2 days ago', iconColor: 'blue' }
  ] : [
    { id: 'act-1', title: 'New candidate assigned', subtitle: 'Software Engineer – Pune', timeAgo: '2 hours ago', iconColor: 'green' },
    { id: 'act-2', title: 'Interview scheduled', subtitle: 'Amit Patil – Frontend Developer', timeAgo: '5 hours ago', iconColor: 'purple' },
    { id: 'act-3', title: 'Feedback submitted', subtitle: 'Neha Shah – HR Executive', timeAgo: '1 day ago', iconColor: 'blue' },
    { id: 'act-4', title: 'Offer letter sent', subtitle: 'Rohit More – Backend Developer', timeAgo: '1 day ago', iconColor: 'amber' }
  ]);

  const activeOpenRequisitions = personalizedData?.openRequisitions || (isDeptHead ? [
    { id: 'REQ-1', jobTitle: 'Production Engineer', department: 'Plant Operations', location: 'Plant - Shirdi', status: 'Open', candidateCount: 6 },
    { id: 'REQ-2', jobTitle: 'Feedmill Supervisor', department: 'Feedmill Plant', location: 'Plant - Rahuri', status: 'In Progress', candidateCount: 5 },
    { id: 'REQ-3', jobTitle: 'Boiler Technician', department: 'Operations & Supply Chain', location: 'Plant - Shirdi', status: 'Open', candidateCount: 4 }
  ] : [
    { id: 'REQ-1', jobTitle: 'Assistant Manager', department: 'Soya Division', location: 'Plant - Rahuri', status: 'Open', candidateCount: 12 },
    { id: 'REQ-2', jobTitle: 'QA Executive', department: 'Quality Assurance', location: 'Pune', status: 'In Progress', candidateCount: 8 },
    { id: 'REQ-3', jobTitle: 'Production Engineer', department: 'Plant Operations', location: 'Plant - Shirdi', status: 'Open', candidateCount: 6 },
    { id: 'REQ-4', jobTitle: 'HR Executive', department: 'Human Resources', location: 'Pune', status: 'On Hold', candidateCount: 4 }
  ]);

  const activeInterviews = personalizedData?.upcomingInterviews || (isDeptHead ? [
    { id: 'int-1', dateDay: '16', dateMonth: 'Oct', candidateName: 'Mahesh Shinde', role: 'Production Engineer', time: '11:00 AM', mode: 'Onsite' },
    { id: 'int-2', dateDay: '16', dateMonth: 'Oct', candidateName: 'Pooja Kale', role: 'Feedmill Supervisor', time: '03:30 PM', mode: 'Online' },
    { id: 'int-3', dateDay: '17', dateMonth: 'Oct', candidateName: 'Ganesh Jadhav', role: 'Boiler Technician', time: '02:00 PM', mode: 'Onsite' }
  ] : [
    { id: 'int-1', dateDay: '16', dateMonth: 'Oct', candidateName: 'Amit Shah', role: 'Software Engineer', time: '10:00 AM', mode: 'Online' },
    { id: 'int-2', dateDay: '16', dateMonth: 'Oct', candidateName: 'Neha Joshi', role: 'HR Executive', time: '02:00 PM', mode: 'Onsite' },
    { id: 'int-3', dateDay: '17', dateMonth: 'Oct', candidateName: 'Rahul Patil', role: 'Quality Analyst', time: '11:30 AM', mode: 'Online' }
  ]);

  const activeTasks = personalizedData?.tasks || (isDeptHead ? [
    { id: 'tsk-1', title: 'Approve requisition for Feedmill Supervisor', dueDate: '16 Oct 2026' },
    { id: 'tsk-2', title: 'Review candidate shortlist – Production Engineer', dueDate: '16 Oct 2026' },
    { id: 'tsk-3', title: 'Conduct final interview – Mahesh Shinde', dueDate: '17 Oct 2026' },
    { id: 'tsk-4', title: 'Verify plant manpower budget for Q4', dueDate: '18 Oct 2026' }
  ] : [
    { id: 'tsk-1', title: 'Review candidate profile – Sohan Desai', dueDate: '16 Oct 2026' },
    { id: 'tsk-2', title: 'Share interview feedback – Neha Shah', dueDate: '16 Oct 2026' },
    { id: 'tsk-3', title: 'Shortlist candidates – QA Executive', dueDate: '17 Oct 2026' },
    { id: 'tsk-4', title: 'Prepare offer letter – Rohit More', dueDate: '17 Oct 2026' }
  ]);

  // Compute strict role permissions and route access
  const userRoles = useMemo(() => {
    return currentUser?.roles || (currentUser?.role ? [currentUser.role] : [currentRoleId]);
  }, [currentUser, currentRoleId]);

  const primaryRole = (userRoles && userRoles[0]) || currentRoleId || 'ROLE_HR_ADMIN';
  const permittedTabs = useMemo(() => {
    if (userRoles.includes('ROLE_IT_ADMIN')) {
      return ['dashboard', 'requisitions', 'candidates', 'interviews', 'offers', 'employees', 'approvals', 'users', 'tasks', 'reports', 'talentPool', 'calendar', 'systemAdmin', 'settings'];
    }
    const set = new Set();
    userRoles.forEach(r => {
      (ROLE_PERMITTED_TABS[r] || []).forEach(t => set.add(t));
    });
    return Array.from(set);
  }, [userRoles]);
  const isAuthorizedTab = permittedTabs.includes(activeTab);

  // ============================================================================
  // RENDER SCREEN 1: LOGIN PAGE IF NOT AUTHENTICATED
  // Placed after all hooks to strictly adhere to React Rules of Hooks
  // ============================================================================
  if (!isAuthenticated) {
    return (
      <LoginPage 
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className={`urja-app-layout-v2 ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* ==============================================================================
          LEFT DARK GREEN SIDEBAR (FULL HEIGHT MATCHING MOCKUP)
          ============================================================================== */}
      <aside className={`urja-sidebar-v2 ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Brand Header */}
        <div className="urja-sidebar-brand-v2" onClick={() => handleNavTab('dashboard')} style={{ cursor: 'pointer' }}>
          <div className="urja-sidebar-logo-row">
            <svg className="urja-sidebar-logo-leaf" viewBox="0 0 24 24" fill="#98E843">
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z"/>
            </svg>
            <div>
              <div className="urja-sidebar-brand-name">
                Urja<span className="urja-sidebar-brand-foods">FOODS</span>
              </div>
              <div className="urja-sidebar-tagline">CLEANER ENERGY</div>
            </div>
          </div>
          <div className="urja-sidebar-ats-label">Applicant Tracking System<br/>(ATS)</div>
        </div>

        {/* Role-Scoped Menu Navigation Items */}
        <ul className="urja-sidebar-nav-v2">
          {sidebarNavItems.map(item => (
            <li key={item.tab}>
              <button 
                type="button"
                className={`urja-nav-item-v2 ${activeTab === item.tab ? 'active' : ''}`} 
                onClick={() => handleNavTab(item.tab)} 
                data-tooltip={item.label}
                aria-label={item.label}
              >
                <i className={`bi ${item.icon}`}></i>
                <span className="urja-nav-item-text">{item.label}</span>
                {item.badge > 0 && (
                  <span className="urja-nav-badge">{item.badge}</span>
                )}
              </button>
            </li>
          ))}
        </ul>

        {/* Decorative Leaf SVG in Bottom Left */}
        <div className="urja-sidebar-footer-leaf">
          <svg viewBox="0 0 200 160" fill="none" style={{ width: '100%', height: '100%' }}>
            <path d="M-10 180C25 140 35 90 20 50C55 70 80 115 75 180Z" fill="#144D2D" opacity="0.6"/>
            <path d="M0 180C45 130 75 75 70 25C115 50 140 105 130 180Z" fill="#1B633A" opacity="0.45"/>
            <path d="M25 180C75 125 115 65 125 5C160 35 180 95 170 180Z" fill="#22C55E" opacity="0.25"/>
          </svg>
        </div>
      </aside>

      {/* Mobile Drawer Backdrop (Active on <= 768px when drawer is open) */}
      {!sidebarCollapsed && (
        <div 
          className="urja-sidebar-mobile-backdrop" 
          onClick={() => setSidebarCollapsed(true)} 
          aria-hidden="true"
        />
      )}

      {/* ==============================================================================
          RIGHT MAIN CONTAINER (TOP NAVBAR + DASHBOARD/CONTENT)
          ============================================================================== */}
      <div className="urja-main-wrapper-v2">
        {/* TOP CLEAN WHITE NAVBAR */}
        <header className="urja-top-header-v2">
          {/* Left Cluster: Sidebar Toggle + Search Pill */}
          <div className="urja-header-left-cluster">
            <button 
              type="button" 
              className="urja-sidebar-toggle-btn"
              onClick={() => setSidebarCollapsed(prev => !prev)}
              title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              aria-label={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <i className={`bi ${sidebarCollapsed ? 'bi-list' : 'bi-text-indent-right'}`}></i>
            </button>

            {/* Search Pill */}
            <div className="urja-header-search-wrap-v2" ref={searchContainerRef}>
              <i className="bi bi-search urja-header-search-icon-v2"></i>
              <input 
                type="text" 
                className="urja-header-search-input-v2"
                placeholder="Search candidates by name, email, job title, or skills..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setIsSearchFocused(true); }}
                onFocus={() => setIsSearchFocused(true)}
              />
              {searchTerm && (
                <button 
                  type="button" 
                  className="btn btn-sm text-secondary p-0 ms-1 border-0 bg-transparent"
                  onClick={() => setSearchTerm('')}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Right Header: Bell, User Profile Pill */}
          <div className="urja-header-right-v2">
            <button 
              className="urja-header-bell-btn-v2"
              onClick={() => setShowNotificationsModal(true)}
              title={unreadNotifCount > 0 ? `Notifications (${unreadNotifCount} unread)` : 'Notifications (All caught up)'}
              aria-label="Notifications"
            >
              <i className="bi bi-bell"></i>
              {unreadNotifCount > 0 && (
                <span className="urja-header-bell-badge-v2">{unreadNotifCount}</span>
              )}
            </button>

            {/* Authenticated User Profile Pill (Requirement 2) */}
            <div 
              className="urja-header-user-pill-v2"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              title="Account Menu"
            >
              <img 
                src={currentUser?.profileImageUrl || currentUser?.avatar || (currentUser?.role === 'ROLE_DEPT_HEAD' ? '/assets/images/man.jpg' : '/assets/images/woman.jpg')} 
                alt={currentUser?.name || 'User'} 
                className="urja-header-avatar-v2"
                onError={(e) => { 
                  e.target.src = currentUser?.role === 'ROLE_DEPT_HEAD' ? '/assets/images/man.jpg' : '/assets/images/woman.jpg'; 
                }}
              />
              <div className="urja-header-user-info-v2">
                <span className="urja-header-user-name-v2">{currentUser?.name || 'Urja User'}</span>
                <span className="urja-header-user-title-v2">{currentUser?.title || (currentUser?.role === 'ROLE_DEPT_HEAD' ? 'Department Head' : 'HR Executive')}</span>
              </div>
              <i className="bi bi-chevron-down urja-header-chevron-v2"></i>
            </div>

            {/* Profile Dropdown Menu with Logout (Requirement 2 & 5) */}
            {showProfileMenu && (
              <div className="urja-profile-dropdown-v2">
                <div className="urja-dropdown-header-v2">
                  <div className="urja-dropdown-header-name">{currentUser?.name}</div>
                  <div className="urja-dropdown-header-email">{currentUser?.email}</div>
                  <div className="urja-dropdown-header-dept">{currentUser?.dept} • {currentUser?.title}</div>
                </div>

                <div style={{ padding: '0.45rem 1.2rem 0.2rem', color: '#64748B', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  Switch Test Account:
                </div>
                {INITIAL_USERS.slice(0, 4).map(u => (
                  <button 
                    key={u.id}
                    className={`urja-dropdown-item-v2 ${currentUser?.email === u.email ? 'active-persona' : ''}`}
                    onClick={() => handleSwitchAccount(u)}
                  >
                    <i className="bi bi-person-circle"></i>
                    <span>{u.name} ({u.title})</span>
                  </button>
                ))}

                <button 
                  className="urja-dropdown-item-v2 logout"
                  onClick={handleSignOut}
                >
                  <i className="bi bi-box-arrow-right"></i>
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* MAIN VIEWPORT BODY */}
        <main className="urja-main-viewport">
          {!isAuthorizedTab ? (
            <div className="urja-tasks-container py-5" id="access-denied-view">
              <div className="card-portal p-5 text-center shadow-sm" style={{ maxWidth: 680, margin: '2rem auto' }}>
                <div className="mb-3" style={{ fontSize: '3.5rem', color: '#DC2626' }}>
                  <i className="bi bi-shield-x"></i>
                </div>
                <span className="badge bg-danger-subtle text-danger border border-danger-subtle mb-3 px-3 py-1" style={{ fontSize: '0.85rem' }}>
                  <i className="bi bi-lock-fill me-1"></i> HTTP 403 Forbidden
                </span>
                <h2 className="fw-bold text-dark mb-2">Access Denied: Restricted Module</h2>
                <p className="text-muted mb-4" style={{ maxWidth: 520, margin: '0 auto', fontSize: '0.95rem' }}>
                  You are authenticated as <strong>{currentUser?.name || 'User'}</strong> (<span className="badge bg-light text-dark border">{primaryRole}</span>), which does not have permission to access the <strong>"{activeTab}"</strong> module under current security policies.
                </p>
                <div className="p-3 bg-light rounded-3 border mb-4 text-start small font-monospace">
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Security Policy:</span>
                    <strong className="text-dark">ATS-RBAC-STRICT-SEPARATION</strong>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Requested Route:</span>
                    <span className="text-danger fw-bold">?tab={activeTab}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Authorized Navigation Scope:</span>
                    <span className="text-success fw-bold">{permittedTabs.join(', ')}</span>
                  </div>
                </div>
                <div className="d-flex justify-content-center gap-3">
                  <button
                    className="urja-btn-lime px-4 py-2"
                    onClick={() => handleNavTab(getRoleDefaultTab(primaryRole))}
                    id="btn-return-authorized-dashboard"
                  >
                    <i className="bi bi-arrow-left me-1"></i> Return to Authorized Dashboard
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
          {/* ============================================================================
              SCREEN 2: DASHBOARD
              ============================================================================ */}
          {activeTab === 'dashboard' && (
            <div className="urja-dashboard-body-v2">
              {/* 1. DYNAMIC GREETING WITH LEAF ICON (Requirement 1) */}
              <div className="urja-greeting-banner-v2">
                <div className="urja-greeting-leaf-wrap-v2">
                  <svg viewBox="0 0 24 24" fill="#22C55E" width="40" height="40">
                    <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z"/>
                  </svg>
                </div>
                <div>
                  <h1 className="urja-greeting-title-v2">
                    {userFirstName ? (
                      <>
                        {dynamicGreeting}, <span className="urja-name-highlight-v2">{userFirstName}!</span>
                      </>
                    ) : (
                      'Welcome!'
                    )}
                  </h1>
                  <p className="urja-greeting-sub-v2">Here's an overview of your activities today.</p>
                </div>
              </div>

              {/* 2. 4 METRIC KPI CARDS ROW (Role-Tailored) */}
              <div className="urja-kpi-row-4-v2">
                {roleMetricCards.map((c, idx) => (
                  <div key={idx} className="urja-metric-card-v2" onClick={() => handleNavTab(c.tab)}>
                    <div className="urja-metric-top-v2">
                      <div className={`urja-metric-icon-box-v2 ${c.color}`}>
                        <i className={`bi ${c.icon}`}></i>
                      </div>
                      <div className="urja-metric-info-v2">
                        <span className="urja-metric-label-v2">{c.label}</span>
                        <span className="urja-metric-val-v2">{c.val}</span>
                      </div>
                    </div>
                    <span className="urja-metric-link-v2">View Details →</span>
                  </div>
                ))}
              </div>

              {/* 3. 2X2 WIDGETS GRID (Requirement 3) */}
              <div className="urja-dashboard-grid-2x2-v2">
                {/* WIDGET 1: MY RECENT ACTIVITIES */}
                <div className="urja-widget-card-v2">
                  <div className="urja-widget-header-v2">
                    <h3 className="urja-widget-title-v2">My Recent Activities</h3>
                    <span className="urja-widget-viewall-v2" onClick={() => handleNavTab('candidates')}>View All →</span>
                  </div>
                  <div className="urja-activities-timeline-v2">
                    {activeActivities.map((act) => (
                      <div key={act.id} className="urja-activity-item-v2">
                        <div className="urja-activity-connector-v2"></div>
                        <div className={`urja-activity-icon-v2 ${act.iconColor || 'green'}`}>
                          <i className={`bi ${act.iconColor === 'purple' ? 'bi-calendar-event' : act.iconColor === 'blue' ? 'bi-file-earmark-check' : act.iconColor === 'amber' ? 'bi-file-earmark-text' : 'bi-file-earmark-person'}`}></i>
                        </div>
                        <div className="urja-activity-details-v2">
                          <div className="urja-activity-title-v2">{act.title}</div>
                          <div className="urja-activity-sub-v2">{act.subtitle}</div>
                        </div>
                        <div className="urja-activity-time-v2">{act.timeAgo}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* WIDGET 2: MY OPEN REQUISITIONS */}
                <div className="urja-widget-card-v2">
                  <div className="urja-widget-header-v2">
                    <h3 className="urja-widget-title-v2">My Open Requisitions</h3>
                    <span className="urja-widget-viewall-v2" onClick={() => handleNavTab('requisitions')}>View All →</span>
                  </div>
                  <table className="urja-req-table-v2">
                    <thead>
                      <tr>
                        <th>Job Title</th>
                        <th>Department</th>
                        <th>Location</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeOpenRequisitions.map((req) => (
                        <tr key={req.id}>
                          <td className="urja-req-title-cell-v2">{req.jobTitle}</td>
                          <td>{req.department}</td>
                          <td>{req.location}</td>
                          <td>
                            <span className={`urja-status-badge-v2 ${req.status === 'Open' ? 'open' : req.status === 'In Progress' ? 'in-progress' : 'on-hold'}`}>
                              {req.status === 'Open' && <i className="bi bi-check-circle-fill" style={{ fontSize: '0.65rem' }}></i>}
                              {req.status}
                            </span>
                          </td>
                          <td className="urja-req-candidates-v2">
                            <i className="bi bi-people-fill"></i> {req.candidateCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* WIDGET 3: UPCOMING INTERVIEWS */}
                <div className="urja-widget-card-v2">
                  <div className="urja-widget-header-v2">
                    <h3 className="urja-widget-title-v2">Upcoming Interviews</h3>
                    <span className="urja-widget-viewall-v2" onClick={() => handleNavTab('interviews')}>View All →</span>
                  </div>
                  <div className="urja-interviews-list-v2">
                    {activeInterviews.map((inv) => (
                      <div key={inv.id} className="urja-interview-item-v2">
                        <div className="urja-interview-left-v2">
                          <div className="urja-interview-date-box-v2">
                            <span className="urja-date-day-v2">{inv.dateDay}</span>
                            <span className="urja-date-month-v2">{inv.dateMonth}</span>
                          </div>
                          <div className="urja-interview-info-v2">
                            <span className="urja-interview-name-v2">{inv.candidateName}</span>
                            <span className="urja-interview-role-v2">{inv.role}</span>
                          </div>
                        </div>
                        <div className="urja-interview-meta-v2">
                          <span className="urja-interview-pill-v2">
                            <i className="bi bi-clock"></i> {inv.time}
                          </span>
                          <span className="urja-interview-pill-v2">
                            <i className={`bi ${inv.mode === 'Online' ? 'bi-camera-video' : 'bi-geo-alt'}`}></i> {inv.mode}
                          </span>
                          <i className="bi bi-chevron-right urja-interview-arrow-v2"></i>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* WIDGET 4: MY TASKS */}
                <div className="urja-widget-card-v2">
                  <div className="urja-widget-header-v2">
                    <h3 className="urja-widget-title-v2">My Tasks</h3>
                    <span className="urja-widget-viewall-v2" onClick={() => handleNavTab('tasks')} style={{ cursor: 'pointer' }}>View All →</span>
                  </div>
                  <div className="urja-tasks-list-v2">
                    {activeTasks.map((tsk) => {
                      const isDone = !!taskCompletedState[tsk.id] || tsk.completed;
                      return (
                        <div 
                          key={tsk.id} 
                          className="urja-task-row-v2"
                          onClick={() => {
                            const newDone = !isDone;
                            setTaskCompletedState(prev => ({ ...prev, [tsk.id]: newDone }));
                            const rawId = String(tsk.id).replace('tsk-', '');
                            if (!isNaN(Number(rawId))) {
                              const token = sessionStorage.getItem('ats_urja_token') || currentUser?.token;
                              fetch(`http://localhost:8080/api/v1/tasks/${rawId}/status`, {
                                method: 'PATCH',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({ status: newDone ? 'COMPLETED' : 'IN_PROGRESS' })
                              }).then(() => showToast(`Task status updated: ${newDone ? 'COMPLETED' : 'IN_PROGRESS'}`)).catch(() => {});
                            }
                          }}
                        >
                          <div className="urja-task-left-v2">
                            <div className={`urja-task-checkbox-v2 ${isDone ? 'checked' : ''}`}>
                              {isDone && <i className="bi bi-check" style={{ fontSize: '0.85rem' }}></i>}
                            </div>
                            <span className={`urja-task-title-v2 ${isDone ? 'done' : ''}`}>{tsk.title}</span>
                          </div>
                          <div className="urja-task-date-v2">
                            <i className="bi bi-calendar3"></i> {tsk.dueDate}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* ============================================================================
              SCREEN 3 & 5: JOB REQUISITIONS & REQUISITION DETAILS
              ============================================================================ */}
          {activeTab === 'requisitions' && (
            <div>
              {/* If a requisition is selected, render Screen 5! */}
              {viewingReq ? (
                <RequisitionDetailView 
                  requisition={viewingReq}
                  onClose={() => setViewingReq(null)}
                  onAssignRecruiter={(r) => { showToast(`Recruiter assigned to ${r.code}`); }}
                  onOpenApproval={(r) => { setActiveTab('approvals'); }}
                />
              ) : (
                /* Screen 3: Job Requisitions List */
                <JobRequisitionsView
                  requisitions={requisitions}
                  departments={INITIAL_DEPARTMENTS}
                  locations={INITIAL_LOCATIONS}
                  reqStatusFilter={reqStatusFilter}
                  setReqStatusFilter={setReqStatusFilter}
                  filterDepartment={filterDepartment}
                  setFilterDepartment={setFilterDepartment}
                  filterLocation={filterLocation}
                  setFilterLocation={setFilterLocation}
                  filterStatusSelect={filterStatusSelect}
                  setFilterStatusSelect={setFilterStatusSelect}
                  searchQuery={searchTerm}
                  setSearchQuery={setSearchTerm}
                  selectedReqIds={selectedReqIds}
                  setSelectedReqIds={setSelectedReqIds}
                  currentPage={currentPage}
                  setCurrentPage={setCurrentPage}
                  rowsPerPage={rowsPerPage}
                  setRowsPerPage={setRowsPerPage}
                  onViewRequisition={(req) => setViewingReq(req)}
                  onCreateRequisition={() => setShowReqModal(true)}
                  onOpenApproval={() => setActiveTab('approvals')}
                  onEditRequisition={(req) => showToast(`Edit form opened for ${req.code}`)}
                />
              )}
            </div>
          )}

          {/* ============================================================================
              SCREEN 6 & 7: CANDIDATES MANAGEMENT & CANDIDATE PROFILE RESUME
              ============================================================================ */}
          {activeTab === 'candidates' && (
            <div>
              {/* If candidate is clicked, render Screen 7! */}
              {selectedCandidate ? (
                <CandidateProfileResume 
                  candidate={selectedCandidate}
                  onClose={() => setSelectedCandidate(null)}
                  onScheduleInterview={(c) => { setActiveTab('interviews'); }}
                  onAddFeedback={(c) => { setFeedbackCandidate(c); setShowFeedbackModal(true); }}
                />
              ) : (
                /* Screen 6: Candidates Management List matching Urja Foods ATS Mockup */
                <CandidatesView
                  currentUser={currentUser}
                  requisitions={requisitions}
                  departments={INITIAL_DEPARTMENTS}
                  onViewCandidate={(c) => setSelectedCandidate(c)}
                  onScheduleInterview={(c) => { setActiveTab('interviews'); }}
                  showToast={showToast}
                />
              )}
            </div>
          )}


          {/* ============================================================================
              SCREEN 8: INTERVIEWS SCHEDULER & ROUND ASSIGNMENT WORKFLOW
              ============================================================================ */}
          {activeTab === 'interviews' && (
            <InterviewsManagementView 
              currentUser={currentUser}
              requisitions={requisitions}
              candidates={candidates}
              locations={INITIAL_LOCATIONS}
              showToast={showToast}
            />
          )}

          {/* ============================================================================
              SCREEN 10: OFFERS & ONBOARDING (Matching Reference Design Mockup)
              ============================================================================ */}
          {activeTab === 'offers' && (
            <OffersOnboardingView
              currentUser={currentUser}
              onToast={showToast}
              candidates={candidates}
              requisitions={requisitions}
            />
          )}

          {/* ============================================================================
              SCREEN 11: TALENT POOL
              ============================================================================ */}
          {activeTab === 'talentPool' && (
            <div>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <h2 className="fw-bold text-dark mb-1" style={{ fontSize: '1.45rem' }}>Talent Pool</h2>
                  <p className="text-muted small mb-0">Pre-screened candidates across agricultural, poultry, and engineering divisions.</p>
                </div>
              </div>

              {/* Search & Filters */}
              <div className="row g-2 mb-4">
                <div className="col-md-5">
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Search by skill, name or title..."
                    value={talentSearch}
                    onChange={e => setTalentSearch(e.target.value)}
                  />
                </div>
                <div className="col-md-3">
                  <select 
                    className="form-select"
                    value={talentLocationFilter}
                    onChange={e => setTalentLocationFilter(e.target.value)}
                  >
                    <option value="ALL">All Locations</option>
                    <option value="Pune">Pune</option>
                    <option value="Nashik">Nashik</option>
                    <option value="Mumbai">Mumbai</option>
                  </select>
                </div>
              </div>

              {/* Talent Pool Card Grid (Screen 11) */}
              <div className="urja-talent-grid">
                {candidates.map(c => (
                  <div key={c.id} className="urja-talent-card">
                    {c.avatar && c.avatar.startsWith('/') ? (
                      <img 
                        src={c.avatar} 
                        alt={c.name} 
                        className="urja-talent-avatar" 
                        onError={(e) => { e.target.src = '/assets/images/man.jpg'; }}
                      />
                    ) : (
                      <div className="urja-talent-avatar">
                        {c.avatar || c.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <h5 className="fw-bold text-dark mb-0" style={{ fontSize: '1rem' }}>{c.name}</h5>
                    <p className="text-muted small mb-1">{c.role || c.appliedFor}</p>
                    <div className="small text-secondary mb-2">{c.exp} • {c.location || 'Pune, India'}</div>

                    <span className={`urja-avail-pill ${c.availability === 'Not Available' ? 'not-available' : 'available'}`}>
                      ● {c.availability || 'Available'}
                    </span>

                    <button 
                      className="btn btn-sm btn-outline-success w-100 mt-3 fw-bold"
                      onClick={() => showToast(`Tagged ${c.name} for Job Requisition!`)}
                    >
                      Tag for Requisition
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================================
              SCREEN 12: APPROVALS INBOX
              ============================================================================ */}
          {activeTab === 'approvals' && (
            <ApprovalsInboxView
              currentUser={currentUser}
              onToast={showToast}
              onApprovalSuccess={(approvedId) => {
                setApprovals(prev => prev.map(a => (a.id === approvedId || a.reqCode === approvedId || a.approvalCode === approvedId) ? { ...a, status: 'Approved' } : a));
              }}
            />
          )}

          {/* ============================================================================
              SCREEN 13: EMPLOYEE MANAGEMENT (URJA FOODS ATS LIFECYCLE)
              ============================================================================ */}
          {activeTab === 'employees' && (
            <EmployeesManagementView currentUser={currentUser} onToast={showToast} />
          )}

          {/* ============================================================================
              SCREEN 14: REPORTS & ANALYTICS
              ============================================================================ */}
          {activeTab === 'reports' && (
            <ReportsAnalyticsView currentUser={currentUser} onToast={showToast} />
          )}

          {/* ============================================================================
              SCREEN 15: CALENDAR
              ============================================================================ */}
          {activeTab === 'calendar' && (
            <div>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <h2 className="fw-bold text-dark mb-1" style={{ fontSize: '1.45rem' }}>Recruitment Calendar</h2>
                  <p className="text-muted small mb-0">October 2026 enterprise interviews, joining dates, and signoff reviews.</p>
                </div>
              </div>

              <div className="card-portal p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h4 className="fw-bold text-dark mb-0">October 2026</h4>
                  <div className="d-flex gap-2">
                    <span className="badge bg-primary">Interview</span>
                    <span className="badge bg-success">Joining</span>
                    <span className="badge bg-warning text-dark">Offer Deadline</span>
                  </div>
                </div>

                <div className="urja-calendar-grid-container">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="urja-calendar-day-header">{d}</div>
                  ))}

                  {Array.from({ length: 35 }, (_, idx) => {
                    const dayNum = idx - 3;
                    const isCurrentMonth = dayNum >= 1 && dayNum <= 31;
                    return (
                      <div key={idx} className="urja-calendar-day-cell">
                        {isCurrentMonth && (
                          <>
                            <span className="urja-calendar-day-num">{dayNum}</span>
                            {dayNum === 10 && <div className="urja-calendar-event-tag blue">Amit Shah Applied</div>}
                            {dayNum === 15 && <div className="urja-calendar-event-tag green">Amol Shinde Joined</div>}
                            {dayNum === 20 && <div className="urja-calendar-event-tag orange">Interview: Amit Shah</div>}
                            {dayNum === 21 && <div className="urja-calendar-event-tag blue">Interview: Karan Mehta</div>}
                            {dayNum === 25 && <div className="urja-calendar-event-tag purple">Offer Deadline</div>}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================================
              TASK ASSIGNMENT & RECRUITMENT WORKLOADS (HR ADMIN & ASSIGNED USERS)
              ============================================================================ */}
          {activeTab === 'tasks' && (
            <TaskAssignmentView 
              currentUser={currentUser}
              showToast={showToast}
              onNavigateToUsers={() => handleNavTab('users')}
            />
          )}

          {/* ============================================================================
              USER MANAGEMENT (IT ADMIN & HR ADMIN)
              ============================================================================ */}
          {activeTab === 'users' && (
            <UserManagementView 
              currentUser={currentUser}
              showToast={showToast}
              onNavigateToTasks={() => handleNavTab('tasks')}
            />
          )}

          {/* ============================================================================
              SYSTEM ADMINISTRATION (IT ADMIN: AUDIT LOGS, BACKUP & RESTORE, ACCESS POLICIES, SYSTEM SETTINGS)
              ============================================================================ */}
          {(activeTab === 'systemAdmin' || activeTab === 'policies') && (
            <SystemAdministrationView 
              currentUser={currentUser}
              showToast={showToast}
            />
          )}

          {/* ============================================================================
              IT ADMIN SETTINGS
              ============================================================================ */}
          {activeTab === 'settings' && (
            <div className="urja-tasks-container">
              <div className="urja-tasks-header">
                <div className="urja-tasks-header-left">
                  <div className="urja-tasks-header-icon" style={{ background: '#144D2D', color: '#98E843' }}>
                    <i className="bi bi-gear-fill"></i>
                  </div>
                  <div>
                    <h1 className="urja-tasks-title">IT Administrator Settings</h1>
                    <p className="urja-tasks-subtitle">
                      Manage administrative account preferences, security credentials, and system administration shortcuts.
                    </p>
                  </div>
                </div>

                <button 
                  className="urja-btn-lime"
                  onClick={() => handleNavTab('systemAdmin')}
                  id="btn-goto-system-admin"
                >
                  <i className="bi bi-shield-lock-fill me-1"></i>
                  <span>Launch System Administration</span>
                </button>
              </div>

              <div className="row g-4 mb-4">
                <div className="col-lg-6">
                  <div className="card-portal p-4 h-100">
                    <h5 className="fw-bold text-dark mb-3 border-bottom pb-2">
                      <i className="bi bi-person-badge-fill me-2 text-success"></i> Administrator Profile
                    </h5>
                    <div className="mb-3">
                      <label className="form-label small fw-bold text-muted">Full Name</label>
                      <input type="text" className="form-control" value={currentUser?.name || 'IT Administrator'} readOnly />
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-bold text-muted">Corporate Email</label>
                      <input type="text" className="form-control" value={currentUser?.email || 'admin@company.com'} readOnly />
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-bold text-muted">Assigned Security Role</label>
                      <div>
                        <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1">
                          ROLE_IT_ADMIN (Full System Privileges)
                        </span>
                      </div>
                    </div>
                    <div className="alert alert-light border small mb-0 mt-3">
                      <i className="bi bi-info-circle-fill text-primary me-1"></i>
                      Administrative roles and permissions are configured by enterprise policy and protected by role-based access control.
                    </div>
                  </div>
                </div>

                <div className="col-lg-6">
                  <div className="card-portal p-4 h-100">
                    <h5 className="fw-bold text-dark mb-3 border-bottom pb-2">
                      <i className="bi bi-shield-lock me-2 text-warning"></i> Security & Session Credentials
                    </h5>
                    <div className="mb-3">
                      <label className="form-label small fw-bold text-muted">Active Session Security</label>
                      <div className="p-3 bg-light rounded-3 border d-flex align-items-center justify-content-between">
                        <div>
                          <strong className="text-dark d-block small">Hardware Security Key / TOTP</strong>
                          <span className="text-muted small">Status: Enforced for IT Admin</span>
                        </div>
                        <span className="badge bg-success-subtle text-success">Active</span>
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-bold text-muted">Authentication Token</label>
                      <div className="p-3 bg-light rounded-3 border font-monospace small text-muted text-truncate">
                        JWT RS256 • Bearer Validated Session
                      </div>
                    </div>
                    <div className="mt-3">
                      <button 
                        className="btn btn-outline-success btn-sm w-100 py-2 fw-semibold"
                        onClick={() => showToast('Password reset link sent to admin corporate email.')}
                      >
                        <i className="bi bi-key-fill me-1"></i> Send Password Reset Link
                      </button>
                    </div>
                  </div>
                </div>

                <div className="col-12">
                  <div className="card-portal p-4">
                    <h5 className="fw-bold text-dark mb-2">System Administration Modules</h5>
                    <p className="text-muted small mb-3">Direct access to core IT governance, audit logs, backup & restore, and system configurations.</p>
                    <div className="row g-3">
                      <div className="col-md-3">
                        <div className="p-3 border rounded-3 bg-light h-100" onClick={() => handleNavTab('systemAdmin')} style={{ cursor: 'pointer' }}>
                          <div className="text-success fs-4 mb-1"><i className="bi bi-journal-text"></i></div>
                          <strong className="text-dark d-block">Audit Logs</strong>
                          <small className="text-muted">Inspect security audit trail & event history</small>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="p-3 border rounded-3 bg-light h-100" onClick={() => handleNavTab('systemAdmin')} style={{ cursor: 'pointer' }}>
                          <div className="text-primary fs-4 mb-1"><i className="bi bi-cloud-arrow-up"></i></div>
                          <strong className="text-dark d-block">Backup & Restore</strong>
                          <small className="text-muted">Cloud snapshots & point-in-time recovery</small>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="p-3 border rounded-3 bg-light h-100" onClick={() => handleNavTab('systemAdmin')} style={{ cursor: 'pointer' }}>
                          <div className="text-warning fs-4 mb-1"><i className="bi bi-shield-check"></i></div>
                          <strong className="text-dark d-block">Access Policies</strong>
                          <small className="text-muted">Role permissions & data privacy policies</small>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="p-3 border rounded-3 bg-light h-100" onClick={() => handleNavTab('systemAdmin')} style={{ cursor: 'pointer' }}>
                          <div className="fs-4 mb-1" style={{ color: '#8B5CF6' }}><i className="bi bi-sliders"></i></div>
                          <strong className="text-dark d-block">System Settings</strong>
                          <small className="text-muted">Session timeout & runtime configuration</small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
            </>
          )}
        </main>
      </div>

      {/* ==============================================================================
          MODALS & OVERLAYS
          ============================================================================== */}

      {/* SCREEN 4: CREATE REQUISITION 3-STEP WIZARD */}
      {showReqModal && (
        <CreateRequisitionWizard 
          onClose={() => setShowReqModal(false)}
          onSubmit={handleCreateRequisitionSubmit}
        />
      )}

      {/* SCREEN 9: INTERVIEW FEEDBACK EVALUATION MODAL */}
      {showFeedbackModal && (
        <InterviewFeedbackModal 
          candidate={feedbackCandidate}
          interview={feedbackInterview}
          onClose={() => setShowFeedbackModal(false)}
          onSubmit={handleFeedbackSubmit}
        />
      )}

      {/* SCREEN 13: ADD EMPLOYEE MODAL */}
      {showAddEmpModal && (
        <div className="urja-modal-backdrop" onClick={() => setShowAddEmpModal(false)}>
          <div className="urja-modal-card" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="urja-modal-header">
              <h4 className="fw-bold mb-0">Register New Employee</h4>
              <button className="urja-modal-close-btn" onClick={() => setShowAddEmpModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddEmployee}>
              <div className="urja-modal-body p-3">
                <div className="mb-3">
                  <label className="form-label small fw-bold">Full Name *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={newEmpForm.name}
                    onChange={e => setNewEmpForm({ ...newEmpForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Designation / Role *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={newEmpForm.role}
                    onChange={e => setNewEmpForm({ ...newEmpForm, role: e.target.value })}
                    required
                  />
                </div>
                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <label className="form-label small fw-bold">Department</label>
                    <select 
                      className="form-select"
                      value={newEmpForm.dept}
                      onChange={e => setNewEmpForm({ ...newEmpForm, dept: e.target.value })}
                    >
                      {INITIAL_DEPARTMENTS.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-bold">Location</label>
                    <select 
                      className="form-select"
                      value={newEmpForm.location}
                      onChange={e => setNewEmpForm({ ...newEmpForm, location: e.target.value })}
                    >
                      {INITIAL_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="urja-modal-footer">
                <button type="button" className="btn btn-light" onClick={() => setShowAddEmpModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-success fw-bold">Register Employee</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NOTIFICATIONS MODAL */}
      {showNotificationsModal && (
        <div className="urja-modal-backdrop" onClick={() => setShowNotificationsModal(false)}>
          <div className="urja-modal-card" style={{ maxWidth: '640px', width: '100%' }} onClick={e => e.stopPropagation()}>
            <div className="urja-modal-header d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <h4 className="fw-bold mb-0">System Alerts & Notifications</h4>
                {unreadNotifCount > 0 ? (
                  <span className="badge bg-danger rounded-pill px-2.5 py-1 small">
                    {unreadNotifCount} Unread
                  </span>
                ) : (
                  <span className="badge bg-secondary-subtle text-secondary rounded-pill px-2.5 py-1 small">
                    0 Unread
                  </span>
                )}
              </div>
              <div className="d-flex align-items-center gap-2">
                <button 
                  type="button"
                  className="btn btn-sm btn-outline-primary fw-semibold"
                  onClick={handleMarkAllAsRead}
                  disabled={unreadNotifCount === 0}
                  title="Mark all notifications as read"
                >
                  <i className="bi bi-check2-all me-1"></i> Mark All as Read
                </button>
                <button className="urja-modal-close-btn" onClick={() => setShowNotificationsModal(false)} aria-label="Close">✕</button>
              </div>
            </div>

            <div className="urja-modal-body p-3" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {isLoadingNotifs && notifications.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                  Loading alerts...
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-bell-slash fs-1 d-block mb-2 text-secondary opacity-50"></i>
                  <p className="mb-0">No notifications in your inbox.</p>
                </div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {notifications.map(notif => {
                    const isRead = notif.readStatus === 'READ' || notif.isRead === true || notif.unread === false;
                    return (
                      <div 
                        key={notif.id} 
                        className={`p-3 border rounded-3 d-flex align-items-start gap-3 transition-all ${
                          isRead ? 'urja-notif-card-read' : 'urja-notif-card-unread'
                        }`}
                        style={{
                          backgroundColor: isRead ? '#F1F3F5' : '#FFFFFF',
                          borderColor: isRead ? '#E2E8F0' : '#CBD5E1',
                          cursor: isRead ? 'default' : 'pointer',
                          transition: 'background-color 0.2s ease, border-color 0.2s ease'
                        }}
                        onClick={() => !isRead && handleMarkAsRead(notif.id)}
                        role="button"
                        tabIndex={0}
                        title={isRead ? 'Notification marked as READ' : 'Click to mark as READ'}
                      >
                        {/* Status Icon */}
                        <div className="pt-0.5">
                          {isRead ? (
                            <i className="bi bi-bell text-secondary fs-5" style={{ color: '#868E96' }}></i>
                          ) : (
                            <i className="bi bi-bell-fill text-success fs-5"></i>
                          )}
                        </div>

                        {/* Notification Details */}
                        <div className="flex-grow-1 min-w-0">
                          <div className="d-flex justify-content-between align-items-baseline gap-2 mb-1">
                            <span 
                              className={`fw-bold ${isRead ? 'text-muted' : 'text-dark'}`}
                              style={{ color: isRead ? '#495057' : '#0F172A', fontSize: '0.95rem' }}
                            >
                              {notif.title}
                            </span>
                            <span 
                              className="small"
                              style={{ color: isRead ? '#868E96' : '#64748B', whiteSpace: 'nowrap', fontSize: '0.78rem' }}
                            >
                              {notif.time || (notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')}
                            </span>
                          </div>

                          <div 
                            className="small mb-2"
                            style={{ color: isRead ? '#6C757D' : '#334155', lineHeight: '1.45' }}
                          >
                            {notif.message}
                          </div>

                          <div className="d-flex justify-content-between align-items-center pt-1 border-top border-light-subtle">
                            {isRead ? (
                              <span 
                                className="badge bg-light border text-secondary rounded-pill px-2 py-0.5"
                                style={{ fontSize: '0.72rem', color: '#6C757D', borderColor: '#DEE2E6' }}
                              >
                                <i className="bi bi-check2 me-1"></i> Read
                              </span>
                            ) : (
                              <div className="d-flex align-items-center gap-2">
                                <span 
                                  className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-0.5"
                                  style={{ fontSize: '0.72rem' }}
                                >
                                  ● Unread
                                </span>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-link text-primary text-decoration-none p-0 fw-semibold"
                                  style={{ fontSize: '0.78rem' }}
                                  onClick={(e) => handleMarkAsRead(notif.id, e)}
                                >
                                  Read Message
                                </button>
                              </div>
                            )}

                            {notif.targetUrl && (
                              <span className="small text-muted" style={{ fontSize: '0.72rem' }}>
                                <i className="bi bi-link-45deg me-0.5"></i>
                                {notif.targetUrl}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="urja-modal-footer d-flex justify-content-between align-items-center">
              <span className="small text-muted">
                Showing {notifications.length} {notifications.length === 1 ? 'alert' : 'alerts'} in history
              </span>
              <button 
                type="button" 
                className="btn btn-secondary px-4 fw-semibold"
                onClick={() => setShowNotificationsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DATE RANGE MODAL */}
      {showDateModal && (
        <div className="urja-modal-backdrop" onClick={() => setShowDateModal(false)}>
          <div className="urja-modal-card" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="urja-modal-header">
              <h4 className="fw-bold mb-0">Select Date Range</h4>
              <button className="urja-modal-close-btn" onClick={() => setShowDateModal(false)}>✕</button>
            </div>
            <div className="urja-modal-body p-3">
              <div className="d-flex flex-column gap-2">
                {['01 Oct 2026 - 31 Oct 2026', 'Last 30 Days', 'Current Quarter (Q4 2026)', 'Year to Date (FY 2026-27)'].map(range => (
                  <button 
                    key={range}
                    className={`btn text-start ${dateRangeText === range ? 'btn-success text-white' : 'btn-outline-secondary'}`}
                    onClick={() => { setDateRangeText(range); setShowDateModal(false); showToast(`Date filter: ${range}`); }}
                  >
                    <i className="bi bi-calendar3 me-2"></i> {range}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DYNAMIC TOAST */}
      {toastMessage && (
        <div className="position-fixed bottom-0 end-0 p-3" style={{ zIndex: 9999 }}>
          <div className="toast show align-items-center text-white bg-dark border-0 shadow-lg" role="alert">
            <div className="d-flex">
              <div className="toast-body d-flex align-items-center gap-2">
                <i className="bi bi-check-circle-fill text-success"></i> {toastMessage}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
