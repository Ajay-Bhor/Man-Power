import React from 'react';

/**
 * Reusable Status Tabs Component with Dark Green Active Indicator
 * and clean badge pills matching the corporate theme
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
  }
}) {
  const tabs = [
    { key: 'ALL', label: 'All', count: counts.all ?? 28 },
    { key: 'OPEN', label: 'Open', count: counts.open ?? 13 },
    { key: 'IN_APPROVAL', label: 'In Approval', count: counts.inApproval ?? 7 },
    { key: 'FILLED', label: 'Filled', count: counts.filled ?? 6 },
    { key: 'ON_HOLD', label: 'On Hold', count: counts.onHold ?? 2 }
  ];

  return (
    <div className="urja-req-tabs-row">
      {/* Horizontal Tabs Scrollable List */}
      <div className="urja-req-tabs-list" role="tablist">
        {tabs.map((tab) => {
          const isActive = activeStatusTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`urja-req-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => onTabChange && onTabChange(tab.key)}
            >
              <span>{tab.label}</span>
              <span className={`urja-req-tab-badge ${isActive ? 'active' : ''}`}>
                {tab.count}
              </span>
              {isActive && <span className="urja-req-tab-indicator" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
