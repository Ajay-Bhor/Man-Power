import React from 'react';

/**
 * Reusable Approval Stage Badge
 * Supports: Approved, Pending with DGM, Pending with HOD, Closed
 */
export default function RequisitionApprovalBadge({ stage }) {
  const normStage = (stage || '').trim();

  let variantClass = 'urja-approval-neutral';
  let icon = 'bi-circle';

  if (normStage.toLowerCase().includes('approved')) {
    variantClass = 'urja-approval-approved';
    icon = 'bi-check-circle-fill';
  } else if (normStage.toLowerCase().includes('dgm')) {
    variantClass = 'urja-approval-dgm';
    icon = 'bi-hourglass-split';
  } else if (normStage.toLowerCase().includes('hod')) {
    variantClass = 'urja-approval-hod';
    icon = 'bi-clock-history';
  } else if (normStage.toLowerCase().includes('closed')) {
    variantClass = 'urja-approval-closed';
    icon = 'bi-dash-circle';
  }

  return (
    <span className={`urja-approval-pill ${variantClass}`}>
      <i className={`bi ${icon} me-1`} style={{ fontSize: '0.75rem' }} />
      <span>{stage || 'Pending'}</span>
    </span>
  );
}
