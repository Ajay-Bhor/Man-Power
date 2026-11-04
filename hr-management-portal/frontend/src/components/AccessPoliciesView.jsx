import React, { useState, useEffect } from 'react';

export default function AccessPoliciesView({ currentUser, showToast }) {
  const [policies, setPolicies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchPolicies = () => {
    setIsLoading(true);
    const token = sessionStorage.getItem('ats_urja_token') || currentUser?.token;
    fetch('http://localhost:8080/api/v1/admin/policies', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Failed to fetch policies');
      })
      .then(body => {
        setIsLoading(false);
        if (body && body.data) {
          setPolicies(body.data);
        }
      })
      .catch(err => {
        setIsLoading(false);
        console.warn('Policies fetch fallback:', err);
        // Fallback default policies
        setPolicies([
          { policyKey: 'it_admin_candidate_access', policyValue: 'false', description: 'Grant IT Admin access to candidate personal data and applications', category: 'DATA_PRIVACY' },
          { policyKey: 'it_admin_resume_access', policyValue: 'false', description: 'Grant IT Admin access to candidate resumes and sensitive documents', category: 'DATA_PRIVACY' },
          { policyKey: 'it_admin_feedback_access', policyValue: 'false', description: 'Grant IT Admin access to interview feedback scorecards and evaluator notes', category: 'DATA_PRIVACY' },
          { policyKey: 'can_assign_recruiters', policyValue: 'ROLE_HR_ADMIN', description: 'Authorized roles permitted to assign recruiters to job requisitions', category: 'WORKFLOW_PERMISSIONS' },
          { policyKey: 'can_assign_interviewers', policyValue: 'ROLE_HR_ADMIN', description: 'Authorized roles permitted to schedule rounds and assign interviewers', category: 'WORKFLOW_PERMISSIONS' },
          { policyKey: 'can_assign_approvers', policyValue: 'ROLE_HR_ADMIN,ROLE_DEPT_HEAD', description: 'Authorized roles permitted to configure approval authority chains', category: 'WORKFLOW_PERMISSIONS' }
        ]);
      });
  };

  useEffect(() => {
    fetchPolicies();
  }, [currentUser]);

  const handleTogglePolicy = (policyKey, currentValue) => {
    const newValue = currentValue === 'true' ? 'false' : 'true';
    updatePolicy(policyKey, newValue);
  };

  const handleSelectPolicy = (policyKey, newValue) => {
    updatePolicy(policyKey, newValue);
  };

  const updatePolicy = (policyKey, newValue) => {
    setIsSaving(true);
    const token = sessionStorage.getItem('ats_urja_token') || currentUser?.token;
    fetch(`http://localhost:8080/api/v1/admin/policies/${policyKey}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ policyValue: newValue })
    })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Failed to update policy');
      })
      .then(body => {
        setIsSaving(false);
        setPolicies(prev => prev.map(p => p.policyKey === policyKey ? { ...p, policyValue: newValue } : p));
        showToast(`Access policy updated: ${policyKey} = ${newValue}`);
      })
      .catch(err => {
        setIsSaving(false);
        // Optimistic local update
        setPolicies(prev => prev.map(p => p.policyKey === policyKey ? { ...p, policyValue: newValue } : p));
        showToast(`Policy updated locally: ${policyKey} = ${newValue}`);
      });
  };

  const getPolicyValue = (key, defaultVal = '') => {
    const found = policies.find(p => p.policyKey === key);
    return found ? found.policyValue : defaultVal;
  };

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="fw-bold text-dark mb-1" style={{ fontSize: '1.45rem' }}>Recruitment Access Policies & Governance</h2>
          <p className="text-muted small mb-0">Configure enterprise permissions, segregation of duties, and sensitive candidate data isolation.</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button 
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
            onClick={fetchPolicies}
            disabled={isLoading || isSaving}
          >
            <i className={`bi bi-arrow-clockwise ${isLoading ? 'spin' : ''}`}></i>
            <span>Refresh Policies</span>
          </button>
        </div>
      </div>

      {/* Security Guidance Alert */}
      <div className="p-3 rounded-3 mb-4 border d-flex align-items-start gap-3" style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#FEF3C7', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
          <i className="bi bi-shield-lock-fill"></i>
        </div>
        <div>
          <strong className="text-dark d-block">Enterprise Data Privacy & Role Isolation</strong>
          <small className="text-muted">
            IT Administrators manage system accounts, infrastructure, and access policies. By default, IT Admins have <strong>zero access</strong> to candidate personal data, resumes, or interview scorecards to uphold strict regulatory compliance and candidate confidentiality. Grant business access only when explicitly authorized by corporate policy.
          </small>
        </div>
      </div>

      <div className="row g-4">
        {/* Section 1: IT Admin Business Data Isolation Policies */}
        <div className="col-lg-6">
          <div className="card-portal p-4 h-100">
            <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom">
              <i className="bi bi-person-x-fill fs-5 text-danger"></i>
              <div>
                <h5 className="fw-bold text-dark mb-0">IT Admin Business Data Restrictions</h5>
                <small className="text-muted">Manage IT Administrator visibility into recruitment business data</small>
              </div>
            </div>

            <div className="d-flex flex-column gap-3">
              {/* Policy 1: Candidate Access */}
              <div className="p-3 border rounded-3 bg-light d-flex align-items-center justify-content-between">
                <div>
                  <strong className="text-dark d-block">Candidate Records & Applications</strong>
                  <small className="text-muted d-block">Allow IT Admin to view candidate names, contacts, and application stages.</small>
                  <span className={`badge mt-1 ${getPolicyValue('it_admin_candidate_access') === 'true' ? 'bg-danger' : 'bg-success'}`}>
                    {getPolicyValue('it_admin_candidate_access') === 'true' ? 'Access Granted' : 'Restricted (Default)'}
                  </span>
                </div>
                <label className="urja-toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={getPolicyValue('it_admin_candidate_access') === 'true'}
                    onChange={() => handleTogglePolicy('it_admin_candidate_access', getPolicyValue('it_admin_candidate_access'))}
                    disabled={isSaving}
                  />
                  <span className="urja-toggle-slider"></span>
                </label>
              </div>

              {/* Policy 2: Resume Downloads */}
              <div className="p-3 border rounded-3 bg-light d-flex align-items-center justify-content-between">
                <div>
                  <strong className="text-dark d-block">Candidate Resumes & Documents</strong>
                  <small className="text-muted d-block">Allow IT Admin to preview and download candidate resumes and attachments.</small>
                  <span className={`badge mt-1 ${getPolicyValue('it_admin_resume_access') === 'true' ? 'bg-danger' : 'bg-success'}`}>
                    {getPolicyValue('it_admin_resume_access') === 'true' ? 'Access Granted' : 'Restricted (Default)'}
                  </span>
                </div>
                <label className="urja-toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={getPolicyValue('it_admin_resume_access') === 'true'}
                    onChange={() => handleTogglePolicy('it_admin_resume_access', getPolicyValue('it_admin_resume_access'))}
                    disabled={isSaving}
                  />
                  <span className="urja-toggle-slider"></span>
                </label>
              </div>

              {/* Policy 3: Interview Feedback */}
              <div className="p-3 border rounded-3 bg-light d-flex align-items-center justify-content-between">
                <div>
                  <strong className="text-dark d-block">Interview Feedback & Evaluations</strong>
                  <small className="text-muted d-block">Allow IT Admin to view scorecards, ratings, and evaluator comments.</small>
                  <span className={`badge mt-1 ${getPolicyValue('it_admin_feedback_access') === 'true' ? 'bg-danger' : 'bg-success'}`}>
                    {getPolicyValue('it_admin_feedback_access') === 'true' ? 'Access Granted' : 'Restricted (Default)'}
                  </span>
                </div>
                <label className="urja-toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={getPolicyValue('it_admin_feedback_access') === 'true'}
                    onChange={() => handleTogglePolicy('it_admin_feedback_access', getPolicyValue('it_admin_feedback_access'))}
                    disabled={isSaving}
                  />
                  <span className="urja-toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Recruitment Workflow Assignment Authority */}
        <div className="col-lg-6">
          <div className="card-portal p-4 h-100">
            <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom">
              <i className="bi bi-diagram-3-fill fs-5 text-success"></i>
              <div>
                <h5 className="fw-bold text-dark mb-0">Workflow Assignment Authority</h5>
                <small className="text-muted">Configure who is authorized to assign recruiters, interviewers, and approvers</small>
              </div>
            </div>

            <div className="d-flex flex-column gap-3">
              {/* Permission 1: Can Assign Recruiters */}
              <div className="p-3 border rounded-3 bg-light">
                <label className="form-label fw-bold text-dark small mb-1">
                  Who can assign Recruiters to Requisitions & Candidates?
                </label>
                <p className="text-muted small mb-2">Controls who can assign or reassign recruitment leads on open hiring requisitions.</p>
                <select 
                  className="form-select form-select-sm"
                  value={getPolicyValue('can_assign_recruiters', 'ROLE_HR_ADMIN')}
                  onChange={(e) => handleSelectPolicy('can_assign_recruiters', e.target.value)}
                  disabled={isSaving}
                >
                  <option value="ROLE_HR_ADMIN">HR Admin Only (Recommended)</option>
                  <option value="ROLE_HR_ADMIN,ROLE_IT_ADMIN">HR Admin & IT Admin</option>
                  <option value="ROLE_HR_ADMIN,ROLE_HRBP">HR Admin & HRBP</option>
                </select>
              </div>

              {/* Permission 2: Can Assign Interviewers */}
              <div className="p-3 border rounded-3 bg-light">
                <label className="form-label fw-bold text-dark small mb-1">
                  Who can schedule rounds and assign Interviewers?
                </label>
                <p className="text-muted small mb-2">Controls authority to select interview rounds, assign panel interviewers, and create feedback tasks.</p>
                <select 
                  className="form-select form-select-sm"
                  value={getPolicyValue('can_assign_interviewers', 'ROLE_HR_ADMIN')}
                  onChange={(e) => handleSelectPolicy('can_assign_interviewers', e.target.value)}
                  disabled={isSaving}
                >
                  <option value="ROLE_HR_ADMIN">HR Admin Only (Recommended)</option>
                  <option value="ROLE_HR_ADMIN,ROLE_HR_RECRUITER">HR Admin & Assigned Recruiters</option>
                  <option value="ROLE_HR_ADMIN,ROLE_IT_ADMIN">HR Admin & IT Admin</option>
                </select>
              </div>

              {/* Permission 3: Can Assign Approvers */}
              <div className="p-3 border rounded-3 bg-light">
                <label className="form-label fw-bold text-dark small mb-1">
                  Who can configure Requisition Approvers?
                </label>
                <p className="text-muted small mb-2">Controls who can configure managerial signoff chains for new job requisitions.</p>
                <select 
                  className="form-select form-select-sm"
                  value={getPolicyValue('can_assign_approvers', 'ROLE_HR_ADMIN,ROLE_DEPT_HEAD')}
                  onChange={(e) => handleSelectPolicy('can_assign_approvers', e.target.value)}
                  disabled={isSaving}
                >
                  <option value="ROLE_HR_ADMIN,ROLE_DEPT_HEAD">HR Admin & Department Head (Recommended)</option>
                  <option value="ROLE_HR_ADMIN">HR Admin Only</option>
                  <option value="ROLE_IT_ADMIN">IT Admin Only</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
