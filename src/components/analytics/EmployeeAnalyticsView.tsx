import { useState, useEffect } from 'react';
import { ArrowLeft, BarChart3, TrendingUp, Calendar, Download } from 'lucide-react';
import { ApplicationUsageChart } from './ApplicationUsageChart';
import { HistoricalAnalyticsChart } from './HistoricalAnalyticsChart';
import { PDFExportButton } from './PDFExportButton';
import { fetchAPI } from '../../config/api';

interface EmployeeAnalyticsViewProps {
  employee: any;
  onBack: () => void;
}

export function EmployeeAnalyticsView({ employee, onBack }: EmployeeAnalyticsViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'apps' | 'historical' | 'daily'>('overview');
  const [isExporting, setIsExporting] = useState(false);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'apps', label: 'Application Usage', icon: BarChart3 },
    { id: 'historical', label: 'Historical Trends', icon: TrendingUp },
    { id: 'daily', label: 'Daily Analysis', icon: Calendar }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Details</span>
          </button>

          <PDFExportButton
            deviceId={employee.device_id || employee.id}
            userName={employee.name}
            onExportStart={() => setIsExporting(true)}
            onExportComplete={() => setIsExporting(false)}
          />
        </div>

        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
              {employee.name.charAt(0).toUpperCase()}
            </div>
          </div>
          
          <div>
            <h2 className="text-slate-900 text-2xl font-bold mb-1">{employee.name} - Analytics Dashboard</h2>
            <p className="text-slate-500">Comprehensive activity analysis and reporting</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="flex border-b border-slate-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-4 transition-all font-medium ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <OverviewTab employee={employee} />
          )}

          {activeTab === 'apps' && (
            <ApplicationUsageChart 
              deviceId={employee.device_id || employee.id}
              period="month"
            />
          )}

          {activeTab === 'historical' && (
            <HistoricalAnalyticsChart
              deviceId={employee.device_id || employee.id}
              userName={employee.name}
            />
          )}

          {activeTab === 'daily' && (
            <DailyAnalysisTab deviceId={employee.device_id || employee.id} />
          )}
        </div>
      </div>

      {isExporting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-900 font-medium">Generating PDF Report...</p>
            <p className="text-slate-500 text-sm mt-2">This may take a few moments</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ employee }: { employee: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <h4 className="text-blue-100 mb-2">Current Screen Time</h4>
          <p className="text-4xl font-bold">{employee.screenTime?.toFixed(1) || '0'}h</p>
          <p className="text-blue-100 mt-2">Today's total</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
          <h4 className="text-green-100 mb-2">Active Time</h4>
          <p className="text-4xl font-bold">{employee.activeTime?.toFixed(1) || '0'}h</p>
          <p className="text-green-100 mt-2">
            {employee.screenTime > 0 ? Math.round((employee.activeTime / employee.screenTime) * 100) : 0}% of screen time
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
          <h4 className="text-purple-100 mb-2">Productivity</h4>
          <p className="text-4xl font-bold">{employee.productivity || 0}%</p>
          <p className="text-purple-100 mt-2">Current rating</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-8 border border-slate-200">
        <h3 className="text-slate-900 font-semibold mb-4">📊 Quick Analytics Summary</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h4 className="text-slate-700 font-medium mb-3">Available Reports</h4>
            <ul className="space-y-2 text-slate-600">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Application usage breakdown (today, yesterday, week, month, all time)
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Historical trends (last 7, 30, 90 days, year)
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                Daily activity summaries with productivity metrics
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                Comprehensive PDF export for all data
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-slate-700 font-medium mb-3">Navigation Guide</h4>
            <ul className="space-y-2 text-slate-600">
              <li className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-500" />
                <strong>Application Usage:</strong> See which apps are used most
              </li>
              <li className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <strong>Historical Trends:</strong> Track performance over time
              </li>
              <li className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-500" />
                <strong>Daily Analysis:</strong> Day-by-day breakdown
              </li>
              <li className="flex items-center gap-2">
                <Download className="w-4 h-4 text-orange-500" />
                <strong>Export PDF:</strong> Download complete report
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Daily Analysis Tab Component
function DailyAnalysisTab({ deviceId }: { deviceId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    loadDailySummary();
  }, [days, deviceId]);

  const loadDailySummary = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/daily-summary/${deviceId}?days=${days}`);
      const result = await response.json();
      if (result.success) {
        setData(result);
      }
    } catch (error) {
      console.error('Failed to load daily summary:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-500">Loading daily analysis...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-900 font-semibold">Daily Activity Breakdown</h3>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={7}>Last 7 Days</option>
          <option value={14}>Last 14 Days</option>
          <option value={30}>Last 30 Days</option>
          <option value={60}>Last 60 Days</option>
          <option value={90}>Last 90 Days</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Date</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Day</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Screen Time</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Active Time</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Productivity</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Apps Used</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Screenshots</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Work Duration</th>
            </tr>
          </thead>
          <tbody>
            {data?.summaries?.map((day: any, index: number) => (
              <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-900">{day.displayDate}</td>
                <td className="px-4 py-3 text-slate-600">{day.dayName}</td>
                <td className="px-4 py-3 text-slate-900 font-medium">{day.screenHours}h</td>
                <td className="px-4 py-3 text-green-600 font-medium">{day.activeHours}h</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-200 rounded-full h-2 w-20">
                      <div
                        className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                        style={{ width: `${day.productivity}%` }}
                      ></div>
                    </div>
                    <span className="text-slate-900 font-medium">{day.productivity}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-900">{day.uniqueApps}</td>
                <td className="px-4 py-3 text-slate-600">{day.screenshotCount}</td>
                <td className="px-4 py-3 text-slate-600">{day.workDuration}h</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!data?.summaries || data.summaries.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No daily data available for this period</p>
        </div>
      )}
    </div>
  );
}
