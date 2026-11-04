import React, { useState } from 'react';

export default function RequisitionDetailView({ requisition, onClose, onAssignRecruiter, onOpenApproval }) {
  const [activeTab, setActiveTab] = useState('approval');
  const [comments, setComments] = useState([
    { id: 1, author: 'Priya Sharma', time: '10 Oct 2026 11:15 AM', text: 'Prefer candidate with solvent extraction plant experience.' },
    { id: 2, author: 'Amit Kumar', time: '11 Oct 2026 09:45 AM', text: 'Approved for hiring.' }
  ]);
  const [newComment, setNewComment] = useState('');

  const req = requisition || {
    id: 1,
    code: 'URJ-R-2026-028',
    title: 'Assistant Manager',
    deptName: 'Soya Division',
    location: 'Plant - Rahuri',
    openings: 2,
    targetDate: '31 Oct 2026',
    priority: 'High',
    status: 'Open',
    approvalStage: 'Approved',
    description: 'Solvent extraction plant oversight, yield monitoring, and compliance with food safety norms.'
  };

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    const item = {
      id: comments.length + 1,
      author: 'Sanchita N. Shingade',
      time: 'Just now',
      text: newComment.trim()
    };
    setComments([...comments, item]);
    setNewComment('');
  };

  return (
    <div className="urja-req-detail-container">
      {/* Top Breadcrumb & Actions */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <button 
          className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
          onClick={onClose}
        >
          <i className="bi bi-arrow-left"></i>
          <span>Back to Requisitions</span>
        </button>

        <div className="d-flex align-items-center gap-2">
          <button 
            className="btn btn-sm btn-outline-success"
            onClick={() => onAssignRecruiter && onAssignRecruiter(req)}
          >
            <i className="bi bi-person-plus me-1"></i> Assign Recruiter
          </button>
          <button 
            className="btn btn-sm btn-primary fw-bold"
            onClick={() => onOpenApproval && onOpenApproval(req)}
            style={{ backgroundColor: '#0284C7', borderColor: '#0284C7' }}
          >
            <i className="bi bi-check-circle me-1"></i> Review Signoff
          </button>
        </div>
      </div>

      {/* Header Banner (Exact match to Screen 5) */}
      <div className="urja-req-details-header">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div>
            <div className="d-flex align-items-center gap-3">
              <span className="badge bg-light text-dark border px-2 py-1 fw-bold">{req.code}</span>
              <h2 className="fw-bold text-dark mb-0" style={{ fontSize: '1.45rem' }}>{req.title}</h2>
              <span className="urja-status-pill open" style={{ padding: '3px 10px', fontSize: '0.75rem' }}>
                <span className="urja-status-dot"></span>
                {req.status}
              </span>
            </div>
          </div>
        </div>

        <div className="urja-req-submeta-row">
          <div className="urja-req-submeta-item">
            <span>Department:</span>
            <strong>{req.deptName}</strong>
          </div>
          <div className="urja-req-submeta-item">
            <span>Location:</span>
            <strong>{req.location}</strong>
          </div>
          <div className="urja-req-submeta-item">
            <span>Openings:</span>
            <strong>{req.openings}</strong>
          </div>
          <div className="urja-req-submeta-item">
            <span>Target Date:</span>
            <strong>{req.targetDate}</strong>
          </div>
          <div className="urja-req-submeta-item">
            <span>Priority:</span>
            <strong className="text-danger">{req.priority || 'High'}</strong>
          </div>
        </div>
      </div>

      {/* Subtab Pill Bar */}
      <div className="urja-tab-pill-bar">
        <button 
          className={`urja-tab-pill-item ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          Details
        </button>
        <button 
          className={`urja-tab-pill-item ${activeTab === 'approval' ? 'active' : ''}`}
          onClick={() => setActiveTab('approval')}
        >
          Approval History
        </button>
        <button 
          className={`urja-tab-pill-item ${activeTab === 'candidates' ? 'active' : ''}`}
          onClick={() => setActiveTab('candidates')}
        >
          Candidates (4)
        </button>
        <button 
          className={`urja-tab-pill-item ${activeTab === 'interviews' ? 'active' : ''}`}
          onClick={() => setActiveTab('interviews')}
        >
          Interviews (2)
        </button>
        <button 
          className={`urja-tab-pill-item ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          Notes (1)
        </button>
        <button 
          className={`urja-tab-pill-item ${activeTab === 'attachments' ? 'active' : ''}`}
          onClick={() => setActiveTab('attachments')}
        >
          Attachments (3)
        </button>
      </div>

      {/* TAB CONTENT */}
      {activeTab === 'approval' && (
        <div className="row g-4">
          {/* LEFT: VERTICAL APPROVAL TIMELINE */}
          <div className="col-lg-7">
            <div className="card-portal p-4 h-100">
              <h5 className="fw-bold text-dark mb-4">Approval Workflow & Sign-offs</h5>
              
              <div className="urja-approval-timeline">
                {/* Step 1: Submission */}
                <div className="urja-approval-timeline-step">
                  <div className="urja-approval-timeline-icon approved">
                    <i className="bi bi-check-lg"></i>
                  </div>
                  <div>
                    <div className="d-flex align-items-center gap-2">
                      <strong className="text-dark small">Submitted by Rahul Patil</strong>
                      <span className="badge bg-success-subtle text-success small">Approved</span>
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>10 Oct 2026 10:30 AM</div>
                    <p className="small text-secondary mt-1 mb-0">Request submitted for approval</p>
                  </div>
                </div>

                {/* Step 2: HR Review */}
                <div className="urja-approval-timeline-step">
                  <div className="urja-approval-timeline-icon approved">
                    <i className="bi bi-check-lg"></i>
                  </div>
                  <div>
                    <div className="d-flex align-items-center gap-2">
                      <strong className="text-dark small">HR Review</strong>
                      <span className="badge bg-success-subtle text-success small">Approved</span>
                    </div>
                    <div className="small text-dark fw-medium">Priya Sharma</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>10 Oct 2026 11:15 AM</div>
                  </div>
                </div>

                {/* Step 3: Department Approval */}
                <div className="urja-approval-timeline-step">
                  <div className="urja-approval-timeline-icon approved">
                    <i className="bi bi-check-lg"></i>
                  </div>
                  <div>
                    <div className="d-flex align-items-center gap-2">
                      <strong className="text-dark small">Department Approval</strong>
                      <span className="badge bg-success-subtle text-success small">Approved</span>
                    </div>
                    <div className="small text-dark fw-medium">Amit Kumar</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>11 Oct 2026 09:45 AM</div>
                  </div>
                </div>

                {/* Step 4: Senior Management */}
                <div className="urja-approval-timeline-step">
                  <div className="urja-approval-timeline-icon pending">
                    <i className="bi bi-hourglass-split"></i>
                  </div>
                  <div>
                    <div className="d-flex align-items-center gap-2">
                      <strong className="text-dark small">Senior Management</strong>
                      <span className="badge bg-warning-subtle text-warning small">Pending</span>
                    </div>
                    <div className="small text-dark fw-medium">Vikram Singh</div>
                    <p className="small text-muted mt-1 mb-0">Awaiting management executive sign-off</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: COMMENTS & COLLABORATION STREAM */}
          <div className="col-lg-5">
            <div className="card-portal p-4 h-100 d-flex flex-column justify-content-between">
              <div>
                <h5 className="fw-bold text-dark mb-3">Comments & Collaboration</h5>
                
                <div className="urja-comments-stream mb-3">
                  {comments.map(c => (
                    <div key={c.id} className="urja-comment-bubble">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <strong className="text-dark small">{c.author}</strong>
                        <span className="text-muted" style={{ fontSize: '0.7rem' }}>{c.time}</span>
                      </div>
                      <p className="small text-secondary mb-0">{c.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handleAddComment}>
                <div className="mb-2">
                  <textarea 
                    className="form-control small" 
                    rows="3" 
                    placeholder="Add a comment or internal review note..."
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                  ></textarea>
                </div>
                <div className="text-end">
                  <button 
                    type="submit" 
                    className="btn btn-success fw-bold px-3 py-1 small"
                    disabled={!newComment.trim()}
                  >
                    Add Comment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* OTHER TABS */}
      {activeTab === 'details' && (
        <div className="card-portal p-4">
          <h5 className="fw-bold text-dark mb-3">Requisition Specification</h5>
          <div className="row g-3 mb-4">
            <div className="col-md-4"><div className="p-3 bg-light rounded"><small className="text-muted d-block">Department</small><strong>{req.deptName}</strong></div></div>
            <div className="col-md-4"><div className="p-3 bg-light rounded"><small className="text-muted d-block">Location</small><strong>{req.location}</strong></div></div>
            <div className="col-md-4"><div className="p-3 bg-light rounded"><small className="text-muted d-block">Openings</small><strong>{req.openings}</strong></div></div>
            <div className="col-md-4"><div className="p-3 bg-light rounded"><small className="text-muted d-block">Experience</small><strong>{req.experience || '4-7 Years'}</strong></div></div>
            <div className="col-md-4"><div className="p-3 bg-light rounded"><small className="text-muted d-block">Budget Range</small><strong>{req.budgetMin || '8.0 LPA'} - {req.budgetMax || '12.0 LPA'}</strong></div></div>
            <div className="col-md-4"><div className="p-3 bg-light rounded"><small className="text-muted d-block">Hiring Manager</small><strong>{req.hiringManager || 'Rajesh Kulkarni'}</strong></div></div>
          </div>
          <div>
            <h6 className="fw-bold text-dark mb-2">Role Responsibilities</h6>
            <p className="small text-muted">{req.description}</p>
          </div>
        </div>
      )}

      {activeTab === 'candidates' && (
        <div className="card-portal p-4">
          <h5 className="fw-bold text-dark mb-3">Matched Candidates for {req.code}</h5>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light"><tr><th>Candidate Name</th><th>Experience</th><th>Current Employer</th><th>Stage</th></tr></thead>
              <tbody>
                <tr><td><strong>Amit Shah</strong></td><td>4 years</td><td>Agro Processors Ltd</td><td><span className="badge bg-primary">Technical</span></td></tr>
                <tr><td><strong>Tanmay Kadam</strong></td><td>4.5 years</td><td>Godrej Agrovet</td><td><span className="badge bg-info text-dark">Screening</span></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'interviews' && (
        <div className="card-portal p-4">
          <h5 className="fw-bold text-dark mb-3">Interviews Scheduled for {req.code}</h5>
          <p className="small text-muted">2 interview panels coordinated across Technical and Managerial evaluations.</p>
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="card-portal p-4">
          <h5 className="fw-bold text-dark mb-3">Internal HR Notes</h5>
          <p className="small text-muted">Priority hiring for new solvent extraction expansion line starting Q1 2027.</p>
        </div>
      )}

      {activeTab === 'attachments' && (
        <div className="card-portal p-4">
          <h5 className="fw-bold text-dark mb-3">Documents & Attachments</h5>
          <ul className="small text-muted ps-3">
            <li>Plant_Expansion_Manpower_Plan_2026.pdf (1.8 MB)</li>
            <li>Organization_Chart_Soya_Division.pdf (850 KB)</li>
            <li>Solvent_Extraction_JD_Approved.docx (240 KB)</li>
          </ul>
        </div>
      )}
    </div>
  );
}
