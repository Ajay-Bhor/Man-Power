import React, { useState, useEffect } from 'react';

/**
 * Reusable RequisitionFilterBar Component
 * Matches the Enterprise Green Corporate Theme from System User Management:
 *  - Prominent Search Box with inner Search button & clear icon
 *  - Filter Dropdowns (Department, Location, Status) with icons and ample padding (no overlap)
 *  - Clear & Apply Filters action buttons
 */
export default function RequisitionFilterBar({
  departments = [],
  locations = [],
  selectedDepartment = 'ALL',
  selectedLocation = 'ALL',
  selectedStatus = 'ALL',
  searchQuery = '',
  onDepartmentChange,
  onLocationChange,
  onStatusChange,
  onSearchChange,
  onResetFilters,
  onApplyFilters,
  totalResults = 0,
  isFiltered = false
}) {
  // Local draft states so user can type and click Search or Apply Filters
  const [draftSearch, setDraftSearch] = useState(searchQuery || '');
  const [draftDept, setDraftDept] = useState(selectedDepartment || 'ALL');
  const [draftLoc, setDraftLoc] = useState(selectedLocation || 'ALL');
  const [draftStatus, setDraftStatus] = useState(selectedStatus || 'ALL');

  useEffect(() => {
    setDraftSearch(searchQuery || '');
  }, [searchQuery]);

  useEffect(() => {
    setDraftDept(selectedDepartment || 'ALL');
  }, [selectedDepartment]);

  useEffect(() => {
    setDraftLoc(selectedLocation || 'ALL');
  }, [selectedLocation]);

  useEffect(() => {
    setDraftStatus(selectedStatus || 'ALL');
  }, [selectedStatus]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    onSearchChange && onSearchChange(draftSearch);
    if (onApplyFilters) onApplyFilters();
  };

  const handleApplyClick = () => {
    onSearchChange && onSearchChange(draftSearch);
    onDepartmentChange && onDepartmentChange(draftDept);
    onLocationChange && onLocationChange(draftLoc);
    onStatusChange && onStatusChange(draftStatus);
    if (onApplyFilters) onApplyFilters();
  };

  const handleClearClick = () => {
    setDraftSearch('');
    setDraftDept('ALL');
    setDraftLoc('ALL');
    setDraftStatus('ALL');
    if (onResetFilters) onResetFilters();
  };

  return (
    <div className="urja-req-filter-card">
      {/* 1. Search Box with integrated Search Button */}
      <form onSubmit={handleSearchSubmit} className="urja-req-search-box">
        <i className="bi bi-search urja-req-search-icon" />
        <input
          type="text"
          className="urja-req-search-input"
          placeholder="Search by title, ID, dept or location..."
          value={draftSearch}
          onChange={(e) => {
            setDraftSearch(e.target.value);
            onSearchChange && onSearchChange(e.target.value);
          }}
        />
        {draftSearch && (
          <button
            type="button"
            className="urja-req-search-clear"
            onClick={() => {
              setDraftSearch('');
              onSearchChange && onSearchChange('');
            }}
            title="Clear search query"
          >
            <i className="bi bi-x-circle-fill" />
          </button>
        )}
        <button
          type="submit"
          className="urja-req-search-btn"
          title="Search requisitions"
        >
          Search
        </button>
      </form>

      {/* 2. Filter Dropdowns & Action Buttons */}
      <div className="urja-req-filters-cluster">
        <div className="urja-req-dropdown-grid">
          {/* Department Filter */}
          <div className="urja-req-select-wrap">
            <i className="bi bi-building urja-req-select-icon" />
            <select
              className="urja-req-select"
              value={draftDept}
              onChange={(e) => {
                setDraftDept(e.target.value);
                onDepartmentChange && onDepartmentChange(e.target.value);
              }}
              aria-label="Filter by department"
            >
              <option value="ALL">All Departments</option>
              {departments.map((dept) => {
                const name = typeof dept === 'string' ? dept : dept.name;
                const id = typeof dept === 'string' ? dept : dept.id || dept.code;
                return (
                  <option key={id} value={name}>
                    {name}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Location Filter */}
          <div className="urja-req-select-wrap">
            <i className="bi bi-geo-alt urja-req-select-icon" />
            <select
              className="urja-req-select"
              value={draftLoc}
              onChange={(e) => {
                setDraftLoc(e.target.value);
                onLocationChange && onLocationChange(e.target.value);
              }}
              aria-label="Filter by location"
            >
              <option value="ALL">All Locations</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="urja-req-select-wrap">
            <i className="bi bi-funnel urja-req-select-icon" />
            <select
              className="urja-req-select"
              value={draftStatus}
              onChange={(e) => {
                setDraftStatus(e.target.value);
                onStatusChange && onStatusChange(e.target.value);
              }}
              aria-label="Filter by status"
            >
              <option value="ALL">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Approval">In Approval</option>
              <option value="Filled">Filled</option>
              <option value="On Hold">On Hold</option>
            </select>
          </div>
        </div>

        {/* Clear & Apply Filters Action Buttons */}
        <div className="urja-req-filter-actions">
          <button
            type="button"
            className="urja-req-btn-clear"
            onClick={handleClearClick}
            title="Clear all filters and reset"
          >
            <i className="bi bi-arrow-counterclockwise" />
            <span>Clear</span>
          </button>

          <button
            type="button"
            className="urja-req-btn-apply"
            onClick={handleApplyClick}
            title="Apply selected filters"
          >
            <i className="bi bi-funnel-fill" />
            <span>Apply Filters</span>
          </button>
        </div>
      </div>
    </div>
  );
}
