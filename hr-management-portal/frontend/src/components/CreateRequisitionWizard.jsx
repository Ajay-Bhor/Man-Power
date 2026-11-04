import React, { useState } from 'react';
import { INITIAL_DEPARTMENTS, INITIAL_LOCATIONS, INITIAL_USERS } from '../data/mockData';

export default function CreateRequisitionWizard({ onClose, onSubmit }) {
  const [step, setStep] = useState(1);

  // Step 1: Basic Details
  const [department, setDepartment] = useState('Soya Division');
  const [designation, setDesignation] = useState('Assistant Manager');
  const [openings, setOpenings] = useState(2);
  const [positionType, setPositionType] = useState('NEW'); // 'NEW' or 'REPLACEMENT'
  const [employmentType, setEmploymentType] = useState('Full Time');
  const [location, setLocation] = useState('Plant - Rahuri');
  const [priority, setPriority] = useState('HIGH');
  const [targetDate, setTargetDate] = useState('2026-10-31');
  const [budgetRange, setBudgetRange] = useState('₹ 8,00,000 - 12,00,000');
  const [justification, setJustification] = useState('Need to strengthen the production team for new plant operations.');

  // Step 2: Job Details
  const [experience, setExperience] = useState('4-7 Years');
  const [qualification, setQualification] = useState('B.Tech in Food / Chemical / Mechanical Engineering');
  const [skills, setSkills] = useState('Solvent Extraction, PLC SCADA, HACCP, Plant Yield, Team Leadership');
  const [description, setDescription] = useState('Responsible for shift operations, raw material yield monitoring, safety compliance, and operator allocation.');

  // Step 3: Approval & Assignment
  const [approverHod, setApproverHod] = useState('Rajesh Kulkarni (Head of Soya Division)');
  const [approverMgmt, setApproverMgmt] = useState('Vikram Singh (VP Operations)');
  const [assignedRecruiter, setAssignedRecruiter] = useState('Anita Deshmukh (Senior Recruiter)');

  const handleNext = (e) => {
    if (e) e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
    } else {
      // Final submit
      const newReq = {
        title: designation,
        deptName: department,
        location: location,
        openings: parseInt(openings) || 1,
        priority: priority,
        experience: experience,
        budgetMin: budgetRange.split('-')[0]?.trim() || '8.0 LPA',
        budgetMax: budgetRange.split('-')[1]?.trim() || '12.0 LPA',
        targetDate: targetDate,
        description: description,
        justification: justification,
        positionType: positionType,
        employmentType: employmentType,
        assignedRecruiter: assignedRecruiter
      };
      if (onSubmit) onSubmit(newReq);
    }
  };

  return (
    <div className="urja-modal-backdrop" onClick={onClose}>
      <div className="urja-modal-card" style={{ maxWidth: 720 }} onClick={e => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="urja-modal-header">
          <div className="d-flex align-items-center gap-2">
            <div className="urja-req-kpi-icon green" style={{ width: 32, height: 32, fontSize: '0.9rem' }}>
              <i className="bi bi-file-earmark-plus-fill"></i>
            </div>
            <h4 className="mb-0 fw-bold text-dark">Create Manpower Requisition</h4>
          </div>
          <button className="urja-modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* 3-Step Stepper Bar */}
        <div className="urja-wizard-stepper">
          <div 
            className={`urja-wizard-step ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}
            onClick={() => setStep(1)}
          >
            <div className="urja-wizard-step-circle">{step > 1 ? '✓' : '1'}</div>
            <span>Basic Details</span>
          </div>

          <div className="urja-wizard-divider"></div>

          <div 
            className={`urja-wizard-step ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}
            onClick={() => setStep(2)}
          >
            <div className="urja-wizard-step-circle">{step > 2 ? '✓' : '2'}</div>
            <span>Job Details</span>
          </div>

          <div className="urja-wizard-divider"></div>

          <div 
            className={`urja-wizard-step ${step === 3 ? 'active' : ''}`}
            onClick={() => setStep(3)}
          >
            <div className="urja-wizard-step-circle">3</div>
            <span>Approval & Assignment</span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleNext}>
          <div className="urja-modal-body" style={{ maxHeight: '62vh', overflowY: 'auto', padding: '1.5rem' }}>
            
            {/* STEP 1: BASIC DETAILS (Exact match to Screen 4) */}
            {step === 1 && (
              <div>
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-dark">Department *</label>
                    <select 
                      className="form-select"
                      value={department}
                      onChange={e => setDepartment(e.target.value)}
                    >
                      {INITIAL_DEPARTMENTS.map(d => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-dark">Designation / Role Title *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={designation}
                      onChange={e => setDesignation(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-dark">Number of Employees *</label>
                    <div className="input-group">
                      <button 
                        type="button" 
                        className="btn btn-outline-secondary"
                        onClick={() => setOpenings(prev => Math.max(1, prev - 1))}
                      >
                        -
                      </button>
                      <input 
                        type="number" 
                        className="form-control text-center fw-bold" 
                        min="1" 
                        max="50" 
                        value={openings}
                        onChange={e => setOpenings(parseInt(e.target.value) || 1)}
                      />
                      <button 
                        type="button" 
                        className="btn btn-outline-secondary"
                        onClick={() => setOpenings(prev => prev + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-dark">Replacement / New *</label>
                    <div className="d-flex align-items-center gap-3 mt-2">
                      <div className="form-check">
                        <input 
                          className="form-check-input" 
                          type="radio" 
                          name="posType" 
                          id="posNew" 
                          checked={positionType === 'NEW'}
                          onChange={() => setPositionType('NEW')}
                        />
                        <label className="form-check-label small" htmlFor="posNew">New Position</label>
                      </div>
                      <div className="form-check">
                        <input 
                          className="form-check-input" 
                          type="radio" 
                          name="posType" 
                          id="posRep" 
                          checked={positionType === 'REPLACEMENT'}
                          onChange={() => setPositionType('REPLACEMENT')}
                        />
                        <label className="form-check-label small" htmlFor="posRep">Replacement</label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-dark">Employment Type *</label>
                    <select 
                      className="form-select"
                      value={employmentType}
                      onChange={e => setEmploymentType(e.target.value)}
                    >
                      <option value="Full Time">Full Time</option>
                      <option value="Contractual">Contractual</option>
                      <option value="Apprentice / Trainee">Apprentice / Trainee</option>
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-dark">Plant / Location *</label>
                    <select 
                      className="form-select"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                    >
                      {INITIAL_LOCATIONS.map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-dark">Priority *</label>
                    <select 
                      className="form-select"
                      value={priority}
                      onChange={e => setPriority(e.target.value)}
                    >
                      <option value="CRITICAL">Critical (Immediate SLA)</option>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-dark">Target Joining Date *</label>
                    <input 
                      type="date" 
                      className="form-control"
                      value={targetDate}
                      onChange={e => setTargetDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-bold small text-dark">Budget Range</label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={budgetRange}
                    onChange={e => setBudgetRange(e.target.value)}
                    placeholder="e.g. ₹ 8,00,000 - 12,00,000"
                  />
                </div>

                <div className="mb-0">
                  <label className="form-label fw-bold small text-dark">Justification *</label>
                  <textarea 
                    className="form-control" 
                    rows="2"
                    value={justification}
                    onChange={e => setJustification(e.target.value)}
                    placeholder="Need to strengthen the production team for new plant operations."
                    required
                  ></textarea>
                </div>
              </div>
            )}

            {/* STEP 2: JOB DETAILS */}
            {step === 2 && (
              <div>
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-dark">Required Experience *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={experience}
                      onChange={e => setExperience(e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-dark">Educational Qualification</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={qualification}
                      onChange={e => setQualification(e.target.value)}
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-bold small text-dark">Key Competencies & Technical Skills</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={skills}
                    onChange={e => setSkills(e.target.value)}
                  />
                </div>

                <div className="mb-0">
                  <label className="form-label fw-bold small text-dark">Job Description & Responsibilities</label>
                  <textarea 
                    className="form-control" 
                    rows="4"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  ></textarea>
                </div>
              </div>
            )}

            {/* STEP 3: APPROVAL & ASSIGNMENT */}
            {step === 3 && (
              <div>
                <div className="alert alert-success border-success-subtle mb-3">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-shield-check text-success fs-5"></i>
                    <div>
                      <strong className="d-block small">Automated Workflow Routing</strong>
                      <span className="small text-muted">This requisition will be routed through the standard 4-tier approval matrix.</span>
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-bold small text-dark">1st Approver (HOD / Division Head)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={approverHod}
                    onChange={e => setApproverHod(e.target.value)}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-bold small text-dark">2nd Approver (Senior Management / DGM)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={approverMgmt}
                    onChange={e => setApproverMgmt(e.target.value)}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-bold small text-dark">Assign Talent Acquisition Specialist</label>
                  <select 
                    className="form-select"
                    value={assignedRecruiter}
                    onChange={e => setAssignedRecruiter(e.target.value)}
                  >
                    <option value="Anita Deshmukh (Senior Recruiter)">Anita Deshmukh (Senior Recruiter)</option>
                    <option value="Rahul Nair (Plant Talent Specialist)">Rahul Nair (Plant Talent Specialist)</option>
                    <option value="Priya Sharma (Talent Lead)">Priya Sharma (Talent Lead)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Controls */}
          <div className="urja-modal-footer d-flex justify-content-between">
            <div>
              <button 
                type="button" 
                className="btn btn-light me-2" 
                onClick={onClose}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-outline-secondary" 
                onClick={() => { alert('Requisition saved as draft!'); onClose(); }}
              >
                Save as Draft
              </button>
            </div>

            <div className="d-flex gap-2">
              {step > 1 && (
                <button 
                  type="button" 
                  className="btn btn-outline-dark" 
                  onClick={() => setStep(step - 1)}
                >
                  ← Previous
                </button>
              )}
              <button 
                type="submit" 
                className="btn btn-primary fw-bold px-4"
                style={{ backgroundColor: '#0284C7', borderColor: '#0284C7' }}
              >
                {step < 3 ? 'Next →' : 'Submit Requisition'}
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}
