import { Download, FileText } from 'lucide-react';
import { fetchAPI } from '../../config/api';

interface PDFExportButtonProps {
  deviceId: string;
  userName: string;
  onExportStart?: () => void;
  onExportComplete?: () => void;
}

export function PDFExportButton({ deviceId, userName, onExportStart, onExportComplete }: PDFExportButtonProps) {
  const handleExport = async () => {
    try {
      if (onExportStart) onExportStart();

      // Fetch all export data
      const exportData = await fetchAPI(`/api/analytics/export-data/${deviceId}?range=30days`);
      const appUsageData = await fetchAPI(`/api/analytics/app-usage/${deviceId}?period=month&limit=20`);
      const historicalData = await fetchAPI(`/api/analytics/historical/${deviceId}?range=30days`);
      const dailySummary = await fetchAPI(`/api/analytics/daily-summary/${deviceId}?days=30`);

      // Generate HTML content for PDF
      const htmlContent = generatePDFHTML({
        ...exportData,
        appUsage: appUsageData,
        historical: historicalData,
        dailySummary: dailySummary
      }, userName);

      // Create a temporary window to print
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Wait for content to load then print
        setTimeout(() => {
          printWindow.print();
          if (onExportComplete) onExportComplete();
        }, 1000);
      }

    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert('Failed to generate PDF report. Please try again.');
      if (onExportComplete) onExportComplete();
    }
  };

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl font-medium"
    >
      <Download className="w-5 h-5" />
      <span>Export PDF Report</span>
    </button>
  );
}

