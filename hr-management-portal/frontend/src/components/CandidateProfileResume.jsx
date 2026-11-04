import React, { useState } from 'react';

export default function CandidateProfileResume({ candidate, onClose, onScheduleInterview, onAddFeedback }) {
  const [activeTab, setActiveTab] = useState('resume');

  const c = candidate || {
    id: 1,
    name: 'Amit Shah',
    role: 'Assistant Manager',
    email: 'amit.shah@email.com',
    mobile: '+91 915 445 2213',
    location: 'Pune, Maharashtra',
    exp: '4 years',
    employer: 'Agro Processors Ltd',
    status: 'In Interview',
    joinedDate: '10 Oct 2026',
    avatar: '/assets/images/man.jpg'
  };

  return (
    <div className="urja-candidate-detail-container">
      {/* Top Breadcrumb / Return Bar */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <button 
          className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
          onClick={onClose}
        >
          <i className="bi bi-arrow-left"></i>
          <span>Back to Candidate Management</span>
        </button>
        <div className="d-flex align-items-center gap-2">
          <button 
            className="btn btn-sm btn-outline-primary"
            onClick={() => onScheduleInterview && onScheduleInterview(c)}
          >
            <i className="bi bi-calendar-plus me-1"></i> Schedule Interview
          </button>
          <button 
            className="btn btn-sm btn-success fw-bold"
            onClick={() => onAddFeedback && onAddFeedback(c)}
          >
            <i className="bi bi-star-fill me-1"></i> Record Feedback
          </button>
        </div>
      </div>

      {/* Split Layout: Left Profile Card, Right Resume Document View */}
      <div className="urja-candidate-split-layout">
        
        {/* LEFT PROFILE CARD */}
        <div className="urja-candidate-profile-card">
          <div style={{ position: 'relative' }}>
            <img 
              src={c.avatar && c.avatar.startsWith('/') ? c.avatar : '/assets/images/man.jpg'} 
              alt={c.name} 
              className="urja-candidate-avatar-lg"
              onError={(e) => { e.target.src = '/assets/images/man.jpg'; }}
            />
          </div>

          <h3 className="fw-bold text-dark mb-0" style={{ fontSize: '1.25rem' }}>{c.name}</h3>
          <p className="text-muted small mb-2">{c.role || c.appliedFor || 'Assistant Manager'}</p>

          <div style={{ marginBottom: '1.25rem' }}>
            <span className="urja-status-pill open" style={{ padding: '4px 12px', fontSize: '0.78rem' }}>
              <span className="urja-status-dot"></span>
              {c.status || 'In Interview'}
            </span>
          </div>

          <div style={{ width: '100%', textAlign: 'left', borderTop: '1px solid #F1F5F9', paddingTop: '1rem' }}>
            <div className="d-flex align-items-center gap-2 mb-2 small text-muted">
              <i className="bi bi-telephone text-success"></i>
              <span className="text-dark fw-medium">{c.mobile || '+91 915 445 2213'}</span>
            </div>
            <div className="d-flex align-items-center gap-2 mb-2 small text-muted">
              <i className="bi bi-geo-alt text-danger"></i>
              <span className="text-dark fw-medium">{c.location || 'Pune, Maharashtra'}</span>
            </div>
            <div className="d-flex align-items-center gap-2 mb-2 small text-muted">
              <i className="bi bi-envelope text-primary"></i>
              <span className="text-dark fw-medium" style={{ wordBreak: 'break-all' }}>{c.email || 'amit.shah@email.com'}</span>
            </div>
            <div className="d-flex align-items-center gap-2 mb-2 small text-muted">
              <i className="bi bi-linkedin text-info"></i>
              <span className="text-dark fw-medium">linkedin.com/in/amitshah</span>
            </div>
            <div className="d-flex align-items-center gap-2 small text-muted">
              <i className="bi bi-calendar3 text-secondary"></i>
              <span>Applied: <strong>{c.joinedDate || '10 Oct 2026'}</strong></span>
            </div>
          </div>
        </div>

        {/* RIGHT TABS & RESUME VIEWER */}
        <div className="urja-resume-viewer-card">
          {/* Subtabs Header */}
          <div className="d-flex align-items-center justify-content-between p-3 border-bottom bg-light">
            <div className="urja-tab-pill-bar mb-0 pb-0 border-0">
              <button 
                className={`urja-tab-pill-item ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                Profile
              </button>
              <button 
                className={`urja-tab-pill-item ${activeTab === 'resume' ? 'active' : ''}`}
                onClick={() => setActiveTab('resume')}
              >
                Resume
              </button>
              <button 
                className={`urja-tab-pill-item ${activeTab === 'interviews' ? 'active' : ''}`}
                onClick={() => setActiveTab('interviews')}
              >
                Interviews (2)
              </button>
              <button 
                className={`urja-tab-pill-item ${activeTab === 'feedback' ? 'active' : ''}`}
                onClick={() => setActiveTab('feedback')}
              >
                Feedback (2)
              </button>
              <button 
                className={`urja-tab-pill-item ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => setActiveTab('history')}
              >
                History
              </button>
            </div>

            <button 
              className="btn btn-sm btn-success fw-bold d-flex align-items-center gap-1"
              onClick={() => alert(`Downloading official ATS resume PDF for ${c.name}...`)}
            >
              <i className="bi bi-download"></i>
              <span>Download</span>
            </button>
          </div>

          {/* TAB 1: RESUME VIEWER (Exact match to Screen 7) */}
          {activeTab === 'resume' && (
            <div className="urja-resume-doc-sheet">
              <div className="urja-resume-paper">
                {/* Header */}
                <div className="d-flex align-items-start justify-content-between border-bottom pb-3 mb-3">
                  <div>
                    <h2 className="fw-bold text-dark mb-1" style={{ fontSize: '1.45rem' }}>{c.name}</h2>
                    <h5 className="text-secondary fw-semibold mb-2" style={{ fontSize: '0.95rem' }}>
                      {c.role || 'Assistant Manager - Production & Extraction'}
                    </h5>
                    <div className="small text-muted d-flex flex-wrap gap-3">
                      <span><i className="bi bi-envelope me-1"></i> {c.email}</span>
                      <span><i className="bi bi-phone me-1"></i> {c.mobile}</span>
                      <span><i className="bi bi-geo-alt me-1"></i> {c.location}</span>
                    </div>
                  </div>
                  <div className="text-end">
                    <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                      Verified Candidate
                    </span>
                  </div>
                </div>

                {/* Professional Summary */}
                <div>
                  <div className="urja-resume-section-title">Professional Summary</div>
                  <p className="small text-muted" style={{ lineHeight: 1.6 }}>
                    Results-driven Agro-Industrial Engineer with 4+ years of hands-on experience in solvent extraction plants, 
                    feed mill production lines, and continuous quality audits. Proven expertise in DCS / PLC SCADA automation, 
                    steam utility optimization, OSHA plant safety norms, and compliance with FSSAI & HACCP standards.
                  </p>
                </div>

                {/* Experience */}
                <div>
                  <div className="urja-resume-section-title">Work Experience</div>
                  
                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <strong className="text-dark small">Production Executive — Agro Processors Ltd</strong>
                      <span className="small text-muted">2022 – Present</span>
                    </div>
                    <div className="small text-secondary mb-1">Solvent Extraction Plant, Maharashtra</div>
                    <ul className="small text-muted mb-0 ps-3" style={{ lineHeight: 1.5 }}>
                      <li>Supervised a 500 TPD soybean crushing and extraction unit achieving 99.2% plant uptime.</li>
                      <li>Reduced residual oil loss in meal from 0.95% to 0.78% through optimized desolventizer toaster (DT) temps.</li>
                      <li>Directed a team of 18 shift operators and technician staff across rotating 8-hour rosters.</li>
                    </ul>
                  </div>

                  <div className="mb-2">
                    <div className="d-flex justify-content-between align-items-center">
                      <strong className="text-dark small">Junior Plant Engineer — Western Agri Mills</strong>
                      <span className="small text-muted">2020 – 2022</span>
                    </div>
                    <div className="small text-secondary mb-1">Feed Processing Unit, Pune</div>
                    <ul className="small text-muted mb-0 ps-3" style={{ lineHeight: 1.5 }}>
                      <li>Executed preventative maintenance checklists for hammer mills, pellet presses, and batch weighers.</li>
                      <li>Assisted in implementing 5S and workplace hygiene standards for export-grade soybean lecithin.</li>
                    </ul>
                  </div>
                </div>

                {/* Education & Certifications */}
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="urja-resume-section-title">Education</div>
                    <div className="small">
                      <div className="fw-bold text-dark">B.Tech in Food & Chemical Technology</div>
                      <div className="text-muted">Savitribai Phule Pune University (2016 – 2020)</div>
                      <div className="text-success small fw-medium">First Class with Distinction (8.4 CGPA)</div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="urja-resume-section-title">Certifications</div>
                    <ul className="small text-muted mb-0 ps-3">
                      <li>HACCP & FSSC 22000 Lead Implementer</li>
                      <li>Industrial Boiler Safety & IBR Norms Certification</li>
                      <li>Six Sigma Green Belt (Quality Improvement)</li>
                    </ul>
                  </div>
                </div>

                {/* Key Skills Tags */}
                <div>
                  <div className="urja-resume-section-title">Core Competencies & Skills</div>
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    {['Solvent Extraction', 'PLC SCADA', 'HACCP', 'Yield Optimization', 'Pelletizing', 'Desolventizer (DT)', 'Lean Manufacturing', 'FSSAI Food Safety', 'Preventive Maintenance'].map(sk => (
                      <span key={sk} className="badge bg-light text-dark border px-2 py-1 small">
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="p-4">
              <h5 className="fw-bold text-dark mb-3">Applicant Overview</h5>
              <div className="row g-3">
                <div className="col-md-4"><div className="p-3 bg-light rounded"><small className="text-muted d-block">Current Employer</small><strong>{c.employer || 'Agro Processors Ltd'}</strong></div></div>
                <div className="col-md-4"><div className="p-3 bg-light rounded"><small className="text-muted d-block">Total Experience</small><strong>{c.exp || '4 years'}</strong></div></div>
                <div className="col-md-4"><div className="p-3 bg-light rounded"><small className="text-muted d-block">Current CTC</small><strong>{c.ctc || '7.5 LPA'}</strong></div></div>
                <div className="col-md-4"><div className="p-3 bg-light rounded"><small className="text-muted d-block">Expected CTC</small><strong className="text-success">{c.expectedCtc || '9.8 LPA'}</strong></div></div>
                <div className="col-md-4"><div className="p-3 bg-light rounded"><small className="text-muted d-block">Notice Period</small><strong>{c.noticeDays || 15} Days</strong></div></div>
                <div className="col-md-4"><div className="p-3 bg-light rounded"><small className="text-muted d-block">Source</small><strong>{c.source || 'LinkedIn'}</strong></div></div>
              </div>
            </div>
          )}

          {/* TAB 3: INTERVIEWS TAB */}
          {activeTab === 'interviews' && (
            <div className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold text-dark mb-0">Scheduled & Completed Rounds</h5>
                <button className="btn btn-sm btn-outline-success" onClick={() => onScheduleInterview && onScheduleInterview(c)}>
                  + New Round
                </button>
              </div>
              <div className="d-flex flex-column gap-3">
                <div className="p-3 border rounded-3 bg-white">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <h6 className="fw-bold text-dark mb-1">Round 2: Technical Interview</h6>
                      <div className="small text-muted">Interviewer: <strong>Rohan Verma (Operations Lead)</strong></div>
                      <div className="small text-muted">Time: <strong>21 Oct 2026, 11:00 AM IST</strong></div>
                    </div>
                    <span className="badge bg-success">Completed</span>
                  </div>
                </div>
                <div className="p-3 border rounded-3 bg-white">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <h6 className="fw-bold text-dark mb-1">Round 1: HR Screening Call</h6>
                      <div className="small text-muted">Interviewer: <strong>Sanchita N. Shingade (HRBP)</strong></div>
                      <div className="small text-muted">Time: <strong>15 Oct 2026, 03:00 PM IST</strong></div>
                    </div>
                    <span className="badge bg-success">Passed</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: FEEDBACK TAB */}
          {activeTab === 'feedback' && (
            <div className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold text-dark mb-0">Panel Evaluation & Feedback</h5>
                <button className="btn btn-sm btn-success fw-bold" onClick={() => onAddFeedback && onAddFeedback(c)}>
                  + Add Feedback
                </button>
              </div>
              <div className="p-3 border rounded-3 bg-light mb-3">
                <div className="d-flex justify-content-between mb-2">
                  <span className="fw-bold text-dark">Rohan Verma (Technical Round 2)</span>
                  <span className="badge bg-success">Recommendation: Hire</span>
                </div>
                <div className="d-flex gap-4 small text-muted mb-2">
                  <span>Tech: <strong>4/5</strong></span>
                  <span>Comm: <strong>4/5</strong></span>
                  <span>Problem Solving: <strong>3/5</strong></span>
                  <span>Cultural Fit: <strong>5/5</strong></span>
                </div>
                <p className="small text-dark mb-0 bg-white p-2 rounded border">
                  "Shows good technical knowledge and problem solving skills. Sound grasp of solvent extraction machinery and safety standards."
                </p>
              </div>
            </div>
          )}

          {/* TAB 5: HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="p-4">
              <h5 className="fw-bold text-dark mb-3">Activity & Stage Timeline</h5>
              <ul className="small text-muted ps-3 mb-0" style={{ lineHeight: 1.8 }}>
                <li><strong>21 Oct 2026 12:30 PM:</strong> Technical Round 2 completed with positive recommendation.</li>
                <li><strong>18 Oct 2026 09:15 AM:</strong> Candidate confirmed interview attendance for Round 2.</li>
                <li><strong>15 Oct 2026 03:30 PM:</strong> HR Screening passed with Sanchita N. Shingade.</li>
                <li><strong>10 Oct 2026 10:00 AM:</strong> Application submitted via LinkedIn for URJ-R-2026-028.</li>
              </ul>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
