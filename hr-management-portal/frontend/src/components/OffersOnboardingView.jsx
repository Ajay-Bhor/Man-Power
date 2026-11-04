import React, { useState, useEffect, useMemo, useRef } from 'react';
import '../styles/urja-offers.css';

// Helper to format ISO date strings to 'DD MMM YYYY' format (e.g., '10 Oct 2026')
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

// Helper for Indian Currency formatting (e.g., ₹ 9,50,000)
const formatCurrency = (val) => {
  if (val === null || val === undefined) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val);
};

export default function OffersOnboardingView({
  currentUser,
  onToast = () => {},
  candidates = [],
  requisitions = []
}) {
  const token = typeof window !== 'undefined' ? (sessionStorage.getItem('ats_urja_token') || currentUser?.token) : null;
  const isInterviewer = currentUser?.role === 'ROLE_INTERVIEWER' || (currentUser?.roles && currentUser.roles.includes('ROLE_INTERVIEWER') && !currentUser.roles.includes('ROLE_HR_ADMIN'));

  // 1. Core State
  const [summaryStats, setSummaryStats] = useState({
    totalOffers: 24,
    offersSent: 8,
    accepted: 6,
    declined: 2,
    joiningScheduled: 5,
    onboardingInProgress: 4,
    onboarded: 3
  });

  const [activeTab, setActiveTab] = useState('ALL');
  const [offersList, setOffersList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [selectedRowIds, setSelectedRowIds] = useState([]);

  // 2. Filters & Search State
  const [filterReq, setFilterReq] = useState('ALL');
  const [filterDept, setFilterDept] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterMonth, setFilterMonth] = useState('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  // 3. Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // 4. Modals State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showLetterModal, setShowLetterModal] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [workflowActionType, setWorkflowActionType] = useState('');
  const [workflowPayload, setWorkflowPayload] = useState({ declineReason: '', joiningDate: '', notes: '' });

  // Letter & Onboarding specific data
  const [letterData, setLetterData] = useState(null);
  const [onboardingChecklist, setOnboardingChecklist] = useState([]);
  const [isLoadingChecklist, setIsLoadingChecklist] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState(null);

  // Create / Edit Offer Form State
  const [editingOfferId, setEditingOfferId] = useState(null);
  const [createForm, setCreateForm] = useState({
    candidateId: '',
    candidateName: '',
    candidateEmail: '',
    candidateMobile: '',
    requisitionId: '',
    jobTitle: 'Software Engineer',
    department: 'Engineering',
    location: 'Pune',
    offerDate: new Date().toISOString().split('T')[0],
    joiningDate: '2026-11-15',
    ctcFixed: 550000,
    ctcVariable: 170000,
    ctcTotal: 700000,
    approvalStage: 'HR_VERIFIED',
    notes: 'Standard permanent employment package'
  });

  // Close more-options dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.urja-dropdown-container')) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Fetch summary counts from backend
  const fetchSummaryStats = () => {
    if (!token) return;
    fetch('http://localhost:8080/api/v1/offers/summary-stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : null)
      .then(res => {
        if (res && res.data) {
          setSummaryStats(res.data);
        }
      })
      .catch(err => console.warn('Failed to fetch offer summary stats:', err));
  };

  useEffect(() => {
    fetchSummaryStats();
  }, [token]);

  // Fetch offers list with tab, filters, search, and pagination
  const fetchOffers = () => {
    if (!token) return;
    setIsLoading(true);

    const params = new URLSearchParams();
    params.set('tab', activeTab);
    params.set('page', String(currentPage - 1));
    params.set('size', String(rowsPerPage));
    params.set('sort', 'offerDate,desc');

    if (filterReq !== 'ALL') params.set('requisitionId', filterReq);
    if (filterDept !== 'ALL') params.set('department', filterDept);
    if (filterStatus !== 'ALL') params.set('status', filterStatus);
    if (filterMonth !== 'ALL') params.set('joiningMonth', filterMonth);
    if (appliedSearch.trim()) params.set('search', appliedSearch.trim());

    fetch(`http://localhost:8080/api/v1/offers?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(body => {
        if (body && body.data) {
          const content = body.data.content || [];
          setOffersList(content);
          setTotalPages(body.data.totalPages || 1);
          setTotalElements(body.data.totalElements || 0);

          // If no offer is selected, select the first row
          if (content.length > 0 && (!selectedOffer || !content.find(o => o.id === selectedOffer.id))) {
            setSelectedOffer(content[0]);
          }
        }
      })
      .catch(err => {
        console.warn('Error fetching offers:', err);
        onToast('Failed to load offers from server');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchOffers();
  }, [token, activeTab, currentPage, rowsPerPage, filterReq, filterDept, filterStatus, filterMonth, appliedSearch]);

  // Handle Search submit
  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setAppliedSearch(searchInput);
    setCurrentPage(1);
  };

  // Handle Reset filters
  const handleResetFilters = () => {
    setFilterReq('ALL');
    setFilterDept('ALL');
    setFilterStatus('ALL');
    setFilterMonth('ALL');
    setSearchInput('');
    setAppliedSearch('');
    setCurrentPage(1);
    onToast('Filters reset to default');
  };

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  // Fetch Onboarding checklist for an offer
  const fetchOnboardingChecklist = (offerId) => {
    if (!token || !offerId) return;
    setIsLoadingChecklist(true);
    fetch(`http://localhost:8080/api/v1/offers/${offerId}/onboarding`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : null)
      .then(res => {
        if (res && res.data) {
          setOnboardingChecklist(res.data);
        }
      })
      .catch(err => console.warn('Checklist fetch error:', err))
      .finally(() => setIsLoadingChecklist(false));
  };

  // Toggle onboarding item completion
  const handleToggleChecklistItem = (itemId, currentCompleted) => {
    if (!token || !selectedOffer) return;
    const nextCompleted = !currentCompleted;

    fetch(`http://localhost:8080/api/v1/offers/${selectedOffer.id}/onboarding/${itemId}?isCompleted=${nextCompleted}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Update failed');
        return res.json();
      })
      .then(res => {
        if (res && res.data) {
          setOnboardingChecklist(prev => prev.map(item => item.id === itemId ? res.data : item));
          fetchOffers(); // Refresh table counts and bottom stats
          fetchSummaryStats();
          onToast(`Updated checklist item: ${res.data.itemName || res.data.title}`);
        }
      })
      .catch(err => onToast('Failed to update checklist item'));
  };

  // Fetch Offer Letter document
  const handleOpenLetterModal = (offer) => {
    setSelectedOffer(offer);
    setShowLetterModal(true);
    fetch(`http://localhost:8080/api/v1/offers/${offer.id}/letter`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : null)
      .then(res => {
        if (res && res.data) {
          setLetterData(res.data);
        }
      })
      .catch(err => console.warn('Letter generation error:', err));
  };

  // Workflow transition submit
  const handleExecuteWorkflow = () => {
    if (!token || !selectedOffer || !workflowActionType) return;

    const payload = {
      status: workflowActionType,
      declineReason: workflowPayload.declineReason,
      joiningDate: workflowPayload.joiningDate || undefined,
      notes: workflowPayload.notes || `Transitioned to ${workflowActionType} via Portal`
    };

    fetch(`http://localhost:8080/api/v1/offers/${selectedOffer.id}/workflow`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
      .then(res => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json();
      })
      .then(res => {
        if (res && res.data) {
          setSelectedOffer(res.data);
          setShowWorkflowModal(false);
          setActiveDropdownId(null);
          fetchOffers();
          fetchSummaryStats();
          onToast(`Offer status transitioned to ${workflowActionType}`);
        }
      })
      .catch(err => {
        onToast('Failed to transition workflow status');
      });
  };

  // Handlers for Opening Create and Edit Modals
  const handleOpenCreateModal = () => {
    setEditingOfferId(null);
    setCreateForm({
      candidateId: '',
      candidateName: '',
      candidateEmail: '',
      candidateMobile: '',
      requisitionId: '',
      jobTitle: 'Software Engineer',
      department: 'Engineering',
      location: 'Pune',
      offerDate: new Date().toISOString().split('T')[0],
      joiningDate: '2026-11-15',
      ctcFixed: 550000,
      ctcVariable: 170000,
      ctcTotal: 700000,
      approvalStage: 'HR_VERIFIED',
      notes: 'Standard permanent employment package'
    });
    setShowCreateModal(true);
  };

  const handleOpenEditModal = (offer) => {
    setSelectedOffer(offer);
    setEditingOfferId(offer.id);
    setCreateForm({
      candidateId: offer.candidateId || '',
      candidateName: offer.candidateName || '',
      candidateEmail: offer.candidateEmail || '',
      candidateMobile: offer.candidateMobile || '',
      requisitionId: offer.requisitionId || '',
      jobTitle: offer.jobTitle || 'Software Engineer',
      department: offer.department || 'Engineering',
      location: offer.location || 'Pune',
      offerDate: offer.offerDate || new Date().toISOString().split('T')[0],
      joiningDate: offer.joiningDate || '',
      ctcFixed: offer.ctcFixed !== null && offer.ctcFixed !== undefined ? offer.ctcFixed : '',
      ctcVariable: offer.ctcVariable !== null && offer.ctcVariable !== undefined ? offer.ctcVariable : '',
      ctcTotal: offer.ctcTotal !== null && offer.ctcTotal !== undefined ? offer.ctcTotal : '',
      approvalStage: offer.approvalStage || 'APPROVED',
      notes: offer.notes || ''
    });
    setShowCreateModal(true);
  };

  // CTC Change Handler - strictly validates non-negative numbers and keeps fields independently editable
  const handleCtcChange = (field, val) => {
    if (val === '') {
      setCreateForm(prev => ({ ...prev, [field]: '' }));
      return;
    }
    if (val.startsWith('-')) {
      onToast('Negative amounts are not allowed');
      return;
    }
    const num = Number(val);
    if (!isNaN(num) && num < 0) {
      onToast('Negative amounts are not allowed');
      return;
    }
    setCreateForm(prev => ({ ...prev, [field]: val }));
  };

  // Handle Create / Edit Offer Form Submission
  const handleCreateOfferSubmit = (isDraft = false) => {
    if (!token) return;
    if (!createForm.candidateName.trim() || !createForm.candidateEmail.trim()) {
      onToast('Please enter candidate name and email');
      return;
    }

    // Validate numeric inputs and prevent negative amounts
    const fixedNum = createForm.ctcFixed !== '' ? Number(createForm.ctcFixed) : 0;
    const variableNum = createForm.ctcVariable !== '' ? Number(createForm.ctcVariable) : 0;
    const totalNum = createForm.ctcTotal !== '' ? Number(createForm.ctcTotal) : 0;

    if (isNaN(fixedNum) || fixedNum < 0) {
      onToast('Fixed CTC must be a valid non-negative number');
      return;
    }
    if (isNaN(variableNum) || variableNum < 0) {
      onToast('Variable CTC must be a valid non-negative number');
      return;
    }
    if (isNaN(totalNum) || totalNum < 0) {
      onToast('Total Gross CTC must be a valid non-negative number');
      return;
    }

    const payload = {
      candidateId: createForm.candidateId ? Number(createForm.candidateId) : null,
      candidateName: createForm.candidateName.trim(),
      candidateEmail: createForm.candidateEmail.trim(),
      candidateMobile: createForm.candidateMobile.trim() || '+91 98230 11223',
      requisitionId: createForm.requisitionId ? Number(createForm.requisitionId) : null,
      jobTitle: createForm.jobTitle,
      department: createForm.department,
      location: createForm.location,
      offerDate: createForm.offerDate,
      joiningDate: createForm.joiningDate,
      ctcFixed: fixedNum,
      ctcVariable: variableNum,
      ctcTotal: totalNum,
      approvalStage: isDraft ? 'DRAFT' : 'DIRECT_APPROVED',
      action: isDraft ? 'SAVE_DRAFT' : 'SEND_OFFER',
      notes: createForm.notes
    };

    const isEdit = Boolean(editingOfferId);
    const url = isEdit
      ? `http://localhost:8080/api/v1/offers/${editingOfferId}`
      : 'http://localhost:8080/api/v1/offers';
    const method = isEdit ? 'PUT' : 'POST';

    fetch(url, {
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(b => { throw new Error(b.message || (isEdit ? 'Update failed' : 'Creation failed')); });
        }
        return res.json();
      })
      .then(res => {
        if (res && res.data) {
          setShowCreateModal(false);
          setEditingOfferId(null);
          fetchOffers();
          fetchSummaryStats();
          onToast(isEdit ? 'Offer updated successfully' : (isDraft ? 'Offer draft saved successfully' : 'Offer created and issued successfully'));
        }
      })
      .catch(err => {
        onToast(err.message || (isEdit ? 'Failed to update offer' : 'Failed to create offer letter'));
      });
  };

  // Select all rows handler
  const handleSelectAllRows = (e) => {
    if (e.target.checked) {
      setSelectedRowIds(offersList.map(o => o.id));
    } else {
      setSelectedRowIds([]);
    }
  };

  const handleToggleRowSelect = (id) => {
    setSelectedRowIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Badge mapping for Offer Status
  const renderOfferStatusBadge = (status) => {
    switch (status) {
      case 'ACCEPTED':
        return <span className="urja-badge offer-accepted"><i className="bi bi-check-circle-fill"></i> Accepted</span>;
      case 'OFFER_SENT':
        return <span className="urja-badge offer-sent"><i className="bi bi-send-fill"></i> Offer Sent</span>;
      case 'JOINING_SCHEDULED':
        return <span className="urja-badge offer-joining-scheduled"><i className="bi bi-calendar-check-fill"></i> Joining Scheduled</span>;
      case 'DECLINED':
        return <span className="urja-badge offer-declined"><i className="bi bi-x-circle-fill"></i> Declined</span>;
      case 'ONBOARDED':
        return <span className="urja-badge offer-onboarded"><i className="bi bi-person-check-fill"></i> Onboarded</span>;
      case 'ONBOARDING':
        return <span className="urja-badge offer-sent"><i className="bi bi-arrow-repeat"></i> Onboarding</span>;
      case 'APPROVED':
        return <span className="urja-badge offer-accepted"><i className="bi bi-shield-check"></i> Approved</span>;
      case 'PENDING_APPROVAL':
        return <span className="urja-badge offer-pending-approval"><i className="bi bi-clock-history"></i> Pending Approval</span>;
      case 'WITHDRAWN':
        return <span className="urja-badge offer-declined"><i className="bi bi-slash-circle"></i> Withdrawn</span>;
      default:
        return <span className="urja-badge offer-draft"><i className="bi bi-file-earmark"></i> {status || 'Draft'}</span>;
    }
  };

  // Badge mapping for Onboarding Status
  const renderOnboardingStatusBadge = (status) => {
    switch (status) {
      case 'IN_PROGRESS':
        return <span className="urja-badge onboarding-in-progress"><i className="bi bi-people-fill"></i> In Progress</span>;
      case 'PENDING':
        return <span className="urja-badge onboarding-pending"><i className="bi bi-flag-fill"></i> Pending</span>;
      case 'COMPLETED':
        return <span className="urja-badge onboarding-completed"><i className="bi bi-check-circle-fill"></i> Completed</span>;
      case 'NOT_APPLICABLE':
        return <span className="urja-badge onboarding-not-applicable"><i className="bi bi-info-circle"></i> Not Applicable</span>;
      default:
        return <span className="urja-badge onboarding-not-started"><i className="bi bi-square"></i> Not Started</span>;
    }
  };

  // Available candidate options for Create Offer Modal
  const candidateOptions = useMemo(() => {
    if (candidates && candidates.length > 0) return candidates;
    return [
      { id: 1, name: 'Rohan Mathur', email: 'rohan.mathur@email.com', role: 'Full Stack Engineer', dept: 'Engineering' },
      { id: 2, name: 'Sneha Patel', email: 'sneha.patel@email.com', role: 'Talent Acquisition Specialist', dept: 'Human Resources' },
      { id: 3, name: 'Kunal Sengupta', email: 'kunal.sengupta@email.com', role: 'Senior QA Engineer', dept: 'Quality Assurance' },
      { id: 4, name: 'Deepika Rao', email: 'deepika.rao@email.com', role: 'Operations Lead', dept: 'Production' },
      { id: 101, name: 'Amit Patil', email: 'amit.patil@gmail.com', role: 'Software Engineer', dept: 'Engineering' },
      { id: 102, name: 'Neha Joshi', email: 'neha.joshi@gmail.com', role: 'HR Executive', dept: 'Human Resources' },
      { id: 103, name: 'Rahul More', email: 'rahul.more@gmail.com', role: 'Quality Analyst', dept: 'Quality Assurance' }
    ];
  }, [candidates]);

  // Compute start and end record numbers for pagination footer
  const recordStart = totalElements === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const recordEnd = Math.min(currentPage * rowsPerPage, totalElements);

  return (
    <div className="urja-offers-container">
      {/* 1. Page Header */}
      <div className="urja-offers-header">
        <div className="urja-offers-header-left">
          <div className="urja-offers-header-icon" title="Urja Foods Offers">
            <i className="bi bi-file-earmark-check-fill"></i>
          </div>
          <div>
            <h1 className="urja-offers-title">Offers & Onboarding</h1>
            <p className="urja-offers-subtitle">
              Manage offer letters, track acceptance and monitor onboarding progress.
            </p>
          </div>
        </div>

        {!isInterviewer && (
          <button
            id="btn-create-offer"
            className="urja-btn-create-offer"
            onClick={handleOpenCreateModal}
          >
            <i className="bi bi-plus-lg"></i>
            Create Offer
            <i className="bi bi-chevron-down" style={{ fontSize: '0.75rem', marginLeft: '0.25rem' }}></i>
          </button>
        )}
      </div>

      {/* 2. Summary Cards Grid (7 Cards) */}
      <div className="urja-summary-cards-grid">
        {/* Total Offers */}
        <div
          className={`urja-summary-card ${activeTab === 'ALL' ? 'active' : ''}`}
          onClick={() => handleTabChange('ALL')}
          title="Filter all offers"
        >
          <div className="urja-summary-icon-box green">
            <i className="bi bi-file-earmark-text"></i>
          </div>
          <div className="urja-summary-info">
            <span className="urja-summary-label">Total Offers</span>
            <span className="urja-summary-val" id="summary-total-offers">{summaryStats.totalOffers}</span>
          </div>
        </div>

        {/* Offers Sent */}
        <div
          className={`urja-summary-card ${activeTab === 'OFFER_SENT' ? 'active' : ''}`}
          onClick={() => handleTabChange('OFFER_SENT')}
          title="Filter offers sent"
        >
          <div className="urja-summary-icon-box blue">
            <i className="bi bi-send"></i>
          </div>
          <div className="urja-summary-info">
            <span className="urja-summary-label">Offers Sent</span>
            <span className="urja-summary-val" id="summary-offers-sent">{summaryStats.offersSent}</span>
          </div>
        </div>

        {/* Accepted */}
        <div
          className={`urja-summary-card ${activeTab === 'ACCEPTED' ? 'active' : ''}`}
          onClick={() => handleTabChange('ACCEPTED')}
          title="Filter accepted offers"
        >
          <div className="urja-summary-icon-box green">
            <i className="bi bi-check-circle"></i>
          </div>
          <div className="urja-summary-info">
            <span className="urja-summary-label">Accepted</span>
            <span className="urja-summary-val" id="summary-accepted">{summaryStats.accepted}</span>
          </div>
        </div>

        {/* Declined */}
        <div
          className={`urja-summary-card ${activeTab === 'DECLINED' ? 'active' : ''}`}
          onClick={() => handleTabChange('DECLINED')}
          title="Filter declined offers"
        >
          <div className="urja-summary-icon-box red">
            <i className="bi bi-x-circle"></i>
          </div>
          <div className="urja-summary-info">
            <span className="urja-summary-label">Declined</span>
            <span className="urja-summary-val" id="summary-declined">{summaryStats.declined}</span>
          </div>
        </div>

        {/* Joining Scheduled */}
        <div
          className={`urja-summary-card ${activeTab === 'JOINING_SCHEDULED' ? 'active' : ''}`}
          onClick={() => handleTabChange('JOINING_SCHEDULED')}
          title="Filter scheduled joinings"
        >
          <div className="urja-summary-icon-box orange">
            <i className="bi bi-calendar3"></i>
          </div>
          <div className="urja-summary-info">
            <span className="urja-summary-label">Joining Scheduled</span>
            <span className="urja-summary-val" id="summary-joining-scheduled">{summaryStats.joiningScheduled}</span>
          </div>
        </div>

        {/* Onboarding In Progress */}
        <div
          className={`urja-summary-card ${activeTab === 'ONBOARDING' ? 'active' : ''}`}
          onClick={() => handleTabChange('ONBOARDING')}
          title="Filter onboarding in progress"
        >
          <div className="urja-summary-icon-box blue">
            <i className="bi bi-people-fill"></i>
          </div>
          <div className="urja-summary-info">
            <span className="urja-summary-label">Onboarding In Progress</span>
            <span className="urja-summary-val" id="summary-onboarding-progress">{summaryStats.onboardingInProgress}</span>
          </div>
        </div>

        {/* Onboarded */}
        <div
          className={`urja-summary-card ${activeTab === 'ONBOARDED' ? 'active' : ''}`}
          onClick={() => handleTabChange('ONBOARDED')}
          title="Filter onboarded candidates"
        >
          <div className="urja-summary-icon-box green">
            <i className="bi bi-people-fill"></i>
          </div>
          <div className="urja-summary-info">
            <span className="urja-summary-label">Onboarded</span>
            <span className="urja-summary-val" id="summary-onboarded">{summaryStats.onboarded}</span>
          </div>
        </div>
      </div>

      {/* 3. Status Tabs */}
      <div className="urja-status-tabs-wrap">
        <button
          className={`urja-status-tab-btn ${activeTab === 'ALL' ? 'active' : ''}`}
          onClick={() => handleTabChange('ALL')}
          id="tab-all"
        >
          All <span className="urja-status-tab-count">({summaryStats.totalOffers})</span>
        </button>
        <button
          className={`urja-status-tab-btn ${activeTab === 'OFFER_SENT' ? 'active' : ''}`}
          onClick={() => handleTabChange('OFFER_SENT')}
          id="tab-offer-sent"
        >
          Offer Sent <span className="urja-status-tab-count">({summaryStats.offersSent})</span>
        </button>
        <button
          className={`urja-status-tab-btn ${activeTab === 'ACCEPTED' ? 'active' : ''}`}
          onClick={() => handleTabChange('ACCEPTED')}
          id="tab-accepted"
        >
          Accepted <span className="urja-status-tab-count">({summaryStats.accepted})</span>
        </button>
        <button
          className={`urja-status-tab-btn ${activeTab === 'DECLINED' ? 'active' : ''}`}
          onClick={() => handleTabChange('DECLINED')}
          id="tab-declined"
        >
          Declined <span className="urja-status-tab-count">({summaryStats.declined})</span>
        </button>
        <button
          className={`urja-status-tab-btn ${activeTab === 'JOINING_SCHEDULED' ? 'active' : ''}`}
          onClick={() => handleTabChange('JOINING_SCHEDULED')}
          id="tab-joining-scheduled"
        >
          Joining Scheduled <span className="urja-status-tab-count">({summaryStats.joiningScheduled})</span>
        </button>
        <button
          className={`urja-status-tab-btn ${activeTab === 'ONBOARDING' ? 'active' : ''}`}
          onClick={() => handleTabChange('ONBOARDING')}
          id="tab-onboarding"
        >
          Onboarding <span className="urja-status-tab-count">({summaryStats.onboardingInProgress})</span>
        </button>
        <button
          className={`urja-status-tab-btn ${activeTab === 'ONBOARDED' ? 'active' : ''}`}
          onClick={() => handleTabChange('ONBOARDED')}
          id="tab-onboarded"
        >
          Onboarded <span className="urja-status-tab-count">({summaryStats.onboarded})</span>
        </button>
      </div>

      {/* 4. Filters & Search Card */}
      <div className="urja-filter-card">
        <form onSubmit={handleSearchSubmit} className="urja-filter-grid">
          {/* Job Requisition */}
          <div className="urja-filter-group">
            <label className="urja-filter-label">Job Requisition</label>
            <select
              id="filter-job-requisition"
              className="urja-filter-select"
              value={filterReq}
              onChange={(e) => { setFilterReq(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">All Requisitions</option>
              <option value="21">REQ-2026-021 (Software Engineer)</option>
              <option value="22">REQ-2026-022 (HR Executive)</option>
              <option value="23">REQ-2026-023 (Quality Analyst)</option>
              <option value="24">REQ-2026-024 (Production Engineer)</option>
              <option value="25">REQ-2026-025 (Plant Operator)</option>
              <option value="26">REQ-2026-026 (Maintenance Tech)</option>
              <option value="27">REQ-2026-027 (Warehouse Supervisor)</option>
            </select>
          </div>

          {/* Department */}
          <div className="urja-filter-group">
            <label className="urja-filter-label">Department</label>
            <select
              id="filter-department"
              className="urja-filter-select"
              value={filterDept}
              onChange={(e) => { setFilterDept(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="Human Resources">Human Resources</option>
              <option value="Quality Assurance">Quality Assurance</option>
              <option value="Production">Production</option>
              <option value="Plant Operations">Plant Operations</option>
              <option value="Supply Chain">Supply Chain</option>
              <option value="Finance">Finance</option>
            </select>
          </div>

          {/* Offer Status */}
          <div className="urja-filter-group">
            <label className="urja-filter-label">Offer Status</label>
            <select
              id="filter-offer-status"
              className="urja-filter-select"
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">All Status</option>
              <option value="OFFER_SENT">Offer Sent</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="DECLINED">Declined</option>
              <option value="JOINING_SCHEDULED">Joining Scheduled</option>
              <option value="ONBOARDING">Onboarding</option>
              <option value="ONBOARDED">Onboarded</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
            </select>
          </div>

          {/* Joining Month */}
          <div className="urja-filter-group">
            <label className="urja-filter-label">Joining Month</label>
            <select
              id="filter-joining-month"
              className="urja-filter-select"
              value={filterMonth}
              onChange={(e) => { setFilterMonth(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">Select Month</option>
              <option value="2026-10">October 2026</option>
              <option value="2026-11">November 2026</option>
              <option value="2026-12">December 2026</option>
              <option value="2027-01">January 2027</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="urja-filter-group">
            <label className="urja-filter-label">&nbsp;</label>
            <div className="urja-search-input-wrap">
              <i className="bi bi-search"></i>
              <input
                id="input-offers-search"
                type="text"
                className="urja-filter-input"
                placeholder="Search by candidate name, job title, or email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          </div>

          {/* Search Button */}
          <button id="btn-offers-search" type="submit" className="urja-btn-search">
            Search
          </button>

          {/* Reset Button */}
          <button
            id="btn-offers-reset"
            type="button"
            className="urja-btn-reset"
            onClick={handleResetFilters}
          >
            Reset
          </button>
        </form>
      </div>

      {/* 5. Offers Table Card */}
      <div className="urja-table-card">
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table className="urja-offers-table" id="table-offers">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    className="urja-row-checkbox"
                    checked={offersList.length > 0 && selectedRowIds.length === offersList.length}
                    onChange={handleSelectAllRows}
                    title="Select all offers on this page"
                  />
                </th>
                <th>Candidate</th>
                <th>Job Title</th>
                <th>Offer Date</th>
                <th>Joining Date</th>
                <th>Offer Status</th>
                <th>Onboarding Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem' }}>
                    <div className="spinner-border text-success" role="status">
                      <span className="visually-hidden">Loading offers...</span>
                    </div>
                    <p className="text-muted mt-2 mb-0">Loading database records...</p>
                  </td>
                </tr>
              ) : offersList.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3.5rem' }}>
                    <div style={{ fontSize: '2.5rem', color: '#94A3B8', marginBottom: '0.5rem' }}>
                      <i className="bi bi-folder-x"></i>
                    </div>
                    <h5 className="fw-bold text-dark">No Offer Records Found</h5>
                    <p className="text-muted small">No candidates match the specified criteria or filter parameters.</p>
                    <button className="urja-btn-reset mt-2" onClick={handleResetFilters}>
                      Clear All Filters
                    </button>
                  </td>
                </tr>
              ) : (
                offersList.map((offer) => {
                  const isRowSelected = selectedOffer?.id === offer.id;
                  const isChecked = selectedRowIds.includes(offer.id);

                  return (
                    <tr
                      key={offer.id}
                      className={isRowSelected ? 'selected' : ''}
                      onClick={() => setSelectedOffer(offer)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="urja-row-checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleRowSelect(offer.id)}
                        />
                      </td>

                      {/* Candidate */}
                      <td>
                        <div className="urja-candidate-cell">
                          {offer.candidateAvatar && offer.candidateAvatar.startsWith('/') ? (
                            <img
                              src={offer.candidateAvatar}
                              alt={offer.candidateName}
                              className="urja-candidate-avatar"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <div className="urja-candidate-initials">
                              {offer.candidateName ? offer.candidateName.substring(0, 2).toUpperCase() : 'UR'}
                            </div>
                          )}
                          <div>
                            <div className="urja-candidate-name">{offer.candidateName}</div>
                            <div className="urja-candidate-email">{offer.candidateEmail}</div>
                          </div>
                        </div>
                      </td>

                      {/* Job Title */}
                      <td>
                        <div className="urja-job-title-text">{offer.jobTitle}</div>
                        <div className="urja-job-location-text">
                          <i className="bi bi-geo-alt"></i>
                          <span>{offer.location || 'Pune'}</span>
                        </div>
                      </td>

                      {/* Offer Date */}
                      <td>
                        <span className="urja-date-text">{formatDate(offer.offerDate)}</span>
                      </td>

                      {/* Joining Date */}
                      <td>
                        <span className="urja-date-text">{formatDate(offer.joiningDate)}</span>
                      </td>

                      {/* Offer Status */}
                      <td>
                        {renderOfferStatusBadge(offer.status)}
                      </td>

                      {/* Onboarding Status */}
                      <td>
                        {renderOnboardingStatusBadge(offer.onboardingStatus)}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <div className="urja-table-actions-cell" style={{ justifyContent: 'center' }}>
                          {/* View details */}
                          <button
                            className="urja-btn-action-icon"
                            title="View Offer Details"
                            onClick={() => { setSelectedOffer(offer); setShowViewModal(true); }}
                          >
                            <i className="bi bi-eye"></i>
                          </button>

                          {/* Offer Letter Document */}
                          <button
                            className="urja-btn-action-icon"
                            title="View Formal Offer Letter"
                            onClick={() => handleOpenLetterModal(offer)}
                          >
                            <i className="bi bi-file-earmark-text"></i>
                          </button>

                          {/* Edit Offer */}
                          {!isInterviewer && (
                            <button
                              className="urja-btn-action-icon"
                              title="Edit Offer & Compensation"
                              onClick={() => handleOpenEditModal(offer)}
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                          )}

                          {/* More Options Dropdown */}
                          <div className="urja-dropdown-container" style={{ position: 'relative' }}>
                            <button
                              className="urja-btn-action-icon"
                              title="More Options"
                              onClick={() => setActiveDropdownId(activeDropdownId === offer.id ? null : offer.id)}
                            >
                              <i className="bi bi-three-dots-vertical"></i>
                            </button>

                            {activeDropdownId === offer.id && (
                              <div
                                style={{
                                  position: 'absolute',
                                  right: 0,
                                  top: '100%',
                                  background: '#FFFFFF',
                                  border: '1px solid #E2E8F0',
                                  borderRadius: '8px',
                                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                                  zIndex: 100,
                                  width: '210px',
                                  padding: '0.4rem 0',
                                  textAlign: 'left'
                                }}
                              >
                                <button
                                  className="dropdown-item px-3 py-2 text-dark d-flex align-items-center gap-2 border-0 bg-transparent w-100"
                                  style={{ fontSize: '0.82rem', cursor: 'pointer' }}
                                  onClick={() => {
                                    setSelectedOffer(offer);
                                    fetchOnboardingChecklist(offer.id);
                                    setShowOnboardingModal(true);
                                    setActiveDropdownId(null);
                                  }}
                                >
                                  <i className="bi bi-check2-square text-primary"></i> Track Onboarding Checklist
                                </button>

                                {!isInterviewer && (
                                  <>
                                    <button
                                      className="dropdown-item px-3 py-2 text-dark d-flex align-items-center gap-2 border-0 bg-transparent w-100"
                                      style={{ fontSize: '0.82rem', cursor: 'pointer' }}
                                      onClick={() => {
                                        handleOpenEditModal(offer);
                                        setActiveDropdownId(null);
                                      }}
                                    >
                                      <i className="bi bi-pencil-square text-secondary"></i> Edit Offer & CTC
                                    </button>
                                    <button
                                      className="dropdown-item px-3 py-2 text-dark d-flex align-items-center gap-2 border-0 bg-transparent w-100"
                                      style={{ fontSize: '0.82rem', cursor: 'pointer' }}
                                      onClick={() => {
                                        setSelectedOffer(offer);
                                        setWorkflowActionType('OFFER_SENT');
                                        setWorkflowPayload({ declineReason: '', joiningDate: offer.joiningDate, notes: '' });
                                        setShowWorkflowModal(true);
                                        setActiveDropdownId(null);
                                      }}
                                    >
                                      <i className="bi bi-send text-success"></i> Send / Dispatch Offer
                                    </button>

                                    <button
                                      className="dropdown-item px-3 py-2 text-dark d-flex align-items-center gap-2 border-0 bg-transparent w-100"
                                      style={{ fontSize: '0.82rem', cursor: 'pointer' }}
                                      onClick={() => {
                                        setSelectedOffer(offer);
                                        setWorkflowActionType('ACCEPTED');
                                        setWorkflowPayload({ declineReason: '', joiningDate: offer.joiningDate, notes: '' });
                                        setShowWorkflowModal(true);
                                        setActiveDropdownId(null);
                                      }}
                                    >
                                      <i className="bi bi-check-circle text-success"></i> Mark as Accepted
                                    </button>

                                    <button
                                      className="dropdown-item px-3 py-2 text-dark d-flex align-items-center gap-2 border-0 bg-transparent w-100"
                                      style={{ fontSize: '0.82rem', cursor: 'pointer' }}
                                      onClick={() => {
                                        setSelectedOffer(offer);
                                        setWorkflowActionType('JOINING_SCHEDULED');
                                        setWorkflowPayload({ declineReason: '', joiningDate: offer.joiningDate || '2026-11-01', notes: '' });
                                        setShowWorkflowModal(true);
                                        setActiveDropdownId(null);
                                      }}
                                    >
                                      <i className="bi bi-calendar-check text-purple"></i> Schedule Joining Date
                                    </button>

                                    <button
                                      className="dropdown-item px-3 py-2 text-danger d-flex align-items-center gap-2 border-0 bg-transparent w-100"
                                      style={{ fontSize: '0.82rem', cursor: 'pointer' }}
                                      onClick={() => {
                                        setSelectedOffer(offer);
                                        setWorkflowActionType('DECLINED');
                                        setWorkflowPayload({ declineReason: 'Candidate accepted competing offer', joiningDate: '', notes: '' });
                                        setShowWorkflowModal(true);
                                        setActiveDropdownId(null);
                                      }}
                                    >
                                      <i className="bi bi-x-circle text-danger"></i> Mark as Declined
                                    </button>

                                    <button
                                      className="dropdown-item px-3 py-2 text-muted d-flex align-items-center gap-2 border-0 bg-transparent w-100"
                                      style={{ fontSize: '0.82rem', cursor: 'pointer' }}
                                      onClick={() => {
                                        setSelectedOffer(offer);
                                        setWorkflowActionType('WITHDRAWN');
                                        setWorkflowPayload({ declineReason: 'Requisition put on hold by management', joiningDate: '', notes: '' });
                                        setShowWorkflowModal(true);
                                        setActiveDropdownId(null);
                                      }}
                                    >
                                      <i className="bi bi-slash-circle text-secondary"></i> Withdraw / Revoke Offer
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 6. Pagination Footer */}
        <div className="urja-table-footer">
          <div className="urja-footer-count">
            Showing {recordStart} to {recordEnd} of {totalElements} records
          </div>

          <div className="urja-pagination-wrap">
            <div className="urja-rows-per-page">
              <span>Rows per page</span>
              <select
                id="select-rows-per-page"
                className="urja-rows-select"
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="urja-pagination-btns">
              <button
                className="urja-page-btn"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                title="Previous page"
              >
                <i className="bi bi-chevron-left"></i>
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                // Show first, last, current, and neighbours
                if (
                  p === 1 ||
                  p === totalPages ||
                  (p >= currentPage - 1 && p <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={p}
                      className={`urja-page-btn ${currentPage === p ? 'active' : ''}`}
                      onClick={() => setCurrentPage(p)}
                    >
                      {p}
                    </button>
                  );
                } else if (p === currentPage - 2 || p === currentPage + 2) {
                  return <span key={p} style={{ color: '#94A3B8', padding: '0 4px' }}>...</span>;
                }
                return null;
              })}

              <button
                className="urja-page-btn"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                title="Next page"
              >
                <i className="bi bi-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 7. Bottom Split Section (Offer & Onboarding Progress + Quick Actions) */}
      <div className="urja-offers-bottom-grid">
        {/* Left: Offer & Onboarding Progress */}
        <div className="urja-progress-card">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h3 className="urja-progress-card-title mb-0">Offer & Onboarding Progress</h3>
            {selectedOffer && (
              <span className="badge bg-light text-dark border px-2 py-1" style={{ fontSize: '0.8rem' }}>
                <i className="bi bi-person me-1"></i>
                {selectedOffer.candidateName} — {selectedOffer.jobTitle}
              </span>
            )}
          </div>

          <div className="urja-stepper-track">
            {/* Connecting Line */}
            <div className="urja-stepper-line">
              <div
                className="urja-stepper-line-fill"
                style={{
                  width:
                    selectedOffer?.status === 'ONBOARDED' ? '100%' :
                    selectedOffer?.status === 'JOINING_SCHEDULED' ? '80%' :
                    selectedOffer?.status === 'ONBOARDING' ? '65%' :
                    selectedOffer?.status === 'ACCEPTED' ? '45%' :
                    selectedOffer?.status === 'OFFER_SENT' ? '25%' : '10%'
                }}
              ></div>
            </div>

            {/* Step 1: Offer Created */}
            <div className="urja-step-node completed">
              <div className="urja-step-circle">
                <i className="bi bi-check-lg"></i>
              </div>
              <div className="urja-step-title">Offer Created</div>
              <div className="urja-step-subtitle">{formatDate(selectedOffer?.offerDate || '2026-10-10')}</div>
            </div>

            {/* Step 2: Offer Sent */}
            <div className={`urja-step-node ${['OFFER_SENT', 'ACCEPTED', 'JOINING_SCHEDULED', 'ONBOARDING', 'ONBOARDED'].includes(selectedOffer?.status) ? 'completed' : ''}`}>
              <div className="urja-step-circle">
                {['OFFER_SENT', 'ACCEPTED', 'JOINING_SCHEDULED', 'ONBOARDING', 'ONBOARDED'].includes(selectedOffer?.status) ? (
                  <i className="bi bi-check-lg"></i>
                ) : '2'}
              </div>
              <div className="urja-step-title">Offer Sent</div>
              <div className="urja-step-subtitle">{formatDate(selectedOffer?.offerDate || '2026-10-10')}</div>
            </div>

            {/* Step 3: Accepted */}
            <div className={`urja-step-node ${['ACCEPTED', 'JOINING_SCHEDULED', 'ONBOARDING', 'ONBOARDED'].includes(selectedOffer?.status) ? 'completed' : selectedOffer?.status === 'DECLINED' ? 'declined' : ''}`}>
              <div className="urja-step-circle">
                {['ACCEPTED', 'JOINING_SCHEDULED', 'ONBOARDING', 'ONBOARDED'].includes(selectedOffer?.status) ? (
                  <i className="bi bi-check-lg"></i>
                ) : selectedOffer?.status === 'DECLINED' ? (
                  <i className="bi bi-x-lg text-danger"></i>
                ) : '3'}
              </div>
              <div className="urja-step-title">{selectedOffer?.status === 'DECLINED' ? 'Declined' : 'Accepted'}</div>
              <div className="urja-step-subtitle">
                {selectedOffer?.status === 'DECLINED' ? 'Declined by Candidate' : formatDate(selectedOffer?.updatedAt || selectedOffer?.offerDate || '2026-10-12')}
              </div>
            </div>

            {/* Step 4: Background Check */}
            <div className={`urja-step-node ${selectedOffer?.onboardingStatus === 'COMPLETED' ? 'completed' : selectedOffer?.onboardingStatus === 'IN_PROGRESS' ? 'in-progress' : ''}`}>
              <div className="urja-step-circle">
                {selectedOffer?.onboardingStatus === 'COMPLETED' ? (
                  <i className="bi bi-check-lg"></i>
                ) : '4'}
              </div>
              <div className="urja-step-title">Background Check</div>
              <div className="urja-step-subtitle">
                {selectedOffer?.onboardingStatus === 'COMPLETED' ? 'Verified' :
                 selectedOffer?.onboardingStatus === 'IN_PROGRESS' ? 'In Progress' : 'Pending'}
              </div>
            </div>

            {/* Step 5: Joining Scheduled */}
            <div className={`urja-step-node ${['JOINING_SCHEDULED', 'ONBOARDED'].includes(selectedOffer?.status) ? 'completed' : ''}`}>
              <div className="urja-step-circle">
                {['JOINING_SCHEDULED', 'ONBOARDED'].includes(selectedOffer?.status) ? (
                  <i className="bi bi-check-lg"></i>
                ) : '5'}
              </div>
              <div className="urja-step-title">Joining Scheduled</div>
              <div className="urja-step-subtitle">{formatDate(selectedOffer?.joiningDate || '2026-11-01')}</div>
            </div>

            {/* Step 6: Onboarded */}
            <div className={`urja-step-node ${selectedOffer?.status === 'ONBOARDED' ? 'completed' : ''}`}>
              <div className="urja-step-circle">
                {selectedOffer?.status === 'ONBOARDED' ? (
                  <i className="bi bi-check-lg"></i>
                ) : '6'}
              </div>
              <div className="urja-step-title">Onboarded</div>
              <div className="urja-step-subtitle">{selectedOffer?.status === 'ONBOARDED' ? 'Completed' : 'Pending'}</div>
            </div>
          </div>
        </div>

        {/* Right: Quick Actions */}
        <div className="urja-quick-actions-card">
          <h3 className="urja-quick-actions-title">Quick Actions</h3>

          <div className="urja-quick-actions-list">
            <button
              id="btn-quick-send-offer"
              className="urja-btn-quick-primary"
              onClick={() => {
                if (selectedOffer) handleOpenLetterModal(selectedOffer);
                else onToast('Please select an offer from the table');
              }}
            >
              <i className="bi bi-send"></i>
              Send Offer Letter
            </button>

            <button
              id="btn-quick-track-onboarding"
              className="urja-btn-quick-secondary"
              onClick={() => {
                if (selectedOffer) {
                  fetchOnboardingChecklist(selectedOffer.id);
                  setShowOnboardingModal(true);
                } else {
                  onToast('Please select an offer first');
                }
              }}
            >
              <i className="bi bi-people-fill text-success"></i>
              Track Onboarding
            </button>

            <button
              id="btn-quick-view-profile"
              className="urja-btn-quick-secondary"
              onClick={() => {
                if (selectedOffer) setShowViewModal(true);
                else onToast('Please select an offer first');
              }}
            >
              <i className="bi bi-eye text-primary"></i>
              View Candidate Profile
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODAL 1: CREATE OFFER MODAL
          ========================================================================= */}
      {showCreateModal && (
        <div className="urja-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="urja-modal-box wide" onClick={(e) => e.stopPropagation()}>
            <div className="urja-modal-header">
              <h4 className="urja-modal-title">
                <i className={`bi ${editingOfferId ? 'bi-pencil-square' : 'bi-file-earmark-plus'} text-success me-2`}></i>
                {editingOfferId ? `Edit Employment Offer Letter — ${selectedOffer?.offerCode || ''}` : 'Create Employment Offer Letter'}
              </h4>
              <button className="urja-modal-close-btn" onClick={() => { setShowCreateModal(false); setEditingOfferId(null); }}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className="urja-modal-body">
              <div className="row g-3">
                {/* Candidate Selection */}
                <div className="col-md-6">
                  <label className="form-label fw-bold small text-secondary">Candidate Selection</label>
                  <select
                    id="select-candidate"
                    className="form-select"
                    value={createForm.candidateId}
                    onChange={(e) => {
                      const selId = Number(e.target.value);
                      const cand = candidateOptions.find(c => c.id === selId);
                      if (cand) {
                        setCreateForm(prev => ({
                          ...prev,
                          candidateId: cand.id,
                          candidateName: cand.name,
                          candidateEmail: cand.email,
                          jobTitle: cand.role || prev.jobTitle,
                          department: cand.dept || prev.department
                        }));
                      } else {
                        setCreateForm(prev => ({ ...prev, candidateId: '' }));
                      }
                    }}
                  >
                    <option value="">Select Existing Candidate</option>
                    {candidateOptions.map(cand => (
                      <option key={cand.id} value={cand.id}>
                        {cand.name} ({cand.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Candidate Full Name */}
                <div className="col-md-6">
                  <label className="form-label fw-bold small text-secondary">Candidate Full Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Ramesh Kulkarni"
                    value={createForm.candidateName}
                    onChange={(e) => setCreateForm({ ...createForm, candidateName: e.target.value })}
                  />
                </div>

                {/* Candidate Email */}
                <div className="col-md-6">
                  <label className="form-label fw-bold small text-secondary">Candidate Email *</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="candidate@example.com"
                    value={createForm.candidateEmail}
                    onChange={(e) => setCreateForm({ ...createForm, candidateEmail: e.target.value })}
                  />
                </div>

                {/* Candidate Mobile */}
                <div className="col-md-6">
                  <label className="form-label fw-bold small text-secondary">Mobile Number</label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="+91 98220 12345"
                    value={createForm.candidateMobile}
                    onChange={(e) => setCreateForm({ ...createForm, candidateMobile: e.target.value })}
                  />
                </div>

                {/* Approved Requisition */}
                <div className="col-md-6">
                  <label className="form-label fw-bold small text-secondary">Approved Requisition</label>
                  <select
                    className="form-select"
                    value={createForm.requisitionId}
                    onChange={(e) => setCreateForm({ ...createForm, requisitionId: e.target.value })}
                  >
                    <option value="">Select Requisition</option>
                    <option value="21">REQ-2026-021 — Software Engineer (Engineering)</option>
                    <option value="22">REQ-2026-022 — HR Executive (HR)</option>
                    <option value="23">REQ-2026-023 — Quality Analyst (QA)</option>
                    <option value="24">REQ-2026-024 — Production Engineer (Production)</option>
                    <option value="25">REQ-2026-025 — Plant Operator (Plant Ops)</option>
                    <option value="26">REQ-2026-026 — Maintenance Tech (Engineering)</option>
                  </select>
                </div>

                {/* Job Title */}
                <div className="col-md-6">
                  <label className="form-label fw-bold small text-secondary">Designation / Title</label>
                  <input
                    type="text"
                    className="form-control"
                    value={createForm.jobTitle}
                    onChange={(e) => setCreateForm({ ...createForm, jobTitle: e.target.value })}
                  />
                </div>

                {/* Department & Location */}
                <div className="col-md-6">
                  <label className="form-label fw-bold small text-secondary">Department</label>
                  <select
                    className="form-select"
                    value={createForm.department}
                    onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Quality Assurance">Quality Assurance</option>
                    <option value="Production">Production</option>
                    <option value="Plant Operations">Plant Operations</option>
                    <option value="Supply Chain">Supply Chain</option>
                    <option value="Finance">Finance</option>
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-bold small text-secondary">Work Location</label>
                  <select
                    className="form-select"
                    value={createForm.location}
                    onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                  >
                    <option value="Pune">Corporate Office - Pune</option>
                    <option value="Mumbai">Regional Office - Mumbai</option>
                    <option value="Rahuri">Plant - Rahuri</option>
                    <option value="Shirdi">Plant - Shirdi</option>
                    <option value="Nashik">Agro Facility - Nashik</option>
                  </select>
                </div>

                {/* Offer Date & Joining Date */}
                <div className="col-md-6">
                  <label className="form-label fw-bold small text-secondary">Offer Release Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={createForm.offerDate}
                    onChange={(e) => setCreateForm({ ...createForm, offerDate: e.target.value })}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-bold small text-secondary">Proposed Joining Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={createForm.joiningDate}
                    onChange={(e) => setCreateForm({ ...createForm, joiningDate: e.target.value })}
                  />
                </div>

                {/* Compensation Section */}
                <div className="col-12 mt-3">
                  <div className="urja-ctc-card">
                    <div className="urja-ctc-header">
                      <i className="bi bi-cash-stack"></i>
                      <span>Compensation & CTC Structure (Annual INR)</span>
                      {isInterviewer && (
                        <span className="badge bg-danger ms-auto">Restricted Access</span>
                      )}
                    </div>

                    {isInterviewer ? (
                      <div className="alert alert-warning mb-0 py-2 small">
                        <i className="bi bi-shield-lock-fill me-1"></i>
                        Confidential salary data is restricted for Interviewer roles.
                      </div>
                    ) : (
                      <div className="row g-3">
                        <div className="col-md-4">
                          <label className="urja-ctc-label">Fixed CTC (INR)</label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            id="input-ctc-fixed"
                            className="form-control urja-ctc-input"
                            placeholder="0"
                            value={createForm.ctcFixed}
                            onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                            onChange={(e) => handleCtcChange('ctcFixed', e.target.value)}
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="urja-ctc-label">Variable / Bonus (INR)</label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            id="input-ctc-variable"
                            className="form-control urja-ctc-input"
                            placeholder="0"
                            value={createForm.ctcVariable}
                            onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                            onChange={(e) => handleCtcChange('ctcVariable', e.target.value)}
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="urja-ctc-label">Total Gross CTC</label>
                          <div className="urja-ctc-currency-input-wrap">
                            <span className="urja-ctc-currency-prefix">₹</span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              id="input-ctc-total"
                              className="form-control urja-ctc-total-input"
                              placeholder="0"
                              value={createForm.ctcTotal}
                              onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                              onChange={(e) => handleCtcChange('ctcTotal', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Internal Notes */}
                <div className="col-12">
                  <label className="form-label fw-bold small text-secondary">Internal Notes & Justification</label>
                  <textarea
                    rows={2}
                    className="form-control"
                    placeholder="Candidate negotiated standard 30-day notice buyout..."
                    value={createForm.notes}
                    onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  ></textarea>
                </div>
              </div>
            </div>

            <div className="urja-modal-footer">
              <button className="urja-btn-reset" onClick={() => { setShowCreateModal(false); setEditingOfferId(null); }}>
                Cancel
              </button>
              {!editingOfferId && (
                <button
                  className="btn btn-outline-secondary fw-bold"
                  onClick={() => handleCreateOfferSubmit(true)}
                >
                  <i className="bi bi-save me-1"></i> Save Draft
                </button>
              )}
              <button
                className="urja-btn-create-offer"
                id="btn-submit-offer"
                onClick={() => handleCreateOfferSubmit(false)}
              >
                <i className={`bi ${editingOfferId ? 'bi-check2-circle' : 'bi-send-fill'} me-1`}></i>
                {editingOfferId ? 'Save & Update Offer' : 'Issue & Dispatch Offer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: FORMAL OFFER LETTER VIEWER
          ========================================================================= */}
      {showLetterModal && (
        <div className="urja-modal-backdrop" onClick={() => setShowLetterModal(false)}>
          <div className="urja-modal-box wide" onClick={(e) => e.stopPropagation()}>
            <div className="urja-modal-header">
              <h4 className="urja-modal-title">
                <i className="bi bi-file-earmark-text text-success me-2"></i>
                Formal Employment Offer Letter — Urja Foods
              </h4>
              <button className="urja-modal-close-btn" onClick={() => setShowLetterModal(false)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className="urja-modal-body">
              <div className="urja-letter-paper" id="offer-letter-document">
                <div className="urja-letter-header">
                  <div>
                    <div className="urja-letter-brand-logo">Urja Foods Ltd.</div>
                    <div className="small text-muted">Agritech, Poultry & Nutrition Division</div>
                    <div className="small text-muted">Registered Office: Viman Nagar, Pune - 411014</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="fw-bold text-dark">Ref: {letterData?.offerCode || selectedOffer?.offerCode || 'UF-OFF-2026-001'}</div>
                    <div className="small text-muted">Date: {formatDate(letterData?.offerDate || selectedOffer?.offerDate)}</div>
                  </div>
                </div>

                <div className="mb-4">
                  <strong>To:</strong><br />
                  <span className="fw-bold text-dark">{letterData?.candidateName || selectedOffer?.candidateName}</span><br />
                  <span>{letterData?.candidateEmail || selectedOffer?.candidateEmail}</span><br />
                  <span>{letterData?.candidateMobile || selectedOffer?.candidateMobile || '+91 98220 12345'}</span>
                </div>

                <h5 className="fw-bold text-dark mb-3">Sub: Formal Offer of Employment for the position of {letterData?.jobTitle || selectedOffer?.jobTitle}</h5>

                <p>Dear {letterData?.candidateName || selectedOffer?.candidateName},</p>
                <p>
                  With reference to your interview and subsequent discussions with our Talent Acquisition team,
                  we are delighted to extend this formal offer of employment with <strong>Urja Foods Limited</strong> as <strong>{letterData?.jobTitle || selectedOffer?.jobTitle}</strong> in our <strong>{letterData?.department || selectedOffer?.department}</strong> department, based at our <strong>{letterData?.location || selectedOffer?.location || 'Pune'}</strong> facility.
                </p>

                <p>
                  Your scheduled date of joining will be <strong>{formatDate(letterData?.joiningDate || selectedOffer?.joiningDate)}</strong>.
                </p>

                {/* Compensation Table */}
                <h6 className="fw-bold text-dark mt-4">Compensation & Annual CTC Breakdown:</h6>
                {isInterviewer || selectedOffer?.compensationMasked ? (
                  <div className="alert alert-secondary py-2 small">
                    <i className="bi bi-shield-lock-fill me-1"></i>
                    Compensation figures are confidential and masked for your access role.
                  </div>
                ) : (
                  <table className="urja-letter-table">
                    <thead>
                      <tr>
                        <th>Salary Component</th>
                        <th>Monthly (INR)</th>
                        <th>Annual (INR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Basic Salary + HRA (Fixed)</td>
                        <td>{formatCurrency((letterData?.ctcFixed || selectedOffer?.ctcFixed || 800000) / 12)}</td>
                        <td>{formatCurrency(letterData?.ctcFixed || selectedOffer?.ctcFixed || 800000)}</td>
                      </tr>
                      <tr>
                        <td>Performance Bonus / Variable Pay</td>
                        <td>—</td>
                        <td>{formatCurrency(letterData?.ctcVariable || selectedOffer?.ctcVariable || 150000)}</td>
                      </tr>
                      <tr style={{ background: '#F8FAFC', fontWeight: 'bold' }}>
                        <td>Total Cost to Company (CTC)</td>
                        <td>{formatCurrency((letterData?.ctcTotal || selectedOffer?.ctcTotal || 950000) / 12)}</td>
                        <td className="text-success">{formatCurrency(letterData?.ctcTotal || selectedOffer?.ctcTotal || 950000)}</td>
                      </tr>
                    </tbody>
                  </table>
                )}

                <p className="mt-3 small text-muted">
                  This offer is subject to satisfactory verification of your credentials, past employment background check, and reference endorsements. Kindly return a signed copy of this letter within 7 working days to confirm your acceptance.
                </p>

                <div className="mt-5 d-flex justify-content-between align-items-end">
                  <div>
                    <div className="fw-bold text-dark">Authorized Signatory</div>
                    <div className="small text-muted">Urja Foods Talent Acquisition</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="text-muted small">Candidate Signature: __________________</div>
                    <div className="text-muted small">Date: __________________</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="urja-modal-footer">
              <button
                className="btn btn-outline-secondary"
                onClick={() => {
                  window.print();
                }}
              >
                <i className="bi bi-printer me-1"></i> Print / Save PDF
              </button>

              <button
                className="urja-btn-create-offer"
                onClick={() => {
                  onToast(`Offer package dispatched to ${selectedOffer?.candidateEmail}`);
                  setShowLetterModal(false);
                }}
              >
                <i className="bi bi-envelope-check me-1"></i> Email to Candidate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: ONBOARDING TRACKING CHECKLIST
          ========================================================================= */}
      {showOnboardingModal && (
        <div className="urja-modal-backdrop" onClick={() => setShowOnboardingModal(false)}>
          <div className="urja-modal-box wide" onClick={(e) => e.stopPropagation()}>
            <div className="urja-modal-header">
              <div>
                <h4 className="urja-modal-title">
                  <i className="bi bi-check2-square text-success me-2"></i>
                  Onboarding Checklist & Verification
                </h4>
                <div className="small text-muted mt-1">
                  Candidate: <strong>{selectedOffer?.candidateName}</strong> ({selectedOffer?.jobTitle} — {selectedOffer?.department})
                </div>
              </div>
              <button className="urja-modal-close-btn" onClick={() => setShowOnboardingModal(false)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className="urja-modal-body">
              {/* Progress Summary Header */}
              {(() => {
                const totalCount = onboardingChecklist.length;
                const completedCount = onboardingChecklist.filter(i => (i.isCompleted ?? i.completed)).length;
                const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

                const categoryMap = {
                  OFFER_ACCEPTANCE: '1. Offer Acceptance & Legal Undertakings',
                  IDENTITY_ADDRESS: '2. Identity and Address Documents',
                  IDENTITY_DOCS: '2. Identity and Address Documents',
                  EDUCATION_EMPLOYMENT: '3. Education and Employment Records',
                  BGV: '4. Background Verification Checks',
                  BACKGROUND_VERIFICATION: '4. Background Verification Checks',
                  JOINING_CONFIRMATION: '5. Joining Confirmation & IT Provisioning',
                  FORMALITIES: '6. Required Joining Formalities (PF, ESIC, Bank)',
                  JOINING_FORMALITIES: '6. Required Joining Formalities (PF, ESIC, Bank)'
                };

                const categories = Array.from(new Set(onboardingChecklist.map(i => i.category)));

                return (
                  <>
                    <div className="p-3 bg-light rounded-3 border mb-4">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="fw-bold text-dark">Overall Onboarding Readiness</span>
                        <span className="badge bg-success fs-6">
                          {progressPct}% Completed
                        </span>
                      </div>
                      <div className="progress" style={{ height: '8px' }}>
                        <div
                          className="progress-bar bg-success"
                          style={{ width: `${progressPct}%` }}
                        ></div>
                      </div>
                    </div>

                    {isLoadingChecklist ? (
                      <div className="text-center py-4">
                        <div className="spinner-border text-success" role="status"></div>
                      </div>
                    ) : onboardingChecklist.length === 0 ? (
                      <div className="text-center py-4 text-muted">
                        No checklist items generated for this offer.
                      </div>
                    ) : (
                      categories.map(cat => {
                        const items = onboardingChecklist.filter(i => i.category === cat);
                        if (items.length === 0) return null;

                        return (
                          <div key={cat} className="mb-3">
                            <div className="urja-checklist-category-title">{categoryMap[cat] || cat}</div>
                            {items.map(item => {
                              const done = item.isCompleted ?? item.completed ?? false;
                              const title = item.itemName || item.title || 'Checklist Item';
                              const desc = item.notes || item.description || 'Verified by HR Operations';

                              return (
                                <div
                                  key={item.id}
                                  className={`urja-checklist-item-row ${done ? 'completed' : ''}`}
                                >
                                  <div className="d-flex align-items-center gap-3">
                                    <input
                                      type="checkbox"
                                      className="urja-row-checkbox"
                                      checked={done}
                                      onChange={() => handleToggleChecklistItem(item.id, done)}
                                      disabled={isInterviewer || (item.sensitiveDoc && !currentUser?.roles?.includes('ROLE_HR_ADMIN'))}
                                    />
                                    <div>
                                      <div className="fw-bold text-dark small d-flex align-items-center gap-2">
                                        {title}
                                        {item.sensitiveDoc && (
                                          <span className="badge bg-warning text-dark border" style={{ fontSize: '0.65rem' }}>
                                            <i className="bi bi-shield-lock"></i> Confidential
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                        {desc}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="d-flex align-items-center gap-2">
                                    <span className={`badge ${done ? 'bg-success' : 'bg-secondary'}`} style={{ fontSize: '0.75rem' }}>
                                      {done ? 'VERIFIED' : 'PENDING'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })
                    )}
                  </>
                );
              })()}
            </div>

            <div className="urja-modal-footer">
              <button className="urja-btn-create-offer" onClick={() => setShowOnboardingModal(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: WORKFLOW STATUS TRANSITION MODAL
          ========================================================================= */}
      {showWorkflowModal && (
        <div className="urja-modal-backdrop" onClick={() => setShowWorkflowModal(false)}>
          <div className="urja-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="urja-modal-header">
              <h4 className="urja-modal-title">
                Update Offer Status: {workflowActionType}
              </h4>
              <button className="urja-modal-close-btn" onClick={() => setShowWorkflowModal(false)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className="urja-modal-body">
              <p className="text-muted small">
                Candidate: <strong>{selectedOffer?.candidateName}</strong> ({selectedOffer?.jobTitle})
              </p>

              {workflowActionType === 'DECLINED' && (
                <div className="mb-3">
                  <label className="form-label fw-bold small text-secondary">Reason for Decline *</label>
                  <select
                    className="form-select"
                    value={workflowPayload.declineReason}
                    onChange={(e) => setWorkflowPayload({ ...workflowPayload, declineReason: e.target.value })}
                  >
                    <option value="Candidate accepted competing offer">Candidate accepted competing offer</option>
                    <option value="Expected compensation out of budget">Expected compensation out of budget</option>
                    <option value="Location / Relocation constraints">Location / Relocation constraints</option>
                    <option value="Notice period buyout declined">Notice period buyout declined</option>
                    <option value="Personal / Family reasons">Personal / Family reasons</option>
                  </select>
                </div>
              )}

              {workflowActionType === 'JOINING_SCHEDULED' && (
                <div className="mb-3">
                  <label className="form-label fw-bold small text-secondary">Confirmed Joining Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={workflowPayload.joiningDate}
                    onChange={(e) => setWorkflowPayload({ ...workflowPayload, joiningDate: e.target.value })}
                  />
                </div>
              )}

              <div className="mb-3">
                <label className="form-label fw-bold small text-secondary">Workflow Audit Notes</label>
                <textarea
                  rows={3}
                  className="form-control"
                  placeholder="Reason for change, HR approval reference, or candidate notes..."
                  value={workflowPayload.notes}
                  onChange={(e) => setWorkflowPayload({ ...workflowPayload, notes: e.target.value })}
                ></textarea>
              </div>
            </div>

            <div className="urja-modal-footer">
              <button className="urja-btn-reset" onClick={() => setShowWorkflowModal(false)}>
                Cancel
              </button>
              <button
                className={`btn fw-bold ${workflowActionType === 'DECLINED' || workflowActionType === 'WITHDRAWN' ? 'btn-danger' : 'btn-success'}`}
                onClick={handleExecuteWorkflow}
              >
                Confirm Transition
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 5: VIEW DETAILS MODAL
          ========================================================================= */}
      {showViewModal && selectedOffer && (
        <div className="urja-modal-backdrop" onClick={() => setShowViewModal(false)}>
          <div className="urja-modal-box wide" onClick={(e) => e.stopPropagation()}>
            <div className="urja-modal-header">
              <h4 className="urja-modal-title">
                <i className="bi bi-person-badge text-success me-2"></i>
                Offer & Onboarding Profile
              </h4>
              <button className="urja-modal-close-btn" onClick={() => setShowViewModal(false)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className="urja-modal-body">
              <div className="row g-3">
                {/* Candidate Overview Card */}
                <div className="col-12">
                  <div className="p-3 bg-light rounded-3 border d-flex align-items-center gap-3">
                    {selectedOffer.candidateAvatar && selectedOffer.candidateAvatar.startsWith('/') ? (
                      <img
                        src={selectedOffer.candidateAvatar}
                        alt={selectedOffer.candidateName}
                        style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div className="urja-candidate-initials" style={{ width: '60px', height: '60px', fontSize: '1.25rem' }}>
                        {selectedOffer.candidateName ? selectedOffer.candidateName.substring(0, 2).toUpperCase() : 'UF'}
                      </div>
                    )}
                    <div>
                      <h4 className="fw-bold text-dark mb-0">{selectedOffer.candidateName}</h4>
                      <div className="text-muted small">{selectedOffer.jobTitle} • {selectedOffer.department}</div>
                      <div className="text-secondary small mt-1">
                        <i className="bi bi-envelope me-1"></i>{selectedOffer.candidateEmail} • <i className="bi bi-telephone ms-2 me-1"></i>{selectedOffer.candidateMobile || '+91 98220 12345'}
                      </div>
                    </div>

                    <div className="ms-auto text-end">
                      <div>{renderOfferStatusBadge(selectedOffer.status)}</div>
                      <div className="mt-1">{renderOnboardingStatusBadge(selectedOffer.onboardingStatus)}</div>
                    </div>
                  </div>
                </div>

                {/* Offer Details */}
                <div className="col-md-6">
                  <div className="card p-3 border">
                    <h6 className="fw-bold text-dark border-bottom pb-2">Employment Details</h6>
                    <div className="small d-flex justify-content-between py-1">
                      <span className="text-muted">Offer Reference:</span>
                      <span className="fw-bold">{selectedOffer.offerCode}</span>
                    </div>
                    <div className="small d-flex justify-content-between py-1">
                      <span className="text-muted">Requisition Code:</span>
                      <span className="fw-bold">{selectedOffer.requisitionCode || 'REQ-2026-021'}</span>
                    </div>
                    <div className="small d-flex justify-content-between py-1">
                      <span className="text-muted">Location:</span>
                      <span className="fw-bold">{selectedOffer.location || 'Pune'}</span>
                    </div>
                    <div className="small d-flex justify-content-between py-1">
                      <span className="text-muted">Offer Date:</span>
                      <span className="fw-bold">{formatDate(selectedOffer.offerDate)}</span>
                    </div>
                    <div className="small d-flex justify-content-between py-1">
                      <span className="text-muted">Joining Date:</span>
                      <span className="fw-bold">{formatDate(selectedOffer.joiningDate)}</span>
                    </div>
                  </div>
                </div>

                {/* Compensation Details */}
                <div className="col-md-6">
                  <div className="card p-3 border">
                    <h6 className="fw-bold text-dark border-bottom pb-2">Compensation Structure</h6>
                    {isInterviewer || selectedOffer.compensationMasked ? (
                      <div className="alert alert-warning mb-0 small">
                        <i className="bi bi-shield-lock-fill me-1"></i>
                        Compensation details are masked for interviewer access.
                      </div>
                    ) : (
                      <>
                        <div className="small d-flex justify-content-between py-1">
                          <span className="text-muted">Fixed CTC:</span>
                          <span className="fw-bold">{formatCurrency(selectedOffer.ctcFixed)}</span>
                        </div>
                        <div className="small d-flex justify-content-between py-1">
                          <span className="text-muted">Variable / Incentives:</span>
                          <span className="fw-bold">{formatCurrency(selectedOffer.ctcVariable)}</span>
                        </div>
                        <div className="small d-flex justify-content-between py-1 border-top mt-1 pt-2">
                          <span className="fw-bold text-dark">Total Gross CTC:</span>
                          <span className="fw-bold text-success fs-6">{formatCurrency(selectedOffer.ctcTotal)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Decline or Notes if present */}
                {selectedOffer.declineReason && (
                  <div className="col-12">
                    <div className="alert alert-danger mb-0 small">
                      <strong>Decline Reason:</strong> {selectedOffer.declineReason}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="urja-modal-footer">
              {!isInterviewer && (
                <button
                  className="btn btn-outline-success fw-bold me-auto"
                  onClick={() => {
                    setShowViewModal(false);
                    handleOpenEditModal(selectedOffer);
                  }}
                >
                  <i className="bi bi-pencil-square me-1"></i> Edit Offer & CTC
                </button>
              )}
              <button
                className="btn btn-outline-secondary"
                onClick={() => {
                  setShowViewModal(false);
                  handleOpenLetterModal(selectedOffer);
                }}
              >
                <i className="bi bi-file-earmark-text me-1"></i> View Offer Letter
              </button>
              <button
                className="urja-btn-create-offer"
                onClick={() => {
                  setShowViewModal(false);
                  fetchOnboardingChecklist(selectedOffer.id);
                  setShowOnboardingModal(true);
                }}
              >
                <i className="bi bi-check2-square me-1"></i> View Checklist
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