function generatePDFHTML(data: any, userName: string): string {
  const now = new Date().toLocaleString();
  
  return `
<!DOCTYPE html>
<html>
<head>
  <title>WorkEye Analytics Report - ${userName}</title>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 40px;
      color: #1e293b;
      background: white;
    }
    
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #3b82f6;
    }
    
    .header h1 {
      color: #1e293b;
      font-size: 32px;
      margin-bottom: 10px;
    }
    
    .header .subtitle {
      color: #64748b;
      font-size: 18px;
    }
    
    .header .meta {
      color: #94a3b8;
      font-size: 14px;
      margin-top: 10px;
    }
    
    .section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    
    .section-title {
      font-size: 24px;
      color: #1e293b;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e2e8f0;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .stat-card {
      padding: 20px;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    }
    
    .stat-card .label {
      font-size: 14px;
      color: #64748b;
      margin-bottom: 8px;
    }
    
    .stat-card .value {
      font-size: 28px;
      font-weight: bold;
      color: #1e293b;
    }
    
    .stat-card .unit {
      font-size: 16px;
      color: #64748b;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    
    table th {
      background: #f1f5f9;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #1e293b;
      border-bottom: 2px solid #e2e8f0;
    }
    
    table td {
      padding: 12px;
      border-bottom: 1px solid #e2e8f0;
      color: #475569;
    }
    
    table tr:hover {
      background: #f8fafc;
    }
    
    .app-row {
      display: flex;
      justify-content: space-between;
      padding: 12px;
      margin-bottom: 8px;
      border-radius: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
    }
    
    .app-name {
      font-weight: 600;
      color: #1e293b;
    }
    
    .app-time {
      color: #3b82f6;
      font-weight: 600;
    }
    
    .productivity-indicator {
      display: inline-block;
      width: 100px;
      height: 20px;
      background: #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
      position: relative;
    }
    
    .productivity-bar {
      height: 100%;
      background: linear-gradient(90deg, #10b981 0%, #059669 100%);
      transition: width 0.3s ease;
    }
    
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 2px solid #e2e8f0;
      text-align: center;
      color: #94a3b8;
      font-size: 14px;
    }
    
    @media print {
      body {
        padding: 20px;
      }
      
      .section {
        page-break-inside: avoid;
      }
      
      .stats-grid {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 WorkEye Analytics Report</h1>
    <div class="subtitle">Employee Activity & Productivity Analysis</div>
    <div class="meta">
      <strong>Employee:</strong> ${userName} | 
      <strong>Device:</strong> ${data.deviceId} | 
      <strong>Generated:</strong> ${now}
    </div>
  </div>

  <!-- Current Status Section -->
  <div class="section">
    <h2 class="section-title">Current Status Overview</h2>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="label">Screen Time</div>
        <div class="value">${data.currentStatus?.screenHours || 0}<span class="unit">h</span></div>
      </div>
      <div class="stat-card">
        <div class="label">Active Time</div>
        <div class="value">${data.currentStatus?.activeHours || 0}<span class="unit">h</span></div>
      </div>
      <div class="stat-card">
        <div class="label">Idle Time</div>
        <div class="value">${data.currentStatus?.idleHours || 0}<span class="unit">h</span></div>
      </div>
      <div class="stat-card">
        <div class="label">Productivity</div>
        <div class="value">${data.currentStatus?.productivity || 0}<span class="unit">%</span></div>
      </div>
    </div>
  </div>

  <!-- Application Usage Section -->
  <div class="section">
    <h2 class="section-title">Top Applications (Last 30 Days)</h2>
    ${data.appUsage?.apps?.slice(0, 15).map((app: any) => `
      <div class="app-row">
        <div>
          <div class="app-name">${app.appName}</div>
          <div style="font-size: 12px; color: #64748b;">${app.windowCount} windows opened</div>
        </div>
        <div style="text-align: right;">
          <div class="app-time">${app.totalHours.toFixed(2)}h</div>
          <div style="font-size: 12px; color: #64748b;">${app.percentage}%</div>
        </div>
      </div>
    `).join('') || '<p>No application data available</p>'}
  </div>

  <!-- Daily Summary Section -->
  <div class="section">
    <h2 class="section-title">Daily Activity Summary (Last 30 Days)</h2>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Day</th>
          <th>Screen Time</th>
          <th>Active Time</th>
          <th>Productivity</th>
          <th>Apps Used</th>
          <th>Screenshots</th>
        </tr>
      </thead>
      <tbody>
        ${data.dailySummary?.summaries?.slice(0, 30).map((day: any) => `
          <tr>
            <td>${day.displayDate}</td>
            <td>${day.dayName}</td>
            <td>${day.screenHours}h</td>
            <td>${day.activeHours}h</td>
            <td>
              <div class="productivity-indicator">
                <div class="productivity-bar" style="width: ${day.productivity}%"></div>
              </div>
              ${day.productivity}%
            </td>
            <td>${day.uniqueApps}</td>
            <td>${day.screenshotCount}</td>
          </tr>
        `).join('') || '<tr><td colspan="7">No daily data available</td></tr>'}
      </tbody>
    </table>
  </div>

  <!-- Summary Statistics -->
  <div class="section">
    <h2 class="section-title">30-Day Summary Statistics</h2>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="label">Total Days Tracked</div>
        <div class="value">${data.dailySummary?.totalDays || 0}</div>
      </div>
      <div class="stat-card">
        <div class="label">Total Applications</div>
        <div class="value">${data.appUsage?.totalApps || 0}</div>
      </div>
      <div class="stat-card">
        <div class="label">Total Screen Time</div>
        <div class="value">${data.appUsage?.totalTrackedHours?.toFixed(1) || 0}<span class="unit">h</span></div>
      </div>
      <div class="stat-card">
        <div class="label">Avg Daily Productivity</div>
        <div class="value">${
          data.dailySummary?.summaries?.length > 0 
            ? (data.dailySummary.summaries.reduce((sum: number, d: any) => sum + d.productivity, 0) / data.dailySummary.summaries.length).toFixed(1)
            : 0
        }<span class="unit">%</span></div>
      </div>
    </div>
  </div>

  <div class="footer">
    <p><strong>WorkEye Employee Tracking System</strong></p>
    <p>This report contains confidential employee activity data. Handle with care.</p>
    <p>Generated automatically by WorkEye Dashboard</p>
  </div>
</body>
</html>
  `;
}
