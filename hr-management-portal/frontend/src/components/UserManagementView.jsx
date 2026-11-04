import React, { useState, useEffect, useMemo } from 'react';
import { INITIAL_USERS } from '../data/mockData';

// Helper to reliably extract string role name from strings or Role objects
const getRoleString = (r) => {
  if (!r) return '';
  if (typeof r === 'string') return r;
  if (typeof r === 'object') return r.roleName || r.name || r.id || '';
  return String(r);
};

export default function UserManagementView({ currentUser, showToast, onNavigateToTasks }) {
  const [users, setUsers] = useState([]);
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterDept, setFilterDept] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterTaskAssign, setFilterTaskAssign] = useState('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals & Details Drawer
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [viewingUserTasks, setViewingUserTasks] = useState([]);
  const [isLoadingUserTasks, setIsLoadingUserTasks] = useState(false);

  // Forms
  const [newUserForm, setNewUserForm] = useState({
    username: '',
    name: '',
    email: '',
    password: 'password',
    role: 'ROLE_HR_RECRUITER',
    dept: 'Human Resources',
    title: 'Senior Technical Recruiter'
  });

  const [editUserForm, setEditUserForm] = useState({
    name: '',
    email: '',
    role: 'ROLE_HR_RECRUITER',
    dept: 'Human Resources',
    title: ''
  });

  const isITAdmin = useMemo(() => {
    const roles = currentUser?.roles || (currentUser?.role ? [currentUser.role] : []);
    return roles.includes('ROLE_IT_ADMIN');
  }, [currentUser]);

  const isHrAdmin = useMemo(() => {
    const roles = currentUser?.roles || (currentUser?.role ? [currentUser.role] : []);
    return roles.includes('ROLE_HR_ADMIN');
  }, [currentUser]);

  const getToken = () => sessionStorage.getItem('ats_urja_token') || currentUser?.token || '';

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
            const primary = roleList[0] || getRoleString(u.role) || 'ROLE_EMPLOYEE';
            return {
              ...u,
              role: primary,
              roles: roleList.length > 0 ? roleList : [primary],
              department: u.department || 'Human Resources',
              designation: u.designation || u.title || 'Team Member',
              assignedTasksCount: u.assignedTasksCount || 0
            };
          });
          setUsers(normalized);
        }
      })
      .catch(err => {
        setIsLoading(false);
        console.warn('Backend users API error, using initial list:', err);
        setUsers(INITIAL_USERS);
      });

    // Fetch Task Summary Stats for Pending Tasks KPI
    fetch('http://localhost:8080/api/v1/tasks/summary-stats', {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d && d.data) {
          setPendingTasksCount((d.data.assignedTasks || 0) + (d.data.inProgressTasks || 0));
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchUsers();
  }, [currentUser]);

  // Handle Status Toggle (IT Admin only)
  const handleToggleStatus = (u) => {
    if (!isITAdmin) {
      showToast('Only IT Administrators have permission to toggle account activation status.', 'error');
      return;
    }
    const newStatus = u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    fetch(`http://localhost:8080/api/v1/admin/users/${u.id}/status?status=${newStatus}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Status update failed');
      })
      .then(() => {
        setUsers(prev => prev.map(item => item.id === u.id ? { ...item, status: newStatus } : item));
        showToast(`Account status for ${u.name} updated to ${newStatus}`);
      })
      .catch(() => {
        // Fallback optimistic
        setUsers(prev => prev.map(item => item.id === u.id ? { ...item, status: newStatus } : item));
        showToast(`Account status toggled: ${u.name} (${newStatus})`);
      });
  };

  // Handle Add User Submit
  const handleAddUserSubmit = (e) => {
    e.preventDefault();
    if (!newUserForm.name || !newUserForm.email) return;

    const payload = {
      username: newUserForm.username.trim().toLowerCase() || newUserForm.email.split('@')[0],
      name: newUserForm.name.trim(),
      email: newUserForm.email.trim().toLowerCase(),
      password: newUserForm.password || 'password',
      roles: [newUserForm.role],
      departmentId: 1
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
        return res.json().then(e => { throw new Error(e.message || 'Failed to create user'); });
      })
      .then(body => {
        setShowAddModal(false);
        showToast(`User account created: ${newUserForm.name}`);
        fetchUsers();
        setNewUserForm({
          username: '',
          name: '',
          email: '',
          password: 'password',
          role: 'ROLE_HR_RECRUITER',
          dept: 'Human Resources',
          title: 'Senior Technical Recruiter'
        });
      })
      .catch(err => {
        showToast(err.message || 'Error creating user', 'error');
      });
  };

  // Handle Edit User Submit
  const handleEditUserSubmit = (e) => {
    e.preventDefault();
    if (!editingUser) return;

    const payload = {
      name: editUserForm.name.trim(),
      email: editUserForm.email.trim().toLowerCase(),
      roles: [editUserForm.role],
      departmentId: 1
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
        showToast(`User updated: ${editUserForm.name}`);
        fetchUsers();
      })
      .catch(err => {
        showToast(err.message || 'Error updating user details', 'error');
      });
  };

  // View User Details & Load their Tasks
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

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // 1. Search Query (name or work email)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inName = (u.name || '').toLowerCase().includes(q);
        const inEmail = (u.email || '').toLowerCase().includes(q);
        const inUser = (u.username || '').toLowerCase().includes(q);
        if (!inName && !inEmail && !inUser) return false;
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

      // 4. Account Status Filter
      if (filterStatus !== 'ALL') {
        if (filterStatus === 'ACTIVE' && u.status !== 'ACTIVE') return false;
        if (filterStatus === 'INACTIVE' && u.status === 'ACTIVE') return false;
      }

      // 5. Task Assignment Filter
      if (filterTaskAssign !== 'ALL') {
        if (filterTaskAssign === 'WITH_TASKS' && (!u.assignedTasksCount || u.assignedTasksCount === 0)) {
          return false;
        }
        if (filterTaskAssign === 'NO_TASKS' && u.assignedTasksCount > 0) {
          return false;
        }
      }

      return true;
    });
  }, [users, searchQuery, filterRole, filterDept, filterStatus, filterTaskAssign]);

  // Pagination Slice
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage]);

  const getRoleBadge = (roleInput) => {
    const roleStr = getRoleString(roleInput);
    switch (roleStr) {
      case 'ROLE_IT_ADMIN':
        return <span className="badge bg-danger-subtle text-danger border border-danger-subtle">IT Admin</span>;
      case 'ROLE_HR_ADMIN':
        return <span className="badge bg-primary-subtle text-primary border border-primary-subtle">HR Admin</span>;
      case 'ROLE_HR_RECRUITER':
        return <span className="badge bg-success-subtle text-success border border-success-subtle">HR Recruiter</span>;
      case 'ROLE_INTERVIEWER':
        return <span className="badge bg-info-subtle text-info border border-info-subtle">Interviewer</span>;
      case 'ROLE_DEPT_HEAD':
        return <span className="badge bg-warning-subtle text-warning border border-warning-subtle">Dept Head</span>;
      case 'ROLE_APPROVING_MANAGER':
        return <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle">Approver</span>;
      default:
        return <span className="badge bg-light text-dark border">{roleStr?.replace('ROLE_', '') || 'User'}</span>;
    }
  };

  return (
    <div className="urja-tasks-container">
      {/* 1. Header */}
      <div className="urja-tasks-header">
        <div className="urja-tasks-header-left">
          <div className="urja-tasks-header-icon" style={{ background: '#144D2D', color: '#98E843' }}>
            <i className="bi bi-people-fill"></i>
          </div>
          <div>
            <h1 className="urja-tasks-title">System User Management</h1>
            <p className="urja-tasks-subtitle">
              Manage enterprise application users, security roles, and recruitment team workloads.
            </p>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button 
            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
            onClick={fetchUsers}
            disabled={isLoading}
          >
            <i className={`bi bi-arrow-clockwise ${isLoading ? 'spin' : ''}`}></i>
            <span>Refresh</span>
          </button>

          {isITAdmin && (
            <button 
              className="urja-btn-lime"
              onClick={() => setShowAddModal(true)}
              id="btn-add-system-user"
            >
              <i className="bi bi-person-plus-fill"></i>
              <span>Add User</span>
            </button>
          )}

          {isHrAdmin && onNavigateToTasks && (
            <button 
              className="urja-btn-lime"
              onClick={onNavigateToTasks}
            >
              <i className="bi bi-list-check"></i>
              <span>Assign Tasks</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Summary KPI Cards (Total Users, Active Users, Inactive Users, Pending Tasks) */}
      <div className="urja-tasks-summary-grid">
        <div className="urja-tasks-card">
          <div className="urja-tasks-card-icon blue">
            <i className="bi bi-person-badge-fill"></i>
          </div>
          <div className="urja-tasks-card-info">
            <div className="urja-tasks-card-val">{users.length}</div>
            <div className="urja-tasks-card-label">Total Users</div>
          </div>
        </div>

        <div className="urja-tasks-card">
          <div className="urja-tasks-card-icon green">
            <i className="bi bi-person-check-fill"></i>
          </div>
          <div className="urja-tasks-card-info">
            <div className="urja-tasks-card-val">{users.filter(u => u.status === 'ACTIVE').length}</div>
            <div className="urja-tasks-card-label">Active Users</div>
          </div>
        </div>

        <div className="urja-tasks-card">
          <div className="urja-tasks-card-icon red">
            <i className="bi bi-person-x-fill"></i>
          </div>
          <div className="urja-tasks-card-info">
            <div className="urja-tasks-card-val">{users.filter(u => u.status !== 'ACTIVE').length}</div>
            <div className="urja-tasks-card-label">Inactive Users</div>
          </div>
        </div>

        <div className="urja-tasks-card">
          <div className="urja-tasks-card-icon amber">
            <i className="bi bi-clock-history"></i>
          </div>
          <div className="urja-tasks-card-info">
            <div className="urja-tasks-card-val">{pendingTasksCount}</div>
            <div className="urja-tasks-card-label">Pending Tasks</div>
          </div>
        </div>
      </div>

      {/* 3. Search and Multi-Attribute Filters Bar */}
      <div className="urja-tasks-filter-box">
        <div className="urja-tasks-search-row">
          {/* Search by user name or work email */}
          <div className="urja-tasks-search-input">
            <i className="bi bi-search urja-tasks-search-icon"></i>
            <input 
              type="text" 
              placeholder="Search by user name or work email..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>

          {/* Role Filter */}
          <select 
            className="urja-tasks-select"
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

          {/* Department Filter */}
          <select 
            className="urja-tasks-select"
            value={filterDept}
            onChange={e => { setFilterDept(e.target.value); setCurrentPage(1); }}
          >
            <option value="ALL">All Departments</option>
            <option value="Human Resources">Human Resources</option>
            <option value="Engineering">Engineering & Technology</option>
            <option value="Plant">Plant Operations</option>
            <option value="Finance">Finance & Accounts</option>
          </select>

          {/* Account Status Filter */}
          <select 
            className="urja-tasks-select"
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
          >
            <option value="ALL">All Account Statuses</option>
            <option value="ACTIVE">Active Accounts</option>
            <option value="INACTIVE">Inactive Accounts</option>
          </select>

          {/* Task Assignment Filter */}
          <select 
            className="urja-tasks-select"
            value={filterTaskAssign}
            onChange={e => { setFilterTaskAssign(e.target.value); setCurrentPage(1); }}
          >
            <option value="ALL">All Task Statuses</option>
            <option value="WITH_TASKS">With Assigned Tasks</option>
            <option value="NO_TASKS">No Assigned Tasks</option>
          </select>

          {(filterRole !== 'ALL' || filterDept !== 'ALL' || filterStatus !== 'ALL' || filterTaskAssign !== 'ALL' || searchQuery) && (
            <button 
              className="btn btn-sm btn-link text-muted p-0 text-decoration-none"
              onClick={() => {
                setFilterRole('ALL');
                setFilterDept('ALL');
                setFilterStatus('ALL');
                setFilterTaskAssign('ALL');
                setSearchQuery('');
                setCurrentPage(1);
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* 4. Table: Columns: Name, Work Email, Role, Department, Designation, Account Status, Assigned Tasks, Actions */}
      <div className="urja-tasks-table-wrapper">
        <table className="urja-tasks-table">
          <thead>
            <tr>
              <th>Name</th>
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
                <td colSpan="8" style={{ textAlign: 'center', padding: '3.5rem' }}>
                  <div className="spinner-border text-success" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="text-muted small mt-2">Loading system user accounts...</p>
                </td>
              </tr>
            ) : paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '3.5rem' }}>
                  <div className="text-muted mb-2"><i className="bi bi-people" style={{ fontSize: '2rem' }}></i></div>
                  <h6 className="fw-bold text-dark">No User Accounts Found</h6>
                  <p className="text-muted small mb-0">No system accounts match the current filter criteria.</p>
                </td>
              </tr>
            ) : (
              paginatedUsers.map((u, idx) => {
                const isActive = u.status === 'ACTIVE';
                const taskCount = u.assignedTasksCount || 0;

                return (
                  <tr key={`${u.id}-${idx}`}>
                    {/* Name */}
                    <td>
                      <div className="task-user-cell">
                        <div className="task-avatar">
                          {(u.name || 'User').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <strong className="text-dark d-block">{u.name}</strong>
                          <small className="text-muted">@{u.username || u.email?.split('@')[0]}</small>
                        </div>
                      </div>
                    </td>

                    {/* Work Email */}
                    <td>
                      <span className="text-dark font-monospace small">{u.email}</span>
                    </td>

                    {/* Role */}
                    <td>
                      {getRoleBadge(u.role)}
                    </td>

                    {/* Department */}
                    <td>
                      <span className="small text-dark fw-medium">{u.department}</span>
                    </td>

                    {/* Designation */}
                    <td>
                      <span className="small text-muted">{u.designation}</span>
                    </td>

                    {/* Account Status */}
                    <td>
                      {isITAdmin ? (
                        <div className="d-flex align-items-center gap-2">
                          <label className="urja-toggle-switch">
                            <input 
                              type="checkbox" 
                              checked={isActive}
                              onChange={() => handleToggleStatus(u)}
                            />
                            <span className="urja-toggle-slider"></span>
                          </label>
                          <span className={`small fw-bold ${isActive ? 'text-success' : 'text-danger'}`}>
                            {isActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </div>
                      ) : (
                        <span className={`badge ${isActive ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-danger-subtle text-danger border border-danger-subtle'}`}>
                          {isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      )}
                    </td>

                    {/* Assigned Tasks */}
                    <td style={{ textAlign: 'center' }}>
                      <span 
                        className={`badge ${taskCount > 0 ? 'bg-primary-subtle text-primary border border-primary-subtle' : 'bg-light text-muted border'}`}
                        style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
                      >
                        <i className="bi bi-list-check me-1"></i>
                        {taskCount} {taskCount === 1 ? 'Task' : 'Tasks'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'center' }}>
                      <div className="d-flex align-items-center justify-content-center gap-1">
                        <button 
                          className="btn btn-sm btn-outline-primary px-2 py-1"
                          title="View Details"
                          onClick={() => handleOpenDetails(u)}
                        >
                          <i className="bi bi-eye"></i> Details
                        </button>

                        {isITAdmin && (
                          <button 
                            className="btn btn-sm btn-outline-secondary px-2 py-1"
                            title="Edit User"
                            onClick={() => {
                              setEditingUser(u);
                              setEditUserForm({
                                name: u.name,
                                email: u.email,
                                role: u.role || 'ROLE_HR_RECRUITER',
                                dept: u.department || 'Human Resources',
                                title: u.designation || ''
                              });
                              setShowEditModal(true);
                            }}
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-3 border-top d-flex align-items-center justify-content-between">
            <span className="small text-muted">
              Page {currentPage} of {totalPages} ({filteredUsers.length} total users)
            </span>
            <div className="d-flex gap-1">
              <button 
                className="btn btn-sm btn-outline-secondary"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              >
                Previous
              </button>
              <button 
                className="btn btn-sm btn-outline-secondary"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: ADD USER (IT Admin Only) */}
      {showAddModal && isITAdmin && (
        <div className="urja-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="urja-modal-dialog" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="urja-modal-header">
              <h3 className="urja-modal-title">
                <i className="bi bi-person-plus-fill text-success me-2"></i>
                Provision System User Account
              </h3>
              <button className="btn-close" onClick={() => setShowAddModal(false)}></button>
            </div>

            <form onSubmit={handleAddUserSubmit}>
              <div className="urja-modal-body">
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
                      placeholder="ramesh.hr@company.com"
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
                    <label className="form-label small fw-bold text-dark">Security Role *</label>
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
                      value={newUserForm.dept}
                      onChange={e => setNewUserForm({ ...newUserForm, dept: e.target.value })}
                    >
                      <option value="Human Resources">Human Resources</option>
                      <option value="Engineering & Technology">Engineering & Technology</option>
                      <option value="Plant Operations">Plant Operations</option>
                      <option value="Finance & Accounts">Finance & Accounts</option>
                      <option value="IT & Systems">IT & Systems</option>
                    </select>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-bold text-dark">Initial Password</label>
                  <input 
                    type="password" 
                    className="form-control"
                    value={newUserForm.password}
                    onChange={e => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  />
                  <small className="text-muted">Default is 'password' for testing.</small>
                </div>
              </div>

              <div className="urja-modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="urja-btn-lime">
                  <i className="bi bi-check-circle-fill"></i>
                  <span>Create User Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT USER (IT Admin Only) */}
      {showEditModal && editingUser && isITAdmin && (
        <div className="urja-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="urja-modal-dialog" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="urja-modal-header">
              <h3 className="urja-modal-title">Edit User Account: {editingUser.name}</h3>
              <button className="btn-close" onClick={() => setShowEditModal(false)}></button>
            </div>

            <form onSubmit={handleEditUserSubmit}>
              <div className="urja-modal-body">
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
                    <label className="form-label small fw-bold text-dark">Role</label>
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
                      value={editUserForm.dept}
                      onChange={e => setEditUserForm({ ...editUserForm, dept: e.target.value })}
                    >
                      <option value="Human Resources">Human Resources</option>
                      <option value="Engineering & Technology">Engineering & Technology</option>
                      <option value="Plant Operations">Plant Operations</option>
                      <option value="Finance & Accounts">Finance & Accounts</option>
                      <option value="IT & Systems">IT & Systems</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="urja-modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-success fw-bold">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAWER: VIEW DETAILS & ASSIGNED TASKS */}
      {viewingUser && (
        <div className="urja-drawer-backdrop" onClick={() => setViewingUser(null)}>
          <div className="urja-drawer-panel" onClick={e => e.stopPropagation()}>
            <div className="p-3 border-bottom d-flex align-items-center justify-content-between bg-light">
              <h5 className="fw-bold mb-0 text-dark">User Account Details</h5>
              <button className="btn-close" onClick={() => setViewingUser(null)}></button>
            </div>

            <div className="p-4 overflow-auto flex-grow-1">
              <div className="d-flex align-items-center gap-3 mb-4">
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#144D2D', color: '#98E843', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 800 }}>
                  {viewingUser.name?.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h5 className="fw-bold text-dark mb-0">{viewingUser.name}</h5>
                  <span className="text-muted small">{viewingUser.email}</span>
                  <div className="mt-1">{getRoleBadge(viewingUser.role)}</div>
                </div>
              </div>

              <div className="card p-3 mb-4 border">
                <div className="row g-2 small">
                  <div className="col-6">
                    <span className="text-muted d-block">Department</span>
                    <strong>{viewingUser.department}</strong>
                  </div>
                  <div className="col-6">
                    <span className="text-muted d-block">Designation</span>
                    <strong>{viewingUser.designation}</strong>
                  </div>
                  <div className="col-6 mt-2">
                    <span className="text-muted d-block">Account Status</span>
                    <span className={`fw-bold ${viewingUser.status === 'ACTIVE' ? 'text-success' : 'text-danger'}`}>
                      {viewingUser.status}
                    </span>
                  </div>
                  <div className="col-6 mt-2">
                    <span className="text-muted d-block">Active Tasks</span>
                    <span className="badge bg-primary">{viewingUser.assignedTasksCount || 0} Assigned</span>
                  </div>
                </div>
              </div>

              <div className="d-flex align-items-center justify-content-between mb-2">
                <h6 className="fw-bold text-dark mb-0">Assigned Recruitment Tasks</h6>
                <span className="small text-muted">{viewingUserTasks.length} total</span>
              </div>

              {isLoadingUserTasks ? (
                <div className="text-center py-4">
                  <div className="spinner-border spinner-border-sm text-success" role="status"></div>
                  <span className="ms-2 small text-muted">Loading assigned tasks...</span>
                </div>
              ) : viewingUserTasks.length === 0 ? (
                <div className="p-3 bg-light rounded text-center text-muted small">
                  No active tasks assigned to this user.
                </div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {viewingUserTasks.map(t => (
                    <div key={t.id} className="p-2 border rounded bg-white">
                      <div className="d-flex align-items-center justify-content-between">
                        <strong className="text-dark small">{t.taskTitle}</strong>
                        <span className={`badge ${t.status === 'COMPLETED' ? 'bg-success' : 'bg-primary'}`} style={{ fontSize: '0.65rem' }}>
                          {t.status}
                        </span>
                      </div>
                      <div className="d-flex align-items-center justify-content-between mt-1 text-muted" style={{ fontSize: '0.72rem' }}>
                        <span>Type: {t.taskTypeLabel}</span>
                        <span>Due: {t.dueDate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 border-top bg-light text-end">
              <button className="btn btn-secondary btn-sm" onClick={() => setViewingUser(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
