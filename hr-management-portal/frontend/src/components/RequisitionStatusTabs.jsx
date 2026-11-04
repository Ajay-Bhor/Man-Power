import React from 'react';

/**
 * Reusable Status Tabs Component with Lime-Green Active Indicator
 * and Prominent "+ Create Requisition" Action Button
 */
export default function RequisitionStatusTabs({
  activeStatusTab = 'ALL',
  onTabChange,
  counts = {
    all: 28,
    open: 13,
    inApproval: 7,
    filled: 6,
    onHold: 2
  },
  onCreateRequisition
}) {
  const tabs = [
    { key: 'ALL', label: 'All', count: counts.all ?? 28 },
    { key: 'OPEN', label: 'Open', count: counts.open ?? 13 },
    { key: 'IN_APPROVAL', label: 'In Approval', count: counts.inApproval ?? 7 },
    { key: 'FILLED', label: 'Filled', count: counts.filled ?? 6 },
    { key: 'ON_HOLD', label: 'On Hold', count: counts.onHold ?? 2 }
  ];

  return (
    <div className="urja-status-tabs-container">
      {/* Horizontal Tabs Scrollable Wrapper */}
      <div className="urja-status-tabs-scroll-area">
        <div className="urja-status-tabs-list" role="tablist">
          {tabs.map((tab) => {
            const isActive = activeStatusTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`urja-status-tab-item ${isActive ? 'active' : ''}`}
                onClick={() => onTabChange && onTabChange(tab.key)}
              >
                <span className="urja-status-tab-label">{tab.label}</span>
                <span className={`urja-status-tab-badge ${isActive ? 'active' : ''}`}>
                  {tab.count}
                </span>
                {isActive && <span className="urja-status-tab-indicator" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Prominent + Create Requisition Button */}
      <div className="urja-status-tabs-actions">
        <button
          type="button"
          className="urja-btn-create-requisition"
          onClick={onCreateRequisition}
          title="Create New Manpower Requisition"
        >
          <i className="bi bi-plus-lg me-1" />
          <span>Create Requisition</span>
        </button>
      </div>
    </div>
  );
}
