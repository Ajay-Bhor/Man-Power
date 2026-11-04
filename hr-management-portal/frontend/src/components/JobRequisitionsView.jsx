import React, { useMemo } from 'react';
import IndianHeaderClock from './IndianHeaderClock';
import RequisitionStatusTabs from './RequisitionStatusTabs';
import RequisitionFilterBar from './RequisitionFilterBar';
import RequisitionsTable from './RequisitionsTable';

/**
 * Enterprise Job Requisitions View for ATS Urja
 * Encapsulates:
 *  - Hero Banner with Silos Graphic & IndianHeaderClock
 *  - 5 Interactive KPI Metric Cards
 *  - Requisition Status Tabs + Prominent "+ Create Requisition" Button
 *  - Requisition Filter Bar (Department, Location, Status, Search, Reset)
 *  - Requisitions Table with Checkboxes, Badges, Actions, and Pagination
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
  // Calculate Dynamic Counts across all requisitions
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
      if (reqStatusFilter === 'OPEN' && req.status !== 'Open') return false;
      if (reqStatusFilter === 'IN_APPROVAL' && req.status !== 'In Approval') return false;
      if (reqStatusFilter === 'FILLED' && req.status !== 'Filled') return false;
      if (reqStatusFilter === 'ON_HOLD' && req.status !== 'On Hold') return false;

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
    <div className="urja-job-requisitions-page">
      {/* 1. Hero Banner Card with Silos Graphic & Indian Clock */}
      <div className="urja-req-hero-card">
        <div className="urja-req-hero-left">
          <div className="urja-req-hero-icon-box">
            <i className="bi bi-card-checklist" />
          </div>
          <div>
            <h1 className="urja-req-hero-title">Job Requisitions</h1>
            <p className="urja-req-hero-desc">
              Create, track and manage all manpower requisitions with multi-stage approval workflows.
            </p>
          </div>
        </div>

        <div className="urja-req-hero-graphic-wrap" aria-hidden="true">
          <img
            src="/assets/images/silos.jpg"
            alt="Urja Foods Plant Silos"
            className="urja-req-hero-bg-img"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>

        <IndianHeaderClock />
      </div>

      {/* 2. 5 Requisitions KPI Summary Metric Cards */}
      <div className="urja-req-kpi-grid">
        <div
          className={`urja-req-kpi-card ${reqStatusFilter === 'ALL' ? 'active-filter' : ''}`}
          onClick={() => {
            setReqStatusFilter('ALL');
            setCurrentPage(1);
          }}
          role="button"
          tabIndex={0}
          title="Filter: All Requisitions"
        >
          <div className="urja-req-kpi-icon green">
            <i className="bi bi-briefcase-fill" />
          </div>
          <div className="urja-req-kpi-content">
            <div className="urja-req-kpi-num">{counts.all}</div>
            <div className="urja-req-kpi-label">Total Requisitions</div>
            <div className="urja-req-kpi-trend up">
              <span>↑ 12%</span> vs last month
            </div>
          </div>
        </div>

        <div
          className={`urja-req-kpi-card ${reqStatusFilter === 'OPEN' ? 'active-filter' : ''}`}
          onClick={() => {
            setReqStatusFilter('OPEN');
            setCurrentPage(1);
          }}
          role="button"
          tabIndex={0}
          title="Filter: Open Requisitions"
        >
          <div className="urja-req-kpi-icon blue">
            <i className="bi bi-hourglass-split" />
          </div>
          <div className="urja-req-kpi-content">
            <div className="urja-req-kpi-num">{counts.open}</div>
            <div className="urja-req-kpi-label">Open</div>
            <div className="urja-req-kpi-trend up">
              <span>↑ 20%</span> vs last month
            </div>
          </div>
        </div>

        <div
          className={`urja-req-kpi-card ${reqStatusFilter === 'IN_APPROVAL' ? 'active-filter' : ''}`}
          onClick={() => {
            setReqStatusFilter('IN_APPROVAL');
            setCurrentPage(1);
          }}
          role="button"
          tabIndex={0}
          title="Filter: In Approval Requisitions"
        >
          <div className="urja-req-kpi-icon orange">
            <i className="bi bi-people-fill" />
          </div>
          <div className="urja-req-kpi-content">
            <div className="urja-req-kpi-num">{counts.inApproval}</div>
            <div className="urja-req-kpi-label">In Approval</div>
            <div className="urja-req-kpi-trend" style={{ color: '#D97706' }}>
              <span>↑ 8%</span> vs last month
            </div>
          </div>
        </div>

        <div
          className={`urja-req-kpi-card ${reqStatusFilter === 'FILLED' ? 'active-filter' : ''}`}
          onClick={() => {
            setReqStatusFilter('FILLED');
            setCurrentPage(1);
          }}
          role="button"
          tabIndex={0}
          title="Filter: Filled Requisitions"
        >
          <div className="urja-req-kpi-icon purple">
            <i className="bi bi-check-circle-fill" />
          </div>
          <div className="urja-req-kpi-content">
            <div className="urja-req-kpi-num">{counts.filled}</div>
            <div className="urja-req-kpi-label">Filled</div>
            <div className="urja-req-kpi-trend up">
              <span>↑ 25%</span> vs last month
            </div>
          </div>
        </div>

        <div
          className={`urja-req-kpi-card ${reqStatusFilter === 'ON_HOLD' ? 'active-filter' : ''}`}
          onClick={() => {
            setReqStatusFilter('ON_HOLD');
            setCurrentPage(1);
          }}
          role="button"
          tabIndex={0}
          title="Filter: On Hold Requisitions"
        >
          <div className="urja-req-kpi-icon red">
            <i className="bi bi-pause-circle-fill" />
          </div>
          <div className="urja-req-kpi-content">
            <div className="urja-req-kpi-num">{counts.onHold}</div>
            <div className="urja-req-kpi-label">On Hold</div>
            <div className="urja-req-kpi-trend" style={{ color: '#94A3B8' }}>
              0% vs last month
            </div>
          </div>
        </div>
      </div>

      {/* 3. Requisition Status Tabs + Prominent "+ Create Requisition" Button */}
      <RequisitionStatusTabs
        activeStatusTab={reqStatusFilter}
        onTabChange={(tabKey) => {
          setReqStatusFilter(tabKey);
          setCurrentPage(1);
        }}
        counts={counts}
        onCreateRequisition={onCreateRequisition}
      />

      {/* 4. Requisition Filter Controls Bar */}
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

      {/* 5. Requisitions Data Table */}
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
