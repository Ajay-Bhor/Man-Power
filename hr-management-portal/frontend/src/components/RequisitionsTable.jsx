import React, { useState } from 'react';
import RequisitionStatusBadge from './RequisitionStatusBadge';
import RequisitionApprovalBadge from './RequisitionApprovalBadge';

/**
 * Reusable Requisitions Table Component
 * Displays:
 *  - Requisition ID
 *  - Job Title
 *  - Department
 *  - Location
 *  - Number of Openings
 *  - Status
 *  - Approval Stage
 *  - Created On
 *  - Target Date
 *  - Actions (View, Edit, Approvals, More)
 *  - Checkboxes (Select All & Row Select)
 *  - Pagination & Rows Per Page controls
 */
export default function RequisitionsTable({
  requisitions = [],
  totalRequisitions = 0,
  selectedIds = [],
  onSelectAll,
  onToggleSelect,
  onViewDetails,
  onEdit,
  onApproval,
  currentPage = 1,
  rowsPerPage = 10,
  onPageChange,
  onRowsPerPageChange,
  onResetFilters
}) {
  const [openActionMenuId, setOpenActionMenuId] = useState(null);

  const totalPages = Math.ceil(totalRequisitions / rowsPerPage) || 1;
  const startItem = totalRequisitions === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endItem = Math.min(currentPage * rowsPerPage, totalRequisitions);

  const isAllSelected =
    requisitions.length > 0 &&
    requisitions.every((r) => selectedIds.includes(r.id));

  const toggleActionMenu = (id, e) => {
    e.stopPropagation();
    setOpenActionMenuId((prev) => (prev === id ? null : id));
  };

  // Close popup menu on clicking elsewhere
  React.useEffect(() => {
    const handleOutsideClick = () => setOpenActionMenuId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  return (
    <div className="urja-table-card">
      <div className="table-responsive urja-table-responsive">
        <table className="urja-data-table">
          <thead>
            <tr>
              <th className="urja-th-checkbox" style={{ width: '42px' }}>
                <input
                  type="checkbox"
                  className="urja-custom-checkbox"
                  checked={isAllSelected}
                  onChange={onSelectAll}
                  aria-label="Select all requisitions"
                />
              </th>
              <th className="urja-th-req-id">Requisition ID</th>
              <th className="urja-th-title">Job Title</th>
              <th className="urja-th-dept">Department</th>
              <th className="urja-th-loc">Location</th>
              <th className="urja-th-openings text-center">Openings</th>
              <th className="urja-th-status">Status</th>
              <th className="urja-th-approval">Approval Stage</th>
              <th className="urja-th-date">Created On</th>
              <th className="urja-th-date">Target Date</th>
              <th className="urja-th-actions text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requisitions.length === 0 ? (
              <tr>
                <td colSpan="11" className="urja-empty-table-cell">
                  <div className="urja-empty-state">
                    <div className="urja-empty-icon-box">
                      <i className="bi bi-funnel" />
                    </div>
                    <h5>No Requisitions Found</h5>
                    <p>There are no job requisitions matching your current filters or search query.</p>
                    {onResetFilters && (
                      <button
                        type="button"
                        className="urja-btn-reset-filters highlight mt-2"
                        onClick={onResetFilters}
                      >
                        <i className="bi bi-arrow-counterclockwise me-1" />
                        <span>Reset All Filters</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              requisitions.map((req) => {
                const isSelected = selectedIds.includes(req.id);
                const isMenuOpen = openActionMenuId === req.id;

                return (
                  <tr
                    key={req.id}
                    className={`urja-table-row ${isSelected ? 'selected' : ''}`}
                  >
                    {/* Checkbox */}
                    <td className="urja-td-checkbox">
                      <input
                        type="checkbox"
                        className="urja-custom-checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect && onToggleSelect(req.id)}
                        aria-label={`Select requisition ${req.code}`}
                      />
                    </td>

                    {/* Requisition ID */}
                    <td className="urja-td-req-id">
                      <button
                        type="button"
                        className="urja-link-code"
                        onClick={() => onViewDetails && onViewDetails(req)}
                        title="Click to view full requisition details & workflow"
                      >
                        {req.code}
                      </button>
                    </td>

                    {/* Job Title */}
                    <td className="urja-td-title">
                      <div
                        className="urja-job-title-clickable"
                        onClick={() => onViewDetails && onViewDetails(req)}
                        title="Click to view details"
                      >
                        <span className="urja-job-title-text">{req.title}</span>
                      </div>
                      {(req.experience || req.budgetMin) && (
                        <div className="urja-job-meta-sub">
                          {req.experience && <span className="urja-meta-chip">{req.experience}</span>}
                          {req.budgetMin && (
                            <span className="urja-meta-salary">
                              {req.budgetMin}{req.budgetMax ? ' - ' + req.budgetMax : ''}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Department */}
                    <td className="urja-td-dept">
                      <span className="urja-dept-tag">
                        <i className="bi bi-building me-1 opacity-75" />
                        {req.deptName}
                      </span>
                    </td>

                    {/* Location */}
                    <td className="urja-td-loc">
                      <span className="urja-loc-text">
                        <i className="bi bi-geo-alt me-1 text-muted" />
                        {req.location || 'Multiple Sites'}
                      </span>
                    </td>

                    {/* Number of Openings */}
                    <td className="urja-td-openings text-center">
                      <span className="urja-openings-chip" title={`${req.openings} opening(s)`}>
                        {req.openings}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="urja-td-status">
                      <RequisitionStatusBadge status={req.status} />
                    </td>

                    {/* Approval Stage */}
                    <td className="urja-td-approval">
                      <RequisitionApprovalBadge stage={req.approvalStage} />
                    </td>

                    {/* Created On */}
                    <td className="urja-td-date">
                      <span className="urja-date-text">
                        {req.createdOn || '—'}
                      </span>
                    </td>

                    {/* Target Date */}
                    <td className="urja-td-date">
                      <span className="urja-date-text urja-target-date">
                        <i className="bi bi-calendar-event me-1 opacity-75" />
                        {req.targetDate || 'Not Defined'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="urja-td-actions text-end">
                      <div className="urja-action-buttons-group">
                        <button
                          type="button"
                          className="urja-btn-icon-action"
                          onClick={() => onViewDetails && onViewDetails(req)}
                          title="View Requisition Details"
                          aria-label="View Details"
                        >
                          <i className="bi bi-eye" />
                        </button>

                        <button
                          type="button"
                          className="urja-btn-icon-action"
                          onClick={() => onEdit && onEdit(req)}
                          title="Edit Requisition"
                          aria-label="Edit Requisition"
                        >
                          <i className="bi bi-pencil" />
                        </button>

                        <button
                          type="button"
                          className="urja-btn-icon-action"
                          onClick={() => onApproval && onApproval(req)}
                          title="Approval Workflow Matrix"
                          aria-label="Approval Matrix"
                        >
                          <i className="bi bi-check2-circle" />
                        </button>

                        {/* More Actions Dropdown */}
                        <div className="urja-dropdown-action-wrapper">
                          <button
                            type="button"
                            className="urja-btn-icon-action"
                            onClick={(e) => toggleActionMenu(req.id, e)}
                            title="More Actions"
                            aria-label="More Actions"
                          >
                            <i className="bi bi-three-dots-vertical" />
                          </button>

                          {isMenuOpen && (
                            <div className="urja-action-menu-dropdown">
                              <button
                                type="button"
                                className="urja-action-menu-item"
                                onClick={() => onViewDetails && onViewDetails(req)}
                              >
                                <i className="bi bi-file-earmark-text me-2" />
                                View Full Requisition
                              </button>
                              <button
                                type="button"
                                className="urja-action-menu-item"
                                onClick={() => onApproval && onApproval(req)}
                              >
                                <i className="bi bi-person-check me-2" />
                                View Approvers Matrix
                              </button>
                              <button
                                type="button"
                                className="urja-action-menu-item"
                                onClick={() => {
                                  if (navigator.clipboard) {
                                    navigator.clipboard.writeText(window.location.href);
                                  }
                                }}
                              >
                                <i className="bi bi-share me-2" />
                                Copy Link
                              </button>
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

      {/* Pagination Footer */}
      <div className="urja-table-footer">
        <div className="urja-table-footer-info">
          Showing <strong>{startItem}</strong> to <strong>{endItem}</strong> of{' '}
          <strong>{totalRequisitions}</strong> requisitions
        </div>

        <div className="urja-table-footer-controls">
          {/* Rows Per Page */}
          <div className="urja-rows-per-page-box">
            <span className="urja-rows-label">Rows per page</span>
            <select
              className="urja-rows-select"
              value={rowsPerPage}
              onChange={(e) =>
                onRowsPerPageChange && onRowsPerPageChange(parseInt(e.target.value, 10))
              }
              aria-label="Select rows per page"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
            </select>
          </div>

          {/* Page Buttons */}
          <div className="urja-pagination-btns" role="navigation" aria-label="Pagination">
            <button
              type="button"
              className="urja-page-nav-btn"
              disabled={currentPage <= 1}
              onClick={() => onPageChange && onPageChange(currentPage - 1)}
              title="Previous Page"
              aria-label="Previous Page"
            >
              <i className="bi bi-chevron-left" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                className={`urja-page-number-btn ${currentPage === pageNum ? 'active' : ''}`}
                onClick={() => onPageChange && onPageChange(pageNum)}
                aria-label={`Go to page ${pageNum}`}
                aria-current={currentPage === pageNum ? 'page' : undefined}
              >
                {pageNum}
              </button>
            ))}

            <button
              type="button"
              className="urja-page-nav-btn"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange && onPageChange(currentPage + 1)}
              title="Next Page"
              aria-label="Next Page"
            >
              <i className="bi bi-chevron-right" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
