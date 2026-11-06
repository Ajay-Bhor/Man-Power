import React from 'react';

/**
 * Reusable Requisitions Table Component
 * Enterprise Green-and-White Theme matching System User Management:
 *  - Selection Strip (Checkbox count & actions)
 *  - Table Header with soft green background and bold green titles
 *  - Properly aligned rows with formatted Job Title & CTC chips (no awkward line wraps)
 *  - Clean Status & Approval pills
 *  - Actions column: [👁 Details] [✏] [📋]
 *  - Pagination controls matching corporate standard
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
  const totalPages = Math.ceil(totalRequisitions / rowsPerPage) || 1;
  const startItem = totalRequisitions === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endItem = Math.min(currentPage * rowsPerPage, totalRequisitions);

  const isAllSelected =
    requisitions.length > 0 &&
    requisitions.every((r) => selectedIds.includes(r.id));

  const renderStatusBadge = (status) => {
    const s = (status || '').toLowerCase().trim();
    if (s === 'open') {
      return (
        <span className="urja-req-status-pill open">
          <i className="bi bi-check-circle-fill" /> Open
        </span>
      );
    }
    if (s === 'in approval') {
      return (
        <span className="urja-req-status-pill in-approval">
          <i className="bi bi-hourglass-split" /> In Approval
        </span>
      );
    }
    if (s === 'filled') {
      return (
        <span className="urja-req-status-pill filled">
          <i className="bi bi-check-circle-fill" /> Filled
        </span>
      );
    }
    if (s === 'on hold') {
      return (
        <span className="urja-req-status-pill on-hold">
          <i className="bi bi-pause-circle-fill" /> On Hold
        </span>
      );
    }
    return (
      <span className="urja-req-status-pill open">
        <i className="bi bi-circle-fill" /> {status || 'Active'}
      </span>
    );
  };

  const renderApprovalBadge = (stage) => {
    const st = (stage || '').toLowerCase().trim();
    if (st.includes('approved')) {
      return (
        <span className="urja-req-approval-pill approved">
          <i className="bi bi-check-circle-fill" /> Approved
        </span>
      );
    }
    if (st.includes('dgm')) {
      return (
        <span className="urja-req-approval-pill pending">
          <i className="bi bi-hourglass-split" /> Pending with DGM
        </span>
      );
    }
    if (st.includes('hod')) {
      return (
        <span className="urja-req-approval-pill hod">
          <i className="bi bi-clock-history" /> Pending with HOD
        </span>
      );
    }
    return (
      <span className="urja-req-approval-pill neutral">
        <i className="bi bi-circle" /> {stage || 'Pending'}
      </span>
    );
  };

  return (
    <div className="d-flex flex-column gap-2">
      {/* 1. Selection Strip (Bulk Selection Info) */}
      <div className="urja-req-selection-strip">
        <label className="urja-req-select-all-label">
          <input
            type="checkbox"
            className="urja-req-checkbox"
            checked={isAllSelected}
            onChange={onSelectAll}
            title="Select all on this page"
          />
          <span>{selectedIds.length} selected</span>
        </label>

        {selectedIds.length > 0 && (
          <button
            type="button"
            className="urja-req-btn-bulk-export"
            onClick={() => {
              if (onViewDetails && requisitions.length > 0) {
                // Example bulk action trigger or export
              }
            }}
            title="Export selected requisitions"
          >
            <i className="bi bi-download" />
            <span>Export Selected ({selectedIds.length})</span>
          </button>
        )}
      </div>

      {/* 2. Requisitions Data Table Card */}
      <div className="urja-req-table-card">
        <div className="urja-req-table-wrap">
          <table className="urja-req-table">
            <thead>
              <tr>
                <th style={{ width: '36px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    className="urja-req-checkbox"
                    checked={isAllSelected}
                    onChange={onSelectAll}
                    aria-label="Select all requisitions"
                  />
                </th>
                <th style={{ width: '105px' }}>REQUISITION ID</th>
                <th style={{ minWidth: '155px' }}>JOB TITLE</th>
                <th style={{ minWidth: '105px' }}>DEPARTMENT</th>
                <th style={{ minWidth: '95px' }}>LOCATION</th>
                <th style={{ width: '60px', textAlign: 'center' }}>OPENINGS</th>
                <th style={{ width: '85px', textAlign: 'center' }}>STATUS</th>
                <th style={{ width: '120px', textAlign: 'center' }}>APPROVAL STAGE</th>
                <th style={{ width: '82px' }}>CREATED ON</th>
                <th style={{ width: '88px' }}>TARGET DATE</th>
                <th style={{ width: '130px', textAlign: 'center' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {requisitions.length === 0 ? (
                <tr>
                  <td colSpan="11">
                    <div className="urja-req-empty-box">
                      <i className="bi bi-funnel urja-req-empty-icon" />
                      <div className="urja-req-empty-title">No Requisitions Found</div>
                      <p className="urja-req-empty-desc">
                        There are no job requisitions matching your current filters or search query.
                      </p>
                      {onResetFilters && (
                        <button
                          type="button"
                          className="urja-req-btn-clear"
                          onClick={onResetFilters}
                        >
                          <i className="bi bi-arrow-counterclockwise" />
                          <span>Reset All Filters</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                requisitions.map((req) => {
                  const isSelected = selectedIds.includes(req.id);

                  return (
                    <tr
                      key={req.id}
                      className={isSelected ? 'selected' : ''}
                    >
                      {/* Checkbox */}
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          className="urja-req-checkbox"
                          checked={isSelected}
                          onChange={() => onToggleSelect && onToggleSelect(req.id)}
                          aria-label={`Select requisition ${req.code}`}
                        />
                      </td>

                      {/* Requisition ID */}
                      <td>
                        <button
                          type="button"
                          className="urja-req-code-btn"
                          onClick={() => onViewDetails && onViewDetails(req)}
                          title="Click to view full requisition details"
                        >
                          {req.code}
                        </button>
                      </td>

                      {/* Job Title & Experience / Salary Chips */}
                      <td>
                        <div className="urja-req-title-cell">
                          <span
                            className="urja-req-job-title"
                            onClick={() => onViewDetails && onViewDetails(req)}
                            title="Click to view details"
                          >
                            {req.title}
                          </span>
                          {(req.experience || req.budgetMin) && (
                            <div className="urja-req-meta-row">
                              {req.experience && (
                                <span className="urja-req-chip-exp">
                                  {req.experience}
                                </span>
                              )}
                              {req.budgetMin && (
                                <span className="urja-req-chip-salary">
                                  {req.budgetMin}{req.budgetMax ? ' - ' + req.budgetMax : ''}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Department */}
                      <td>
                        <div className="urja-req-dept-cell">
                          <i className="bi bi-building" />
                          <span>{req.deptName}</span>
                        </div>
                      </td>

                      {/* Location */}
                      <td>
                        <div className="urja-req-loc-cell">
                          <i className="bi bi-geo-alt" />
                          <span>{req.location || 'Plant - Rahuri'}</span>
                        </div>
                      </td>

                      {/* Openings */}
                      <td style={{ textAlign: 'center' }}>
                        <span className="urja-req-openings-badge">
                          {req.openings || 1}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ textAlign: 'center' }}>
                        {renderStatusBadge(req.status)}
                      </td>

                      {/* Approval Stage */}
                      <td style={{ textAlign: 'center' }}>
                        {renderApprovalBadge(req.approvalStage)}
                      </td>

                      {/* Created On */}
                      <td>
                        <span className="urja-req-date-cell">
                          {req.createdOn || '—'}
                        </span>
                      </td>

                      {/* Target Date */}
                      <td>
                        <span className="urja-req-date-cell">
                          <i className="bi bi-calendar-event" />
                          <span>{req.targetDate || 'Not Defined'}</span>
                        </span>
                      </td>

                      {/* Actions: Mandatory [Details] [Edit] [Workflow/More] */}
                      <td style={{ textAlign: 'center' }}>
                        <div className="urja-req-row-actions">
                          <button
                            type="button"
                            className="urja-req-btn-details"
                            onClick={() => onViewDetails && onViewDetails(req)}
                            title="View Requisition Details"
                          >
                            <i className="bi bi-eye" />
                            <span>Details</span>
                          </button>

                          <button
                            type="button"
                            className="urja-req-btn-icon edit"
                            onClick={() => onEdit && onEdit(req)}
                            title="Edit Requisition"
                          >
                            <i className="bi bi-pencil-square" />
                          </button>

                          <button
                            type="button"
                            className="urja-req-btn-icon workflow"
                            onClick={() => onApproval && onApproval(req)}
                            title="View Approval Workflow"
                          >
                            <i className="bi bi-check2-square" />
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

        {/* 3. Pagination Controls (Matching Corporate Standard) */}
        <div className="urja-req-pagination">
          <div className="urja-req-pagination-info">
            Showing {totalRequisitions > 0 ? startItem : 0} – {endItem} of {totalRequisitions} requisitions
          </div>

          <div className="urja-req-pagination-controls">
            <div className="urja-req-rows-selector">
              <span>Rows per page:</span>
              <select
                className="urja-req-rows-select"
                value={rowsPerPage}
                onChange={(e) => onRowsPerPageChange && onRowsPerPageChange(Number(e.target.value))}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="urja-req-page-buttons">
              <button
                type="button"
                className="urja-req-page-btn"
                disabled={currentPage <= 1}
                onClick={() => onPageChange && onPageChange(currentPage - 1)}
                title="Previous page"
              >
                <i className="bi bi-chevron-left" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((p, idx, arr) => (
                  <React.Fragment key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span className="px-1 text-muted">...</span>
                    )}
                    <button
                      type="button"
                      className={`urja-req-page-btn ${currentPage === p ? 'active' : ''}`}
                      onClick={() => onPageChange && onPageChange(p)}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                ))}

              <button
                type="button"
                className="urja-req-page-btn"
                disabled={currentPage >= totalPages}
                onClick={() => onPageChange && onPageChange(currentPage + 1)}
                title="Next page"
              >
                <i className="bi bi-chevron-right" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
