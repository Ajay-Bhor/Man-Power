import React from 'react';

/**
 * Reusable Requisition Status Badge with colored indicator dot
 * Supports: Open, In Approval, Filled, On Hold, Closed
 */
export default function RequisitionStatusBadge({ status }) {
  const normStatus = (status || '').trim();

  let variantClass = 'urja-badge-status-neutral';
  let dotClass = 'urja-dot-neutral';

  switch (normStatus.toLowerCase()) {
    case 'open':
      variantClass = 'urja-badge-status-open';
      dotClass = 'urja-dot-open';
      break;
    case 'in approval':
      variantClass = 'urja-badge-status-approval';
      dotClass = 'urja-dot-approval';
      break;
    case 'filled':
      variantClass = 'urja-badge-status-filled';
      dotClass = 'urja-dot-filled';
      break;
    case 'on hold':
      variantClass = 'urja-badge-status-hold';
      dotClass = 'urja-dot-hold';
      break;
    case 'closed':
      variantClass = 'urja-badge-status-closed';
      dotClass = 'urja-dot-closed';
      break;
    default:
      variantClass = 'urja-badge-status-neutral';
      dotClass = 'urja-dot-neutral';
  }

  return (
    <span className={`urja-status-badge ${variantClass}`}>
      <span className={`urja-status-badge-dot ${dotClass}`} />
      <span>{status || 'Unknown'}</span>
    </span>
  );
}
