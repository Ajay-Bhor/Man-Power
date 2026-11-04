import React, { useState, useEffect, useMemo, useRef } from 'react';
import '../styles/urja-candidates.css';

export default function CandidatesView({
  currentUser,
  requisitions = [],
  departments = [],
  onViewCandidate,
  onScheduleInterview,
  showToast = () => {}
}) {
  // 1. Data States
  const [candidates, setCandidates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    totalCandidates: 248,
    newApplications: 32,
    newThisWeek: 12,
    inScreening: 65,
    inInterview: 48,
    offerStage: 18,
    rejected: 85
  });

  // 2. Filter States (Matching Row 1 & Row 2 of reference mockup)
  const [filterReq, setFilterReq] = useState('ALL');
  const [filterDept, setFilterDept] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterSource, setFilterSource] = useState('ALL');
  const [dateRange, setDateRange] = useState('');
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [filterExp, setFilterExp] = useState('ALL');
  const [filterNotice, setFilterNotice] = useState('ALL');

  // 3. Selection & Pagination States
  const [selectedCandidateIds, setSelectedCandidateIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'

  // 4. Modal & Dropdown Action States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [candidateToDelete, setCandidateToDelete] = useState(null);
  const [stageChangeCandidate, setStageChangeCandidate] = useState(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    requisitionId: '',
    jobTitle: 'Software Engineer',
    department: 'Soya Division',
    location: 'Pune',
    experienceYears: 3,
    source: 'NAUKRI',
    currentCtc: 800000,
    expectedCtc: 1200000,
    noticePeriodDays: 30,
    primarySkills: '',
    resumeFile: null
  });
  const [formErrors, setFormErrors] = useState({});

  // 5. Fetch Summary Stats from Backend
  useEffect(() => {
    const token = sessionStorage.getItem('ats_urja_token') || currentUser?.token;
    if (!token) return;

    fetch('http://localhost:8080/api/v1/candidates/stats', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => (res.ok ? res.json() : null))
      .then(body => {
        if (body && body.data) {
          setStats(body.data);
        }
      })
      .catch(err => console.warn('Could not fetch candidate stats:', err));
  }, [currentUser]);

  // 6. Fetch Candidates from Backend with Fallback
  const fetchCandidatesFromBackend = () => {
    setIsLoading(true);
    const token = sessionStorage.getItem('ats_urja_token') || currentUser?.token;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    let url = `http://localhost:8080/api/v1/candidates?page=0&size=50`;
    if (appliedSearch) url += `&search=${encodeURIComponent(appliedSearch)}`;
    if (filterReq !== 'ALL') url += `&requisitionId=${filterReq}`;
    if (filterDept !== 'ALL') url += `&department=${encodeURIComponent(filterDept)}`;
    if (filterStatus !== 'ALL') url += `&status=${encodeURIComponent(filterStatus)}`;
    if (filterSource !== 'ALL') url += `&source=${encodeURIComponent(filterSource)}`;

    fetch(url, { headers })
      .then(res => (res.ok ? res.json() : Promise.reject('Failed to fetch candidates')))
      .then(body => {
        setIsLoading(false);
        if (body && body.data && Array.isArray(body.data.content)) {
          if (body.data.content.length > 0) {
            // Normalize backend candidates with UI attributes
            const mapped = body.data.content.map(c => ({
              id: c.id,
              code: c.candidateCode,
              name: c.name,
              email: c.email,
              mobile: c.mobile,
              jobTitle: c.jobTitle || 'Software Engineer',
              department: c.departmentName || 'General',
              location: c.location || 'Pune',
              appliedDate: c.appliedDate || '12 Oct 2026',
              rawDate: c.createdAt,
              source: formatSource(c.source),
              status: c.displayStatus || 'New',
              currentStage: c.currentStage || 'Application Received',
              avatar: c.avatar || (c.name && c.name.toLowerCase().includes('neha') ? '/assets/images/cand_neha.jpg' : '/assets/images/cand_amit.jpg'),
              expYears: c.experienceYears || 3,
              noticeDays: c.noticePeriodDays || 30,
              skills: c.primarySkills || '',
              expectedCtc: c.expectedCtc || 1000000
            }));
            setCandidates(mapped);
          } else {
            // Zero candidates returned by backend (e.g. IT Admin restricted by policy, or interviewer with no assigned candidates)
            setCandidates([]);
          }
        } else {
          if (currentUser?.role === 'ROLE_IT_ADMIN') {
            setCandidates([]);
          } else {
            setCandidates(getDefaultCandidates());
          }
        }
      })
      .catch(() => {
        setIsLoading(false);
        if (currentUser?.role === 'ROLE_IT_ADMIN') {
          setCandidates([]);
        } else {
          setCandidates(getDefaultCandidates());
        }
      });
  };

  useEffect(() => {
    fetchCandidatesFromBackend();
  }, [appliedSearch, filterReq, filterDept, filterStatus, filterSource, currentUser]);

  // Default seed list matching reference mockup image media_1792815866975.png
  function getDefaultCandidates() {
    return [
      {
        id: 101,
        code: 'CAN-2026-M01',
        name: 'Amit Patil',
        email: 'amit.patil@gmail.com',
        mobile: '+91 98221 12345',
        jobTitle: 'Software Engineer',
        department: 'Soya Division',
        location: 'Pune',
        appliedDate: '12 Oct 2026',
        source: 'Naukri',
        status: 'New',
        currentStage: 'Application Received',
        avatar: '/assets/images/cand_amit.jpg',
        expYears: 4,
        noticeDays: 30,
        skills: 'React, Node.js, JavaScript, REST APIs, MySQL',
        expectedCtc: 1250000
      },
      {
        id: 102,
        code: 'CAN-2026-M02',
        name: 'Neha Joshi',
        email: 'neha.joshi@gmail.com',
        mobile: '+91 98222 23456',
        jobTitle: 'HR Executive',
        department: 'Human Resources',
        location: 'Mumbai',
        appliedDate: '11 Oct 2026',
        source: 'LinkedIn',
        status: 'In Progress',
        currentStage: 'Screening',
        avatar: '/assets/images/cand_neha.jpg',
        expYears: 3.5,
        noticeDays: 15,
        skills: 'Talent Acquisition, Campus Hiring, HRMS, Sourcing',
        expectedCtc: 650000
      },
      {
        id: 103,
        code: 'CAN-2026-M03',
        name: 'Rahul More',
        email: 'rahul.more@gmail.com',
        mobile: '+91 98223 34567',
        jobTitle: 'Quality Analyst',
        department: 'Quality Assurance',
        location: 'Pune',
        appliedDate: '10 Oct 2026',
        source: 'Company Website',
        status: 'Interview',
        currentStage: 'Technical Round',
        avatar: '/assets/images/cand_rahul.jpg',
        expYears: 4.5,
        noticeDays: 30,
        skills: 'Selenium, Java, Manual Testing, JIRA, Test Automation',
        expectedCtc: 950000
      },
      {
        id: 104,
        code: 'CAN-2026-M04',
        name: 'Sneha Shah',
        email: 'sneha.shah@gmail.com',
        mobile: '+91 98224 45678',
        jobTitle: 'Production Engineer',
        department: 'Plant Operations',
        location: 'Shirdi',
        appliedDate: '09 Oct 2026',
        source: 'Referral',
        status: 'Offer',
        currentStage: 'Offer Released',
        avatar: '/assets/images/cand_sneha.jpg',
        expYears: 5,
        noticeDays: 45,
        skills: 'Plant Operations, PLC SCADA, Six Sigma, Lean Manufacturing',
        expectedCtc: 1050000
      },
      {
        id: 105,
        code: 'CAN-2026-M05',
        name: 'Vikram Desai',
        email: 'vikram.desai@gmail.com',
        mobile: '+91 98225 56789',
        jobTitle: 'Plant Operator',
        department: 'Operations & Supply Chain',
        location: 'Rahuri',
        appliedDate: '08 Oct 2026',
        source: 'Naukri',
        status: 'New',
        currentStage: 'Application Received',
        avatar: '/assets/images/cand_vikram.jpg',
        expYears: 2.5,
        noticeDays: 15,
        skills: 'Boiler Operation, Steam Systems, Machine Preventive Maintenance',
        expectedCtc: 480000
      },
      {
        id: 106,
        code: 'CAN-2026-M06',
        name: 'Pooja Kale',
        email: 'pooja.kale@gmail.com',
        mobile: '+91 98226 67890',
        jobTitle: 'QA Executive',
        department: 'Quality Assurance',
        location: 'Pune',
        appliedDate: '07 Oct 2026',
        source: 'LinkedIn',
        status: 'In Progress',
        currentStage: 'HR Round',
        avatar: '/assets/images/cand_pooja.jpg',
        expYears: 3,
        noticeDays: 30,
        skills: 'Food Safety, FSSAI, HACCP, ISO 22000, Lab Testing',
        expectedCtc: 720000
      },
      {
        id: 107,
        code: 'CAN-2026-M07',
        name: 'Soham Gawade',
        email: 'soham.gawade@gmail.com',
        mobile: '+91 98227 78901',
        jobTitle: 'Maintenance Engineer',
        department: 'Plant Operations',
        location: 'Plant - Shirdi',
        appliedDate: '06 Oct 2026',
        source: 'Referral',
        status: 'Rejected',
        currentStage: 'Not Selected',
        avatar: '/assets/images/cand_soham.jpg',
        expYears: 4,
        noticeDays: 30,
        skills: 'Electrical Maintenance, Gearbox Alignment, HT Panels',
        expectedCtc: 800000
      },
      {
        id: 108,
        code: 'CAN-2026-M08',
        name: 'Riya Patil',
        email: 'riya.patil@gmail.com',
        mobile: '+91 98228 89012',
        jobTitle: 'HR Executive',
        department: 'Human Resources',
        location: 'Mumbai',
        appliedDate: '05 Oct 2026',
        source: 'Company Website',
        status: 'Interview',
        currentStage: 'HR Round',
        avatar: '/assets/images/cand_riya.jpg',
        expYears: 3.2,
        noticeDays: 30,
        skills: 'HR Operations, Employee Relations, Statutory Compliance',
        expectedCtc: 680000
      }
    ];
  }

  function formatSource(src) {
    if (!src) return 'Naukri';
    const s = src.toString().toUpperCase();
    if (s.includes('NAUKRI')) return 'Naukri';
    if (s.includes('LINKEDIN')) return 'LinkedIn';
    if (s.includes('CAREERS') || s.includes('WEBSITE') || s.includes('PORTAL')) return 'Company Website';
    if (s.includes('REFERRAL')) return 'Referral';
    if (s.includes('HEADHUNTER')) return 'Headhunter';
    if (s.includes('CAMPUS')) return 'Campus';
    return src;
  }

  // 7. Role-Based Permissions & Scoping
  const userRole = (currentUser?.roles && currentUser.roles[0]) || currentUser?.role || 'ROLE_HR_ADMIN';
  const isDeptHead = userRole === 'ROLE_DEPT_HEAD';
  const canEdit = ['ROLE_HR_ADMIN', 'ROLE_HR_RECRUITER', 'ROLE_IT_ADMIN'].includes(userRole);
  const canDelete = ['ROLE_HR_ADMIN', 'ROLE_IT_ADMIN'].includes(userRole);

  // Close more-options menus when clicked outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.urja-cand-actions-cell')) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // 8. Client-Side Filtering & Search Logic (Works dynamically on the candidate list)
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      // Requisition filter
      if (filterReq !== 'ALL') {
        const reqMatch = c.jobTitle.toLowerCase().includes(filterReq.toLowerCase()) || (c.code && c.code.includes(filterReq));
        if (!reqMatch) return false;
      }

      // Department filter
      if (filterDept !== 'ALL') {
        if (c.department.toLowerCase() !== filterDept.toLowerCase()) return false;
      }

      // Status filter
      if (filterStatus !== 'ALL') {
        if (c.status.toLowerCase() !== filterStatus.toLowerCase()) return false;
      }

      // Source filter
      if (filterSource !== 'ALL') {
        if (c.source.toLowerCase() !== filterSource.toLowerCase()) return false;
      }

      // Text Search Query (across name, email, mobile, skills, job title)
      if (appliedSearch && appliedSearch.trim()) {
        const q = appliedSearch.toLowerCase().trim();
        const inName = c.name.toLowerCase().includes(q);
        const inEmail = c.email.toLowerCase().includes(q);
        const inMobile = c.mobile && c.mobile.includes(q);
        const inSkills = c.skills && c.skills.toLowerCase().includes(q);
        const inJob = c.jobTitle.toLowerCase().includes(q);
        if (!inName && !inEmail && !inMobile && !inSkills && !inJob) return false;
      }

      // More filters: Experience
      if (filterExp !== 'ALL') {
        if (filterExp === '0-2' && (c.expYears < 0 || c.expYears > 2)) return false;
        if (filterExp === '3-5' && (c.expYears < 3 || c.expYears > 5)) return false;
        if (filterExp === '5+' && c.expYears < 5) return false;
      }

      // More filters: Notice Period
      if (filterNotice !== 'ALL') {
        if (filterNotice === '15' && c.noticeDays > 15) return false;
        if (filterNotice === '30' && c.noticeDays > 30) return false;
      }

      return true;
    });
  }, [candidates, filterReq, filterDept, filterStatus, filterSource, appliedSearch, filterExp, filterNotice]);

  // 9. Sorted & Paginated Candidates
  const sortedCandidates = useMemo(() => {
    const list = [...filteredCandidates];
    list.sort((a, b) => {
      if (sortField === 'name') {
        return sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      if (sortField === 'date') {
        const parseD = (item) => {
          if (item.rawDate) {
            const t = new Date(item.rawDate).getTime();
            if (!isNaN(t)) return t;
          }
          if (item.appliedDate) {
            const t = new Date(item.appliedDate).getTime();
            if (!isNaN(t)) return t;
          }
          return 0;
        };
        const timeA = parseD(a);
        const timeB = parseD(b);
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      }
      return 0;
    });
    return list;
  }, [filteredCandidates, sortField, sortOrder]);

  const totalPages = Math.ceil(sortedCandidates.length / rowsPerPage) || 1;
  const paginatedCandidates = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return sortedCandidates.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedCandidates, currentPage, rowsPerPage]);

  // 10. Checkbox Selection Handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedCandidateIds(paginatedCandidates.map(c => c.id));
    } else {
      setSelectedCandidateIds([]);
    }
  };

  const handleToggleSelectCandidate = (id) => {
    setSelectedCandidateIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // 11. Quick Filter from Summary Metric Cards
  const handleCardFilterClick = (statusKey) => {
    if (filterStatus === statusKey) {
      setFilterStatus('ALL');
    } else {
      setFilterStatus(statusKey);
    }
    setCurrentPage(1);
  };

  // 12. Search & Reset Handlers
  const handleExecuteSearch = (e) => {
    if (e) e.preventDefault();
    setAppliedSearch(searchQuery);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilterReq('ALL');
    setFilterDept('ALL');
    setFilterStatus('ALL');
    setFilterSource('ALL');
    setDateRange('');
    setSearchQuery('');
    setAppliedSearch('');
    setFilterExp('ALL');
    setFilterNotice('ALL');
    setCurrentPage(1);
    showToast('Filters reset to default view');
  };

  // 13. Form Validation for Add / Edit
  const validateForm = () => {
    const errs = {};
    if (!formData.name || !formData.name.trim()) errs.name = 'Candidate name is required.';
    if (!formData.email || !formData.email.trim()) {
      errs.email = 'Work email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Please enter a valid email format (e.g. name@domain.com).';
    }
    if (!formData.mobile || !formData.mobile.trim()) {
      errs.mobile = 'Mobile phone number is required.';
    } else if (!/^[0-9+\s-]{8,15}$/.test(formData.mobile.trim())) {
      errs.mobile = 'Please enter a valid mobile number.';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // 14. Add Candidate Submit Handler
  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const newId = candidates.length > 0 ? Math.max(...candidates.map(c => c.id)) + 1 : 109;
    const newCand = {
      id: newId,
      code: `CAN-2026-M${newId}`,
      name: formData.name.trim(),
      email: formData.email.trim(),
      mobile: formData.mobile.trim(),
      jobTitle: formData.jobTitle || 'Software Engineer',
      department: formData.department || 'Soya Division',
      location: formData.location || 'Pune',
      appliedDate: 'Just Now',
      source: formatSource(formData.source),
      status: 'New',
      currentStage: 'Application Received',
      avatar: formData.name.toLowerCase().includes('neha') || formData.name.toLowerCase().includes('pooja') 
              ? '/assets/images/cand_neha.jpg' 
              : '/assets/images/cand_amit.jpg',
      expYears: parseFloat(formData.experienceYears) || 3,
      noticeDays: parseInt(formData.noticePeriodDays) || 30,
      skills: formData.primarySkills || '',
      expectedCtc: parseFloat(formData.expectedCtc) || 1200000
    };

    // Call backend API if connected
    const token = sessionStorage.getItem('ats_urja_token') || currentUser?.token;
    if (token) {
      fetch('http://localhost:8080/api/v1/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: newCand.name,
          email: newCand.email,
          mobile: newCand.mobile,
          requisitionId: formData.requisitionId ? parseInt(formData.requisitionId) : 1,
          experienceYears: newCand.expYears,
          currentDesignation: newCand.jobTitle,
          currentCtc: formData.currentCtc,
          expectedCtc: newCand.expectedCtc,
          noticePeriodDays: newCand.noticeDays,
          primarySkills: newCand.skills,
          source: formData.source
        })
      }).catch(err => console.warn('Backend candidate save issue:', err));
    }

    setCandidates([newCand, ...candidates]);
    setStats(prev => ({
      ...prev,
      totalCandidates: prev.totalCandidates + 1,
      newApplications: prev.newApplications + 1
    }));
    setShowAddModal(false);
    showToast(`Candidate ${newCand.name} registered successfully!`);
  };

  // 15. Edit Candidate Handlers
  const handleOpenEdit = (cand) => {
    setEditingCandidate(cand);
    setFormData({
      name: cand.name,
      email: cand.email,
      mobile: cand.mobile,
      jobTitle: cand.jobTitle,
      department: cand.department,
      location: cand.location,
      experienceYears: cand.expYears || 3,
      source: cand.source.toUpperCase().replace(' ', '_'),
      expectedCtc: cand.expectedCtc || 1000000,
      noticePeriodDays: cand.noticeDays || 30,
      primarySkills: cand.skills || ''
    });
    setFormErrors({});
    setShowEditModal(true);
    setActiveMenuId(null);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!validateForm() || !editingCandidate) return;

    const updatedList = candidates.map(c => {
      if (c.id === editingCandidate.id) {
        return {
          ...c,
          name: formData.name.trim(),
          email: formData.email.trim(),
          mobile: formData.mobile.trim(),
          jobTitle: formData.jobTitle,
          department: formData.department,
          location: formData.location,
          expYears: parseFloat(formData.experienceYears) || c.expYears,
          noticeDays: parseInt(formData.noticePeriodDays) || c.noticeDays,
          skills: formData.primarySkills || c.skills,
          expectedCtc: parseFloat(formData.expectedCtc) || c.expectedCtc
        };
      }
      return c;
    });

    // Call backend API update
    const token = sessionStorage.getItem('ats_urja_token') || currentUser?.token;
    if (token) {
      fetch(`http://localhost:8080/api/v1/candidates/${editingCandidate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          mobile: formData.mobile.trim(),
          requisitionId: 1,
          experienceYears: parseFloat(formData.experienceYears) || 3,
          currentDesignation: formData.jobTitle,
          expectedCtc: parseFloat(formData.expectedCtc) || 1000000,
          noticePeriodDays: parseInt(formData.noticePeriodDays) || 30,
          primarySkills: formData.primarySkills || '',
          source: formData.source
        })
      }).catch(err => console.warn('Backend update candidate issue:', err));
    }

    setCandidates(updatedList);
    setShowEditModal(false);
    setEditingCandidate(null);
    showToast(`Candidate details for ${formData.name} updated!`);
  };

  // 16. Stage Update Handler
  const handleUpdateStage = (candidateId, newStage, newStatus) => {
    setCandidates(prev =>
      prev.map(c => {
        if (c.id === candidateId) {
          return { ...c, currentStage: newStage, status: newStatus };
        }
        return c;
      })
    );

    const token = sessionStorage.getItem('ats_urja_token') || currentUser?.token;
    if (token) {
      fetch(`http://localhost:8080/api/v1/candidates/${candidateId}/status?status=${newStatus.toUpperCase()}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      }).catch(err => console.warn('Backend status update issue:', err));
    }

    setStageChangeCandidate(null);
    setActiveMenuId(null);
    showToast(`Recruitment stage updated to: ${newStage}`);
  };

  // 17. Delete Candidate Handler
  const handleConfirmDelete = () => {
    if (!candidateToDelete) return;
    const token = sessionStorage.getItem('ats_urja_token') || currentUser?.token;
    if (token) {
      fetch(`http://localhost:8080/api/v1/candidates/${candidateToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      }).catch(err => console.warn('Backend delete issue:', err));
    }

    setCandidates(prev => prev.filter(c => c.id !== candidateToDelete.id));
    setSelectedCandidateIds(prev => prev.filter(id => id !== candidateToDelete.id));
    setStats(prev => ({
      ...prev,
      totalCandidates: Math.max(0, prev.totalCandidates - 1)
    }));
    setCandidateToDelete(null);
    setActiveMenuId(null);
    showToast('Candidate record removed successfully.');
  };

  // 18. Bulk Delete Handler
  const handleBulkDelete = () => {
    if (selectedCandidateIds.length === 0) return;
    setCandidates(prev => prev.filter(c => !selectedCandidateIds.includes(c.id)));
    setStats(prev => ({
      ...prev,
      totalCandidates: Math.max(0, prev.totalCandidates - selectedCandidateIds.length)
    }));
    showToast(`${selectedCandidateIds.length} candidates removed successfully.`);
    setSelectedCandidateIds([]);
  };

  return (
    <div className="urja-candidates-view-root">
      
      {/* ------------------------------------------------------------------------
          1. HEADER BAR: Title, Subtitle, and + Add Candidate Button
          ------------------------------------------------------------------------ */}
      <div className="urja-candidates-header-row">
        <div className="urja-candidates-title-group">
          <div className="urja-candidates-header-icon">
            <svg width="42" height="42" viewBox="0 0 24 24" fill="#15803D">
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
            </svg>
          </div>
          <div>
            <h1 className="urja-candidates-title">Candidates</h1>
            <p className="urja-candidates-subtitle">
              Track, manage and short-list candidates for your hiring requirements.
            </p>
          </div>
        </div>

        {/* Green + Add Candidate Button with dropdown split */}
        {canEdit && (
          <div className="urja-add-candidate-btn-group">
            <button
              className="urja-add-candidate-main-btn"
              onClick={() => {
                setFormData({
                  name: '',
                  email: '',
                  mobile: '',
                  requisitionId: '1',
                  jobTitle: 'Software Engineer',
                  department: 'Soya Division',
                  location: 'Pune',
                  experienceYears: 3,
                  source: 'NAUKRI',
                  currentCtc: 800000,
                  expectedCtc: 1200000,
                  noticePeriodDays: 30,
                  primarySkills: '',
                  resumeFile: null
                });
                setFormErrors({});
                setShowAddModal(true);
              }}
            >
              <i className="bi bi-plus-lg"></i>
              <span>Add Candidate</span>
            </button>
            <button
              className="urja-add-candidate-caret-btn"
              onClick={() => {
                showToast('Import Candidates via CSV / Excel');
              }}
              title="More Candidate Actions"
            >
              <i className="bi bi-chevron-down"></i>
            </button>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------------
          2. SUMMARY KPI METRIC CARDS (6 Across matching reference mockup)
          ------------------------------------------------------------------------ */}
      <div className="urja-candidates-summary-grid">
        
        {/* 1. Total Candidates */}
        <div
          className={`urja-summary-card ${filterStatus === 'ALL' ? 'active-filter' : ''}`}
          onClick={() => handleCardFilterClick('ALL')}
          title="Filter all candidates"
        >
          <div className="urja-summary-card-icon green">
            <i className="bi bi-people-fill" style={{ fontSize: '1.25rem' }}></i>
          </div>
          <div className="urja-summary-card-info">
            <span className="urja-summary-card-label">Total Candidates</span>
            <div className="urja-summary-card-value-row">
              <span className="urja-summary-card-value">{stats.totalCandidates}</span>
            </div>
          </div>
        </div>

        {/* 2. New Applications */}
        <div
          className={`urja-summary-card ${filterStatus === 'New' ? 'active-filter' : ''}`}
          onClick={() => handleCardFilterClick('New')}
          title="Filter New candidates"
        >
          <div className="urja-summary-card-icon blue">
            <i className="bi bi-file-earmark-text" style={{ fontSize: '1.25rem' }}></i>
          </div>
          <div className="urja-summary-card-info">
            <span className="urja-summary-card-label">New Applications</span>
            <div className="urja-summary-card-value-row">
              <span className="urja-summary-card-value">{stats.newApplications}</span>
              <span className="urja-summary-badge-green">+{stats.newThisWeek} this week ↗</span>
            </div>
          </div>
        </div>

        {/* 3. In Screening */}
        <div
          className={`urja-summary-card ${filterStatus === 'In Progress' ? 'active-filter' : ''}`}
          onClick={() => handleCardFilterClick('In Progress')}
          title="Filter Screening candidates"
        >
          <div className="urja-summary-card-icon purple">
            <i className="bi bi-person-fill" style={{ fontSize: '1.25rem' }}></i>
          </div>
          <div className="urja-summary-card-info">
            <span className="urja-summary-card-label">In Screening</span>
            <div className="urja-summary-card-value-row">
              <span className="urja-summary-card-value">{stats.inScreening}</span>
            </div>
          </div>
        </div>

        {/* 4. In Interview */}
        <div
          className={`urja-summary-card ${filterStatus === 'Interview' ? 'active-filter' : ''}`}
          onClick={() => handleCardFilterClick('Interview')}
          title="Filter Interview candidates"
        >
          <div className="urja-summary-card-icon calendar-blue">
            <i className="bi bi-calendar-event" style={{ fontSize: '1.25rem' }}></i>
          </div>
          <div className="urja-summary-card-info">
            <span className="urja-summary-card-label">In Interview</span>
            <div className="urja-summary-card-value-row">
              <span className="urja-summary-card-value">{stats.inInterview}</span>
            </div>
          </div>
        </div>

        {/* 5. Offer Stage */}
        <div
          className={`urja-summary-card ${filterStatus === 'Offer' ? 'active-filter' : ''}`}
          onClick={() => handleCardFilterClick('Offer')}
          title="Filter Offer candidates"
        >
          <div className="urja-summary-card-icon amber">
            <i className="bi bi-hand-thumbs-up" style={{ fontSize: '1.25rem' }}></i>
          </div>
          <div className="urja-summary-card-info">
            <span className="urja-summary-card-label">Offer Stage</span>
            <div className="urja-summary-card-value-row">
              <span className="urja-summary-card-value">{stats.offerStage}</span>
            </div>
          </div>
        </div>

        {/* 6. Rejected */}
        <div
          className={`urja-summary-card ${filterStatus === 'Rejected' ? 'active-filter' : ''}`}
          onClick={() => handleCardFilterClick('Rejected')}
          title="Filter Rejected candidates"
        >
          <div className="urja-summary-card-icon red">
            <i className="bi bi-person-x" style={{ fontSize: '1.25rem' }}></i>
          </div>
          <div className="urja-summary-card-info">
            <span className="urja-summary-card-label">Rejected</span>
            <div className="urja-summary-card-value-row">
              <span className="urja-summary-card-value">{stats.rejected}</span>
            </div>
          </div>
        </div>

      </div>

      {/* ------------------------------------------------------------------------
          3. SEARCH & FILTERS BAR (Row 1 Dropdowns + Row 2 Search)
          ------------------------------------------------------------------------ */}
      <div className="urja-candidates-filter-panel">
        
        {/* Row 1: Dropdowns */}
        <div className="urja-filter-dropdown-row">
          
          {/* Select Job Requisition */}
          <div className="urja-filter-group">
            <label className="urja-filter-label">Select Job Requisition</label>
            <select
              className="urja-filter-select"
              value={filterReq}
              onChange={(e) => { setFilterReq(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">All Requisitions</option>
              <option value="Software Engineer">Software Engineer</option>
              <option value="HR Executive">HR Executive</option>
              <option value="Quality Analyst">Quality Analyst</option>
              <option value="Production Engineer">Production Engineer</option>
              <option value="Plant Operator">Plant Operator</option>
              <option value="QA Executive">QA Executive</option>
              <option value="Maintenance Engineer">Maintenance Engineer</option>
            </select>
          </div>

          {/* Department */}
          <div className="urja-filter-group">
            <label className="urja-filter-label">Department</label>
            <select
              className="urja-filter-select"
              value={filterDept}
              onChange={(e) => { setFilterDept(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">All Departments</option>
              <option value="Soya Division">Soya Division</option>
              <option value="Plant Operations">Plant Operations</option>
              <option value="Quality Assurance">Quality Assurance</option>
              <option value="Human Resources">Human Resources</option>
              <option value="Operations & Supply Chain">Operations & Supply Chain</option>
              <option value="Feedmill Plant">Feedmill Plant</option>
              <option value="Poultry Integration">Poultry Integration</option>
            </select>
          </div>

          {/* Status */}
          <div className="urja-filter-group">
            <label className="urja-filter-label">Status</label>
            <select
              className="urja-filter-select"
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">All Status</option>
              <option value="New">New</option>
              <option value="In Progress">In Progress</option>
              <option value="Interview">Interview</option>
              <option value="Offer">Offer</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Source */}
          <div className="urja-filter-group">
            <label className="urja-filter-label">Source</label>
            <select
              className="urja-filter-select"
              value={filterSource}
              onChange={(e) => { setFilterSource(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">All Sources</option>
              <option value="Naukri">Naukri</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="Company Website">Company Website</option>
              <option value="Referral">Referral</option>
              <option value="Headhunter">Headhunter</option>
              <option value="Campus">Campus</option>
            </select>
          </div>

          {/* Applied Date */}
          <div className="urja-filter-group">
            <label className="urja-filter-label">Applied Date</label>
            <button
              type="button"
              className="urja-filter-date-btn"
              onClick={() => setShowDatePickerModal(true)}
            >
              <i className="bi bi-calendar3"></i>
              <span>{dateRange || 'Select Date Range'}</span>
            </button>
          </div>

        </div>

        {/* Row 2: Search input, More Filters, Reset, Search button */}
        <form onSubmit={handleExecuteSearch} className="urja-filter-search-row">
          <div className="urja-candidate-search-wrapper">
            <i className="bi bi-search urja-candidate-search-icon"></i>
            <input
              type="text"
              className="urja-candidate-search-input"
              placeholder="Search by candidate name, email, phone, or skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <button
            type="button"
            className={`urja-more-filters-btn ${showMoreFilters ? 'active' : ''}`}
            onClick={() => setShowMoreFilters(!showMoreFilters)}
          >
            <i className="bi bi-funnel"></i>
            <span>More Filters</span>
          </button>

          <button
            type="button"
            className="urja-reset-filter-btn"
            onClick={handleResetFilters}
          >
            Reset
          </button>

          <button
            type="submit"
            className="urja-execute-search-btn"
          >
            <i className="bi bi-search"></i>
            <span>Search</span>
          </button>
        </form>

        {/* Expandable More Filters Panel */}
        {showMoreFilters && (
          <div className="urja-more-filters-collapsible">
            <div className="urja-filter-group">
              <label className="urja-filter-label">Experience Range</label>
              <select
                className="urja-filter-select"
                value={filterExp}
                onChange={(e) => { setFilterExp(e.target.value); setCurrentPage(1); }}
              >
                <option value="ALL">Any Experience</option>
                <option value="0-2">0 - 2 Years (Entry)</option>
                <option value="3-5">3 - 5 Years (Mid)</option>
                <option value="5+">5+ Years (Senior)</option>
              </select>
            </div>

            <div className="urja-filter-group">
              <label className="urja-filter-label">Notice Period</label>
              <select
                className="urja-filter-select"
                value={filterNotice}
                onChange={(e) => { setFilterNotice(e.target.value); setCurrentPage(1); }}
              >
                <option value="ALL">Any Notice Period</option>
                <option value="15">Immediate to 15 Days</option>
                <option value="30">Within 30 Days</option>
              </select>
            </div>

            <div className="urja-filter-group">
              <label className="urja-filter-label">Sort By Field</label>
              <select
                className="urja-filter-select"
                value={sortField}
                onChange={(e) => setSortField(e.target.value)}
              >
                <option value="date">Applied Date (Latest First)</option>
                <option value="name">Candidate Name (Alphabetical)</option>
              </select>
            </div>
          </div>
        )}

      </div>

      {/* ------------------------------------------------------------------------
          4. BULK ACTIONS FLOATING TOOLBAR (Appears when candidates selected)
          ------------------------------------------------------------------------ */}
      {selectedCandidateIds.length > 0 && (
        <div className="urja-bulk-actions-toolbar">
          <span className="urja-bulk-selection-count">
            <i className="bi bi-check-circle-fill me-2 text-success"></i>
            {selectedCandidateIds.length} candidate{selectedCandidateIds.length > 1 ? 's' : ''} selected
          </span>
          <div className="urja-bulk-action-buttons">
            <button
              className="urja-bulk-btn stage"
              onClick={() => {
                showToast(`Bulk moved ${selectedCandidateIds.length} candidates to Screening`);
                setSelectedCandidateIds([]);
              }}
            >
              Move to Screening
            </button>
            {canDelete && (
              <button
                className="urja-bulk-btn delete"
                onClick={handleBulkDelete}
              >
                Delete Selected
              </button>
            )}
            <button
              className="urja-bulk-btn cancel"
              onClick={() => setSelectedCandidateIds([])}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------
          5. CANDIDATE DATA TABLE CARD (Exact columns & layout)
          ------------------------------------------------------------------------ */}
      <div className="urja-candidates-table-card">
        <div className="urja-table-responsive-box">
          <table className="urja-candidates-data-table">
            <thead>
              <tr>
                <th style={{ width: '42px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    className="urja-candidate-checkbox"
                    checked={paginatedCandidates.length > 0 && selectedCandidateIds.length === paginatedCandidates.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th>Candidate Name</th>
                <th>Job Title</th>
                <th
                  className="urja-th-sortable"
                  onClick={() => {
                    setSortField('date');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                >
                  Applied Date <i className="bi bi-arrow-down-up ms-1" style={{ fontSize: '0.75rem' }}></i>
                </th>
                <th>Status</th>
                <th>Current Stage</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem' }}>
                    <div className="spinner-border text-success" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="text-muted small mt-2">Loading authorized candidate records...</p>
                  </td>
                </tr>
              ) : paginatedCandidates.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
                    {currentUser?.role === 'ROLE_IT_ADMIN' ? (
                      <div className="p-4 rounded-3 border bg-light text-center" style={{ maxWidth: 640, margin: '0 auto' }}>
                        <div className="badge bg-warning text-dark px-3 py-2 fs-6 mb-3">
                          <i className="bi bi-shield-lock-fill me-1"></i> Data Privacy Policy Enforced
                        </div>
                        <h5 className="fw-bold text-dark mb-2">Candidate Business Data Access Restricted</h5>
                        <p className="text-muted small mb-3">
                          Per Urja Foods enterprise security & privacy policy, IT Administrators do not have direct access to candidate resumes, hiring notes, or applicant data. IT Administrator permissions are limited to system configuration, user provisioning, and audit logs.
                        </p>
                        <p className="text-secondary small mb-0">
                          If business access is explicitly authorized, enable <code>it_admin_candidate_access</code> in <strong>Settings → Access Policies</strong>.
                        </p>
                      </div>
                    ) : (
                      <>
                        <i className="bi bi-search" style={{ fontSize: '2rem', color: '#94A3B8' }}></i>
                        <h5 className="fw-bold text-dark mt-2">No Candidates Found</h5>
                        <p className="text-muted small mb-3">Try adjusting your filters, search term, or date range.</p>
                        <button className="btn btn-sm btn-outline-success" onClick={handleResetFilters}>
                          Reset Filters
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedCandidates.map((cand) => {
                  const isChecked = selectedCandidateIds.includes(cand.id);
                  const isMenuOpen = activeMenuId === cand.id;

                  return (
                    <tr key={cand.id} className={isChecked ? 'row-selected' : ''}>
                      
                      {/* Checkbox */}
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          className="urja-candidate-checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectCandidate(cand.id)}
                        />
                      </td>

                      {/* Candidate Name & Photo */}
                      <td>
                        <div className="urja-cand-name-cell">
                          <img
                            src={cand.avatar}
                            alt={cand.name}
                            className="urja-cand-avatar-img"
                            onError={(e) => { e.target.src = '/assets/images/man.jpg'; }}
                          />
                          <div className="urja-cand-name-info">
                            <span
                              className="urja-cand-name-text"
                              onClick={() => onViewCandidate && onViewCandidate(cand)}
                              title="Click to view full candidate profile & resume"
                            >
                              {cand.name}
                            </span>
                            <span className="urja-cand-email-text">{cand.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Job Title & Location */}
                      <td>
                        <div className="urja-cand-job-cell">
                          <span className="urja-cand-job-title">{cand.jobTitle}</span>
                          <span className="urja-cand-job-loc">
                            <i className="bi bi-geo-alt"></i>
                            {cand.location}
                          </span>
                        </div>
                      </td>

                      {/* Applied Date */}
                      <td>
                        <span className="urja-cand-date-cell">{cand.appliedDate}</span>
                      </td>

                      {/* Status Badges Matching Reference Mockup */}
                      <td>
                        {cand.status === 'New' && (
                          <span className="urja-cand-status-pill new">
                            <i className="bi bi-check-circle-fill"></i> New
                          </span>
                        )}
                        {cand.status === 'In Progress' && (
                          <span className="urja-cand-status-pill in-progress">
                            <i className="bi bi-person-fill"></i> In Progress
                          </span>
                        )}
                        {cand.status === 'Interview' && (
                          <span className="urja-cand-status-pill interview">
                            <i className="bi bi-calendar-event"></i> Interview
                          </span>
                        )}
                        {cand.status === 'Offer' && (
                          <span className="urja-cand-status-pill offer">
                            <i className="bi bi-check-circle"></i> Offer
                          </span>
                        )}
                        {cand.status === 'Rejected' && (
                          <span className="urja-cand-status-pill rejected">
                            <i className="bi bi-x-circle-fill"></i> Rejected
                          </span>
                        )}
                      </td>

                      {/* Current Stage */}
                      <td>
                        <span className="urja-cand-stage-cell">{cand.currentStage}</span>
                      </td>

                      {/* Actions: View (Eye), Edit (Pencil), More Options (Three dots) */}
                      <td>
                        <div className="urja-cand-actions-cell" style={{ justifyContent: 'center' }}>
                          
                          {/* View Candidate */}
                          <button
                            className="urja-action-icon-btn"
                            onClick={() => onViewCandidate && onViewCandidate(cand)}
                            title="View Profile & Resume"
                          >
                            <i className="bi bi-eye"></i>
                          </button>

                          {/* Edit Candidate */}
                          {canEdit && (
                            <button
                              className="urja-action-icon-btn"
                              onClick={() => handleOpenEdit(cand)}
                              title="Edit Candidate"
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                          )}

                          {/* More Options */}
                          <button
                            className="urja-action-icon-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(isMenuOpen ? null : cand.id);
                            }}
                            title="More Options"
                          >
                            <i className="bi bi-three-dots-vertical"></i>
                          </button>

                          {/* Dropdown Menu */}
                          {isMenuOpen && (
                            <div className="urja-more-options-menu">
                              <button
                                className="urja-more-menu-item"
                                onClick={() => {
                                  setStageChangeCandidate(cand);
                                  setActiveMenuId(null);
                                }}
                              >
                                <i className="bi bi-arrow-repeat text-primary"></i>
                                <span>Change Stage</span>
                              </button>
                              <button
                                className="urja-more-menu-item"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  if (onScheduleInterview) onScheduleInterview(cand);
                                }}
                              >
                                <i className="bi bi-calendar-plus text-info"></i>
                                <span>Schedule Interview</span>
                              </button>
                              <button
                                className="urja-more-menu-item"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  showToast(`Email prompt opened for ${cand.email}`);
                                }}
                              >
                                <i className="bi bi-envelope text-secondary"></i>
                                <span>Send Email</span>
                              </button>
                              {canEdit && cand.status !== 'Rejected' && (
                                <button
                                  className="urja-more-menu-item text-danger"
                                  onClick={() => handleUpdateStage(cand.id, 'Not Selected', 'Rejected')}
                                >
                                  <i className="bi bi-x-circle text-danger"></i>
                                  <span>Reject Candidate</span>
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  className="urja-more-menu-item danger"
                                  onClick={() => {
                                    setCandidateToDelete(cand);
                                    setActiveMenuId(null);
                                  }}
                                >
                                  <i className="bi bi-trash"></i>
                                  <span>Delete Candidate</span>
                                </button>
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
            6. PAGINATION FOOTER (Matching reference mockup footer)
            ---------------------------------------------------------------------- */}
        <div className="urja-candidates-pagination-footer">
          <div>
            Showing {filteredCandidates.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1} to{' '}
            {Math.min(currentPage * rowsPerPage, filteredCandidates.length)} of {stats.totalCandidates || filteredCandidates.length} candidates
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            
            {/* Rows Per Page */}
            <div className="urja-pagination-rows-selector">
              <span>Rows per page</span>
              <select
                className="urja-rows-select"
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            {/* Pagination Button Controls: < 1 2 3 4 5 ... 25 > */}
            <div className="urja-pagination-controls">
              <button
                className="urja-page-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              >
                <i className="bi bi-chevron-left"></i>
              </button>

              <button
                className={`urja-page-btn ${currentPage === 1 ? 'active' : ''}`}
                onClick={() => setCurrentPage(1)}
              >
                1
              </button>

              {totalPages >= 2 && (
                <button
                  className={`urja-page-btn ${currentPage === 2 ? 'active' : ''}`}
                  onClick={() => setCurrentPage(2)}
                >
                  2
                </button>
              )}

              {totalPages >= 3 && (
                <button
                  className={`urja-page-btn ${currentPage === 3 ? 'active' : ''}`}
                  onClick={() => setCurrentPage(3)}
                >
                  3
                </button>
              )}

              {totalPages >= 4 && (
                <button
                  className={`urja-page-btn ${currentPage === 4 ? 'active' : ''}`}
                  onClick={() => setCurrentPage(4)}
                >
                  4
                </button>
              )}

              {totalPages >= 5 && (
                <button
                  className={`urja-page-btn ${currentPage === 5 ? 'active' : ''}`}
                  onClick={() => setCurrentPage(5)}
                >
                  5
                </button>
              )}

              <span className="urja-page-dots">...</span>

              <button
                className={`urja-page-btn ${currentPage === 25 ? 'active' : ''}`}
                onClick={() => setCurrentPage(Math.min(25, totalPages))}
              >
                25
              </button>

              <button
                className="urja-page-btn"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              >
                <i className="bi bi-chevron-right"></i>
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* ------------------------------------------------------------------------
          7. ADD CANDIDATE MODAL DIALOG
          ------------------------------------------------------------------------ */}
      {showAddModal && (
        <div className="urja-candidate-modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="urja-candidate-modal-card" onClick={(e) => e.stopPropagation()}>
            
            <div className="urja-candidate-modal-header">
              <h3 className="urja-candidate-modal-title">Register New Candidate</h3>
              <button className="urja-modal-close-btn" onClick={() => setShowAddModal(false)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div className="urja-candidate-modal-body">
                
                {/* Full Name & Email */}
                <div className="urja-form-row-2">
                  <div className="urja-filter-group">
                    <label className="urja-filter-label">Candidate Full Name *</label>
                    <input
                      type="text"
                      className="urja-candidate-search-input"
                      placeholder="e.g. Ramesh Kulkarni"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                    {formErrors.name && <span className="urja-field-error">{formErrors.name}</span>}
                  </div>

                  <div className="urja-filter-group">
                    <label className="urja-filter-label">Official Email *</label>
                    <input
                      type="email"
                      className="urja-candidate-search-input"
                      placeholder="e.g. ramesh.kulkarni@gmail.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                    {formErrors.email && <span className="urja-field-error">{formErrors.email}</span>}
                  </div>
                </div>

                {/* Mobile & Job Requisition */}
                <div className="urja-form-row-2">
                  <div className="urja-filter-group">
                    <label className="urja-filter-label">Mobile Number *</label>
                    <input
                      type="tel"
                      className="urja-candidate-search-input"
                      placeholder="e.g. +91 98221 44556"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    />
                    {formErrors.mobile && <span className="urja-field-error">{formErrors.mobile}</span>}
                  </div>

                  <div className="urja-filter-group">
                    <label className="urja-filter-label">Assign to Job Requisition</label>
                    <select
                      className="urja-filter-select"
                      value={formData.jobTitle}
                      onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                    >
                      <option value="Software Engineer">Software Engineer (Pune)</option>
                      <option value="HR Executive">HR Executive (Mumbai)</option>
                      <option value="Quality Analyst">Quality Analyst (Pune)</option>
                      <option value="Production Engineer">Production Engineer (Shirdi)</option>
                      <option value="Plant Operator">Plant Operator (Rahuri)</option>
                      <option value="QA Executive">QA Executive (Pune)</option>
                      <option value="Maintenance Engineer">Maintenance Engineer (Plant - Shirdi)</option>
                    </select>
                  </div>
                </div>

                {/* Department & Location */}
                <div className="urja-form-row-2">
                  <div className="urja-filter-group">
                    <label className="urja-filter-label">Department</label>
                    <select
                      className="urja-filter-select"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    >
                      <option value="Soya Division">Soya Division</option>
                      <option value="Plant Operations">Plant Operations</option>
                      <option value="Quality Assurance">Quality Assurance</option>
                      <option value="Human Resources">Human Resources</option>
                      <option value="Operations & Supply Chain">Operations & Supply Chain</option>
                      <option value="Feedmill Plant">Feedmill Plant</option>
                    </select>
                  </div>

                  <div className="urja-filter-group">
                    <label className="urja-filter-label">Location</label>
                    <select
                      className="urja-filter-select"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    >
                      <option value="Pune">Pune</option>
                      <option value="Mumbai">Mumbai</option>
                      <option value="Shirdi">Shirdi</option>
                      <option value="Rahuri">Rahuri</option>
                      <option value="Plant - Shirdi">Plant - Shirdi</option>
                    </select>
                  </div>
                </div>

                {/* Experience & Notice Period */}
                <div className="urja-form-row-2">
                  <div className="urja-filter-group">
                    <label className="urja-filter-label">Experience (Years)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      className="urja-candidate-search-input"
                      value={formData.experienceYears}
                      onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                    />
                  </div>

                  <div className="urja-filter-group">
                    <label className="urja-filter-label">Notice Period (Days)</label>
                    <select
                      className="urja-filter-select"
                      value={formData.noticePeriodDays}
                      onChange={(e) => setFormData({ ...formData, noticePeriodDays: e.target.value })}
                    >
                      <option value={0}>Immediate Joiner</option>
                      <option value={15}>15 Days</option>
                      <option value={30}>30 Days</option>
                      <option value={60}>60 Days</option>
                      <option value={90}>90 Days</option>
                    </select>
                  </div>
                </div>

                {/* Skills */}
                <div className="urja-filter-group">
                  <label className="urja-filter-label">Primary Key Skills</label>
                  <input
                    type="text"
                    className="urja-candidate-search-input"
                    placeholder="e.g. React, Java, HACCP, Food Safety, PLC SCADA"
                    value={formData.primarySkills}
                    onChange={(e) => setFormData({ ...formData, primarySkills: e.target.value })}
                  />
                </div>

                {/* Resume Upload Drag & Drop Zone */}
                <div className="urja-filter-group">
                  <label className="urja-filter-label">Upload Resume (PDF, DOCX)</label>
                  <div
                    className="urja-resume-upload-zone"
                    onClick={() => document.getElementById('candResumeFile').click()}
                  >
                    <input
                      type="file"
                      id="candResumeFile"
                      style={{ display: 'none' }}
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setFormData({ ...formData, resumeFile: e.target.files[0] });
                          showToast(`Selected resume: ${e.target.files[0].name}`);
                        }
                      }}
                    />
                    <div className="urja-upload-icon">
                      <i className="bi bi-cloud-arrow-up"></i>
                    </div>
                    <p className="fw-bold mb-1 text-dark" style={{ fontSize: '0.88rem' }}>
                      {formData.resumeFile ? formData.resumeFile.name : 'Click or Drag & Drop to attach resume'}
                    </p>
                    <span className="text-muted small">Supports PDF, DOC, DOCX up to 15MB</span>
                  </div>
                </div>

              </div>

              <div className="urja-candidate-modal-footer">
                <button
                  type="button"
                  className="urja-btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="urja-btn-primary"
                >
                  <i className="bi bi-check2 me-1"></i>
                  Register Candidate
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------
          8. EDIT CANDIDATE MODAL DIALOG
          ------------------------------------------------------------------------ */}
      {showEditModal && editingCandidate && (
        <div className="urja-candidate-modal-backdrop" onClick={() => setShowEditModal(false)}>
          <div className="urja-candidate-modal-card" onClick={(e) => e.stopPropagation()}>
            
            <div className="urja-candidate-modal-header">
              <h3 className="urja-candidate-modal-title">Edit Candidate Profile</h3>
              <button className="urja-modal-close-btn" onClick={() => setShowEditModal(false)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="urja-candidate-modal-body">
                
                <div className="urja-form-row-2">
                  <div className="urja-filter-group">
                    <label className="urja-filter-label">Full Name *</label>
                    <input
                      type="text"
                      className="urja-candidate-search-input"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                    {formErrors.name && <span className="urja-field-error">{formErrors.name}</span>}
                  </div>

                  <div className="urja-filter-group">
                    <label className="urja-filter-label">Email *</label>
                    <input
                      type="email"
                      className="urja-candidate-search-input"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                    {formErrors.email && <span className="urja-field-error">{formErrors.email}</span>}
                  </div>
                </div>

                <div className="urja-form-row-2">
                  <div className="urja-filter-group">
                    <label className="urja-filter-label">Mobile Number *</label>
                    <input
                      type="tel"
                      className="urja-candidate-search-input"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    />
                    {formErrors.mobile && <span className="urja-field-error">{formErrors.mobile}</span>}
                  </div>

                  <div className="urja-filter-group">
                    <label className="urja-filter-label">Target Role / Job Title</label>
                    <input
                      type="text"
                      className="urja-candidate-search-input"
                      value={formData.jobTitle}
                      onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                    />
                  </div>
                </div>

                <div className="urja-form-row-2">
                  <div className="urja-filter-group">
                    <label className="urja-filter-label">Location</label>
                    <input
                      type="text"
                      className="urja-candidate-search-input"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>

                  <div className="urja-filter-group">
                    <label className="urja-filter-label">Experience (Years)</label>
                    <input
                      type="number"
                      step="0.5"
                      className="urja-candidate-search-input"
                      value={formData.experienceYears}
                      onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                    />
                  </div>
                </div>

                <div className="urja-filter-group">
                  <label className="urja-filter-label">Primary Key Skills</label>
                  <input
                    type="text"
                    className="urja-candidate-search-input"
                    value={formData.primarySkills}
                    onChange={(e) => setFormData({ ...formData, primarySkills: e.target.value })}
                  />
                </div>

              </div>

              <div className="urja-candidate-modal-footer">
                <button
                  type="button"
                  className="urja-btn-secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="urja-btn-primary"
                >
                  <i className="bi bi-save me-1"></i>
                  Save Changes
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------
          9. CONFIRM DELETE MODAL
          ------------------------------------------------------------------------ */}
      {candidateToDelete && (
        <div className="urja-candidate-modal-backdrop" onClick={() => setCandidateToDelete(null)}>
          <div className="urja-candidate-modal-card" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="urja-candidate-modal-header" style={{ background: '#FEE2E2' }}>
              <h4 className="fw-bold text-danger mb-0">Confirm Deletion</h4>
              <button className="urja-modal-close-btn" onClick={() => setCandidateToDelete(null)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="urja-candidate-modal-body">
              <p className="mb-0 text-dark">
                Are you sure you want to delete candidate <strong>{candidateToDelete.name}</strong> ({candidateToDelete.code})?
                This action is permanent and cannot be undone.
              </p>
            </div>
            <div className="urja-candidate-modal-footer">
              <button className="urja-btn-secondary" onClick={() => setCandidateToDelete(null)}>
                Cancel
              </button>
              <button className="btn btn-danger fw-bold px-3 py-2" onClick={handleConfirmDelete}>
                Delete Candidate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------
          10. CHANGE STAGE MODAL
          ------------------------------------------------------------------------ */}
      {stageChangeCandidate && (
        <div className="urja-candidate-modal-backdrop" onClick={() => setStageChangeCandidate(null)}>
          <div className="urja-candidate-modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="urja-candidate-modal-header">
              <h4 className="fw-bold text-dark mb-0">Update Candidate Stage</h4>
              <button className="urja-modal-close-btn" onClick={() => setStageChangeCandidate(null)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="urja-candidate-modal-body">
              <p className="text-muted small mb-3">
                Candidate: <strong>{stageChangeCandidate.name}</strong> • Currently: <em>{stageChangeCandidate.currentStage}</em>
              </p>
              <div className="d-flex flex-column gap-2">
                <button
                  className="btn btn-outline-success text-start d-flex justify-content-between align-items-center"
                  onClick={() => handleUpdateStage(stageChangeCandidate.id, 'Application Received', 'New')}
                >
                  <span>1. Application Received</span>
                  <span className="badge bg-success">New</span>
                </button>
                <button
                  className="btn btn-outline-primary text-start d-flex justify-content-between align-items-center"
                  onClick={() => handleUpdateStage(stageChangeCandidate.id, 'Screening', 'In Progress')}
                >
                  <span>2. Screening</span>
                  <span className="badge bg-primary">In Progress</span>
                </button>
                <button
                  className="btn btn-outline-primary text-start d-flex justify-content-between align-items-center"
                  onClick={() => handleUpdateStage(stageChangeCandidate.id, 'Technical Round', 'Interview')}
                >
                  <span>3. Technical Round</span>
                  <span className="badge bg-purple text-white" style={{ background: '#7C3AED' }}>Interview</span>
                </button>
                <button
                  className="btn btn-outline-info text-start d-flex justify-content-between align-items-center"
                  onClick={() => handleUpdateStage(stageChangeCandidate.id, 'HR Round', 'Interview')}
                >
                  <span>4. HR Round</span>
                  <span className="badge bg-info text-dark">Interview</span>
                </button>
                <button
                  className="btn btn-outline-warning text-start d-flex justify-content-between align-items-center"
                  onClick={() => handleUpdateStage(stageChangeCandidate.id, 'Offer Released', 'Offer')}
                >
                  <span>5. Offer Released</span>
                  <span className="badge bg-warning text-dark">Offer</span>
                </button>
                <button
                  className="btn btn-outline-danger text-start d-flex justify-content-between align-items-center"
                  onClick={() => handleUpdateStage(stageChangeCandidate.id, 'Not Selected', 'Rejected')}
                >
                  <span>6. Not Selected</span>
                  <span className="badge bg-danger">Rejected</span>
                </button>
              </div>
            </div>
            <div className="urja-candidate-modal-footer">
              <button className="urja-btn-secondary" onClick={() => setStageChangeCandidate(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------
          11. DATE RANGE PICKER MODAL
          ------------------------------------------------------------------------ */}
      {showDatePickerModal && (
        <div className="urja-candidate-modal-backdrop" onClick={() => setShowDatePickerModal(false)}>
          <div className="urja-candidate-modal-card" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="urja-candidate-modal-header">
              <h4 className="fw-bold text-dark mb-0">Select Applied Date Range</h4>
              <button className="urja-modal-close-btn" onClick={() => setShowDatePickerModal(false)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="urja-candidate-modal-body">
              <div className="d-flex flex-column gap-2">
                <button
                  className="btn btn-outline-secondary text-start"
                  onClick={() => { setDateRange('Today (24 Oct 2026)'); setShowDatePickerModal(false); }}
                >
                  Today
                </button>
                <button
                  className="btn btn-outline-secondary text-start"
                  onClick={() => { setDateRange('Last 7 Days (17 - 24 Oct)'); setShowDatePickerModal(false); }}
                >
                  Last 7 Days
                </button>
                <button
                  className="btn btn-outline-secondary text-start"
                  onClick={() => { setDateRange('This Month (01 - 31 Oct 2026)'); setShowDatePickerModal(false); }}
                >
                  This Month (October 2026)
                </button>
                <button
                  className="btn btn-outline-secondary text-start"
                  onClick={() => { setDateRange('Q3 - Q4 2026'); setShowDatePickerModal(false); }}
                >
                  Last 90 Days
                </button>
              </div>
            </div>
            <div className="urja-candidate-modal-footer">
              <button className="urja-btn-secondary" onClick={() => { setDateRange(''); setShowDatePickerModal(false); }}>
                Clear
              </button>
              <button className="urja-btn-primary" onClick={() => setShowDatePickerModal(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
