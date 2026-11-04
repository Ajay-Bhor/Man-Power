import React, { useState } from 'react';

export default function MonthlyHiringTrendChart() {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const applications = [120, 145, 180, 210, 245, 290, 315, 360, 390, 432, 455, 480];
  const joined = [4, 6, 5, 8, 7, 9, 8, 11, 10, 8, 12, 14];

  const [hoveredIdx, setHoveredIdx] = useState(null);

  // SVG Chart dimensions
  const width = 500;
  const height = 150;
  const paddingX = 35;
  const paddingY = 20;
  const chartW = width - paddingX * 2;
  const chartH = height - paddingY * 2;

  const maxApp = 500;
  const maxJoined = 16;

  // Compute points for Applications line
  const appPoints = applications.map((val, i) => {
    const x = paddingX + (i / (months.length - 1)) * chartW;
    const y = height - paddingY - (val / maxApp) * chartH;
    return { x, y, val };
  });

  const lineD = appPoints.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  return (
    <div className="urja-widget-card">
      <div className="urja-widget-header">
        <div className="urja-widget-title-wrap">
          <i className="bi bi-graph-up urja-widget-icon" style={{ color: '#0284C7' }}></i>
          <h3 className="urja-widget-title">Monthly Hiring Trend</h3>
        </div>
        <div className="urja-chart-legend">
          <span style={{ display: 'inline-flex', alignSelf: 'center', alignItems: 'center' }}>
            <span className="urja-legend-dot" style={{ backgroundColor: '#0284C7' }}></span>
            <span>Applications</span>
          </span>
          <span style={{ display: 'inline-flex', alignSelf: 'center', alignItems: 'center' }}>
            <span className="urja-legend-rect" style={{ backgroundColor: '#10B981' }}></span>
            <span>Joined</span>
          </span>
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          style={{ width: '100%', height: 'auto', display: 'block' }}
        >
          {/* Horizontal grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = height - paddingY - pct * chartH;
            return (
              <line 
                key={idx} 
                x1={paddingX} 
                y1={y} 
                x2={width - paddingX} 
                y2={y} 
                stroke="#F1F5F9" 
                strokeDasharray="3 3"
              />
            );
          })}

          {/* Joined Bars (Green) */}
          {joined.map((val, i) => {
            const barW = 12;
            const x = paddingX + (i / (months.length - 1)) * chartW - barW / 2;
            const barH = (val / maxJoined) * chartH * 0.75;
            const y = height - paddingY - barH;
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width={barW}
                height={barH}
                fill={hoveredIdx === i ? '#059669' : '#10B981'}
                rx="3"
                opacity={0.88}
                style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}

          {/* Applications Trend Line (Cyan/Blue) */}
          <path
            d={lineD}
            fill="none"
            stroke="#0284C7"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Applications Data Dots */}
          {appPoints.map((pt, i) => (
            <g key={i}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={hoveredIdx === i ? 5 : 3.5}
                fill="#FFFFFF"
                stroke="#0284C7"
                strokeWidth={hoveredIdx === i ? 3 : 2}
                style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            </g>
          ))}

          {/* Month Labels along bottom */}
          {months.map((m, i) => {
            const x = paddingX + (i / (months.length - 1)) * chartW;
            return (
              <text
                key={i}
                x={x}
                y={height - 4}
                textAnchor="middle"
                fontSize="10"
                fill="#94A3B8"
                fontWeight={hoveredIdx === i ? '700' : '500'}
              >
                {m}
              </text>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredIdx !== null && (
          <div style={{
            position: 'absolute',
            top: 6,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#0F172A',
            color: '#FFFFFF',
            padding: '3px 10px',
            borderRadius: 6,
            fontSize: '0.72rem',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <span>{months[hoveredIdx]} 2026:</span>
            <span style={{ color: '#38BDF8' }}>Apps: {applications[hoveredIdx]}</span>
            <span>•</span>
            <span style={{ color: '#4ADE80' }}>Joined: {joined[hoveredIdx]}</span>
          </div>
        )}
      </div>
    </div>
  );
}
