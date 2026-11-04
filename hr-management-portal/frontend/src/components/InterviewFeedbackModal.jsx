import React, { useState } from 'react';

export default function InterviewFeedbackModal({ candidate, interview, onClose, onSubmit }) {
  const c = candidate || { name: 'Amit Shah', role: 'Assistant Manager', avatar: '/assets/images/man.jpg' };
  const inv = interview || { round: 'Technical Round 2', date: '21 Oct 2026', time: '11:00 AM', interviewer: 'Rohan Verma' };

  const [technical, setTechnical] = useState(4);
  const [communication, setCommunication] = useState(4);
  const [problemSolving, setProblemSolving] = useState(3);
  const [culturalFit, setCulturalFit] = useState(5);
  const [recommendation, setRecommendation] = useState('Hire');
  const [comments, setComments] = useState('Shows good technical knowledge and problem solving skills.');

  // Calculate overall average
  const overallRating = Math.round((technical + communication + problemSolving + culturalFit) / 4);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit({
        candidateId: c.id,
        ratings: { technical, communication, problemSolving, culturalFit, overallRating },
        recommendation,
        comments
      });
    }
  };

  const renderStars = (rating, setRating) => (
    <div className="urja-star-group">
      {[1, 2, 3, 4, 5].map(star => (
        <i
          key={star}
          className={`bi bi-star-fill ${star <= rating ? 'filled' : ''}`}
          onClick={() => setRating(star)}
          style={{ cursor: 'pointer' }}
        ></i>
      ))}
    </div>
  );

  return (
    <div className="urja-modal-backdrop" onClick={onClose}>
      <div className="urja-modal-card" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="urja-modal-header">
          <div className="d-flex align-items-center gap-2">
            <div className="urja-req-kpi-icon orange" style={{ width: 32, height: 32, fontSize: '0.9rem' }}>
              <i className="bi bi-star-fill"></i>
            </div>
            <h4 className="mb-0 fw-bold text-dark">Interview Feedback</h4>
          </div>
          <button className="urja-modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="urja-modal-body" style={{ maxHeight: '65vh', overflowY: 'auto', padding: '1.5rem' }}>
            
            {/* Candidate & Interview Summary (Exact match to Screen 9) */}
            <div className="d-flex align-items-center justify-content-between p-3 bg-light rounded-3 mb-4 border">
              <div className="d-flex align-items-center gap-3">
                <img 
                  src={c.avatar && c.avatar.startsWith('/') ? c.avatar : '/assets/images/man.jpg'} 
                  alt={c.name} 
                  style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid #98E843' }}
                  onError={(e) => { e.target.src = '/assets/images/man.jpg'; }}
                />
                <div>
                  <div className="fw-bold text-dark">{c.name}</div>
                  <div className="small text-muted">{c.role || 'Assistant Manager'}</div>
                </div>
              </div>

              <div className="text-end small">
                <div className="fw-bold text-secondary">Interview Details</div>
                <div className="text-muted">{inv.round}</div>
                <div className="text-muted">{inv.date} {inv.time}</div>
                <div className="text-dark fw-medium">Interviewer: {inv.interviewer}</div>
              </div>
            </div>

            {/* Interactive Rating Rows */}
            <div className="mb-4">
              <div className="urja-star-rating-row">
                <span className="small fw-semibold text-dark">Technical Skills</span>
                {renderStars(technical, setTechnical)}
              </div>
              <div className="urja-star-rating-row">
                <span className="small fw-semibold text-dark">Communication</span>
                {renderStars(communication, setCommunication)}
              </div>
              <div className="urja-star-rating-row">
                <span className="small fw-semibold text-dark">Problem Solving</span>
                {renderStars(problemSolving, setProblemSolving)}
              </div>
              <div className="urja-star-rating-row">
                <span className="small fw-semibold text-dark">Cultural Fit</span>
                {renderStars(culturalFit, setCulturalFit)}
              </div>
            </div>

            {/* Overall Rating & Recommendation */}
            <div className="row g-3 align-items-center mb-4">
              <div className="col-6">
                <div className="p-3 border rounded-3 bg-white text-center">
                  <div className="small text-muted mb-1">Overall Rating</div>
                  <div className="fs-4 fw-bold text-dark">{overallRating} / 5</div>
                </div>
              </div>

              <div className="col-6">
                <label className="form-label small fw-bold text-dark mb-1">Recommendation *</label>
                <select 
                  className="form-select"
                  value={recommendation}
                  onChange={e => setRecommendation(e.target.value)}
                  required
                >
                  <option value="Strong Hire">Strong Hire</option>
                  <option value="Hire">Hire</option>
                  <option value="Hold">Hold</option>
                  <option value="Reject">Reject</option>
                </select>
              </div>
            </div>

            {/* Comments Field */}
            <div className="mb-0">
              <label className="form-label small fw-bold text-dark">Evaluation Comments *</label>
              <textarea 
                className="form-control small" 
                rows="3" 
                value={comments}
                onChange={e => setComments(e.target.value)}
                placeholder="Shows good technical knowledge and problem solving skills."
                required
              ></textarea>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="urja-modal-footer">
            <button type="button" className="btn btn-light" onClick={onClose}>Cancel</button>
            <button 
              type="submit" 
              className="btn btn-success fw-bold px-4"
              style={{ backgroundColor: '#16A34A', borderColor: '#16A34A' }}
            >
              Submit Feedback
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
