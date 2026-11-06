import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import '../styles/urja-reports.css';

// Corporate Palette
const THEME_COLORS = {
  primaryGreen: '#087B55',
  secondaryGreen: '#16A36A',
  lightGreen: '#EAF7F0',
  primaryText: '#26364A',
  secondaryText: '#718096',
  border: '#E2E8F0',
  chartBar1: '#087B55',
  chartBar2: '#16A36A',
  chartLine: '#EA580C',
  donutColors: ['#087B55', '#16A36A', '#2563EB', '#0D9488', '#F59E0B', '#8B5CF6']
};

export default function ReportsAnalyticsView({ currentUser, onToast }) {
  // Filters State
  const [dateRange, setDateRange] = useState('Last 30 Days');
  const [selectedDept, setSelectedDept] = useState('All Departments');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Active Drill-down Drawer State
  const [activeDrilldown, setActiveDrilldown] = useState(null);

  // Performance Guide & Fullscreen Modal States
  const [showPerfInfo, setShowPerfInfo] = useState(false);
  const [isPerfExpanded, setIsPerfExpanded] = useState(false);

  // Initial Monthly Performance Data (Recharts) - Matching Enterprise Design Reference
  const monthlyHiringData = [
    { month: 'May 2026', applications: 210, interviews: 62, joined: 12 },
    { month: 'Jun 2026', applications: 245, interviews: 64, joined: 14 },
    { month: 'Jul 2026', applications: 295, interviews: 78, joined: 18 },
    { month: 'Aug 2026', applications: 310, interviews: 85, joined: 16 },
    { month: 'Sep 2026', applications: 290, interviews: 76, joined: 15 },
    { month: 'Oct 2026', applications: 340, interviews: 92, joined: 20 }
  ];

  // Custom renderers for Monthly Hiring Performance chart
  const renderCustomBarLabel = (props) => {
    const { x, y, width, height, value } = props;
    if (!value || height < 14) return null;
    return (
      <text
        x={x + width / 2}
        y={y + 13}
        fill="#FFFFFF"
        textAnchor="middle"
        fontSize={10}
        fontWeight="700"
        fontFamily="'DM Sans', 'Manrope', sans-serif"
        pointerEvents="none"
      >
        {value}
      </text>
    );
  };

  const renderCustomLineDot = (props) => {
    const { cx, cy, value } = props;
    if (cx == null || cy == null) return null;
    return (
      <g key={`dot-${cx}-${cy}`}>
        <circle
          cx={cx}
          cy={cy}
          r={9.5}
          fill="#FFFFFF"
          stroke="#FF6B35"
          strokeWidth={2}
        />
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#D9480F"
          fontSize={9}
          fontWeight="800"
          fontFamily="'DM Sans', 'Manrope', sans-serif"
          pointerEvents="none"
        >
          {value}
        </text>
      </g>
    );
  };

  const renderActiveLineDot = (props) => {
    const { cx, cy, value } = props;
    if (cx == null || cy == null) return null;
    return (
      <g key={`active-dot-${cx}-${cy}`}>
        <circle
          cx={cx}
          cy={cy}
          r={12}
          fill="#FFFFFF"
          stroke="#FF6B35"
          strokeWidth={2.5}
        />
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#D9480F"
          fontSize={10}
          fontWeight="800"
          fontFamily="'DM Sans', 'Manrope', sans-serif"
          pointerEvents="none"
        >
          {value}
        </text>
      </g>
    );
  };

  const renderCustomLegend = () => {
    return (
      <div className="urja-perf-legend">
        <div className="urja-perf-legend-item">
          <span className="urja-perf-legend-square" style={{ backgroundColor: '#087B55' }}></span>
          <span>Applications</span>
        </div>
        <div className="urja-perf-legend-item">
          <span className="urja-perf-legend-line-dot">
            <span className="urja-perf-legend-line"></span>
            <span className="urja-perf-legend-dot"></span>
          </span>
          <span>Candidates Joined</span>
        </div>
        <div className="urja-perf-legend-item">
          <span className="urja-perf-legend-square" style={{ backgroundColor: '#16A36A' }}></span>
          <span>Interviews</span>
        </div>
      </div>
    );
  };

  const CustomPerfTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="urja-chart-custom-tooltip">
          <div className="urja-tooltip-header">{label}</div>
          <div className="urja-tooltip-items">
            {payload.map((entry, index) => (
              <div key={`tip-${index}`} className="urja-tooltip-row">
                <span
                  className="urja-tooltip-dot"
                  style={{ backgroundColor: entry.color || entry.stroke || entry.fill }}
                />
                <span className="urja-tooltip-name">{entry.name}:</span>
                <span className="urja-tooltip-val">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const handleSummaryCardClick = (type) => {
    if (type === 'APPLICATIONS') {
      setActiveDrilldown({
        type: 'APPLICATIONS',
        title: 'Total Applications Pipeline (1,759)',
        subtitle: 'Candidate sourcing breakdown across active requisition channels.',
        value: '1,759 Total Sourced',
        label: '+14.2% Growth vs Last Period',
        items: [
          { title: 'Job Portals (Naukri, LinkedIn, Indeed)', meta: '703 applications (40.0%)' },
          { title: 'Employee Referrals & Internal Network', meta: '352 applications (20.0%)' },
          { title: 'Campus Recruitment Drives', meta: '264 applications (15.0%)' },
          { title: 'Direct Walk-in Applications', meta: '176 applications (10.0%)' },
          { title: 'Recruitment Agency Partners', meta: '139 applications (7.9%)' },
          { title: 'Careers Portal Direct Inquiries', meta: '125 applications (7.1%)' }
        ]
      });
    } else if (type === 'INTERVIEWS') {
      setActiveDrilldown({
        type: 'INTERVIEWS',
        title: 'Conducted Interviews (467)',
        subtitle: 'Technical evaluations, managerial reviews, and HR screenings.',
        value: '467 Interviews',
        label: '+8.9% Activity vs Target',
        items: [
          { title: 'Initial Screening & HR Fitment', meta: '185 candidates screened' },
          { title: 'Technical & Domain Assessment', meta: '162 panel sessions conducted' },
          { title: 'HOD & Leadership Round', meta: '86 final evaluations held' },
          { title: 'Management Final Review', meta: '34 compensation & offer discussions' }
        ]
      });
    } else if (type === 'JOINED') {
      setActiveDrilldown({
        type: 'JOINED',
        title: 'Candidates Successfully Joined (100)',
        subtitle: 'New team members onboarded across plants and corporate offices.',
        value: '100 Joiners',
        label: '+11.1% Achievement vs Target',
        items: [
          { title: 'Plant Operations & Manufacturing', meta: '38 joiners inducted' },
          { title: 'Engineering & Technology', meta: '24 software & automation engineers' },
          { title: 'Quality Assurance & Compliance', meta: '15 specialists deployed' },
          { title: 'Maintenance & Facility Support', meta: '12 technicians active' },
          { title: 'Accounts & Human Resources', meta: '11 corporate team members' }
        ]
      });
    }
  };

  // Recruitment Funnel Stages Data
  const funnelStages = [
    { stage: 'Applied', count: 340, percent: 100, drop: '0%', color: '#087B55' },
    { stage: 'Screened', count: 185, percent: 54.4, drop: '45.6%', color: '#0E9367' },
    { stage: 'Shortlisted', count: 96, percent: 28.2, drop: '26.2%', color: '#16A36A' },
    { stage: 'Interviewed', count: 48, percent: 14.1, drop: '14.1%', color: '#22C55E' },
    { stage: 'Offered', count: 18, percent: 5.3, drop: '8.8%', color: '#38BDF8' },
    { stage: 'Joined', count: 15, percent: 4.4, drop: '0.9%', color: '#6366F1' }
  ];

  // Candidate Source Donut Data
  const sourceAnalyticsData = [
    { name: 'Job Portals', value: 38, count: 129, color: '#087B55' },
    { name: 'Employee Referrals', value: 24, count: 82, color: '#16A36A' },
    { name: 'Campus Recruitment', value: 16, count: 54, color: '#2563EB' },
    { name: 'Careers Portal', value: 12, count: 41, color: '#0D9488' },
    { name: 'Recruitment Agencies', value: 6, count: 20, color: '#F59E0B' },
    { name: 'Walk-ins', value: 4, count: 14, color: '#8B5CF6' }
  ];

  // Department Hiring Progress Data
  const departmentAnalyticsList = [
    {
      id: 1,
      name: 'Engineering & IT',
      requisitioned: 20,
      filled: 12,
      open: 8,
      avgTat: '16 Days',
      budget: '₹48.5 L',
      slaStatus: 'ON_TRACK',
      completionRate: 60
    },
    {
      id: 2,
      name: 'Plant Operations',
      requisitioned: 12,
      filled: 9,
      open: 3,
      avgTat: '14 Days',
      budget: '₹28.0 L',
      slaStatus: 'ON_TRACK',
      completionRate: 75
    },
    {
      id: 3,
      name: 'Quality & Compliance',
      requisitioned: 5,
      filled: 4,
      open: 1,
      avgTat: '21 Days',
      budget: '₹14.2 L',
      slaStatus: 'ON_TRACK',
      completionRate: 80
    },
    {
      id: 4,
      name: 'Human Resources',
      requisitioned: 4,
      filled: 3,
      open: 1,
      avgTat: '19 Days',
      budget: '₹11.8 L',
      slaStatus: 'ON_TRACK',
      completionRate: 75
    },
    {
      id: 5,
      name: 'Supply Chain & Logistics',
      requisitioned: 4,
      filled: 3,
      open: 1,
      avgTat: '24 Days',
      budget: '₹12.5 L',
      slaStatus: 'AT_RISK',
      completionRate: 75
    },
    {
      id: 6,
      name: 'Finance & Accounts',
      requisitioned: 3,
      filled: 2,
      open: 1,
      avgTat: '28 Days',
      budget: '₹16.0 L',
      slaStatus: 'ON_TRACK',
      completionRate: 67
    }
  ];

  // Recent Hiring Activity List
  const recentActivities = [
    {
      id: 1,
      candidate: 'Amit Patil',
      role: 'Senior Software Engineer',
      dept: 'Engineering & IT',
      action: 'Offer Accepted & Joining Nov 1',
      date: 'Today, 10:45 AM',
      avatarText: 'AP',
      status: 'Joined'
    },
    {
      id: 2,
      candidate: 'Neha Joshi',
      role: 'HR Executive',
      dept: 'Human Resources',
      action: 'Offer Letter Dispatched',
      date: 'Yesterday, 04:20 PM',
      avatarText: 'NJ',
      status: 'Offered'
    },
    {
      id: 3,
      candidate: 'Vikram Desai',
      role: 'Plant Operator (Solvent Unit)',
      dept: 'Plant Operations',
      action: 'Technical Panel Cleared',
      date: '05 Nov 2026',
      avatarText: 'VD',
      status: 'Interviewed'
    },
    {
      id: 4,
      candidate: 'Anita Kulkarni',
      role: 'QA Automation Lead',
      dept: 'Quality & Compliance',
      action: 'Final Management Review',
      date: '04 Nov 2026',
      avatarText: 'AK',
      status: 'Shortlisted'
    }
  ];

  // Close drill-down drawer when user presses Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && activeDrilldown) {
        setActiveDrilldown(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDrilldown]);

  // Filtered Department List based on search and selected department
  const filteredDepartments = useMemo(() => {
    return departmentAnalyticsList.filter(dept => {
      const matchesDept = selectedDept === 'All Departments' || dept.name.toLowerCase().includes(selectedDept.toLowerCase());
      const matchesSearch = !searchTerm || dept.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesDept && matchesSearch;
    });
  }, [selectedDept, searchTerm]);

  // Export to CSV Handler
  const handleExportCSV = () => {
    const csvRows = [];
    csvRows.push(['TalentPulse HRMS - Recruitment & Hiring Analytics Report']);
    csvRows.push([`Generated On: ${new Date().toLocaleString()}`, `Period: ${dateRange}`, `Department: ${selectedDept}`]);
    csvRows.push([]);
    csvRows.push(['--- 1. EXECUTIVE KPI SUMMARY ---']);
    csvRows.push(['Metric', 'Value', 'Benchmark / Target', 'Trend']);
    csvRows.push(['Total Requisitions', '28', '25 Target', '+12% vs last month']);
    csvRows.push(['Active Vacancies', '14', '15 Target', '+5% vs target']);
    csvRows.push(['Average Time to Hire', '18 Days', '30 Days SLA', '-4 Days vs SLA']);
    csvRows.push(['Offer Acceptance Rate', '88.5%', '85% Target', '+3.2% vs Q2']);
    csvRows.push([]);
    csvRows.push(['--- 2. RECRUITMENT FUNNEL CONVERSION ---']);
    csvRows.push(['Funnel Stage', 'Candidate Count', 'Stage Conversion %', 'Drop-off %']);
    funnelStages.forEach(s => {
      csvRows.push([s.stage, s.count, `${s.percent}%`, s.drop]);
    });
    csvRows.push([]);
    csvRows.push(['--- 3. CANDIDATE SOURCE EFFECTIVENESS ---']);
    csvRows.push(['Source Channel', 'Share %', 'Candidate Volume']);
    sourceAnalyticsData.forEach(src => {
      csvRows.push([src.name, `${src.value}%`, src.count]);
    });
    csvRows.push([]);
    csvRows.push(['--- 4. DEPARTMENT HIRING PERFORMANCE ---']);
    csvRows.push(['Department', 'Requisitioned', 'Filled', 'Open', 'Avg TAT', 'Budget Utilized', 'SLA Status', 'Completion %']);
    departmentAnalyticsList.forEach(d => {
      csvRows.push([d.name, d.requisitioned, d.filled, d.open, d.avgTat, d.budget, d.slaStatus, `${d.completionRate}%`]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.map(item => `"${item}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TalentPulse_Recruitment_Analytics_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onToast) onToast('Analytics report exported as CSV successfully!');
  };

  // Export to PDF / Print Handler
  const handleExportPDF = () => {
    if (onToast) onToast('Opening print dialog for executive PDF report...');
    setTimeout(() => {
      window.print();
    }, 300);
  };

  // KPI Drill-down Handlers
  const handleOpenKpiDrilldown = (metricKey) => {
    switch (metricKey) {
      case 'requisitions':
        setActiveDrilldown({
          type: 'KPI',
          title: 'Total Requisitions Drill-down',
          subtitle: 'Detailed list of 28 open and processed requisitions across units.',
          value: '28',
          label: 'Total Requisitions Active in Q3/Q4 2026',
          items: [
            { title: 'JR-2026-001: Senior Software Engineer', meta: 'IT • 2 Openings • Target: Nov 01, 2026 • High Priority' },
            { title: 'JR-2026-004: Plant Operator (Solvent Unit)', meta: 'Plant Operations • 2 Openings • Target: Nov 15, 2026 • Urgent' },
            { title: 'JR-2026-008: QA Lead (Automated Testing)', meta: 'Quality • 1 Opening • Target: Oct 30, 2026 • On Track' },
            { title: 'JR-2026-012: Regional HR Generalist', meta: 'Human Resources • 1 Opening • Target: Nov 10, 2026 • On Track' },
            { title: 'JR-2026-015: Supply Chain Procurement Analyst', meta: 'Supply Chain • 1 Opening • Target: Nov 20, 2026 • Medium Priority' }
          ]
        });
        break;
      case 'vacancies':
        setActiveDrilldown({
          type: 'KPI',
          title: 'Active Vacancies Drill-down',
          subtitle: 'Positions currently actively sourcing or undergoing interviews.',
          value: '14',
          label: 'Current Unfilled Headcount across all facilities',
          items: [
            { title: 'Senior Backend Engineer (Java/Spring)', meta: 'IT • 3 positions • In Interview Stage' },
            { title: 'Chemical Refining Supervisor', meta: 'Plant Operations • 2 positions • Sourcing Phase' },
            { title: 'Boiler & Silo Certified Operator', meta: 'Plant Operations • 4 positions • Screening Candidates' },
            { title: 'Quality Assurance Inspector', meta: 'Quality • 2 positions • Final Evaluation' },
            { title: 'Statutory Compliance Officer', meta: 'Human Resources • 1 position • Offer Pending' }
          ]
        });
        break;
      case 'tat':
        setActiveDrilldown({
          type: 'KPI',
          title: 'Average Time to Hire (TAT)',
          subtitle: 'Enterprise turnaround speed benchmarked against the 30-day SLA.',
          value: '18 Days',
          label: 'Overall Average TAT (Industry standard is 30 days)',
          items: [
            { title: 'Engineering & IT', meta: 'Avg: 16 Days • 12 Hires • 100% SLA Adherence' },
            { title: 'Plant Operations', meta: 'Avg: 14 Days • 9 Hires • 100% SLA Adherence' },
            { title: 'Human Resources', meta: 'Avg: 19 Days • 3 Hires • On Track' },
            { title: 'Quality & Regulatory', meta: 'Avg: 21 Days • 4 Hires • On Track' },
            { title: 'Supply Chain & Logistics', meta: 'Avg: 24 Days • 3 Hires • At Risk (>20 days)' }
          ]
        });
        break;
      case 'offer_rate':
        setActiveDrilldown({
          type: 'KPI',
          title: 'Offer Acceptance Rate',
          subtitle: 'Percentage of job offers extended that resulted in confirmed acceptance.',
          value: '88.5%',
          label: 'Offer Acceptance Velocity in Q3-Q4 2026',
          items: [
            { title: 'Accepted Offers', meta: '18 of 20 Candidates accepted formal compensation packages' },
            { title: 'Declined Offers', meta: '2 Candidates declined due to counter-offers from tech consulting firms' },
            { title: 'Avg. Decision Time', meta: 'Candidates accepted within an average of 2.4 days after offer dispatch' }
          ]
        });
        break;
      default:
        break;
    }
  };

  // Funnel Stage Drilldown
  const handleFunnelStageClick = (stage) => {
    setActiveDrilldown({
      type: 'FUNNEL',
      title: `Recruitment Stage: ${stage.stage}`,
      subtitle: `${stage.count} candidates currently in or passed through the ${stage.stage} milestone.`,
      value: `${stage.count}`,
      label: `Conversion Rate: ${stage.percent}% | Drop-off: ${stage.drop}`,
      items: [
        { title: `Candidates in ${stage.stage}`, meta: `Stage Health: Optimal • SLA Benchmark: Met • Channel: Multiple Sources` },
        { title: 'Process TAT at this stage', meta: 'Average candidate stays 2.8 business days before milestone transition' }
      ]
    });
  };

  // Department Drilldown
  const handleDeptClick = (dept) => {
    setActiveDrilldown({
      type: 'DEPARTMENT',
      title: `${dept.name} Hiring Breakdown`,
      subtitle: `Comprehensive headcount and recruitment status for ${dept.name}.`,
      value: `${dept.filled} / ${dept.requisitioned}`,
      label: `Positions Filled (${dept.completionRate}% completion) | ${dept.open} Open Vacancies`,
      items: [
        { title: `Budget Allocated & Utilized`, meta: `${dept.budget} total budgeted compensation` },
        { title: `Average Time to Hire`, meta: `${dept.avgTat} turnaround speed from requisition approval` },
        { title: `SLA Adherence Status`, meta: `Status: ${dept.slaStatus.replace('_', ' ')}` }
      ]
    });
  };

  return (
    <div className="urja-reports-root">
      {/* 1. Header Section */}
      <header className="urja-reports-header">
        <div className="urja-reports-header-left">
          <div className="urja-reports-header-icon">
            <i className="bi bi-graph-up-arrow"></i>
          </div>
          <div>
            <h1 className="urja-reports-title">Reports & Analytics</h1>
            <p className="urja-reports-subtitle">
              Comprehensive recruitment velocity, hiring funnel analytics, and departmental staffing intelligence.
            </p>
          </div>
        </div>

        <div className="urja-reports-actions">
          <button
            type="button"
            className="urja-btn-export"
            onClick={handleExportCSV}
            title="Download full analytics as CSV"
          >
            <i className="bi bi-filetype-csv text-success"></i>
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            className="urja-btn-export primary"
            onClick={handleExportPDF}
            title="Print or save executive summary as PDF"
          >
            <i className="bi bi-printer"></i>
            <span>Export PDF</span>
          </button>
        </div>
      </header>

      {/* 2. Controls & Filter Bar */}
      <section className="urja-reports-filter-bar" aria-label="Reports Filters">
        <div className="urja-filter-group">
          <div className="urja-filter-item">
            <i className="bi bi-calendar3"></i>
            <span>Date Range:</span>
            <select
              className="urja-filter-select"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="Last 30 Days">Last 30 Days</option>
              <option value="Q3 2026">Q3 2026 (Jul - Sep)</option>
              <option value="Q4 2026">Q4 2026 (Oct - Dec)</option>
              <option value="Year-to-Date">Year-to-Date 2026</option>
              <option value="All Time">All Historical Data</option>
            </select>
          </div>

          <div className="urja-filter-item">
            <i className="bi bi-building"></i>
            <span>Department:</span>
            <select
              className="urja-filter-select"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
            >
              <option value="All Departments">All Departments</option>
              <option value="Engineering & IT">Engineering & IT</option>
              <option value="Plant Operations">Plant Operations</option>
              <option value="Quality & Compliance">Quality & Compliance</option>
              <option value="Human Resources">Human Resources</option>
              <option value="Supply Chain & Logistics">Supply Chain & Logistics</option>
              <option value="Finance & Accounts">Finance & Accounts</option>
            </select>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <div className="urja-search-box">
            <i className="bi bi-search"></i>
            <input
              type="text"
              className="urja-search-input"
              placeholder="Search department, role, metric..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {(selectedDept !== 'All Departments' || searchTerm || dateRange !== 'Last 30 Days') && (
            <button
              type="button"
              className="urja-filter-reset-btn"
              onClick={() => {
                setSelectedDept('All Departments');
                setSearchTerm('');
                setDateRange('Last 30 Days');
              }}
              title="Reset all filters"
            >
              <i className="bi bi-arrow-counterclockwise me-1"></i> Reset
            </button>
          )}
        </div>
      </section>

      {/* 3. 4 Executive KPI Cards */}
      <section className="urja-kpi-grid" aria-label="Key Performance Indicators">
        {/* KPI 1: Total Requisitions */}
        <div
          className="urja-kpi-card"
          onClick={() => handleOpenKpiDrilldown('requisitions')}
          title="Click to view requisitions breakdown"
        >
          <div className="urja-kpi-top">
            <div>
              <div className="urja-kpi-label">Total Requisitions</div>
              <div className="urja-kpi-val">28</div>
            </div>
            <div className="urja-kpi-icon-pill blue">
              <i className="bi bi-briefcase"></i>
            </div>
          </div>
          <div className="urja-kpi-bottom">
            <span className="urja-kpi-trend positive">
              <i className="bi bi-arrow-up-right"></i> +12%
            </span>
            <span className="urja-kpi-subtext">vs last month</span>
            {/* SVG Sparkline */}
            <svg className="urja-sparkline-svg" viewBox="0 0 76 28">
              <path
                d="M 2 24 L 16 18 L 30 20 L 44 12 L 58 14 L 74 4"
                fill="none"
                stroke="#2563EB"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* KPI 2: Active Vacancies */}
        <div
          className="urja-kpi-card"
          onClick={() => handleOpenKpiDrilldown('vacancies')}
          title="Click to view open vacancies breakdown"
        >
          <div className="urja-kpi-top">
            <div>
              <div className="urja-kpi-label">Active Vacancies</div>
              <div className="urja-kpi-val">14</div>
            </div>
            <div className="urja-kpi-icon-pill orange">
              <i className="bi bi-person-plus"></i>
            </div>
          </div>
          <div className="urja-kpi-bottom">
            <span className="urja-kpi-trend positive">
              <i className="bi bi-arrow-up-right"></i> +5%
            </span>
            <span className="urja-kpi-subtext">vs target limit</span>
            {/* SVG Sparkline */}
            <svg className="urja-sparkline-svg" viewBox="0 0 76 28">
              <path
                d="M 2 22 L 16 20 L 30 14 L 44 16 L 58 8 L 74 6"
                fill="none"
                stroke="#EA580C"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* KPI 3: Average Time to Hire */}
        <div
          className="urja-kpi-card"
          onClick={() => handleOpenKpiDrilldown('tat')}
          title="Click to view TAT turnaround speed details"
        >
          <div className="urja-kpi-top">
            <div>
              <div className="urja-kpi-label">Avg. Time to Hire</div>
              <div className="urja-kpi-val">18 <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>Days</span></div>
            </div>
            <div className="urja-kpi-icon-pill green">
              <i className="bi bi-stopwatch"></i>
            </div>
          </div>
          <div className="urja-kpi-bottom">
            <span className="urja-kpi-trend positive">
              <i className="bi bi-arrow-down-right"></i> -4 Days
            </span>
            <span className="urja-kpi-subtext">better than 30d SLA</span>
            {/* SVG Sparkline */}
            <svg className="urja-sparkline-svg" viewBox="0 0 76 28">
              <path
                d="M 2 8 L 16 12 L 30 10 L 44 18 L 58 16 L 74 22"
                fill="none"
                stroke="#087B55"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* KPI 4: Offer Acceptance Rate */}
        <div
          className="urja-kpi-card"
          onClick={() => handleOpenKpiDrilldown('offer_rate')}
          title="Click to view offer acceptance details"
        >
          <div className="urja-kpi-top">
            <div>
              <div className="urja-kpi-label">Offer Acceptance Rate</div>
              <div className="urja-kpi-val">88.5%</div>
            </div>
            <div className="urja-kpi-icon-pill emerald">
              <i className="bi bi-patch-check"></i>
            </div>
          </div>
          <div className="urja-kpi-bottom">
            <span className="urja-kpi-trend positive">
              <i className="bi bi-arrow-up-right"></i> +3.2%
            </span>
            <span className="urja-kpi-subtext">vs previous quarter</span>
            {/* SVG Sparkline */}
            <svg className="urja-sparkline-svg" viewBox="0 0 76 28">
              <path
                d="M 2 20 L 16 18 L 30 14 L 44 12 L 58 6 L 74 4"
                fill="none"
                stroke="#16A36A"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </section>

      {/* 4. Interactive Graphs Row 1: Monthly Trend & Recruitment Funnel */}
      <section className="urja-charts-grid-row">
        {/* Graph A: Monthly Hiring Performance (Enterprise Two-Part Layout) */}
        <div className="urja-hiring-perf-card">
          {/* Dark Green Gradient Header */}
          <div className="urja-hiring-perf-header">
            <div className="urja-hiring-perf-header-left">
              <div className="urja-hiring-perf-header-icon">
                <i className="bi bi-bar-chart-line-fill"></i>
              </div>
              <div className="urja-hiring-perf-header-titles">
                <h3 className="urja-hiring-perf-header-title">Monthly Hiring Performance</h3>
                <span className="urja-hiring-perf-header-subtitle">
                  Applications, Interviews and Joined candidates trend
                </span>
              </div>
            </div>
            <div className="urja-hiring-perf-header-right">
              <span className="urja-hiring-perf-badge">Line &amp; Bar</span>
              <button
                type="button"
                className="urja-hiring-perf-icon-btn"
                title="Performance Metrics Guide"
                onClick={() => setShowPerfInfo(true)}
              >
                <i className="bi bi-info-circle"></i>
              </button>
              <button
                type="button"
                className="urja-hiring-perf-icon-btn"
                title="Expand to Full View"
                onClick={() => setIsPerfExpanded(true)}
              >
                <i className="bi bi-arrows-angle-expand"></i>
              </button>
            </div>
          </div>

          {/* Two-Column Card Body: 3 Summary Cards + Combination Chart */}
          <div className="urja-hiring-perf-body">
            {/* Left Column: 3 Vertical Summary Cards */}
            <div className="urja-hiring-perf-summary-list">
              {/* Metric 1: Applications */}
              <div
                className="urja-perf-summary-card"
                onClick={() => handleSummaryCardClick('APPLICATIONS')}
                title="Click to view full Applications breakdown"
              >
                <div className="urja-perf-summary-icon-box">
                  <i className="bi bi-briefcase-fill"></i>
                </div>
                <div className="urja-perf-summary-info">
                  <span className="urja-perf-summary-label">Applications</span>
                  <div className="urja-perf-summary-stat-row">
                    <span className="urja-perf-summary-val">1,759</span>
                    <span className="urja-perf-summary-trend">
                      <i className="bi bi-arrow-up-right"></i> +14.2%
                    </span>
                  </div>
                </div>
              </div>

              {/* Metric 2: Interviews */}
              <div
                className="urja-perf-summary-card"
                onClick={() => handleSummaryCardClick('INTERVIEWS')}
                title="Click to view full Interviews breakdown"
              >
                <div className="urja-perf-summary-icon-box">
                  <i className="bi bi-people-fill"></i>
                </div>
                <div className="urja-perf-summary-info">
                  <span className="urja-perf-summary-label">Interviews</span>
                  <div className="urja-perf-summary-stat-row">
                    <span className="urja-perf-summary-val">467</span>
                    <span className="urja-perf-summary-trend">
                      <i className="bi bi-arrow-up-right"></i> +8.9%
                    </span>
                  </div>
                </div>
              </div>

              {/* Metric 3: Candidates Joined */}
              <div
                className="urja-perf-summary-card"
                onClick={() => handleSummaryCardClick('JOINED')}
                title="Click to view full Onboarding breakdown"
              >
                <div className="urja-perf-summary-icon-box">
                  <i className="bi bi-person-check-fill"></i>
                </div>
                <div className="urja-perf-summary-info">
                  <span className="urja-perf-summary-label">Candidates Joined</span>
                  <div className="urja-perf-summary-stat-row">
                    <span className="urja-perf-summary-val">100</span>
                    <span className="urja-perf-summary-trend">
                      <i className="bi bi-arrow-up-right"></i> +11.1%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Recharts Combination Chart */}
            <div className="urja-perf-chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={monthlyHiringData}
                  margin={{ top: 16, right: 14, bottom: 0, left: -16 }}
                  onClick={(e) => {
                    if (e && e.activePayload && e.activePayload.length > 0) {
                      const row = e.activePayload[0].payload;
                      setActiveDrilldown({
                        type: 'MONTHLY',
                        title: `${row.month} Hiring Breakdown`,
                        subtitle: `Full pipeline metrics recorded during ${row.month}.`,
                        value: `${row.joined} Joined`,
                        label: `${row.applications} Applications • ${row.interviews} Interviews`,
                        items: [
                          { title: 'Total Sourced Applicants', meta: `${row.applications} candidate applications received` },
                          { title: 'Interviews Administered', meta: `${row.interviews} panels conducted across technical and managerial stages` },
                          { title: 'Final Candidates Onboarded', meta: `${row.joined} new joiners successfully integrated` }
                        ]
                      });
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EDF2F7" />
                  <XAxis
                    dataKey="month"
                    stroke="#718096"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                  />
                  <YAxis
                    domain={[0, 340]}
                    ticks={[0, 85, 170, 255, 340]}
                    stroke="#718096"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomPerfTooltip />} />
                  <Legend content={renderCustomLegend} />
                  <Bar
                    dataKey="applications"
                    name="Applications"
                    fill="#087B55"
                    radius={[6, 6, 0, 0]}
                    barSize={24}
                    label={renderCustomBarLabel}
                  />
                  <Bar
                    dataKey="interviews"
                    name="Interviews"
                    fill="#16A36A"
                    radius={[6, 6, 0, 0]}
                    barSize={22}
                    label={renderCustomBarLabel}
                  />
                  <Line
                    type="monotone"
                    dataKey="joined"
                    name="Candidates Joined"
                    stroke="#FF6B35"
                    strokeWidth={2.5}
                    dot={renderCustomLineDot}
                    activeDot={renderActiveLineDot}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Graph B: Recruitment Funnel */}
        <div className="urja-chart-card">
          <div className="urja-chart-header">
            <div className="urja-chart-title-box">
              <i className="bi bi-funnel-fill text-success fs-5"></i>
              <h2 className="urja-chart-title">Recruitment Funnel</h2>
              <span className="urja-chart-badge">6 Stages</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span className="urja-chart-hint">Click stage for candidates</span>
              <button
                type="button"
                className="btn btn-sm btn-link p-0 text-muted"
                style={{ fontSize: '0.85rem', color: '#718096' }}
                title="Expand Funnel"
              >
                <i className="bi bi-arrows-angle-expand"></i>
              </button>
            </div>
          </div>

          <div className="urja-funnel-container">
            {funnelStages.map((stg, idx) => (
              <div
                key={idx}
                className="urja-funnel-step"
                onClick={() => handleFunnelStageClick(stg)}
                title={`Click to view candidates in ${stg.stage} stage`}
              >
                <div className="urja-funnel-step-left">
                  <div className="urja-funnel-step-number">{idx + 1}</div>
                  <div className="urja-funnel-step-name">{stg.stage}</div>
                </div>

                <div className="urja-funnel-step-bar-wrap">
                  <div className="urja-funnel-step-bar-bg">
                    <div
                      className="urja-funnel-step-bar-fill"
                      style={{ width: `${stg.percent}%`, backgroundColor: stg.color }}
                    ></div>
                  </div>
                </div>

                <div className="urja-funnel-step-right">
                  <span className="urja-funnel-step-count">{stg.count}</span>
                  <span className="urja-funnel-step-conv">{stg.percent}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Interactive Graphs Row 2: Candidate Source Analytics & Department Hiring */}
      <section className="urja-charts-grid-row">
        {/* Graph C: Candidate Source Analytics (Interactive Donut Recharts) */}
        <div className="urja-chart-card">
          <div className="urja-chart-header">
            <div className="urja-chart-title-box">
              <i className="bi bi-pie-chart-fill text-success fs-5"></i>
              <h2 className="urja-chart-title">Candidate Source Analytics</h2>
              <span className="urja-chart-badge">Donut</span>
            </div>
            <span className="urja-chart-hint">340 Total Applicants</span>
          </div>

          <div className="row align-items-center">
            <div className="col-sm-6" style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceAnalyticsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    onClick={(entry) => {
                      setActiveDrilldown({
                        type: 'SOURCE',
                        title: `Channel: ${entry.name}`,
                        subtitle: `${entry.count} candidate submissions received via ${entry.name}.`,
                        value: `${entry.value}%`,
                        label: `Volume: ${entry.count} Candidates`,
                        items: [
                          { title: 'Channel Quality Score', meta: 'High interview conversion and low drop-off rate' },
                          { title: 'Retention SLA', meta: 'Average 1-year retention adherence at 94%' }
                        ]
                      });
                    }}
                  >
                    {sourceAnalyticsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val, name, props) => [`${val}% (${props.payload.count} applicants)`, name]}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
                      fontSize: '0.82rem'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="col-sm-6">
              <div className="d-flex flex-column gap-2">
                {sourceAnalyticsData.map((src, idx) => (
                  <div
                    key={idx}
                    className="d-flex align-items-center justify-content-between p-2 rounded"
                    style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', cursor: 'pointer' }}
                    onClick={() => {
                      setActiveDrilldown({
                        type: 'SOURCE',
                        title: `Channel: ${src.name}`,
                        subtitle: `${src.count} candidate submissions received via ${src.name}.`,
                        value: `${src.value}%`,
                        label: `Volume: ${src.count} Candidates`,
                        items: [
                          { title: 'Channel Quality Score', meta: 'High interview conversion and low drop-off rate' },
                          { title: 'Retention SLA', meta: 'Average 1-year retention adherence at 94%' }
                        ]
                      });
                    }}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          backgroundColor: src.color,
                          display: 'inline-block'
                        }}
                      ></span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#26364A' }}>{src.name}</span>
                    </div>
                    <div className="text-end">
                      <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#087B55' }}>{src.value}%</span>
                      <span style={{ fontSize: '0.74rem', color: '#718096', marginLeft: 4 }}>({src.count})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Graph D: Department Hiring Analytics (Horizontal Visual Bars) */}
        <div className="urja-chart-card">
          <div className="urja-chart-header">
            <div className="urja-chart-title-box">
              <i className="bi bi-building-check text-success fs-5"></i>
              <h2 className="urja-chart-title">Department Hiring Analytics</h2>
              <span className="urja-chart-badge">Horizontal Bars</span>
            </div>
            <span className="urja-chart-hint">Filled vs Open Vacancies</span>
          </div>

          <div className="urja-dept-analytics-list">
            {filteredDepartments.map((dept) => (
              <div
                key={dept.id}
                className="urja-dept-item"
                onClick={() => handleDeptClick(dept)}
                title={`Click to view details for ${dept.name}`}
              >
                <div className="urja-dept-item-top">
                  <span className="urja-dept-name">{dept.name}</span>
                  <span className="urja-dept-stats">
                    <strong>{dept.filled}</strong> Filled • <strong>{dept.open}</strong> Open ({dept.completionRate}%)
                  </span>
                </div>
                <div className="urja-dept-bar-group">
                  <div
                    className="urja-dept-bar-filled"
                    style={{ width: `${dept.completionRate}%` }}
                    title={`${dept.filled} Filled`}
                  ></div>
                  <div
                    className="urja-dept-bar-open"
                    style={{ width: `${100 - dept.completionRate}%` }}
                    title={`${dept.open} Open`}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Additional Sections: Recruitment Efficiency, Approval Analytics & Insights */}
      <section className="urja-insights-grid" aria-label="Efficiency and Insights">
        {/* Efficiency Metric */}
        <div className="urja-insight-card">
          <div className="urja-insight-icon-box">
            <i className="bi bi-lightning-charge"></i>
          </div>
          <div>
            <div className="urja-insight-title">Recruitment Velocity & Efficiency</div>
            <p className="urja-insight-desc">
              Average sourcing turnaround is <strong>6.2 days</strong>, with a cost-per-hire of <strong>₹24,500</strong>, exceeding corporate cost benchmarks by 18%.
            </p>
          </div>
        </div>

        {/* Approval Speed Metric */}
        <div className="urja-insight-card">
          <div className="urja-insight-icon-box">
            <i className="bi bi-shield-check"></i>
          </div>
          <div>
            <div className="urja-insight-title">Approval Workflow Turnaround</div>
            <p className="urja-insight-desc">
              Multi-tier approval resolution clocks at <strong>1.4 days</strong>. 94% of requisition and offer sign-offs clear without requisition revisions.
            </p>
          </div>
        </div>

        {/* Actionable Talent Insight */}
        <div className="urja-insight-card">
          <div className="urja-insight-icon-box">
            <i className="bi bi-lightbulb"></i>
          </div>
          <div>
            <div className="urja-insight-title">Actionable Talent Insights</div>
            <p className="urja-insight-desc">
              Employee referrals yield the highest 1-year retention (96%) and 4.2-day shorter interview-to-offer cycles across manufacturing plants.
            </p>
          </div>
        </div>
      </section>

      {/* 7. Department Performance Table */}
      <section className="urja-reports-table-card">
        <div className="urja-reports-table-header">
          <div>
            <h3 className="fw-bold text-dark mb-1" style={{ fontSize: '1.1rem' }}>
              Department Performance Scorecard
            </h3>
            <p className="text-muted small mb-0">
              Breakdown of headcount targets, actual hires, SLA compliance, and allocated salary budget.
            </p>
          </div>
          <span className="badge bg-light text-dark border px-3 py-2">
            Showing {filteredDepartments.length} Departments
          </span>
        </div>

        <div className="table-responsive">
          <table className="urja-reports-table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Target Headcount</th>
                <th>Filled Positions</th>
                <th>Open Vacancies</th>
                <th>Avg. TAT</th>
                <th>Budget Utilized</th>
                <th>SLA Compliance</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDepartments.map((dept) => (
                <tr
                  key={dept.id}
                  onClick={() => handleDeptClick(dept)}
                  title="Click to view full department audit drill-down"
                >
                  <td className="fw-bold">{dept.name}</td>
                  <td>{dept.requisitioned}</td>
                  <td className="text-success fw-bold">{dept.filled}</td>
                  <td className="text-primary fw-bold">{dept.open}</td>
                  <td>{dept.avgTat}</td>
                  <td>{dept.budget}</td>
                  <td>
                    <span className={`urja-badge-sla ${dept.slaStatus === 'ON_TRACK' ? 'on-track' : 'at-risk'}`}>
                      <i className={`bi ${dept.slaStatus === 'ON_TRACK' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'}`}></i>
                      <span>{dept.slaStatus === 'ON_TRACK' ? 'On Track' : 'At Risk'}</span>
                    </span>
                  </td>
                  <td className="text-end">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeptClick(dept);
                      }}
                    >
                      <i className="bi bi-eye me-1"></i> Drill-down
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 8. Recent Hiring Activity Feed */}
      <section className="urja-reports-table-card">
        <div className="urja-reports-table-header">
          <div>
            <h3 className="fw-bold text-dark mb-1" style={{ fontSize: '1.1rem' }}>
              Recent Hiring Activity
            </h3>
            <p className="text-muted small mb-0">
              Live updates on candidates cleared through offer generation, interviews, and joining dates.
            </p>
          </div>
        </div>

        <div className="p-3">
          <div className="d-flex flex-column gap-2">
            {recentActivities.map((act) => (
              <div
                key={act.id}
                className="d-flex align-items-center justify-content-between p-2 rounded"
                style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
              >
                <div className="d-flex align-items-center gap-3">
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      background: '#EAF7F0',
                      color: '#087B55',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem'
                    }}
                  >
                    {act.avatarText}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#26364A' }}>
                      {act.candidate} — <span style={{ fontWeight: 500, color: '#718096' }}>{act.role}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#718096' }}>
                      {act.dept} • {act.action}
                    </div>
                  </div>
                </div>
                <div className="text-end">
                  <span className="badge bg-light text-dark border me-2">{act.status}</span>
                  <small className="text-muted">{act.date}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          9. Right-Side Drill-down Drawer (Using React Portal directly into body)
          Clean white background, sharp text, no permanent blur, 100% accessible
          ========================================================================= */}
      {activeDrilldown && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="urja-reports-drawer-backdrop"
            onClick={() => setActiveDrilldown(null)}
            aria-hidden="true"
          />
          <aside
            className="urja-reports-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={activeDrilldown.title}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="urja-reports-drawer-header">
              <div className="urja-reports-drawer-title-box">
                <i className="bi bi-info-circle-fill text-success fs-5"></i>
                <div>
                  <h3 className="urja-reports-drawer-title">{activeDrilldown.title}</h3>
                  <small className="text-muted" style={{ fontSize: '0.78rem' }}>TalentPulse Analytics Drill-down</small>
                </div>
              </div>
              <button
                type="button"
                className="urja-reports-drawer-close-btn"
                onClick={() => setActiveDrilldown(null)}
                title="Close drawer"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            {/* Drawer Body */}
            <div className="urja-reports-drawer-body">
              {/* Highlight Box */}
              <div className="urja-drilldown-highlight-box">
                <div>
                  <div className="urja-drilldown-hl-val">{activeDrilldown.value}</div>
                  <div className="urja-drilldown-hl-label">{activeDrilldown.label}</div>
                </div>
                <i className="bi bi-graph-up text-success fs-3"></i>
              </div>

              <div>
                <div className="urja-drawer-subheading">Context & Summary</div>
                <p className="text-muted small mb-0">{activeDrilldown.subtitle}</p>
              </div>

              {/* Supporting Records List */}
              {activeDrilldown.items && activeDrilldown.items.length > 0 && (
                <div>
                  <div className="urja-drawer-subheading">Supporting Breakdown Records</div>
                  <div className="urja-drilldown-list">
                    {activeDrilldown.items.map((item, idx) => (
                      <div key={idx} className="urja-drilldown-card">
                        <div className="urja-drilldown-card-left">
                          <span className="urja-drilldown-card-title">{item.title}</span>
                          <span className="urja-drilldown-card-meta">{item.meta}</span>
                        </div>
                        <i className="bi bi-chevron-right text-muted small"></i>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Data Freshness Indicator */}
              <div className="p-3 bg-light rounded-3 text-muted small">
                <i className="bi bi-clock-history me-1 text-primary"></i>
                Data synced live with MySQL cloud database. Filtered by period: <strong>{dateRange}</strong>.
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="urja-reports-drawer-footer">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary px-3"
                onClick={() => setActiveDrilldown(null)}
              >
                Close Drawer
              </button>
              <button
                type="button"
                className="btn btn-sm btn-success px-3 fw-bold"
                onClick={() => {
                  if (onToast) onToast(`Exporting snapshot for ${activeDrilldown.title}...`);
                  handleExportCSV();
                }}
              >
                <i className="bi bi-download me-1"></i> Export Data
              </button>
            </div>
          </aside>
        </>,
        document.body
      )}

      {/* Information Guide Modal for Monthly Hiring Performance */}
      {showPerfInfo && createPortal(
        <div className="urja-perf-modal-backdrop" onClick={() => setShowPerfInfo(false)}>
          <div className="urja-info-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="urja-info-modal-header">
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-info-circle-fill text-success fs-5"></i>
                <h5 className="m-0 fw-bold text-dark">About Monthly Hiring Performance</h5>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowPerfInfo(false)}
                aria-label="Close"
              ></button>
            </div>
            <div className="urja-info-modal-body">
              <p className="text-secondary small mb-3">
                This analytics module tracks conversion velocity through all three key stages of talent acquisition over the past 6 months:
              </p>
              <div className="d-flex flex-column gap-2 mb-3">
                <div className="p-2 rounded bg-light border">
                  <div className="fw-bold text-success mb-1">
                    <i className="bi bi-inbox-fill me-1"></i> Applications (1,759 Total)
                  </div>
                  <div className="text-muted small">
                    All candidate profiles sourced through direct portals, campus drives, referrals, and recruitment agencies.
                  </div>
                </div>
                <div className="p-2 rounded bg-light border">
                  <div className="fw-bold text-success mb-1">
                    <i className="bi bi-people-fill me-1"></i> Interviews (467 Total)
                  </div>
                  <div className="text-muted small">
                    Evaluation panels conducted including technical rounds, managerial interviews, and HR fitment assessments.
                  </div>
                </div>
                <div className="p-2 rounded bg-light border">
                  <div className="fw-bold text-warning-emphasis mb-1" style={{ color: '#D9480F' }}>
                    <i className="bi bi-person-check-fill me-1"></i> Candidates Joined (100 Total)
                  </div>
                  <div className="text-muted small">
                    New employees who accepted offers and successfully completed Day 1 onboarding and plant deployment.
                  </div>
                </div>
              </div>
              <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                <i className="bi bi-lightbulb text-warning me-1"></i>
                Tip: Click any bar, line point, or left summary card to open the drill-down drawer with candidate breakdowns.
              </div>
            </div>
            <div className="urja-info-modal-footer">
              <button
                type="button"
                className="btn btn-sm btn-success px-4 fw-bold"
                onClick={() => setShowPerfInfo(false)}
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Expanded / Fullscreen View Modal for Monthly Hiring Performance */}
      {isPerfExpanded && createPortal(
        <div className="urja-perf-modal-backdrop" onClick={() => setIsPerfExpanded(false)}>
          <div className="urja-perf-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="urja-perf-modal-header">
              <div className="d-flex align-items-center gap-2">
                <div className="urja-hiring-perf-header-icon" style={{ background: '#087B55', width: 28, height: 28, fontSize: '0.9rem' }}>
                  <i className="bi bi-bar-chart-line-fill"></i>
                </div>
                <div>
                  <h5 className="m-0 fw-bold text-dark">Monthly Hiring Performance – Full Analytics</h5>
                  <span className="text-muted small">May 2026 – Oct 2026 detailed pipeline throughput</span>
                </div>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setIsPerfExpanded(false)}
                aria-label="Close"
              ></button>
            </div>
            <div className="urja-perf-modal-body">
              <div style={{ width: '100%', height: 360 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={monthlyHiringData}
                    margin={{ top: 20, right: 25, bottom: 5, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="month" stroke="#718096" fontSize={12} />
                    <YAxis domain={[0, 340]} ticks={[0, 85, 170, 255, 340]} stroke="#718096" fontSize={12} />
                    <Tooltip content={<CustomPerfTooltip />} />
                    <Legend content={renderCustomLegend} />
                    <Bar dataKey="applications" name="Applications" fill="#087B55" radius={[4, 4, 0, 0]} barSize={28} label={renderCustomBarLabel} />
                    <Bar dataKey="interviews" name="Interviews" fill="#16A36A" radius={[4, 4, 0, 0]} barSize={28} label={renderCustomBarLabel} />
                    <Line type="monotone" dataKey="joined" name="Candidates Joined" stroke="#FF6B35" strokeWidth={3} dot={renderCustomLineDot} activeDot={renderActiveLineDot} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Monthly breakdown table */}
              <div className="table-responsive mt-3">
                <table className="table table-sm table-bordered align-middle text-center small mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="text-start">Metric / Period</th>
                      {monthlyHiringData.map((d, i) => <th key={i}>{d.month}</th>)}
                      <th className="table-success">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="text-start fw-bold text-success">Applications</td>
                      {monthlyHiringData.map((d, i) => <td key={i}>{d.applications}</td>)}
                      <td className="fw-bold table-success">1,759</td>
                    </tr>
                    <tr>
                      <td className="text-start fw-bold text-primary">Interviews</td>
                      {monthlyHiringData.map((d, i) => <td key={i}>{d.interviews}</td>)}
                      <td className="fw-bold table-success">467</td>
                    </tr>
                    <tr>
                      <td className="text-start fw-bold text-danger">Candidates Joined</td>
                      {monthlyHiringData.map((d, i) => <td key={i}>{d.joined}</td>)}
                      <td className="fw-bold table-success">100</td>
                    </tr>
                    <tr>
                      <td className="text-start text-muted">Interview Conversion</td>
                      {monthlyHiringData.map((d, i) => <td key={i}>{((d.interviews / d.applications) * 100).toFixed(1)}%</td>)}
                      <td className="fw-bold table-success">26.5%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="urja-info-modal-footer">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary px-3 me-2"
                onClick={() => setIsPerfExpanded(false)}
              >
                Close View
              </button>
              <button
                type="button"
                className="btn btn-sm btn-success px-3 fw-bold"
                onClick={handleExportCSV}
              >
                <i className="bi bi-file-earmark-spreadsheet me-1"></i> Export Metrics CSV
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
