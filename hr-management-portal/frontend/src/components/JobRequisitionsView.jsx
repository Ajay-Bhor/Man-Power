import React, { useMemo } from 'react';
import '../styles/urja-requisitions.css';
import { useIndianTime } from './IndianHeaderClock';
import RequisitionStatusTabs from './RequisitionStatusTabs';
import RequisitionFilterBar from './RequisitionFilterBar';
import RequisitionsTable from './RequisitionsTable';

/**
 * Enterprise Job Requisitions View for ATS Urja
 * Redesigned to match the System User Management standard:
 *  - Modern Enterprise Header with corporate green theme, Refresh, Clock & + Create Requisition
 *  - 5 KPI Statistics Cards with soft icon backgrounds, large bold numbers & wave accents
 *  - Requisition Status Tabs with clean pill counts & dark green indicator
 *  - Advanced Search & Filter Section (Search button, clean dropdowns with no overlap, Clear & Apply)
 *  - Enterprise Data Table with Selection Strip, Details/Edit/Workflow action buttons & Pagination
 */
export default function JobRequisitionsView({
  requisitions = [],
  departments = [],
  locations = [],
  reqStatusFilter = 'ALL',
  setReqStatusFilter,
  filterDepartment = 'ALL',
  setFilterDepartment,
  filterLocation = 'ALL',
  setFilterLocation,
  filterStatusSelect = 'ALL',
  setFilterStatusSelect,
  searchQuery = '',
  setSearchQuery,
  selectedReqIds = [],
  setSelectedReqIds,
  currentPage = 1,
  setCurrentPage,
  rowsPerPage = 10,
  setRowsPerPage,
  onViewRequisition,
  onCreateRequisition,
  onOpenApproval,
  onEditRequisition
}) {
  const indianTime = useIndianTime();

  // Calculate dynamic KPI counts across all requisitions
  const counts = useMemo(() => {
    let open = 0;
    let inApproval = 0;
    let filled = 0;
    let onHold = 0;

    requisitions.forEach((r) => {
      const s = (r.status || '').toLowerCase();
      if (s === 'open') open += 1;
      else if (s === 'in approval') inApproval += 1;
      else if (s === 'filled') filled += 1;
      else if (s === 'on hold') onHold += 1;
    });

    return {
      all: requisitions.length,
      open,
      inApproval,
      filled,
      onHold
    };
  }, [requisitions]);

  // Combined Filtering Logic
  const filteredRequisitions = useMemo(() => {
    return requisitions.filter((req) => {
      // 1. Status Tab Filter
      if (reqStatusFilter === 'OPEN' && (req.status || '').toLowerCase() !== 'open') return false;
      if (reqStatusFilter === 'IN_APPROVAL' && (req.status || '').toLowerCase() !== 'in approval') return false;
      if (reqStatusFilter === 'FILLED' && (req.status || '').toLowerCase() !== 'filled') return false;
      if (reqStatusFilter === 'ON_HOLD' && (req.status || '').toLowerCase() !== 'on hold') return false;

      // 2. Department Dropdown
      if (filterDepartment !== 'ALL' && req.deptName !== filterDepartment) return false;

      // 3. Location Dropdown
      if (filterLocation !== 'ALL' && req.location !== filterLocation) return false;

      // 4. Status Dropdown
      if (
        filterStatusSelect !== 'ALL' &&
        (req.status || '').toLowerCase() !== filterStatusSelect.toLowerCase()
      ) {
        return false;
      }

      // 5. Search Query
      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (req.title || '').toLowerCase().includes(q);
        const matchCode = (req.code || '').toLowerCase().includes(q);
        const matchDept = (req.deptName || '').toLowerCase().includes(q);
        const matchLoc = (req.location || '').toLowerCase().includes(q);
        if (!matchTitle && !matchCode && !matchDept && !matchLoc) return false;
      }

      return true;
    });
  }, [
    requisitions,
    reqStatusFilter,
    filterDepartment,
    filterLocation,
    filterStatusSelect,
    searchQuery
  ]);

  // Pagination Slice
  const paginatedRequisitions = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredRequisitions.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredRequisitions, currentPage, rowsPerPage]);

  // Checkbox handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedReqIds(paginatedRequisitions.map((r) => r.id));
    } else {
      setSelectedReqIds([]);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedReqIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Reset all filters
  const handleResetFilters = () => {
    setReqStatusFilter('ALL');
    setFilterDepartment('ALL');
    setFilterLocation('ALL');
    setFilterStatusSelect('ALL');
    setSearchQuery('');
    setCurrentPage(1);
    setSelectedReqIds([]);
  };

  const isFiltered =
    reqStatusFilter !== 'ALL' ||
    filterDepartment !== 'ALL' ||
    filterLocation !== 'ALL' ||
    filterStatusSelect !== 'ALL' ||
    Boolean(searchQuery && searchQuery.trim());

  return (
    <div className="urja-requisitions-container">
      {/* ========================================================================
          1. PAGE HEADER (Refresh, Clock Badge & + Create Requisition)
          ======================================================================== */}
      <div className="urja-req-header">
        <div className="urja-req-header-left">
          <div className="urja-req-header-icon">
            <i className="bi bi-card-checklist" />
          </div>
          <div className="urja-req-title-cluster">
            <h1 className="urja-req-title">Job Requisitions</h1>
            <p className="urja-req-subtitle">
              Create, track and manage all manpower requisitions with multi-stage approval workflows.
            </p>
          </div>
        </div>

        <div className="urja-req-header-actions">
          <button
            type="button"
            className="urja-req-btn-refresh"
            onClick={handleResetFilters}
            title="Refresh job requisitions"
          >
            <i className="bi bi-arrow-clockwise" />
            <span>Refresh</span>
          </button>

          <div className="urja-req-clock-badge" title="Indian Standard Time">
            <i className="bi bi-calendar3" />
            <span>{indianTime.date}</span>
            <span className="opacity-75">|</span>
            <span>{indianTime.time}</span>
          </div>

          <button
            type="button"
            className="urja-req-btn-create"
            onClick={onCreateRequisition}
            id="btn-create-requisition-header"
            title="Create new manpower requisition"
          >
            <i className="bi bi-plus-lg" />
            <span>Create Requisition</span>
          </button>
        </div>
      </div>

      {/* ========================================================================
          2. DASHBOARD KPI CARDS (5 Interactive Metric Cards)
          ======================================================================== */}
      <div className="urja-req-stats-grid">
        {/* Card 1: Total Requisitions */}
        <div
          className={`urja-req-stat-card ${reqStatusFilter === 'ALL' ? 'active' : ''}`}
          onClick={() => {
            setReqStatusFilter('ALL');
            setCurrentPage(1);
          }}
          role="button"
          tabIndex={0}
          title="Filter: All Requisitions"
        >
          <div className="urja-req-stat-icon mint">
            <i className="bi bi-briefcase-fill" />
          </div>
          <div className="urja-req-stat-content">
            <div className="urja-req-stat-value">{counts.all}</div>
            <div className="urja-req-stat-label">Total Requisitions</div>
            <div className="urja-req-stat-trend up">
              <span>↑ 12%</span> vs last month
            </div>
          </div>
          <svg className="urja-req-stat-wave" viewBox="0 0 100 80" fill="none">
            <path d="M0 80 C 40 40, 60 70, 100 20 L 100 80 Z" fill="#E8F6ED" opacity="0.6" />
          </svg>
        </div>

        {/* Card 2: Open */}
        <div
          className={`urja-req-stat-card ${reqStatusFilter === 'OPEN' ? 'active' : ''}`}
          onClick={() => {
            setReqStatusFilter('OPEN');
            setCurrentPage(1);
          }}
          role="button"
          tabIndex={0}
          title="Filter: Open Requisitions"
        >
          <div className="urja-req-stat-icon blue">
            <i className="bi bi-hourglass-split" />
          </div>
          <div className="urja-req-stat-content">
            <div className="urja-req-stat-value">{counts.open}</div>
            <div className="urja-req-stat-label">Open</div>
            <div className="urja-req-stat-trend up">
              <span>↑ 20%</span> vs last month
            </div>
          </div>
          <svg className="urja-req-stat-wave" viewBox="0 0 100 80" fill="none">
            <path d="M0 80 C 40 35, 65 65, 100 15 L 100 80 Z" fill="#E0F2FE" opacity="0.6" />
          </svg>
        </div>

        {/* Card 3: In Approval */}
        <div
          className={`urja-req-stat-card ${reqStatusFilter === 'IN_APPROVAL' ? 'active' : ''}`}
          onClick={() => {
            setReqStatusFilter('IN_APPROVAL');
            setCurrentPage(1);
          }}
          role="button"
          tabIndex={0}
          title="Filter: In Approval Requisitions"
        >
          <div className="urja-req-stat-icon amber">
            <i className="bi bi-people-fill" />
          </div>
          <div className="urja-req-stat-content">
            <div className="urja-req-stat-value">{counts.inApproval}</div>
            <div className="urja-req-stat-label">In Approval</div>
            <div className="urja-req-stat-trend amber">
              <span>↑ 8%</span> vs last month
            </div>
          </div>
          <svg className="urja-req-stat-wave" viewBox="0 0 100 80" fill="none">
            <path d="M0 80 C 35 45, 60 75, 100 25 L 100 80 Z" fill="#FEF3C7" opacity="0.6" />
          </svg>
        </div>

        {/* Card 4: Filled */}
        <div
          className={`urja-req-stat-card ${reqStatusFilter === 'FILLED' ? 'active' : ''}`}
          onClick={() => {
            setReqStatusFilter('FILLED');
            setCurrentPage(1);
          }}
          role="button"
          tabIndex={0}
          title="Filter: Filled Requisitions"
        >
          <div className="urja-req-stat-icon purple">
            <i className="bi bi-check-circle-fill" />
          </div>
          <div className="urja-req-stat-content">
            <div className="urja-req-stat-value">{counts.filled}</div>
            <div className="urja-req-stat-label">Filled</div>
            <div className="urja-req-stat-trend up">
              <span>↑ 25%</span> vs last month
            </div>
          </div>
          <svg className="urja-req-stat-wave" viewBox="0 0 100 80" fill="none">
            <path d="M0 80 C 40 35, 65 65, 100 20 L 100 80 Z" fill="#F3E8FF" opacity="0.6" />
          </svg>
        </div>

        {/* Card 5: On Hold */}
        <div
          className={`urja-req-stat-card ${reqStatusFilter === 'ON_HOLD' ? 'active' : ''}`}
          onClick={() => {
            setReqStatusFilter('ON_HOLD');
            setCurrentPage(1);
          }}
          role="button"
          tabIndex={0}
          title="Filter: On Hold Requisitions"
        >
          <div className="urja-req-stat-icon red">
            <i className="bi bi-pause-circle-fill" />
          </div>
          <div className="urja-req-stat-content">
            <div className="urja-req-stat-value">{counts.onHold}</div>
            <div className="urja-req-stat-label">On Hold</div>
            <div className="urja-req-stat-trend neutral">
              <span>0%</span> vs last month
            </div>
          </div>
          <svg className="urja-req-stat-wave" viewBox="0 0 100 80" fill="none">
            <path d="M0 80 C 35 40, 60 70, 100 20 L 100 80 Z" fill="#FEE2E2" opacity="0.6" />
          </svg>
        </div>
      </div>

      {/* ========================================================================
          3. REQUISITIONS STATUS TABS ROW
          ======================================================================== */}
      <RequisitionStatusTabs
        activeStatusTab={reqStatusFilter}
        onTabChange={(tabKey) => {
          setReqStatusFilter(tabKey);
          setCurrentPage(1);
        }}
        counts={counts}
        onCreateRequisition={onCreateRequisition}
      />

      {/* ========================================================================
          4. ADVANCED SEARCH AND FILTER SECTION
          ======================================================================== */}
      <RequisitionFilterBar
        departments={departments}
        locations={locations}
        selectedDepartment={filterDepartment}
        selectedLocation={filterLocation}
        selectedStatus={filterStatusSelect}
        searchQuery={searchQuery}
        onDepartmentChange={(dept) => {
          setFilterDepartment(dept);
          setCurrentPage(1);
        }}
        onLocationChange={(loc) => {
          setFilterLocation(loc);
          setCurrentPage(1);
        }}
        onStatusChange={(status) => {
          setFilterStatusSelect(status);
          setCurrentPage(1);
        }}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setCurrentPage(1);
        }}
        onResetFilters={handleResetFilters}
        totalResults={filteredRequisitions.length}
        isFiltered={isFiltered}
      />

      {/* ========================================================================
          5. REQUISITIONS DATA TABLE
          ======================================================================== */}
      <RequisitionsTable
        requisitions={paginatedRequisitions}
        totalRequisitions={filteredRequisitions.length}
        selectedIds={selectedReqIds}
        onSelectAll={handleSelectAll}
        onToggleSelect={handleToggleSelect}
        onViewDetails={onViewRequisition}
        onEdit={onEditRequisition}
        onApproval={onOpenApproval}
        currentPage={currentPage}
        rowsPerPage={rowsPerPage}
        onPageChange={(p) => setCurrentPage(p)}
        onRowsPerPageChange={(r) => {
          setRowsPerPage(r);
          setCurrentPage(1);
        }}
        onResetFilters={handleResetFilters}
      />
    </div>
  );
}
