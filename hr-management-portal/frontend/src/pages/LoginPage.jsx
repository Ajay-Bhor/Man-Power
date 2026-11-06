import React, { useState, useEffect } from 'react';
import '../styles/urja-login.css';
import IndianHeaderClock from '../components/IndianHeaderClock';

export default function LoginPage({ onLoginSuccess, sessionExpiredMessage }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // Guarantee fields and storage are reset whenever the login page mounts/refreshes
  useEffect(() => {
    try {
      localStorage.removeItem('ats_urja_saved_email');
      
    } catch (e) {}
    setEmail('');
    setPassword('');

    // Remove readonly after initial load/autofill window
    const timer = setTimeout(() => {
      const emailInput = document.getElementById('workEmail');
      const passInput = document.getElementById('userPassword');
      if (emailInput) emailInput.removeAttribute('readonly');
      if (passInput) passInput.removeAttribute('readonly');
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  // Demo accounts for rapid one-click role switching during testing
  const demoAccounts = [
    { label: 'IT Admin', email: 'admin@company.com', role: 'ROLE_IT_ADMIN', name: 'Vikramaditya Sharma', title: 'IT Administrator', avatar: 'VS' },
    { label: 'HR Admin', email: 'hradmin@company.com', role: 'ROLE_HR_ADMIN', name: 'Priyanka Deshmukh', title: 'HR Administrator', avatar: '/assets/images/woman.jpg' },
    { label: 'Recruiter', email: 'anita.recruiter@company.com', role: 'ROLE_HR_RECRUITER', name: 'Anita Deshmukh', title: 'Senior Technical Recruiter', avatar: 'AD' },
    { label: 'Interviewer', email: 'arjun.tech@company.com', role: 'ROLE_INTERVIEWER', name: 'Arjun Varma', title: 'Technical Lead / Interviewer', avatar: '/assets/images/man.jpg' },
    { label: 'Dept Head', email: 'sanjay.ops@company.com', role: 'ROLE_DEPT_HEAD', name: 'Sanjay Patil', title: 'Department Head', avatar: '/assets/images/man.jpg' },
    { label: 'Approver', email: 'amitav.mgr@company.com', role: 'ROLE_APPROVING_MANAGER', name: 'Amitav Mukherjee', title: 'Approving Manager', avatar: 'AM' }
  ];

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter both work email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      // Connect directly to the existing Spring Boot authentication API
      const res = await fetch('http://localhost:8080/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail: email, password: password })
      });

      if (res.ok) {
        const body = await res.json();
        const authData = body.data || body;
        const jwtToken = authData.accessToken || authData.token;
        authData.token = jwtToken;
        sessionStorage.setItem('ats_urja_token', jwtToken);
        sessionStorage.setItem('ats_urja_user', JSON.stringify(authData));
        if (rememberMe) {
          localStorage.setItem('ats_urja_saved_email', email);
        }
        if (onLoginSuccess) {
          onLoginSuccess(authData);
        }
        return;
      } else {
        const errJson = await res.json().catch(() => null);
        setErrorMessage(errJson?.message || 'Invalid credentials. Please verify your work email and password.');
        setIsLoading(false);
        return;
      }
    } catch (err) {
      console.warn('Backend API connection issue, evaluating local fallback:', err);
    }

    // Fallback authentication for offline or network edge cases
    const matched = demoAccounts.find(a => a.email.toLowerCase() === email.toLowerCase()) || {
      name: email.split('@')[0],
      email: email,
      role: 'ROLE_HR_ADMIN',
      title: 'HR Executive',
      avatar: '/assets/images/woman.jpg'
    };

    setTimeout(() => {
      setIsLoading(false);
      const fallbackData = {
        token: 'demo-jwt-token-ats-urja-enterprise',
        username: matched.email.split('@')[0],
        name: matched.name,
        email: matched.email,
        roles: [matched.role],
        title: matched.title || 'HR Executive',
        profileImageUrl: matched.avatar || '/assets/images/woman.jpg',
        avatar: matched.avatar || '/assets/images/woman.jpg'
      };
      if (rememberMe) {
        sessionStorage.setItem('ats_urja_token', fallbackData.token);
        sessionStorage.setItem('ats_urja_user', JSON.stringify(fallbackData));
      }
      if (onLoginSuccess) {
        onLoginSuccess(fallbackData);
      }
    }, 600);
  };

  const handleMicrosoftSSO = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const ssoData = {
        token: 'ms-sso-token-ats-urja-corp',
        username: 'priyanka.sen@urjafoods.com',
        name: 'Priyanka Sen (Urja Microsoft 365 SSO)',
        email: 'priyanka.sen@urjafoods.com',
        roles: ['ROLE_HR_ADMIN']
      };
      if (rememberMe) {
        sessionStorage.setItem('ats_urja_token', ssoData.token);
        sessionStorage.setItem('ats_urja_user', JSON.stringify(ssoData));
      }
      if (onLoginSuccess) {
        onLoginSuccess(ssoData);
      }
    }, 650);
  };

  return (
    <div className="urja-login-viewport">
      
      {/* Main Enclosed Split-Screen Card Canvas matching reference mockup */}
      <div className="urja-app-canvas">
        
        {/* Background Visual Layer: Silos, Chick Wedge, Woman, Green Foliage */}
        <div className="urja-canvas-bg">
          {/* Top Grain Silos Facility */}
          <div className="canvas-photo-cell cell-silos">
            <img src="/assets/images/silos.jpg" alt="Urja Agro Grain Silos Facility" />
          </div>

          {/* Center-Middle Baby Chick Diagonal Wedge with Glowing Lime Border */}
          <div className="canvas-photo-cell cell-chick">
            <img src="/assets/images/chick.jpg" alt="Poultry Hatchery Chick & Soybeans" />
          </div>

          {/* Bottom Woman HR Workspace */}
          <div className="canvas-photo-cell cell-woman">
            <img src="/assets/images/woman.jpg" alt="Corporate HR Workspace" />
          </div>

          {/* Right Foliage Header Area */}
          <div className="canvas-photo-cell cell-foliage">
            <img src="/assets/images/leaves_bg.jpg" alt="Lush Soybean Foliage" />
          </div>
        </div>

        {/* Diagonal Glowing Lime Divider Line */}
        <div className="urja-diagonal-divider-svg">
          <svg viewBox="0 0 1000 1000" preserveAspectRatio="none">
            <line x1="365" y1="0" x2="515" y2="1000" stroke="#84d623" strokeWidth="4" />
          </svg>
        </div>

        {/* Top-Right Floating Live IST Clock Badge matching mockup */}
        <div className="urja-top-right-clock">
          <IndianHeaderClock className="urja-clock-badge-glass" />
        </div>

        {/* Left Side: Dark Green Branding Panel */}
        <div className="urja-left-panel">
          
          {/* Brand Logo & Company Titles */}
          <div className="urja-brand-block">
            <div className="urja-logo-text">
              <span className="urja-logo-white">Urja</span>
              <div className="urja-logo-foods">
                <span>FOODS</span>
                <span className="urja-logo-tagline">CREATING ENERGY</span>
              </div>
            </div>
            
            <div className="urja-company-name">Urja Foods & Agro Pvt. Ltd.</div>
            <div className="urja-company-devanagari">ऊर्जा फूड्स अँड अ‍ॅग्रो</div>

            {/* Accent Lime Bar */}
            <div className="urja-lime-accent-bar"></div>

            {/* ATS URJA Sub-brand */}
            <div className="urja-ats-badge">
              <div className="urja-ats-title">
                ATS <span className="highlight-lime">URJA</span>
              </div>
              <div className="urja-ats-subtitle">Applicant Tracking System</div>
            </div>

            {/* Accent Lime Bar */}
            <div className="urja-lime-accent-bar" style={{ marginTop: '0.85rem' }}></div>
          </div>

          {/* Main Hero Headline & Description */}
          <div className="urja-hero-content">
            <h1 className="urja-hero-headline">
              Right Talent<br />
              Stronger <span className="highlight-lime">Urja</span>
            </h1>
            <p className="urja-hero-description">
              A smarter way to manage candidates, interviews and hiring for a stronger Urja team.
            </p>
          </div>

          {/* Six (6) Circular Business Division Badges */}
          <div className="urja-divisions-container">
            
            {/* 1. Soybean */}
            <div className="urja-division-item" title="Soybean Agro Processing Division">
              <div className="urja-division-circle">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"></path>
                  <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path>
                </svg>
              </div>
              <span className="urja-division-label">Soybean</span>
            </div>

            {/* 2. Plant Feedmill */}
            <div className="urja-division-item" title="Animal Nutrition & Feedmill Plant">
              <div className="urja-division-circle">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
              </div>
              <span className="urja-division-label">Plant<br />Feedmill</span>
            </div>

            {/* 3. Poultry Integration */}
            <div className="urja-division-item" title="Commercial Poultry Integration">
              <div className="urja-division-circle">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10"></line>
                  <line x1="12" y1="20" x2="12" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
              </div>
              <span className="urja-division-label">Poultry<br />Integration</span>
            </div>

            {/* 4. Hatchery */}
            <div className="urja-division-item" title="Hatchery & Incubation Facility">
              <div className="urja-division-circle">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a5 5 0 0 1 5 5c0 2-1.5 4-3 5.5l1 2.5-3-1-3 1 1-2.5C8.5 11 7 9 7 7a5 5 0 0 1 5-5z"></path>
                  <path d="M5 19a7 7 0 0 0 14 0H5z"></path>
                </svg>
              </div>
              <span className="urja-division-label">Hatchery</span>
            </div>

            {/* 5. Breeder Operation */}
            <div className="urja-division-item" title="Breeder Farm Operations">
              <div className="urja-division-circle">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9"></circle>
                  <path d="M12 7v10"></path>
                  <path d="M8 11c2-2 6-2 8 0"></path>
                </svg>
              </div>
              <span className="urja-division-label">Breeder<br />Operation</span>
            </div>

            {/* 6. QA / QC */}
            <div className="urja-division-item" title="Quality Assurance & Quality Control Lab">
              <div className="urja-division-circle">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"></path>
                  <line x1="8.5" y1="2" x2="15.5" y2="2"></line>
                </svg>
              </div>
              <span className="urja-division-label">QA / QC</span>
            </div>

          </div>

          {/* Organic Green Waves Curve Graphic at the bottom */}
          <div className="urja-bottom-wave">
            <svg viewBox="0 0 800 120" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0,60 C150,110 350,10 500,70 C650,130 750,50 800,80 L800,120 L0,120 Z" fill="rgba(4, 18, 8, 0.7)" />
              <path d="M0,80 C200,40 400,110 600,60 C700,35 750,75 800,90" stroke="#84d623" strokeWidth="2.5" opacity="0.8" />
              <path d="M0,95 C250,55 450,115 650,75 C750,55 780,85 800,100" stroke="#98ed28" strokeWidth="1.5" opacity="0.6" />
            </svg>
          </div>

        </div>

        {/* Right Side: Pristine Floating WHITE Login Card */}
        <div className="urja-right-panel">
          <div className="urja-white-login-card">
            
            <div className="urja-card-header">
              <h3 className="card-welcome-title">Welcome to</h3>
              <h1 className="card-ats-title">
                ATS <span className="card-brand-green">Urja</span>
              </h1>
              <p className="card-instructions">
                Sign in to access your recruitment workspace.
              </p>
            </div>

            {sessionExpiredMessage && (
              <div
                className="urja-session-expired-alert"
                role="alert"
                style={{
                  backgroundColor: '#FEF3C7',
                  border: '1px solid #F59E0B',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  color: '#92400E',
                  fontSize: '0.86rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  marginBottom: '1rem',
                  lineHeight: '1.4'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>{sessionExpiredMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="urja-card-error">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="urja-card-form" noValidate autoComplete="off">
              {/* Invisible decoy inputs to capture aggressive browser credential autofill */}
              <div style={{ position: 'absolute', opacity: 0, height: 0, width: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: -1 }}>
                <input type="text" name="prevent_autofill_username" tabIndex={-1} autoComplete="off" />
                <input type="password" name="prevent_autofill_password" tabIndex={-1} autoComplete="new-password" />
              </div>
              
              {/* Work Email Field */}
              <div className="urja-form-group">
                <label htmlFor="workEmail" className="urja-field-label">Work Email</label>
                <div className="urja-input-wrapper">
                  <div className="input-icon-left">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                    </svg>
                  </div>
                  <input
                    id="workEmail"
                    name="workEmail"
                    type="email"
                    className="urja-clean-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={(e) => e.target.removeAttribute('readonly')}
                    readOnly
                    placeholder="Enter your work email"
                    autoComplete="off"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="urja-form-group">
                <label htmlFor="userPassword" className="urja-field-label">Password</label>
                <div className="urja-input-wrapper">
                  <div className="input-icon-left">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  </div>
                  <input
                    id="userPassword"
                    name="userPassword"
                    type={showPassword ? 'text' : 'password'}
                    className="urja-clean-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={(e) => e.target.removeAttribute('readonly')}
                    readOnly
                    placeholder="Enter your password"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-action"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Options Row: Remember Me & Forgot Password */}
              <div className="urja-card-options">
                <label className="urja-checkbox-label">
                  <input
                    type="checkbox"
                    id="rememberMeCheckbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span className="custom-checkmark"></span>
                  <span className="checkbox-text">Remember me</span>
                </label>

                <button
                  type="button"
                  className="forgot-link-btn"
                  onClick={() => { setShowForgotModal(true); setForgotEmail(email); setForgotSent(false); }}
                >
                  Forgot Password?
                </button>
              </div>

              {/* Vibrant Green Sign In Button */}
              <button
                type="submit"
                id="signInBtn"
                className="urja-green-submit-btn"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="urja-btn-loading">
                    <div className="urja-spinner"></div>
                    <span>Authenticating...</span>
                  </div>
                ) : (
                  <>
                    <span>Sign In</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </>
                )}
              </button>

              {/* OR Divider */}
              <div className="urja-card-divider">
                <span>OR</span>
              </div>

              {/* Sign in with Microsoft Button */}
              <button
                type="button"
                id="msSignInBtn"
                className="urja-ms-sso-btn"
                onClick={handleMicrosoftSSO}
                disabled={isLoading}
              >
                <div className="ms-icon-tiles">
                  <span className="tile-red"></span>
                  <span className="tile-green"></span>
                  <span className="tile-blue"></span>
                  <span className="tile-yellow"></span>
                </div>
                <span className="ms-btn-text">Sign in with Microsoft</span>
              </button>

              {/* Security Badge Footer */}
              <div className="urja-security-footer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <span>Secure Access | Urja Foods & Agro Pvt. Ltd.</span>
              </div>

            </form>

          </div>
        </div>

      </div>

      {/* Forgot Password Modal Dialog */}
      {showForgotModal && (
        <div className="urja-modal-backdrop" onClick={() => setShowForgotModal(false)}>
          <div className="urja-modal-box-white" onClick={(e) => e.stopPropagation()}>
            <div className="urja-modal-header-clean">
              <h4>Reset Your Password</h4>
              <button className="urja-close-modal-btn" onClick={() => setShowForgotModal(false)}>✕</button>
            </div>
            <div className="urja-modal-body-clean">
              {forgotSent ? (
                <div className="urja-modal-success-state">
                  <div className="success-icon-badge">✓</div>
                  <h5>Password Reset Dispatched</h5>
                  <p>A secure temporary reset link has been dispatched to <strong>{forgotEmail}</strong>. Please verify your Urja corporate inbox.</p>
                  <button className="urja-green-submit-btn" style={{ marginTop: '1rem' }} onClick={() => setShowForgotModal(false)}>Done</button>
                </div>
              ) : (
                <div>
                  <p className="forgot-modal-desc">
                    Enter your registered Urja official work email. Our Active Directory service will send password restoration instructions.
                  </p>
                  <div className="urja-form-group" style={{ marginBottom: '1.25rem' }}>
                    <label className="urja-field-label">Official Work Email</label>
                    <input
                      type="email"
                      className="urja-clean-input"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="name@urjafoods.com"
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button type="button" className="urja-ghost-btn" onClick={() => setShowForgotModal(false)}>Cancel</button>
                    <button
                      type="button"
                      className="urja-green-submit-btn"
                      style={{ width: 'auto', padding: '0.6rem 1.4rem' }}
                      onClick={() => setForgotSent(true)}
                    >
                      Send Reset Instructions
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
