import React, { useState, useEffect, useMemo } from 'react';
import '../styles/urja-usermanagement.css';
import { INITIAL_USERS } from '../data/mockData';

// Helper to extract clean string role name
const getRoleString = (r) => {
  if (!r) return '';
  if (typeof r === 'string') return r;
  if (typeof r === 'object') return r.roleName || r.name || r.id || '';
  return String(r);
};

// Helper to extract clean 2-letter uppercase initials ignoring bracketed roles like (VP)
const getInitials = (name) => {
  if (!name) return 'U';
  const clean = name.replace(/\([^)]*\)/g, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function UserManagementView({ currentUser, showToast, onNavigateToTasks }) {
  // 1. Data States
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    pendingTasks: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 2. Search & Filters (draft + applied)
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterDept, setFilterDept] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterTaskAssign, setFilterTaskAssign] = useState('ALL');

  // 3. Selection & Bulk Action
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  // 4. Sorting & Pagination (Default sort by id ascending so Vikramaditya & Priyanka are on top)
  const [sortField, setSortField] = useState('id');
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // 5. Modals & Drawers
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [viewingUserTasks, setViewingUserTasks] = useState([]);
  const [isLoadingUserTasks, setIsLoadingUserTasks] = useState(false);
  const [deleteCandidateUser, setDeleteCandidateUser] = useState(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // 6. Form States
  const [newUserForm, setNewUserForm] = useState({
    username: '',
    name: '',
    email: '',
    password: 'password',
    role: 'ROLE_HR_RECRUITER',
    departmentId: 3,
    designation: 'Senior Technical Recruiter',
    status: 'ACTIVE'
  });

  const [editUserForm, setEditUserForm] = useState({
    name: '',
    email: '',
    role: 'ROLE_HR_RECRUITER',
    departmentId: 3,
    status: 'ACTIVE'
  });

  const getToken = () => sessionStorage.getItem('ats_urja_token') || currentUser?.token || '';

  // --------------------------------------------------------------------------
  // API Calls
  // --------------------------------------------------------------------------
  const fetchStats = () => {
    fetch('http://localhost:8080/api/v1/admin/users/stats', {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
      .then(res => res.ok ? res.json() : null)
      .then(body => {
        if (body && body.data) {
          setStats({
            totalUsers: body.data.totalUsers ?? 0,
            activeUsers: body.data.activeUsers ?? 0,
            inactiveUsers: body.data.inactiveUsers ?? 0,
            pendingTasks: body.data.pendingTasks ?? 0
          });
        }
      })
      .catch(err => {
        console.warn('Backend user stats API error:', err);
      });
  };

  const fetchUsers = () => {
    setIsLoading(true);
    fetch('http://localhost:8080/api/v1/admin/users', {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Failed to fetch users');
      })
      .then(body => {
        setIsLoading(false);
        if (body && body.data && Array.isArray(body.data)) {
          const normalized = body.data.map(u => {
            const roleList = (u.roles || []).map(r => getRoleString(r));
            const nonEmployeeRole = roleList.find(r => r !== 'ROLE_EMPLOYEE');
            const primary = nonEmployeeRole || roleList[0] || getRoleString(u.role) || 'ROLE_EMPLOYEE';
            return {
              ...u,
              role: primary,
              roles: roleList.length > 0 ? roleList : [primary],
              department: u.department || 'Human Resources',
              designation: u.designation || u.title || 'Panel Member',
              assignedTasksCount: u.assignedTasksCount || 0
            };
          });
          setUsers(normalized);

          // Update stats
          setStats(prev => ({
            totalUsers: prev.totalUsers || normalized.length,
            activeUsers: prev.activeUsers || normalized.filter(x => x.status === 'ACTIVE').length,
            inactiveUsers: prev.inactiveUsers || normalized.filter(x => x.status !== 'ACTIVE').length,
            pendingTasks: prev.pendingTasks || 11
          }));
        }
      })
      .catch(err => {
        setIsLoading(false);
        console.warn('Backend users API error, using initial list:', err);
        setUsers(INITIAL_USERS);
        setStats({
          totalUsers: INITIAL_USERS.length,
          activeUsers: INITIAL_USERS.filter(x => x.status === 'ACTIVE').length,
          inactiveUsers: INITIAL_USERS.filter(x => x.status !== 'ACTIVE').length,
          pendingTasks: 11
        });
      });

    fetchStats();
  };

  useEffect(() => {
    fetchUsers();
  }, [currentUser]);

  // --------------------------------------------------------------------------
  // Handlers: Search & Filter
  // --------------------------------------------------------------------------
  const handleApplyFilters = () => {
    setAppliedSearch(searchQuery);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setAppliedSearch('');
    setFilterRole('ALL');
    setFilterDept('ALL');
    setFilterStatus('ALL');
    setFilterTaskAssign('ALL');
    setCurrentPage(1);
  };

  // --------------------------------------------------------------------------
  // Selection Handlers
  // --------------------------------------------------------------------------
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allSelectableIds = filteredUsers
        .filter(u => u.username !== 'itadmin' && u.id !== 1 && u.id !== currentUser?.id)
        .map(u => u.id);
      setSelectedUserIds(allSelectableIds);
    } else {
      setSelectedUserIds([]);
    }
  };

  const handleSelectRow = (id, isChecked) => {
    if (isChecked) {
      setSelectedUserIds(prev => [...prev, id]);
    } else {
      setSelectedUserIds(prev => prev.filter(item => item !== id));
    }
  };

  // --------------------------------------------------------------------------
  // Handlers: Delete (Individual & Bulk)
  // --------------------------------------------------------------------------
  // Stage 1 – Deactivate User
  const confirmDeactivateUser = () => {
    if (!deleteCandidateUser) return;
    setIsDeleting(true);

    fetch(`http://localhost:8080/api/v1/admin/users/${deleteCandidateUser.id}/deactivate`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
      .then(res => {
        setIsDeleting(false);
        setDeleteCandidateUser(null);
        if (res.ok) {
          showToast?.('User deactivated successfully.', 'success');
          fetchUsers();
          fetchStats();
        } else {
          res.json().then(e => {
            showToast?.(e.message || 'Failed to deactivate user', 'error');
          }).catch(() => {
            showToast?.('Error deactivating user', 'error');
          });
        }
      })
      .catch(err => {
        setIsDeleting(false);
        setDeleteCandidateUser(null);
        showToast?.(err.message || 'Network error deactivating user', 'error');
      });
  };

  // Stage 2 – Permanently Delete User
  const confirmPermanentDelete = () => {
    if (!deleteCandidateUser) return;
    setIsDeleting(true);

    fetch(`http://localhost:8080/api/v1/admin/users/${deleteCandidateUser.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
      .then(res => {
        setIsDeleting(false);
        const deletedId = deleteCandidateUser.id;
        setDeleteCandidateUser(null);
        if (res.ok) {
          showToast?.('User permanently deleted successfully.', 'success');
          setSelectedUserIds(prev => prev.filter(id => id !== deletedId));
          fetchUsers();
          fetchStats();
        } else {
          res.json().then(e => {
            showToast?.(e.message || 'Failed to permanently delete user', 'error');
          }).catch(() => {
            showToast?.('Error permanently deleting user', 'error');
          });
        }
      })
      .catch(err => {
        setIsDeleting(false);
        setDeleteCandidateUser(null);
        showToast?.(err.message || 'Network error permanently deleting user', 'error');
      });
  };

  const confirmBulkDelete = () => {
    if (selectedUserIds.length === 0) return;
    setIsDeleting(true);

    fetch('http://localhost:8080/api/v1/admin/users/bulk-delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ userIds: selectedUserIds })
    })
      .then(res => {
        setIsDeleting(false);
        setShowBulkDeleteModal(false);
        if (res.ok) {
          showToast?.(`${selectedUserIds.length} user(s) removed or deactivated successfully.`, 'success');
          setSelectedUserIds([]);
          fetchUsers();
          fetchStats();
        } else {
          res.json().then(e => {
            showToast?.(e.message || 'Bulk delete operation failed', 'error');
          }).catch(() => {
            showToast?.('Error performing bulk delete', 'error');
          });
        }
      })
      .catch(err => {
        setIsDeleting(false);
        setShowBulkDeleteModal(false);
        showToast?.(err.message || 'Network error performing bulk delete', 'error');
      });
  };

  // --------------------------------------------------------------------------
  // Handlers: Add & Edit User
  // --------------------------------------------------------------------------
  const handleAddUserSubmit = (e) => {
    e.preventDefault();
    const trimmedName = newUserForm.name.trim();
    const trimmedEmail = newUserForm.email.trim().toLowerCase();
    const trimmedUsername = (newUserForm.username.trim() || trimmedEmail.split('@')[0]).toLowerCase();

    if (!trimmedName) {
      showToast?.('Please enter user full name', 'warning');
      return;
    }

    if (!trimmedEmail) {
      showToast?.('Please enter a valid work email', 'warning');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      showToast?.('Invalid work email address format', 'warning');
      return;
    }

    // Check duplicate email
    if (users.some(u => (u.email || '').toLowerCase() === trimmedEmail)) {
      showToast?.(`A user with work email "${trimmedEmail}" already exists.`, 'error');
      return;
    }

    // Check duplicate username
    if (users.some(u => (u.username || '').toLowerCase() === trimmedUsername)) {
      showToast?.(`Username "${trimmedUsername}" is already taken. Please choose another username.`, 'error');
      return;
    }

    const payload = {
      username: trimmedUsername,
      name: trimmedName,
      email: trimmedEmail,
      password: newUserForm.password || 'password',
      roles: [newUserForm.role],
      departmentId: Number(newUserForm.departmentId) || 3,
      status: newUserForm.status || 'ACTIVE'
    };

    fetch('http://localhost:8080/api/v1/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(payload)
    })
      .then(res => {
        if (res.ok) return res.json();
        return res.json().then(errData => { throw new Error(errData.message || 'Failed to create user'); });
      })
      .then(() => {
        setShowAddModal(false);
        showToast?.(`User account created successfully: ${trimmedName}`, 'success');
        fetchUsers();
        fetchStats();
        setNewUserForm({
          username: '',
          name: '',
          email: '',
          password: 'password',
          role: 'ROLE_HR_RECRUITER',
          departmentId: 3,
          designation: 'Senior Technical Recruiter',
          status: 'ACTIVE'
        });
      })
      .catch(err => {
        showToast?.(err.message || 'Error creating user', 'error');
      });
  };

  const handleEditUserSubmit = (e) => {
    e.preventDefault();
    if (!editingUser) return;
    const trimmedName = editUserForm.name.trim();
    const trimmedEmail = editUserForm.email.trim().toLowerCase();

    if (!trimmedName || !trimmedEmail) {
      showToast?.('Name and email are mandatory', 'warning');
      return;
    }

    // Check duplicate email with another user
    if (users.some(u => u.id !== editingUser.id && (u.email || '').toLowerCase() === trimmedEmail)) {
      showToast?.(`Another user already has the email "${trimmedEmail}".`, 'error');
      return;
    }

    const payload = {
      name: trimmedName,
      email: trimmedEmail,
      roles: [editUserForm.role],
      departmentId: Number(editUserForm.departmentId) || 3,
      status: editUserForm.status || 'ACTIVE'
    };

    fetch(`http://localhost:8080/api/v1/admin/users/${editingUser.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(payload)
    })
      .then(res => {
        if (res.ok) return res.json();
        return res.json().then(e => { throw new Error(e.message || 'Failed to update user'); });
      })
      .then(() => {
        setShowEditModal(false);
        showToast?.(`User details updated: ${trimmedName}`, 'success');
        fetchUsers();
        fetchStats();
      })
      .catch(err => {
        showToast?.(err.message || 'Error updating user details', 'error');
      });
  };

  // --------------------------------------------------------------------------
  // Details Modal & Tasks
  // --------------------------------------------------------------------------
  const handleOpenDetails = (u) => {
    setViewingUser(u);
    setIsLoadingUserTasks(true);
    fetch(`http://localhost:8080/api/v1/tasks?assignedUserId=${u.id}&size=20`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        setIsLoadingUserTasks(false);
        if (d && d.data) {
          setViewingUserTasks(d.data.content || []);
        } else {
          setViewingUserTasks([]);
        }
      })
      .catch(() => {
        setIsLoadingUserTasks(false);
        setViewingUserTasks([]);
      });
  };

  // --------------------------------------------------------------------------
  // Filtered and Sorted Users
  // --------------------------------------------------------------------------
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // 1. Search Query
      const query = (appliedSearch || searchQuery).trim().toLowerCase();
      if (query) {
        const inName = (u.name || '').toLowerCase().includes(query);
        const inEmail = (u.email || '').toLowerCase().includes(query);
        const inUser = (u.username || '').toLowerCase().includes(query);
        const inDesig = (u.designation || '').toLowerCase().includes(query);
        const inDept = (u.department || '').toLowerCase().includes(query);
        if (!inName && !inEmail && !inUser && !inDesig && !inDept) return false;
      }

      // 2. Role Filter
      if (filterRole !== 'ALL') {
        const hasRole = (u.roles || []).includes(filterRole) || u.role === filterRole;
        if (!hasRole) return false;
      }

      // 3. Department Filter
      if (filterDept !== 'ALL') {
        if (!u.department || !u.department.toLowerCase().includes(filterDept.toLowerCase())) {
          return false;
        }
      }

      // 4. Status Filter
      if (filterStatus !== 'ALL') {
        if (filterStatus === 'ACTIVE' && u.status !== 'ACTIVE') return false;
        if (filterStatus === 'INACTIVE' && u.status === 'ACTIVE') return false;
      }

      // 5. Task Status Filter
      if (filterTaskAssign !== 'ALL') {
        if (filterTaskAssign === 'WITH_TASKS' && (!u.assignedTasksCount || u.assignedTasksCount === 0)) return false;
        if (filterTaskAssign === 'NO_TASKS' && u.assignedTasksCount > 0) return false;
      }

      return true;
    }).sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [users, appliedSearch, searchQuery, filterRole, filterDept, filterStatus, filterTaskAssign, sortField, sortAsc]);

  // Pagination Slice
  const totalUsers = filteredUsers.length;
  const totalPages = Math.ceil(totalUsers / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalUsers);
  const paginatedUsers = useMemo(() => {
    return filteredUsers.slice(startIndex, endIndex);
  }, [filteredUsers, startIndex, endIndex]);

  // Role Badges Renderer
  const renderRoleBadge = (roleName) => {
    const r = getRoleString(roleName);
    switch (r) {
      case 'ROLE_IT_ADMIN':
        return (
          <span className="urja-role-badge itadmin">
            <i className="bi bi-shield-fill"></i> IT Admin
          </span>
        );
      case 'ROLE_HR_ADMIN':
        return (
          <span className="urja-role-badge hradmin">
            <i className="bi bi-shield-fill"></i> HR Admin
          </span>
        );
      case 'ROLE_HR_RECRUITER':
        return (
          <span className="urja-role-badge recruiter">
            <i className="bi bi-shield-fill"></i> Recruiter
          </span>
        );
      case 'ROLE_INTERVIEWER':
        return (
          <span className="urja-role-badge interviewer">
            <i className="bi bi-shield-fill"></i> Interviewer
          </span>
        );
      case 'ROLE_DEPT_HEAD':
        return (
          <span className="urja-role-badge depthead">
            <i className="bi bi-shield-fill"></i> Dept Head
          </span>
        );
      case 'ROLE_APPROVING_MANAGER':
        return (
          <span className="urja-role-badge approver">
            <i className="bi bi-shield-fill"></i> Approver
          </span>
        );
      case 'ROLE_SENIOR_MGMT':
        return (
          <span className="urja-role-badge depthead">
            <i className="bi bi-shield-fill"></i> Senior Mgmt
          </span>
        );
      default:
        return (
          <span className="urja-role-badge default">
            <i className="bi bi-person-badge"></i> {r.replace('ROLE_', '') || 'Employee'}
          </span>
        );
    }
  };

  const isAllSelectableSelected = useMemo(() => {
    const selectable = paginatedUsers.filter(u => u.username !== 'itadmin' && u.id !== 1 && u.id !== currentUser?.id);
    return selectable.length > 0 && selectable.every(u => selectedUserIds.includes(u.id));
  }, [paginatedUsers, selectedUserIds, currentUser]);

  return (
    <div className="urja-usermgmt-container">
      {/* ========================================================================
          1. PAGE HEADER (Mandatory: Refresh, Assign Tasks, Add User)
          ======================================================================== */}
      <div className="urja-usermgmt-header">
        <div className="urja-usermgmt-header-left">
          <div className="urja-usermgmt-header-icon">
            <i className="bi bi-people-fill"></i>
          </div>
          <div className="urja-usermgmt-title-cluster">
            <h1 className="urja-usermgmt-title">System User Management</h1>
            <p className="urja-usermgmt-subtitle">
              Manage enterprise application users, security roles, and recruitment team workloads.
            </p>
          </div>
        </div>

        <div className="urja-usermgmt-header-actions">
          <button 
            type="button"
            className="urja-usermgmt-btn-refresh"
            onClick={() => { fetchUsers(); fetchStats(); }}
            disabled={isLoading}
            title="Refresh user accounts and metrics"
          >
            <i className={`bi bi-arrow-clockwise ${isLoading ? 'spin' : ''}`}></i>
            <span>Refresh</span>
          </button>

          <button 
            type="button"
            className="urja-usermgmt-btn-assign-tasks"
            onClick={() => {
              if (onNavigateToTasks) onNavigateToTasks();
              else window.location.href = '/?tab=tasks';
            }}
            title="Assign recruitment tasks"
          >
            <i className="bi bi-list-task"></i>
            <span>Assign Tasks</span>
          </button>

          <button 
            type="button"
            className="urja-usermgmt-btn-add-user"
            onClick={() => setShowAddModal(true)}
            id="btn-add-system-user"
            title="Provision new system user account"
          >
            <i className="bi bi-person-plus-fill"></i>
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* ========================================================================
          2. DASHBOARD KPI CARDS (Real backend statistics)
          ======================================================================== */}
      <div className="urja-usermgmt-stats-grid">
        {/* Card 1: Total Users */}
        <div className="urja-usermgmt-stat-card">
          <div className="urja-usermgmt-stat-icon mint">
            <i className="bi bi-people-fill"></i>
          </div>
          <div className="urja-usermgmt-stat-content">
            <div className="urja-usermgmt-stat-value">{stats.totalUsers}</div>
            <div className="urja-usermgmt-stat-label">Total Users</div>
          </div>
          <svg className="urja-usermgmt-stat-wave" viewBox="0 0 100 80" fill="none">
            <path d="M0 80 C 40 40, 60 70, 100 20 L 100 80 Z" fill="#E8F6ED" opacity="0.6"/>
          </svg>
        </div>

        {/* Card 2: Active Users */}
        <div className="urja-usermgmt-stat-card">
          <div className="urja-usermgmt-stat-icon green">
            <i className="bi bi-person-check-fill"></i>
          </div>
          <div className="urja-usermgmt-stat-content">
            <div className="urja-usermgmt-stat-value">{stats.activeUsers}</div>
            <div className="urja-usermgmt-stat-label">Active Users</div>
          </div>
          <svg className="urja-usermgmt-stat-wave" viewBox="0 0 100 80" fill="none">
            <path d="M0 80 C 40 35, 65 65, 100 15 L 100 80 Z" fill="#DCFCE7" opacity="0.7"/>
          </svg>
        </div>

        {/* Card 3: Inactive Users */}
        <div className="urja-usermgmt-stat-card">
          <div className="urja-usermgmt-stat-icon red">
            <i className="bi bi-person-x-fill"></i>
          </div>
          <div className="urja-usermgmt-stat-content">
            <div className="urja-usermgmt-stat-value">{stats.inactiveUsers}</div>
            <div className="urja-usermgmt-stat-label">Inactive Users</div>
          </div>
          <svg className="urja-usermgmt-stat-wave" viewBox="0 0 100 80" fill="none">
            <path d="M0 80 C 35 45, 60 75, 100 25 L 100 80 Z" fill="#FEE2E2" opacity="0.6"/>
          </svg>
        </div>

        {/* Card 4: Pending Tasks */}
        <div className="urja-usermgmt-stat-card">
          <div className="urja-usermgmt-stat-icon amber">
            <i className="bi bi-clock"></i>
          </div>
          <div className="urja-usermgmt-stat-content">
            <div className="urja-usermgmt-stat-value">{stats.pendingTasks}</div>
            <div className="urja-usermgmt-stat-label">Pending Tasks</div>
          </div>
          <svg className="urja-usermgmt-stat-wave" viewBox="0 0 100 80" fill="none">
            <path d="M0 80 C 40 35, 65 65, 100 20 L 100 80 Z" fill="#FEF3C7" opacity="0.6"/>
          </svg>
        </div>
      </div>

      {/* ========================================================================
          3. ADVANCED SEARCH AND FILTER SECTION
          ======================================================================== */}
      <div className="urja-usermgmt-filter-card">
        {/* Left: Search Bar with integrated Search button */}
        <div className="urja-usermgmt-search-box">
          <i className="bi bi-search urja-usermgmt-search-icon"></i>
          <input 
            type="text" 
            className="urja-usermgmt-search-input"
            placeholder="Search by user name, work email, or designation..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleApplyFilters(); }}
          />
          {searchQuery && (
            <button 
              type="button" 
              className="urja-usermgmt-search-clear" 
              onClick={() => { setSearchQuery(''); setAppliedSearch(''); setCurrentPage(1); }}
              title="Clear search"
            >
              <i className="bi bi-x-circle-fill"></i>
            </button>
          )}
          <button 
            type="button" 
            className="urja-usermgmt-search-btn"
            onClick={handleApplyFilters}
          >
            Search
          </button>
        </div>

        {/* Right: 4 Filter Dropdowns & Action Buttons */}
        <div className="urja-usermgmt-filters-cluster">
          <div className="urja-usermgmt-dropdown-grid">
            {/* Filter 1: Role */}
            <div className="urja-usermgmt-select-wrap">
              <i className="bi bi-layers urja-usermgmt-select-icon"></i>
              <select 
                className="urja-usermgmt-select"
                value={filterRole}
                onChange={e => { setFilterRole(e.target.value); setCurrentPage(1); }}
              >
                <option value="ALL">All System Roles</option>
                <option value="ROLE_IT_ADMIN">IT Administrator</option>
                <option value="ROLE_HR_ADMIN">HR Administrator</option>
                <option value="ROLE_HR_RECRUITER">HR Recruiter</option>
                <option value="ROLE_INTERVIEWER">Technical Interviewer</option>
                <option value="ROLE_DEPT_HEAD">Department Head</option>
                <option value="ROLE_APPROVING_MANAGER">Approving Manager</option>
              </select>
            </div>

            {/* Filter 2: Department */}
            <div className="urja-usermgmt-select-wrap">
              <i className="bi bi-building urja-usermgmt-select-icon"></i>
              <select 
                className="urja-usermgmt-select"
                value={filterDept}
                onChange={e => { setFilterDept(e.target.value); setCurrentPage(1); }}
              >
                <option value="ALL">All Departments</option>
                <option value="Human Resources">Human Resources</option>
                <option value="Engineering & Technology">Engineering & Technology</option>
                <option value="Plant Operations">Plant Operations</option>
                <option value="Finance">Finance & Accounts</option>
                <option value="Global Sales">Global Sales & BD</option>
                <option value="Operations">Operations & Supply</option>
              </select>
            </div>

            {/* Filter 3: Account Status */}
            <div className="urja-usermgmt-select-wrap">
              <i className="bi bi-shield-check urja-usermgmt-select-icon"></i>
              <select 
                className="urja-usermgmt-select"
                value={filterStatus}
                onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
              >
                <option value="ALL">All Account Statuses</option>
                <option value="ACTIVE">Active Accounts</option>
                <option value="INACTIVE">Inactive Accounts</option>
              </select>
            </div>

            {/* Filter 4: Task Status */}
            <div className="urja-usermgmt-select-wrap">
              <i className="bi bi-list-task urja-usermgmt-select-icon"></i>
              <select 
                className="urja-usermgmt-select"
                value={filterTaskAssign}
                onChange={e => { setFilterTaskAssign(e.target.value); setCurrentPage(1); }}
              >
                <option value="ALL">All Task Statuses</option>
                <option value="WITH_TASKS">With Assigned Tasks</option>
                <option value="NO_TASKS">No Assigned Tasks</option>
              </select>
            </div>
          </div>

          <div className="urja-usermgmt-filter-actions">
            <button 
              type="button" 
              className="urja-usermgmt-btn-clear"
              onClick={handleClearFilters}
              title="Reset all filters"
            >
              <i className="bi bi-arrow-counterclockwise"></i>
              <span>Clear</span>
            </button>

            <button 
              type="button" 
              className="urja-usermgmt-btn-apply"
              onClick={handleApplyFilters}
            >
              <i className="bi bi-funnel-fill"></i>
              <span>Apply Filters</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================
          4. SELECTION STRIP & BULK ACTIONS (Mandatory: Checkbox, Count, Delete Selected)
          ======================================================================== */}
      <div className="urja-usermgmt-selection-strip">
        <label className="urja-usermgmt-select-all-label">
          <input 
            type="checkbox" 
            className="urja-usermgmt-checkbox"
            checked={isAllSelectableSelected}
            onChange={handleSelectAll}
          />
          <span>{selectedUserIds.length} selected</span>
        </label>

        <button 
          type="button"
          className={`urja-usermgmt-btn-delete-bulk ${selectedUserIds.length > 0 ? 'active' : 'disabled'}`}
          disabled={selectedUserIds.length === 0}
          onClick={() => setShowBulkDeleteModal(true)}
          title={selectedUserIds.length > 0 ? `Delete ${selectedUserIds.length} selected user(s)` : 'Select one or more users to enable delete'}
        >
          <i className="bi bi-trash"></i>
          <span>Delete Selected</span>
        </button>
      </div>

      {/* ========================================================================
          5. USER MANAGEMENT TABLE
          ======================================================================== */}
      <div className="urja-usermgmt-table-card">
        <div className="urja-usermgmt-table-wrap">
          <table className="urja-usermgmt-table">
            <thead>
              <tr>
                <th style={{ width: 38, textAlign: 'center' }}>
                  <input 
                    type="checkbox" 
                    className="urja-usermgmt-checkbox"
                    checked={isAllSelectableSelected}
                    onChange={handleSelectAll}
                    title="Select / Deselect all"
                  />
                </th>
                <th 
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => {
                    if (sortField === 'name') setSortAsc(!sortAsc);
                    else { setSortField('name'); setSortAsc(true); }
                  }}
                >
                  Name <i className="bi bi-arrow-down-up ms-1" style={{ fontSize: '0.75rem' }}></i>
                </th>
                <th>Work Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Account Status</th>
                <th style={{ textAlign: 'center' }}>Assigned Tasks</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '3.5rem' }}>
                    <div className="spinner-border text-success" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="text-muted small mt-2 mb-0">Loading enterprise user accounts...</p>
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '3.5rem' }}>
                    <i className="bi bi-people text-muted" style={{ fontSize: '2.4rem' }}></i>
                    <h6 className="fw-bold text-dark mt-2 mb-1">No System Users Found</h6>
                    <p className="text-muted small mb-0">Try adjusting your search criteria or resetting filters.</p>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => {
                  const isActive = u.status === 'ACTIVE';
                  const isSelected = selectedUserIds.includes(u.id);
                  const isProtected = u.username === 'itadmin' || u.id === 1 || u.id === currentUser?.id;
                  const taskCount = u.assignedTasksCount || 0;
                  const initials = getInitials(u.name);

                  return (
                    <tr key={u.id} className={isSelected ? 'selected' : ''}>
                      {/* Checkbox */}
                      <td style={{ textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          className="urja-usermgmt-checkbox"
                          checked={isSelected}
                          disabled={isProtected}
                          onChange={(e) => handleSelectRow(u.id, e.target.checked)}
                          title={isProtected ? 'Protected system account' : 'Select user'}
                        />
                      </td>

                      {/* Name with initials avatar */}
                      <td>
                        <div className="urja-user-cell">
                          <div className="urja-user-avatar">
                            {initials}
                          </div>
                          <div className="urja-user-meta">
                            <span className="urja-user-name">{u.name}</span>
                            <span className="urja-user-handle">@{u.username || u.email?.split('@')[0]}</span>
                          </div>
                        </div>
                      </td>

                      {/* Work Email */}
                      <td>
                        <div className="urja-user-email">
                          <i className="bi bi-envelope"></i>
                          <span>{u.email}</span>
                        </div>
                      </td>

                      {/* Role */}
                      <td>
                        {renderRoleBadge(u.role)}
                      </td>

                      {/* Department */}
                      <td>
                        <div className="urja-dept-cell" title={u.department}>
                          <i className="bi bi-diagram-3"></i>
                          <span>{u.department}</span>
                        </div>
                      </td>

                      {/* Designation */}
                      <td>
                        <span className="urja-designation-cell" title={u.designation}>{u.designation}</span>
                      </td>

                      {/* Account Status */}
                      <td>
                        {isActive ? (
                          <span className="urja-status-pill active">
                            <i className="bi bi-check-circle-fill"></i> ACTIVE
                          </span>
                        ) : (
                          <span className="urja-status-pill inactive">
                            <i className="bi bi-x-circle-fill"></i> INACTIVE
                          </span>
                        )}
                      </td>

                      {/* Assigned Tasks */}
                      <td style={{ textAlign: 'center' }}>
                        <span 
                          className={`urja-tasks-pill ${taskCount > 0 ? 'has-tasks' : 'zero'}`}
                          onClick={() => handleOpenDetails(u)}
                          title="Click to view assigned tasks"
                        >
                          <i className="bi bi-list-task"></i>
                          <span>{taskCount} {taskCount === 1 ? 'Task' : 'Tasks'}</span>
                        </span>
                      </td>

                      {/* Actions: Mandatory [Details] [Edit] [Delete] */}
                      <td style={{ textAlign: 'center' }}>
                        <div className="urja-row-actions">
                          <button 
                            type="button" 
                            className="urja-btn-row-details"
                            onClick={() => handleOpenDetails(u)}
                            title="View Details"
                          >
                            <i className="bi bi-eye"></i>
                            <span>Details</span>
                          </button>

                          <button 
                            type="button" 
                            className="urja-btn-row-icon edit"
                            title="Edit User"
                            onClick={() => {
                              setEditingUser(u);
                              setEditUserForm({
                                name: u.name,
                                email: u.email,
                                role: u.role || 'ROLE_HR_RECRUITER',
                                departmentId: u.departmentId || 3,
                                status: u.status || 'ACTIVE'
                              });
                              setShowEditModal(true);
                            }}
                          >
                            <i className="bi bi-pencil-square"></i>
                          </button>

                          <button 
                            type="button" 
                            className={`urja-btn-row-icon delete ${isActive ? 'deactivate' : 'permanent'}`}
                            title={
                              isProtected 
                                ? 'Protected system account cannot be modified' 
                                : isActive 
                                  ? 'Deactivate User' 
                                  : 'Permanently Delete User'
                            }
                            disabled={isProtected}
                            onClick={() => setDeleteCandidateUser(u)}
                            style={isProtected ? { opacity: 0.35, cursor: 'not-allowed' } : {}}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ======================================================================
            6. PAGINATION CONTROLS
            ====================================================================== */}
        <div className="urja-usermgmt-pagination">
          <div className="urja-usermgmt-pagination-info">
            Showing {totalUsers > 0 ? startIndex + 1 : 0} – {endIndex} of {totalUsers} users
          </div>

          <div className="urja-usermgmt-pagination-controls">
            <div className="urja-usermgmt-rows-selector">
              <span>Rows per page:</span>
              <select 
                className="urja-usermgmt-rows-select"
                value={rowsPerPage}
                onChange={e => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="urja-usermgmt-page-buttons">
              <button 
                type="button"
                className="urja-usermgmt-page-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                title="Previous page"
              >
                <i className="bi bi-chevron-left"></i>
              </button>

              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(pageNum => (
                <button 
                  key={pageNum}
                  type="button"
                  className={`urja-usermgmt-page-btn ${currentPage === pageNum ? 'active' : ''}`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              ))}

              <button 
                type="button"
                className="urja-usermgmt-page-btn"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                title="Next page"
              >
                <i className="bi bi-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================
          7. MODAL: ADD USER (Mandatory)
          ======================================================================== */}
      {showAddModal && (
        <div className="urja-mgmt-modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="urja-mgmt-modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="urja-mgmt-modal-header">
              <h3 className="urja-mgmt-modal-title">
                <i className="bi bi-person-plus-fill text-success"></i>
                Provision System User Account
              </h3>
              <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
            </div>

            <form onSubmit={handleAddUserSubmit}>
              <div className="urja-mgmt-modal-body">
                <div className="mb-3">
                  <label className="form-label small fw-bold text-dark">Full Name *</label>
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="e.g. Ramesh Kulkarni"
                    value={newUserForm.name}
                    onChange={e => setNewUserForm({ ...newUserForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-dark">Work Email *</label>
                    <input 
                      type="email" 
                      className="form-control"
                      placeholder="ramesh.kulkarni@company.com"
                      value={newUserForm.email}
                      onChange={e => setNewUserForm({ ...newUserForm, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-dark">Username</label>
                    <input 
                      type="text" 
                      className="form-control"
                      placeholder="ramesh.k"
                      value={newUserForm.username}
                      onChange={e => setNewUserForm({ ...newUserForm, username: e.target.value })}
                    />
                  </div>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-dark">System Role *</label>
                    <select 
                      className="form-select"
                      value={newUserForm.role}
                      onChange={e => setNewUserForm({ ...newUserForm, role: e.target.value })}
                    >
                      <option value="ROLE_HR_RECRUITER">HR Recruiter</option>
                      <option value="ROLE_INTERVIEWER">Technical Interviewer</option>
                      <option value="ROLE_DEPT_HEAD">Department Head</option>
                      <option value="ROLE_APPROVING_MANAGER">Approving Manager</option>
                      <option value="ROLE_HR_ADMIN">HR Administrator</option>
                      <option value="ROLE_IT_ADMIN">IT Administrator</option>
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-dark">Department</label>
                    <select 
                      className="form-select"
                      value={newUserForm.departmentId}
                      onChange={e => setNewUserForm({ ...newUserForm, departmentId: Number(e.target.value) })}
                    >
                      <option value="3">Human Resources & Talent Acquisition</option>
                      <option value="1">Engineering & Technology</option>
                      <option value="5">Operations & Supply Chain</option>
                      <option value="4">Finance, Tax & Accounts</option>
                      <option value="2">Global Sales & Enterprise BD</option>
                    </select>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-bold text-dark">Designation</label>
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="e.g. Senior Talent Acquisition Specialist"
                    value={newUserForm.designation}
                    onChange={e => setNewUserForm({ ...newUserForm, designation: e.target.value })}
                  />
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-dark">Initial Password</label>
                    <input 
                      type="password" 
                      className="form-control"
                      value={newUserForm.password}
                      onChange={e => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    />
                    <small className="text-muted">Default is 'password'.</small>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-dark">Account Status</label>
                    <select 
                      className="form-select"
                      value={newUserForm.status}
                      onChange={e => setNewUserForm({ ...newUserForm, status: e.target.value })}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="urja-mgmt-modal-footer">
                <button type="button" className="urja-btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="urja-btn-save">
                  <i className="bi bi-check-circle-fill me-1"></i>
                  <span>Create User Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================
          8. MODAL: EDIT USER
          ======================================================================== */}
      {showEditModal && editingUser && (
        <div className="urja-mgmt-modal-backdrop" onClick={() => setShowEditModal(false)}>
          <div className="urja-mgmt-modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="urja-mgmt-modal-header">
              <h3 className="urja-mgmt-modal-title">
                <i className="bi bi-pencil-square text-primary"></i>
                Edit User Account: {editingUser.name}
              </h3>
              <button type="button" className="btn-close" onClick={() => setShowEditModal(false)}></button>
            </div>

            <form onSubmit={handleEditUserSubmit}>
              <div className="urja-mgmt-modal-body">
                <div className="mb-3">
                  <label className="form-label small fw-bold text-dark">Full Name *</label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={editUserForm.name}
                    onChange={e => setEditUserForm({ ...editUserForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-bold text-dark">Work Email *</label>
                  <input 
                    type="email" 
                    className="form-control"
                    value={editUserForm.email}
                    onChange={e => setEditUserForm({ ...editUserForm, email: e.target.value })}
                    required
                  />
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-dark">System Role *</label>
                    <select 
                      className="form-select"
                      value={editUserForm.role}
                      onChange={e => setEditUserForm({ ...editUserForm, role: e.target.value })}
                    >
                      <option value="ROLE_HR_RECRUITER">HR Recruiter</option>
                      <option value="ROLE_INTERVIEWER">Technical Interviewer</option>
                      <option value="ROLE_DEPT_HEAD">Department Head</option>
                      <option value="ROLE_APPROVING_MANAGER">Approving Manager</option>
                      <option value="ROLE_HR_ADMIN">HR Administrator</option>
                      <option value="ROLE_IT_ADMIN">IT Administrator</option>
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-dark">Department</label>
                    <select 
                      className="form-select"
                      value={editUserForm.departmentId}
                      onChange={e => setEditUserForm({ ...editUserForm, departmentId: Number(e.target.value) })}
                    >
                      <option value="3">Human Resources & Talent Acquisition</option>
                      <option value="1">Engineering & Technology</option>
                      <option value="5">Operations & Supply Chain</option>
                      <option value="4">Finance, Tax & Accounts</option>
                      <option value="2">Global Sales & Enterprise BD</option>
                    </select>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-bold text-dark">Account Status</label>
                  <select 
                    className="form-select"
                    value={editUserForm.status}
                    onChange={e => setEditUserForm({ ...editUserForm, status: e.target.value })}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div className="urja-mgmt-modal-footer">
                <button type="button" className="urja-btn-secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="urja-btn-save">
                  <i className="bi bi-check-circle-fill me-1"></i>
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================
          9. MODAL: TWO-STAGE DELETE USER CONFIRMATION (Stage 1 Deactivate / Stage 2 Permanent)
          ======================================================================== */}
      {deleteCandidateUser && (
        <div className="urja-mgmt-modal-backdrop" onClick={() => setDeleteCandidateUser(null)}>
          <div className="urja-mgmt-modal-dialog" style={{ maxWidth: 490 }} onClick={e => e.stopPropagation()}>
            {deleteCandidateUser.status === 'ACTIVE' ? (
              /* -------------------------------------------------------------
                 STAGE 1 – DEACTIVATE CONFIRMATION (Orange/Amber Warning Theme)
                 ------------------------------------------------------------- */
              <>
                <div className="urja-mgmt-modal-header bg-warning-subtle">
                  <h3 className="urja-mgmt-modal-title" style={{ color: '#B45309' }}>
                    <i className="bi bi-person-slash me-2" style={{ color: '#D97706' }}></i>
                    Deactivate User?
                  </h3>
                  <button type="button" className="btn-close" onClick={() => setDeleteCandidateUser(null)}></button>
                </div>

                <div className="urja-mgmt-modal-body">
                  <p className="text-dark mb-3" style={{ fontSize: '0.92rem' }}>
                    Are you sure you want to deactivate this user?
                  </p>
                  <div className="p-3 bg-light rounded-3 border mb-3">
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <span className="text-muted small fw-bold">User Name:</span>
                      <strong className="text-dark">{deleteCandidateUser.name}</strong>
                    </div>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <span className="text-muted small fw-bold">Work Email:</span>
                      <span className="text-dark font-monospace small">{deleteCandidateUser.email}</span>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <span className="text-muted small fw-bold">Account Status:</span>
                      <span className="urja-status-pill active" style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}>ACTIVE</span>
                    </div>
                  </div>
                  <div className="alert alert-warning py-2 px-3 small mb-0" style={{ borderLeft: '4px solid #D97706', backgroundColor: '#FFFBEB' }}>
                    <i className="bi bi-info-circle-fill me-1" style={{ color: '#D97706' }}></i>
                    Login access will be disabled immediately. Historical HRMS records, tasks, and audit logs are safely preserved.
                  </div>
                </div>

                <div className="urja-mgmt-modal-footer">
                  <button 
                    type="button" 
                    className="urja-btn-secondary" 
                    onClick={() => setDeleteCandidateUser(null)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="urja-btn-warning-confirm" 
                    onClick={confirmDeactivateUser}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deactivating...' : 'Deactivate'}
                  </button>
                </div>
              </>
            ) : (
              /* -------------------------------------------------------------
                 STAGE 2 – PERMANENT DATABASE DELETION (Red Danger Confirmation)
                 ------------------------------------------------------------- */
              <>
                <div className="urja-mgmt-modal-header bg-danger-subtle">
                  <h3 className="urja-mgmt-modal-title text-danger">
                    <i className="bi bi-trash-fill text-danger me-2"></i>
                    Permanently Delete User?
                  </h3>
                  <button type="button" className="btn-close" onClick={() => setDeleteCandidateUser(null)}></button>
                </div>

                <div className="urja-mgmt-modal-body">
                  <p className="text-dark mb-3" style={{ fontSize: '0.92rem' }}>
                    This user is already inactive. Do you want to permanently delete this account from the database?
                  </p>
                  <div className="p-3 bg-light rounded-3 border mb-3">
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <span className="text-muted small fw-bold">User Name:</span>
                      <strong className="text-dark">{deleteCandidateUser.name}</strong>
                    </div>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <span className="text-muted small fw-bold">Work Email:</span>
                      <span className="text-dark font-monospace small">{deleteCandidateUser.email}</span>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <span className="text-muted small fw-bold">Account Status:</span>
                      <span className="urja-status-pill inactive" style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}>INACTIVE</span>
                    </div>
                  </div>
                  <div className="alert alert-danger py-2 px-3 small mb-0" style={{ borderLeft: '4px solid #DC2626', backgroundColor: '#FEF2F2' }}>
                    <i className="bi bi-exclamation-octagon-fill me-1" style={{ color: '#DC2626' }}></i>
                    <strong>Warning:</strong> This action is permanent and cannot be undone. All credentials and login records will be purged from MySQL.
                  </div>
                </div>

                <div className="urja-mgmt-modal-footer">
                  <button 
                    type="button" 
                    className="urja-btn-secondary" 
                    onClick={() => setDeleteCandidateUser(null)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="urja-btn-danger-confirm" 
                    onClick={confirmPermanentDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting Permanently...' : 'Permanently Delete'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================
          10. MODAL: BULK DELETE CONFIRMATION
          ======================================================================== */}
      {showBulkDeleteModal && (
        <div className="urja-mgmt-modal-backdrop" onClick={() => setShowBulkDeleteModal(false)}>
          <div className="urja-mgmt-modal-dialog" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="urja-mgmt-modal-header bg-danger-subtle">
              <h3 className="urja-mgmt-modal-title text-danger">
                <i className="bi bi-trash-fill text-danger me-2"></i>
                Delete Selected Users?
              </h3>
              <button type="button" className="btn-close" onClick={() => setShowBulkDeleteModal(false)}></button>
            </div>

            <div className="urja-mgmt-modal-body">
              <p className="text-dark mb-3" style={{ fontSize: '0.92rem' }}>
                Are you sure you want to delete <strong>{selectedUserIds.length}</strong> selected users? This action may affect associated HRMS records.
              </p>
              <div className="alert alert-warning py-2 px-3 small mb-0">
                <i className="bi bi-shield-lock-fill me-1"></i>
                Protected system accounts and your logged-in administrator profile are preserved.
              </div>
            </div>

            <div className="urja-mgmt-modal-footer">
              <button 
                type="button" 
                className="urja-btn-secondary" 
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="urja-btn-danger-confirm" 
                onClick={confirmBulkDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting Users...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================
          11. MODAL: USER DETAILS & ASSIGNED TASKS
          ======================================================================== */}
      {viewingUser && (
        <div className="urja-mgmt-modal-backdrop" onClick={() => setViewingUser(null)}>
          <div className="urja-mgmt-modal-dialog" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <div className="urja-mgmt-modal-header">
              <h3 className="urja-mgmt-modal-title">
                <i className="bi bi-person-badge-fill text-success"></i>
                User Account Details
              </h3>
              <button type="button" className="btn-close" onClick={() => setViewingUser(null)}></button>
            </div>

            <div className="urja-mgmt-modal-body">
              <div className="d-flex align-items-center gap-3 mb-4">
                <div className="urja-user-avatar" style={{ width: 54, height: 54, fontSize: '1.25rem' }}>
                  {getInitials(viewingUser.name)}
                </div>
                <div>
                  <h5 className="fw-bold text-dark mb-0">{viewingUser.name}</h5>
                  <span className="text-muted small">{viewingUser.email}</span>
                  <div className="mt-1">{renderRoleBadge(viewingUser.role)}</div>
                </div>
              </div>

              <div className="card p-3 mb-4 border">
                <div className="row g-2 small">
                  <div className="col-6">
                    <span className="text-muted d-block">Department</span>
                    <strong className="text-dark">{viewingUser.department}</strong>
                  </div>
                  <div className="col-6">
                    <span className="text-muted d-block">Designation</span>
                    <strong className="text-dark">{viewingUser.designation}</strong>
                  </div>
                  <div className="col-6 mt-2">
                    <span className="text-muted d-block">Account Status</span>
                    <span className={`fw-bold ${viewingUser.status === 'ACTIVE' ? 'text-success' : 'text-danger'}`}>
                      {viewingUser.status}
                    </span>
                  </div>
                  <div className="col-6 mt-2">
                    <span className="text-muted d-block">Active Tasks</span>
                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                      {viewingUser.assignedTasksCount || 0} Tasks Assigned
                    </span>
                  </div>
                </div>
              </div>

              <div className="d-flex align-items-center justify-content-between mb-2">
                <h6 className="fw-bold text-dark mb-0">Assigned Recruitment Tasks</h6>
                <span className="small text-muted">{viewingUserTasks.length} total tasks</span>
              </div>

              {isLoadingUserTasks ? (
                <div className="text-center py-4">
                  <div className="spinner-border spinner-border-sm text-success" role="status"></div>
                  <span className="ms-2 small text-muted">Loading assigned tasks...</span>
                </div>
              ) : viewingUserTasks.length === 0 ? (
                <div className="p-3 bg-light rounded-3 text-center text-muted small">
                  No active recruitment tasks currently assigned to this user.
                </div>
              ) : (
                <div className="d-flex flex-column gap-2" style={{ maxHeight: 240, overflowY: 'auto' }}>
                  {viewingUserTasks.map(t => (
                    <div key={t.id} className="p-2 border rounded-3 bg-white">
                      <div className="d-flex align-items-center justify-content-between">
                        <strong className="text-dark small">{t.taskTitle}</strong>
                        <span className={`badge ${t.status === 'COMPLETED' ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-primary-subtle text-primary border border-primary-subtle'}`} style={{ fontSize: '0.68rem' }}>
                          {t.status}
                        </span>
                      </div>
                      <div className="d-flex align-items-center justify-content-between mt-1 text-muted" style={{ fontSize: '0.74rem' }}>
                        <span>Type: {t.taskTypeLabel || t.taskType}</span>
                        <span>Due: {t.dueDate || 'N/A'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="urja-mgmt-modal-footer">
              <button type="button" className="urja-btn-secondary" onClick={() => setViewingUser(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
