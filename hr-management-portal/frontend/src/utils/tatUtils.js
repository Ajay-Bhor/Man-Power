// ==============================================================================
// TAT Calculation Engine (Target: 30 Calendar Days SLA)
// ==============================================================================

export function calculateTat(startDateStr, dueDateStr, isClosed = false, actualTatDays = null) {
  if (!startDateStr) {
    return {
      started: false,
      elapsedDays: 0,
      daysRemaining: null,
      isOverdue: false,
      progress: 0,
      badgeClass: 'secondary',
      label: 'Not Started'
    };
  }

  const start = new Date(startDateStr);
  const due = dueDateStr ? new Date(dueDateStr) : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
  const now = new Date('2026-10-22'); // Align with current contextual anchor or today

  const diffTime = now.getTime() - start.getTime();
  const elapsedDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

  if (isClosed) {
    return {
      started: true,
      elapsedDays: actualTatDays || elapsedDays,
      daysRemaining: 0,
      isOverdue: false,
      progress: 100,
      badgeClass: 'success',
      label: `Closed in ${actualTatDays || elapsedDays} days`
    };
  }

  const remainingDiff = due.getTime() - now.getTime();
  const daysRemaining = Math.ceil(remainingDiff / (1000 * 60 * 60 * 24));
  const isOverdue = daysRemaining < 0;

  const targetDays = 30;
  const progress = Math.min(100, Math.max(0, Math.round((elapsedDays / targetDays) * 100)));

  let badgeClass = 'success';
  let label = `${daysRemaining} days left`;

  if (isOverdue) {
    badgeClass = 'danger';
    label = `OVERDUE by ${Math.abs(daysRemaining)}d`;
  } else if (elapsedDays >= 20 || daysRemaining <= 7) {
    badgeClass = 'warning';
    label = `Warning (${daysRemaining}d left)`;
  }

  return {
    started: true,
    startDate: startDateStr,
    dueDate: due.toISOString().split('T')[0],
    elapsedDays,
    daysRemaining,
    isOverdue,
    progress,
    badgeClass,
    label
  };
}
