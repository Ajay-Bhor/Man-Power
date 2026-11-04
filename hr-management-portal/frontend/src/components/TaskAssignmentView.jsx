import React, { useState, useEffect, useMemo } from 'react';
import '../styles/urja-tasks.css';

const TASK_TYPES = [
  { value: 'ALL', label: 'All Task Types' },
  { value: 'REQUISITION_REVIEW', label: 'Requisition Review' },
  { value: 'CANDIDATE_SCREENING', label: 'Candidate Screening' },
  { value: 'INTERVIEW_COORDINATION', label: 'Interview Scheduling' },
  { value: 'INTERVIEW_FEEDBACK', label: 'Interview Feedback' },
  { value: 'OFFER_PROCESSING', label: 'Offer Processing' },
  { value: 'ONBOARDING_FOLLOW_UP', label: 'Onboarding Follow-up' },
  { value: 'OTHER', label: 'Other' }
];

const PRIORITIES = [
  { value: 'ALL', label: 'All Priorities' },
  { value: 'URGENT', label: 'Urgent' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' }
];

const STATUSES = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' }
];

export default function TaskAssignmentView({ currentUser, showToast, onNavigateToUsers }) {
  const [tasks, setTasks] = useState([]);
  const [summaryStats, setSummaryStats] = useState({
    totalTasks: 0,
    assignedTasks: 0,
    inProgressTasks: 0,
    completedTasks: 0,
    overdueTasks: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isStatsLoading, setIsStatsLoading] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState('ALL');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterAssignedUser, setFilterAssignedUser] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Sorting
  const [sortBy, setSortBy] = useState('dueDate');
  const [sortDir, setSortDir] = useState('asc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Modals & Drawers
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Data for Form Dropdowns
  const [eligibleAssignees, setEligibleAssignees] = useState([]);
  const [allUsersList, setAllUsersList] = useState([]);
  const [requisitionsList, setRequisitionsList] = useState([]);
  const [candidatesList, setCandidatesList] = useState([]);

  // Task Creation Form
  const [assignForm, setAssignForm] = useState({
    taskTitle: '',
    taskDescription: '',
    taskType: 'CANDIDATE_SCREENING',
    assignedUserId: '',
    requisitionId: '',
    candidateId: '',
    priority: 'HIGH',
    startDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    status: 'ASSIGNED',
    comments: ''
  });

  // Reassignment Form
  const [reassignForm, setReassignForm] = useState({
    newAssignedUserId: '',
    comments: ''
  });

  // Access Control: Strict HR Admin check (IT Admin does not receive task management access)
  const isHrAdmin = useMemo(() => {
    const roles = currentUser?.roles || (currentUser?.role ? [currentUser.role] : []);
    return roles.includes('ROLE_HR_ADMIN') || roles.includes('ROLE_HRBP');
  }, [currentUser]);

  const getToken = () => sessionStorage.getItem('ats_urja_token') || currentUser?.token || '';

  // 1. Fetch Summary Stats (Actual database-backed counts)
  const fetchSummaryStats = () => {
    setIsStatsLoading(true);
    fetch('http://localhost:8080/api/v1/tasks/summary-stats', {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(res => {
        setIsStatsLoading(false);
        if (res.data) setSummaryStats(res.data);
      })
      .catch(err => {
        setIsStatsLoading(false);
        console.warn('Could not load task stats:', err);
      });
  };

  // 2. Fetch Tasks (Paginated, Filtered, and Sorted)
  const fetchTasks = (page = 0, sortField = sortBy, sortDirection = sortDir) => {
    setIsLoading(true);
    const params = new URLSearchParams();
    params.set('page', page);
    params.set('size', 15);
    params.set('sort', `${sortField},${sortDirection}`);
    if (filterType !== 'ALL') params.set('taskType', filterType);
    if (filterPriority !== 'ALL') params.set('priority', filterPriority);
    if (filterStatus !== 'ALL') params.set('status', filterStatus);
    if (filterAssignedUser !== 'ALL') params.set('assignedUserId', filterAssignedUser);
    if (searchQuery.trim()) params.set('search', searchQuery.trim());

    fetch(`http://localhost:8080/api/v1/tasks?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(res => {
        setIsLoading(false);
        if (res.data) {
          setTasks(res.data.content || []);
          setTotalPages(res.data.totalPages || 1);
          setTotalElements(res.data.totalElements || 0);
          setCurrentPage(res.data.number || 0);
        }
      })
      .catch(err => {
        setIsLoading(false);
        console.warn('Could not load tasks from API:', err);
      });
  };

  // 3. Fetch Dropdown Helpers
  const fetchDropdownData = () => {
    const token = getToken();
    // Fetch users for filter dropdown
    fetch('http://localhost:8080/api/v1/admin/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d && d.data) setAllUsersList(d.data);
      })
      .catch(() => {});

    // Fetch requisitions
    fetch('http://localhost:8080/api/v1/requisitions', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d && d.data) {
          const list = Array.isArray(d.data) ? d.data : (d.data.content || []);
          setRequisitionsList(list);
        }
      })
      .catch(() => {});

    // Fetch candidates
    fetch('http://localhost:8080/api/v1/candidates', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d && d.data) {
          const list = Array.isArray(d.data) ? d.data : (d.data.content || []);
          setCandidatesList(list);
        }
      })
      .catch(() => {});
  };

  // 4. Fetch Eligible Assignees based on selected taskType (Strict active user check)
  const fetchEligibleAssignees = (taskType) => {
    fetch(`http://localhost:8080/api/v1/tasks/eligible-assignees?taskType=${taskType}`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(res => {
        if (res.data) {
          setEligibleAssignees(res.data);
          // If current selection is not in list, default to first eligible user
          if (res.data.length > 0 && !res.data.some(u => String(u.id) === String(assignForm.assignedUserId))) {
            setAssignForm(prev => ({ ...prev, assignedUserId: String(res.data[0].id) }));
          }
        }
      })
      .catch(err => {
        console.warn('Failed to fetch eligible assignees:', err);
      });
  };

  useEffect(() => {
    fetchSummaryStats();
    fetchTasks(0, sortBy, sortDir);
    fetchDropdownData();
  }, [currentUser]);

  useEffect(() => {
    fetchTasks(0, sortBy, sortDir);
  }, [filterType, filterPriority, filterStatus, filterAssignedUser]);

  useEffect(() => {
    if (showAssignModal && isHrAdmin) {
      fetchEligibleAssignees(assignForm.taskType);
    }
  }, [showAssignModal, assignForm.taskType, isHrAdmin]);

  // Handle Sort Change
  const handleHeaderSort = (field) => {
    let nextDir = 'asc';
    if (sortBy === field) {
      nextDir = sortDir === 'asc' ? 'desc' : 'asc';
    }
    setSortBy(field);
    setSortDir(nextDir);
    fetchTasks(0, field, nextDir);
  };

  // Handle Create Task Submit
  const handleAssignSubmit = (e) => {
    e.preventDefault();
    if (!assignForm.taskTitle || !assignForm.assignedUserId || !assignForm.dueDate) {
      showToast('Please fill in all required task fields.', 'error');
      return;
    }

    const payload = {
      taskTitle: assignForm.taskTitle.trim(),
      taskDescription: assignForm.taskDescription,
      taskType: assignForm.taskType,
      assignedUserId: Number(assignForm.assignedUserId),
      requisitionId: assignForm.requisitionId ? Number(assignForm.requisitionId) : null,
      candidateId: assignForm.candidateId ? Number(assignForm.candidateId) : null,
      priority: assignForm.priority,
      startDate: assignForm.startDate,
      dueDate: assignForm.dueDate,
      status: assignForm.status || 'ASSIGNED',
      comments: assignForm.comments
    };

    fetch('http://localhost:8080/api/v1/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(payload)
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(errData => {
            throw new Error(errData.message || 'Failed to assign task');
          });
        }
        return res.json();
      })
      .then(res => {
        setShowAssignModal(false);
        showToast(`Task assigned successfully to ${res.data.assignedUserName}`);
        fetchTasks(0, sortBy, sortDir);
        fetchSummaryStats();
        setAssignForm({
          taskTitle: '',
          taskDescription: '',
          taskType: 'CANDIDATE_SCREENING',
          assignedUserId: '',
          requisitionId: '',
          candidateId: '',
          priority: 'HIGH',
          startDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
          status: 'ASSIGNED',
          comments: ''
        });
      })
      .catch(err => {
        showToast(err.message || 'Error creating task assignment', 'error');
      });
  };

  // Handle Status Toggle / Quick Complete
  const handleStatusChange = (taskId, newStatus) => {
    fetch(`http://localhost:8080/api/v1/tasks/${taskId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ status: newStatus })
    })
      .then(res => {
        if (!res.ok) throw new Error('Status update failed');
        return res.json();
      })
      .then(res => {
        showToast(`Task status updated to ${newStatus.replace('_', ' ')}`);
        setTasks(prev => prev.map(t => t.id === taskId ? res.data : t));
        fetchSummaryStats();
      })
      .catch(err => {
        showToast(err.message || 'Failed to update task status', 'error');
      });
  };

  // Open Reassign Modal
  const handleOpenReassign = (task) => {
    setSelectedTask(task);
    setReassignForm({
      newAssignedUserId: '',
      comments: ''
    });
    fetchEligibleAssignees(task.taskType);
    setShowReassignModal(true);
  };

  // Handle Reassign Submit
  const handleReassignSubmit = (e) => {
    e.preventDefault();
    if (!selectedTask || !reassignForm.newAssignedUserId) return;

    fetch(`http://localhost:8080/api/v1/tasks/${selectedTask.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({
        assignedUserId: Number(reassignForm.newAssignedUserId),
        comments: reassignForm.comments
      })
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(e => { throw new Error(e.message || 'Reassignment failed'); });
        }
        return res.json();
      })
      .then(res => {
        setShowReassignModal(false);
        showToast(`Task reassigned to ${res.data.assignedUserName}`);
        setTasks(prev => prev.map(t => t.id === selectedTask.id ? res.data : t));
        fetchSummaryStats();
      })
      .catch(err => {
        showToast(err.message || 'Failed to reassign task', 'error');
      });
  };

  // Badges Helpers
  const getPriorityPill = (p) => {
    switch (p) {
      case 'URGENT':
        return <span className="task-priority-pill urgent"><i className="bi bi-exclamation-triangle-fill"></i> Urgent</span>;
      case 'HIGH':
        return <span className="task-priority-pill high"><i className="bi bi-arrow-up-circle-fill"></i> High</span>;
      case 'MEDIUM':
        return <span className="task-priority-pill medium"><i className="bi bi-dash-circle"></i> Medium</span>;
      default:
        return <span className="task-priority-pill low"><i className="bi bi-arrow-down-circle"></i> Low</span>;
    }
  };

  const getStatusPill = (s) => {
    switch (s) {
      case 'COMPLETED':
        return <span className="task-status-pill completed"><i className="bi bi-check2-circle me-1"></i>Completed</span>;
      case 'IN_PROGRESS':
        return <span className="task-status-pill in_progress"><i className="bi bi-clock-history me-1"></i>In Progress</span>;
      case 'CANCELLED':
        return <span className="task-status-pill cancelled">Cancelled</span>;
      default:
        return <span className="task-status-pill assigned"><i className="bi bi-flag me-1"></i>Assigned</span>;
    }
  };

  const getTypeBadge = (type, label) => {
    let cls = 'task-type-badge';
    if (type === 'CANDIDATE_SCREENING') cls += ' screening';
    else if (type === 'INTERVIEW_FEEDBACK') cls += ' feedback';
    else if (type === 'OFFER_PROCESSING') cls += ' offer';
    else if (type === 'INTERVIEW_COORDINATION') cls += ' coordination';

    let displayLabel = label;
    if (type === 'INTERVIEW_COORDINATION') displayLabel = 'Interview Scheduling';
    else if (type === 'OTHER') displayLabel = 'Other';
    else if (!displayLabel) {
      const match = TASK_TYPES.find(t => t.value === type);
      displayLabel = match ? match.label : type;
    }
    return <span className={cls}>{displayLabel}</span>;
  };

  return (
    <div className="urja-tasks-container">
      {/* Header */}
      <div className="urja-tasks-header">
        <div className="urja-tasks-header-left">
          <div className="urja-tasks-header-icon">
            <i className="bi bi-list-check"></i>
          </div>
          <div>
            <h1 className="urja-tasks-title">Task Assignment</h1>
            <p className="urja-tasks-subtitle">
              {isHrAdmin 
                ? 'Create, assign, monitor, and reassign recruitment tasks within your authorized scope.'
                : 'View and update recruitment tasks assigned to you within permitted actions.'}
            </p>
          </div>
        </div>

        <div className="urja-tasks-header-actions">
          <button 
            type="button"
            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
            onClick={() => { fetchTasks(currentPage, sortBy, sortDir); fetchSummaryStats(); }}
            disabled={isLoading}
            id="btn-refresh-tasks"
          >
            <i className={`bi bi-arrow-clockwise ${isLoading ? 'spin' : ''}`}></i>
            <span>Refresh</span>
          </button>

          {isHrAdmin && (
            <button 
              type="button"
              className="urja-btn-lime"
              onClick={() => setShowAssignModal(true)}
              id="btn-assign-new-task"
            >
              <i className="bi bi-plus-circle-fill"></i>
              <span>Create Task</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Dashboard Summary Cards: 5 Database-Backed Cards */}
      <div className="urja-tasks-summary-grid">
        <div className="urja-tasks-card" id="card-total-tasks">
          <div className="urja-tasks-card-icon blue">
            <i className="bi bi-stack"></i>
          </div>
          <div className="urja-tasks-card-info">
            <div className="urja-tasks-card-val">{summaryStats.totalTasks}</div>
            <div className="urja-tasks-card-label">Total Tasks</div>
          </div>
        </div>

        <div className="urja-tasks-card" id="card-assigned-tasks">
          <div className="urja-tasks-card-icon purple">
            <i className="bi bi-person-check-fill"></i>
          </div>
          <div className="urja-tasks-card-info">
            <div className="urja-tasks-card-val">{summaryStats.assignedTasks}</div>
            <div className="urja-tasks-card-label">Assigned</div>
          </div>
        </div>

        <div className="urja-tasks-card" id="card-in-progress-tasks">
          <div className="urja-tasks-card-icon amber">
            <i className="bi bi-hourglass-split"></i>
          </div>
          <div className="urja-tasks-card-info">
            <div className="urja-tasks-card-val">{summaryStats.inProgressTasks}</div>
            <div className="urja-tasks-card-label">In Progress</div>
          </div>
        </div>

        <div className="urja-tasks-card" id="card-completed-tasks">
          <div className="urja-tasks-card-icon green">
            <i className="bi bi-check2-all"></i>
          </div>
          <div className="urja-tasks-card-info">
            <div className="urja-tasks-card-val">{summaryStats.completedTasks}</div>
            <div className="urja-tasks-card-label">Completed</div>
          </div>
        </div>

        <div className="urja-tasks-card" id="card-overdue-tasks">
          <div className="urja-tasks-card-icon red">
            <i className="bi bi-exclamation-triangle-fill"></i>
          </div>
          <div className="urja-tasks-card-info">
            <div className="urja-tasks-card-val">{summaryStats.overdueTasks}</div>
            <div className="urja-tasks-card-label">Overdue</div>
          </div>
        </div>
      </div>

      {/* 3. Search and Filters */}
      <div className="urja-tasks-filter-box">
        <form 
          className="urja-tasks-filter-form"
          onSubmit={e => {
            e.preventDefault();
            fetchTasks(0, sortBy, sortDir);
          }}
        >
          {/* Row 1: Search Input & Search Action */}
          <div className="urja-tasks-search-row">
            <div className="urja-tasks-search-input-wrap">
              <i className="bi bi-search urja-tasks-search-icon"></i>
              <input 
                id="input-task-search"
                type="text"
                placeholder="Search by task title, description, candidate, or requisition..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="urja-tasks-search-clear"
                  onClick={() => {
                    setSearchQuery('');
                    fetchTasks(0, sortBy, sortDir);
                  }}
                  title="Clear search"
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              )}
            </div>

            <button 
              type="submit" 
              className="urja-tasks-btn-search" 
              id="btn-search-tasks"
            >
              <i className="bi bi-search"></i>
              <span>Search</span>
            </button>
          </div>

          {/* Row 2: Filter Dropdowns */}
          <div className="urja-tasks-dropdowns-row">
            <div className="urja-tasks-select-group">
              <select 
                id="select-filter-type"
                className="urja-tasks-select"
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
              >
                {TASK_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="urja-tasks-select-group">
              <select 
                id="select-filter-priority"
                className="urja-tasks-select"
                value={filterPriority}
                onChange={e => setFilterPriority(e.target.value)}
              >
                {PRIORITIES.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            <div className="urja-tasks-select-group">
              <select 
                id="select-filter-status"
                className="urja-tasks-select"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
              >
                {STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {isHrAdmin && (
              <div className="urja-tasks-select-group">
                <select 
                  id="select-filter-user"
                  className="urja-tasks-select"
                  value={filterAssignedUser}
                  onChange={e => setFilterAssignedUser(e.target.value)}
                >
                  <option value="ALL">All Team Members</option>
                  {allUsersList.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role?.replace('ROLE_', '')})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="urja-tasks-select-group">
              <select
                id="select-sort-tasks"
                className="urja-tasks-select"
                value={`${sortBy}:${sortDir}`}
                onChange={e => {
                  const [field, dir] = e.target.value.split(':');
                  setSortBy(field);
                  setSortDir(dir);
                  fetchTasks(0, field, dir);
                }}
              >
                <option value="dueDate:asc">Sort: Due Date (Earliest First)</option>
                <option value="dueDate:desc">Sort: Due Date (Latest First)</option>
                <option value="priority:asc">Sort: Priority (Urgent First)</option>
                <option value="taskTitle:asc">Sort: Title (A-Z)</option>
                <option value="id:desc">Sort: Newest Created</option>
              </select>
            </div>

            {(filterType !== 'ALL' || filterPriority !== 'ALL' || filterStatus !== 'ALL' || filterAssignedUser !== 'ALL' || searchQuery) && (
              <button 
                type="button"
                id="btn-reset-filters"
                className="urja-tasks-reset-btn"
                onClick={() => {
                  setFilterType('ALL');
                  setFilterPriority('ALL');
                  setFilterStatus('ALL');
                  setFilterAssignedUser('ALL');
                  setSearchQuery('');
                  fetchTasks(0, sortBy, sortDir);
                }}
                title="Reset all filters"
              >
                <i className="bi bi-arrow-counterclockwise"></i>
                <span>Reset</span>
              </button>
            )}
          </div>
        </form>
      </div>

      {/* 4. Task List Table */}
      <div className="urja-tasks-table-wrapper">
        <div className="urja-tasks-table-scroll">
          <table className="urja-tasks-table" id="tasks-table">
            <thead>
              <tr>
                <th style={{ width: '75px' }} className="sortable" onClick={() => handleHeaderSort('id')}>
                  Task ID
                  <span className={`sort-icon ${sortBy === 'id' ? 'active' : ''}`}>
                    {sortBy === 'id' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                  </span>
                </th>
                <th style={{ width: 'auto' }} className="sortable" onClick={() => handleHeaderSort('taskTitle')}>
                  Task Title
                  <span className={`sort-icon ${sortBy === 'taskTitle' ? 'active' : ''}`}>
                    {sortBy === 'taskTitle' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                  </span>
                </th>
                <th style={{ width: '150px' }}>Assigned To</th>
                <th style={{ width: '135px' }}>Task Type</th>
                <th style={{ width: '175px' }}>Related Candidate / Requisition</th>
                <th style={{ width: '95px' }} className="sortable" onClick={() => handleHeaderSort('priority')}>
                  Priority
                  <span className={`sort-icon ${sortBy === 'priority' ? 'active' : ''}`}>
                    {sortBy === 'priority' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                  </span>
                </th>
                <th style={{ width: '110px' }} className="sortable" onClick={() => handleHeaderSort('dueDate')}>
                  Due Date
                  <span className={`sort-icon ${sortBy === 'dueDate' ? 'active' : ''}`}>
                    {sortBy === 'dueDate' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                  </span>
                </th>
                <th style={{ width: '110px' }} className="sortable" onClick={() => handleHeaderSort('status')}>
                  Status
                  <span className={`sort-icon ${sortBy === 'status' ? 'active' : ''}`}>
                    {sortBy === 'status' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                  </span>
                </th>
                <th style={{ width: '115px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '3.5rem' }}>
                    <div className="spinner-border text-success" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="text-muted small mt-2">Loading tasks from database...</p>
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '3.5rem' }}>
                    <div className="text-muted mb-2"><i className="bi bi-inbox" style={{ fontSize: '2.5rem', color: '#94a3b8' }}></i></div>
                    <h6 className="fw-bold text-dark mb-1">No Recruitment Tasks Found</h6>
                    <p className="text-muted small mb-3">No tasks match your current filter, search, or assignment criteria.</p>
                    {(filterType !== 'ALL' || filterPriority !== 'ALL' || filterStatus !== 'ALL' || filterAssignedUser !== 'ALL' || searchQuery) && (
                      <button 
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => {
                          setFilterType('ALL');
                          setFilterPriority('ALL');
                          setFilterStatus('ALL');
                          setFilterAssignedUser('ALL');
                          setSearchQuery('');
                          fetchTasks(0, sortBy, sortDir);
                        }}
                      >
                        <i className="bi bi-arrow-counterclockwise me-1"></i>Reset All Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                tasks.map(t => {
                  const isOverdue = t.isOverdue || t.overdue;
                  return (
                    <tr key={t.id} id={`task-row-${t.id}`}>
                      {/* Task ID */}
                      <td>
                        <span className="badge bg-light text-dark border font-monospace" style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}>
                          #TSK-{t.id}
                        </span>
                      </td>

                      {/* Task Title (Wraps onto multiple lines) */}
                      <td>
                        <div className="task-title-text">{t.taskTitle}</div>
                        {t.taskDescription && (
                          <div className="task-desc-text" title={t.taskDescription}>
                            {t.taskDescription}
                          </div>
                        )}
                      </td>

                      {/* Assigned To */}
                      <td>
                        <div className="task-user-cell">
                          <div className="task-avatar">
                            {(t.assignedUserName || 'User').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                          </div>
                          <div className="task-user-info">
                            <div className="fw-semibold text-dark small">{t.assignedUserName}</div>
                            <div className="text-muted" style={{ fontSize: '0.72rem' }}>{t.assignedUserRole?.replace('ROLE_', '')}</div>
                          </div>
                        </div>
                      </td>

                      {/* Task Type */}
                      <td>
                        {getTypeBadge(t.taskType, t.taskTypeLabel)}
                      </td>

                      {/* Related Candidate / Requisition (Wraps cleanly) */}
                      <td>
                        {t.candidateName ? (
                          <div className="task-related-box">
                            <span className="d-block small text-dark fw-medium">
                              <i className="bi bi-person me-1 text-primary"></i>{t.candidateName}
                            </span>
                            <span className="badge bg-light text-muted border" style={{ fontSize: '0.68rem' }}>
                              {t.candidateCode || ('CAN-' + t.candidateId)}
                            </span>
                          </div>
                        ) : t.jobTitle ? (
                          <div className="task-related-box">
                            <span className="d-block small text-dark fw-medium">
                              <i className="bi bi-briefcase me-1 text-success"></i>{t.jobTitle}
                            </span>
                            <span className="badge bg-light text-muted border" style={{ fontSize: '0.68rem' }}>
                              {t.requisitionCode}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted small">None</span>
                        )}
                      </td>

                      {/* Priority */}
                      <td>
                        {getPriorityPill(t.priority)}
                      </td>

                      {/* Due Date */}
                      <td>
                        <div className="small">
                          <div className={`fw-medium ${isOverdue ? 'text-danger fw-bold' : 'text-dark'}`}>
                            <i className="bi bi-calendar-event me-1"></i>
                            {t.dueDate}
                            {isOverdue && <span className="badge bg-danger ms-1" style={{ fontSize: '0.65rem' }}>OVERDUE</span>}
                          </div>
                          {t.startDate && (
                            <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                              Start: {t.startDate}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        {getStatusPill(t.status)}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'center' }}>
                        <div className="d-flex align-items-center justify-content-center gap-1">
                          {t.status !== 'COMPLETED' && (
                            <button 
                              type="button"
                              className="btn btn-sm btn-outline-success px-2 py-1"
                              title="Mark as Completed"
                              onClick={() => handleStatusChange(t.id, 'COMPLETED')}
                              id={`btn-complete-task-${t.id}`}
                            >
                              <i className="bi bi-check-lg"></i>
                            </button>
                          )}

                          {t.status === 'ASSIGNED' && (
                            <button 
                              type="button"
                              className="btn btn-sm btn-outline-primary px-2 py-1"
                              title="Start Progress"
                              onClick={() => handleStatusChange(t.id, 'IN_PROGRESS')}
                              id={`btn-progress-task-${t.id}`}
                            >
                              <i className="bi bi-play-fill"></i>
                            </button>
                          )}

                          {isHrAdmin && (
                            <button 
                              type="button"
                              className="btn btn-sm btn-outline-secondary px-2 py-1"
                              title="Reassign Task"
                              onClick={() => handleOpenReassign(t)}
                              id={`btn-reassign-task-${t.id}`}
                            >
                              <i className="bi bi-person-fill-gear"></i>
                            </button>
                          )}

                          <button 
                            type="button"
                            className="btn btn-sm btn-light border px-2 py-1"
                            title="View Details"
                            onClick={() => { setSelectedTask(t); setShowDetailsModal(true); }}
                            id={`btn-view-task-${t.id}`}
                          >
                            <i className="bi bi-eye"></i>
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

        {/* Pinned Full-Width Pagination Footer */}
        {totalPages > 1 && (
          <div className="urja-tasks-table-footer">
            <span className="small text-muted">
              Showing page {currentPage + 1} of {totalPages} ({totalElements} total tasks)
            </span>
            <div className="d-flex gap-1">
              <button 
                type="button"
                id="btn-pagination-prev"
                className="btn btn-sm btn-outline-secondary"
                disabled={currentPage === 0}
                onClick={() => fetchTasks(currentPage - 1, sortBy, sortDir)}
              >
                Previous
              </button>
              <button 
                type="button"
                id="btn-pagination-next"
                className="btn btn-sm btn-outline-secondary"
                disabled={currentPage >= totalPages - 1}
                onClick={() => fetchTasks(currentPage + 1, sortBy, sortDir)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: CREATE TASK FORM (HR Admin Only) */}
      {showAssignModal && isHrAdmin && (
        <div className="urja-modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="urja-modal-dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: 660 }}>
            <div className="urja-modal-header">
              <h3 className="urja-modal-title">
                <i className="bi bi-plus-circle-fill text-success me-2"></i>
                Create Recruitment Task
              </h3>
              <button className="btn-close" onClick={() => setShowAssignModal(false)}></button>
            </div>

            <form onSubmit={handleAssignSubmit} id="form-create-task">
              <div className="urja-modal-body">
                {/* Task Title */}
                <div className="mb-3">
                  <label className="form-label small fw-bold text-dark">Task Title *</label>
                  <input 
                    id="input-create-title"
                    type="text"
                    className="form-control"
                    placeholder="e.g. Screen Senior Java Engineer Resumes"
                    value={assignForm.taskTitle}
                    onChange={e => setAssignForm({ ...assignForm, taskTitle: e.target.value })}
                    required
                  />
                </div>

                {/* Task Type & Assigned User */}
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-dark">Task Type *</label>
                    <select 
                      id="select-create-type"
                      className="form-select"
                      value={assignForm.taskType}
                      onChange={e => setAssignForm({ ...assignForm, taskType: e.target.value })}
                      required
                    >
                      <option value="REQUISITION_REVIEW">Requisition Review</option>
                      <option value="CANDIDATE_SCREENING">Candidate Screening</option>
                      <option value="INTERVIEW_COORDINATION">Interview Scheduling</option>
                      <option value="INTERVIEW_FEEDBACK">Interview Feedback</option>
                      <option value="OFFER_PROCESSING">Offer Processing</option>
                      <option value="ONBOARDING_FOLLOW_UP">Onboarding Follow-up</option>
                      <option value="OTHER">Other</option>
                    </select>
                    <small className="text-muted" style={{ fontSize: '0.72rem' }}>
                      Filters active eligible users by recruitment role requirements.
                    </small>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-dark">Assigned User *</label>
                    <select 
                      id="select-create-user"
                      className="form-select"
                      value={assignForm.assignedUserId}
                      onChange={e => setAssignForm({ ...assignForm, assignedUserId: e.target.value })}
                      required
                    >
                      <option value="">-- Select Eligible Active User --</option>
                      {eligibleAssignees.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} — {u.role?.replace('ROLE_', '')} ({u.activeTasksCount} active)
                        </option>
                      ))}
                    </select>
                    {eligibleAssignees.length === 0 && (
                      <small className="text-danger" style={{ fontSize: '0.72rem' }}>
                        No eligible active users found for this task type.
                      </small>
                    )}
                  </div>
                </div>

                {/* Related Requisition or Candidate */}
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-dark">Related Requisition (Optional)</label>
                    <select 
                      id="select-create-requisition"
                      className="form-select"
                      value={assignForm.requisitionId}
                      onChange={e => setAssignForm({ ...assignForm, requisitionId: e.target.value })}
                    >
                      <option value="">-- None / General Recruitment --</option>
                      {requisitionsList.map(r => (
                        <option key={r.id} value={r.id}>{r.requisitionCode} - {r.jobTitle}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-dark">Related Candidate (Optional)</label>
                    <select 
                      id="select-create-candidate"
                      className="form-select"
                      value={assignForm.candidateId}
                      onChange={e => setAssignForm({ ...assignForm, candidateId: e.target.value })}
                    >
                      <option value="">-- None / General Recruitment --</option>
                      {candidatesList.map(c => (
                        <option key={c.id} value={c.id}>{c.candidateCode || ('CAN-' + c.id)} - {c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Priority, Start Date, Due Date, Status */}
                <div className="row g-3 mb-3">
                  <div className="col-md-3">
                    <label className="form-label small fw-bold text-dark">Priority *</label>
                    <select 
                      id="select-create-priority"
                      className="form-select"
                      value={assignForm.priority}
                      onChange={e => setAssignForm({ ...assignForm, priority: e.target.value })}
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>

                  <div className="col-md-3">
                    <label className="form-label small fw-bold text-dark">Start Date</label>
                    <input 
                      id="input-create-start-date"
                      type="date"
                      className="form-control"
                      value={assignForm.startDate}
                      onChange={e => setAssignForm({ ...assignForm, startDate: e.target.value })}
                    />
                  </div>

                  <div className="col-md-3">
                    <label className="form-label small fw-bold text-dark">Due Date *</label>
                    <input 
                      id="input-create-due-date"
                      type="date"
                      className="form-control"
                      value={assignForm.dueDate}
                      onChange={e => setAssignForm({ ...assignForm, dueDate: e.target.value })}
                      required
                    />
                  </div>

                  <div className="col-md-3">
                    <label className="form-label small fw-bold text-dark">Status *</label>
                    <select 
                      id="select-create-status"
                      className="form-select"
                      value={assignForm.status}
                      onChange={e => setAssignForm({ ...assignForm, status: e.target.value })}
                    >
                      <option value="ASSIGNED">Assigned</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div className="mb-3">
                  <label className="form-label small fw-bold text-dark">Description</label>
                  <textarea 
                    id="input-create-desc"
                    className="form-control"
                    rows="2"
                    placeholder="Specific requirements, instructions, or deliverables..."
                    value={assignForm.taskDescription}
                    onChange={e => setAssignForm({ ...assignForm, taskDescription: e.target.value })}
                  ></textarea>
                </div>

                {/* Comments */}
                <div className="mb-3">
                  <label className="form-label small fw-bold text-dark">Comments</label>
                  <input 
                    id="input-create-comments"
                    type="text"
                    className="form-control"
                    placeholder="Optional notes or context for the assignee..."
                    value={assignForm.comments}
                    onChange={e => setAssignForm({ ...assignForm, comments: e.target.value })}
                  />
                </div>
              </div>

              <div className="urja-modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAssignModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="urja-btn-lime" id="btn-submit-create-task">
                  <i className="bi bi-check-circle-fill"></i>
                  <span>Confirm Assignment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REASSIGN TASK MODAL (HR Admin Only) */}
      {showReassignModal && selectedTask && isHrAdmin && (
        <div className="urja-modal-overlay" onClick={() => setShowReassignModal(false)}>
          <div className="urja-modal-dialog" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="urja-modal-header">
              <h3 className="urja-modal-title">
                <i className="bi bi-arrow-left-right text-warning me-2"></i>
                Reassign Task
              </h3>
              <button className="btn-close" onClick={() => setShowReassignModal(false)}></button>
            </div>

            <form onSubmit={handleReassignSubmit} id="form-reassign-task">
              <div className="urja-modal-body">
                <div className="p-3 bg-light rounded-3 mb-3 border">
                  <div className="small text-muted">Current Task</div>
                  <div className="fw-bold text-dark">#{selectedTask.id} - {selectedTask.taskTitle}</div>
                  <div className="small text-muted mt-1">
                    Currently assigned to: <strong>{selectedTask.assignedUserName}</strong>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-bold text-dark">New Assignee (Eligible Active Users) *</label>
                  <select 
                    id="select-reassign-user"
                    className="form-select"
                    value={reassignForm.newAssignedUserId}
                    onChange={e => setReassignForm({ ...reassignForm, newAssignedUserId: e.target.value })}
                    required
                  >
                    <option value="">-- Select New Active User --</option>
                    {eligibleAssignees
                      .filter(u => u.id !== selectedTask.assignedUserId)
                      .map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} — {u.role?.replace('ROLE_', '')} ({u.activeTasksCount} active)
                        </option>
                      ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-bold text-dark">Reassignment Note / Reason</label>
                  <textarea 
                    id="input-reassign-comments"
                    className="form-control"
                    rows="2"
                    placeholder="e.g. Workload balancing or rescheduling..."
                    value={reassignForm.comments}
                    onChange={e => setReassignForm({ ...reassignForm, comments: e.target.value })}
                  ></textarea>
                </div>
              </div>

              <div className="urja-modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowReassignModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-warning fw-bold text-dark" id="btn-submit-reassign">
                  Confirm Reassignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: VIEW TASK DETAILS MODAL */}
      {showDetailsModal && selectedTask && (
        <div className="urja-modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="urja-modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="urja-modal-header">
              <h3 className="urja-modal-title">Task #{selectedTask.id}: {selectedTask.taskTitle}</h3>
              <button className="btn-close" onClick={() => setShowDetailsModal(false)}></button>
            </div>
            <div className="urja-modal-body">
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="small text-muted d-block">Task Type</label>
                  {getTypeBadge(selectedTask.taskType, selectedTask.taskTypeLabel)}
                </div>
                <div className="col-md-6">
                  <label className="small text-muted d-block">Priority</label>
                  {getPriorityPill(selectedTask.priority)}
                </div>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="small text-muted d-block">Assigned To</label>
                  <strong>{selectedTask.assignedUserName}</strong> ({selectedTask.assignedUserEmail})
                </div>
                <div className="col-md-6">
                  <label className="small text-muted d-block">Assigned By</label>
                  <span>{selectedTask.assignedByName || 'HR Administrator'}</span>
                </div>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="small text-muted d-block">Due Date</label>
                  <strong className={selectedTask.isOverdue ? 'text-danger' : 'text-dark'}>{selectedTask.dueDate}</strong>
                  {selectedTask.isOverdue && <span className="badge bg-danger ms-2">OVERDUE</span>}
                </div>
                <div className="col-md-6">
                  <label className="small text-muted d-block">Current Status</label>
                  {getStatusPill(selectedTask.status)}
                </div>
              </div>

              {selectedTask.jobTitle && (
                <div className="mb-3 p-2 bg-light rounded border">
                  <span className="small text-muted d-block">Requisition</span>
                  <strong>{selectedTask.requisitionCode}</strong> — {selectedTask.jobTitle}
                </div>
              )}

              {selectedTask.candidateName && (
                <div className="mb-3 p-2 bg-light rounded border">
                  <span className="small text-muted d-block">Candidate</span>
                  <strong>{selectedTask.candidateName}</strong> {selectedTask.candidateCode && `(${selectedTask.candidateCode})`}
                </div>
              )}

              {selectedTask.taskDescription && (
                <div className="mb-3">
                  <label className="small text-muted d-block">Description</label>
                  <p className="p-2 bg-light rounded small text-dark mb-0">{selectedTask.taskDescription}</p>
                </div>
              )}

              {selectedTask.comments && (
                <div className="mb-3">
                  <label className="small text-muted d-block">Comments</label>
                  <p className="p-2 bg-light rounded small text-dark mb-0">{selectedTask.comments}</p>
                </div>
              )}
            </div>

            <div className="urja-modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDetailsModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
