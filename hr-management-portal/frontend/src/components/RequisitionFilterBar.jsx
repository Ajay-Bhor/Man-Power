import React from 'react';

/**
 * Reusable RequisitionFilterBar Component
 * Horizontal row containing:
 *  - Department dropdown (with icon & custom arrow)
 *  - Location dropdown (with icon & custom arrow)
 *  - Status dropdown (with icon & custom arrow)
 *  - Search input (integrated with filters)
 *  - Reset Filters button (clears all)
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
  totalResults = 0,
  isFiltered = false
}) {
  return (
    <div className="urja-filters-container">
      <div className="urja-filters-row">
        {/* Search Input Box */}
        <div className="urja-filter-search-box">
          <i className="bi bi-search urja-filter-icon" />
          <input
            type="text"
            className="urja-filter-search-input"
            placeholder="Search by title, ID, dept or location..."
            value={searchQuery}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="urja-filter-clear-btn"
              onClick={() => onSearchChange && onSearchChange('')}
              title="Clear search"
            >
              <i className="bi bi-x" />
            </button>
          )}
        </div>

        {/* Department Dropdown */}
        <div className="urja-filter-select-wrapper">
          <i className="bi bi-building urja-filter-icon" />
          <select
            className="urja-filter-select"
            value={selectedDepartment}
            onChange={(e) => onDepartmentChange && onDepartmentChange(e.target.value)}
            aria-label="Filter by department"
          >
            <option value="ALL">Department — All</option>
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
          <i className="bi bi-chevron-down urja-filter-chevron" />
        </div>

        {/* Location Dropdown */}
        <div className="urja-filter-select-wrapper">
          <i className="bi bi-geo-alt urja-filter-icon" />
          <select
            className="urja-filter-select"
            value={selectedLocation}
            onChange={(e) => onLocationChange && onLocationChange(e.target.value)}
            aria-label="Filter by location"
          >
            <option value="ALL">Location — All</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
          <i className="bi bi-chevron-down urja-filter-chevron" />
        </div>

        {/* Status Dropdown */}
        <div className="urja-filter-select-wrapper">
          <i className="bi bi-funnel urja-filter-icon" />
          <select
            className="urja-filter-select"
            value={selectedStatus}
            onChange={(e) => onStatusChange && onStatusChange(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="ALL">Status — All</option>
            <option value="Open">Open</option>
            <option value="In Approval">In Approval</option>
            <option value="Filled">Filled</option>
            <option value="On Hold">On Hold</option>
          </select>
          <i className="bi bi-chevron-down urja-filter-chevron" />
        </div>

        {/* Reset Filters Button */}
        <button
          type="button"
          className={`urja-btn-reset-filters ${isFiltered ? 'highlight' : ''}`}
          onClick={onResetFilters}
          title="Reset all filters and restore full list"
        >
          <i className="bi bi-arrow-counterclockwise me-1" />
          <span>Reset Filters</span>
        </button>
      </div>

      {/* Filter Stats Bar (when filtered) */}
      {isFiltered && (
        <div className="urja-filter-status-strip">
          <span>
            Showing <strong className="text-dark">{totalResults}</strong> matching results
          </span>
          <button
            type="button"
            className="urja-filter-clear-all-link"
            onClick={onResetFilters}
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
