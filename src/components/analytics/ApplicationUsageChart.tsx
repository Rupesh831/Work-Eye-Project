import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { Monitor, Clock, TrendingUp, Activity } from 'lucide-react';
import { fetchAPI } from '../../config/api';

interface AppUsageData {
  appName: string;
  totalHours: number;
  activeHours: number;
  idleHours: number;
  percentage: number;
  windowCount: number;
  usageCount: number;
}

interface ApplicationUsageChartProps {
  deviceId: string;
  period?: 'today' | 'yesterday' | 'week' | 'month' | '90days' | 'all';
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export function ApplicationUsageChart({ deviceId, period = 'today' }: ApplicationUsageChartProps) {
  const [apps, setApps] = useState<AppUsageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(period);
  const [totalTime, setTotalTime] = useState(0);

  useEffect(() => {
    loadAppUsage();
    const interval = setInterval(loadAppUsage, 30000);
    return () => clearInterval(interval);
  }, [deviceId, selectedPeriod]);

  const loadAppUsage = async () => {
    try {
      setLoading(true);
      const data = await fetchAPI(`/api/analytics/app-usage/${deviceId}?period=${selectedPeriod}&limit=10`);
      
      if (data.success) {
        setApps(data.apps || []);
        setTotalTime(data.totalTrackedHours || 0);
      }
    } catch (error) {
      console.error('Failed to load app usage:', error);
    } finally {
      setLoading(false);
    }
  };

  const periods = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'week', label: 'Last 7 Days' },
    { value: 'month', label: 'Last 30 Days' },
    { value: '90days', label: 'Last 90 Days' },
    { value: 'all', label: 'All Time' }
  ];

  if (loading && apps.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-48"></div>
          <div className="h-64 bg-slate-100 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Monitor className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-slate-900 font-semibold">Application Usage Analysis</h3>
              <p className="text-slate-500">Time spent on different applications</p>
            </div>
          </div>

          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {periods.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        {/* Summary Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Total Time</span>
            </div>
            <p className="text-slate-900 text-2xl font-semibold">{totalTime.toFixed(1)}h</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <Activity className="w-4 h-4" />
              <span className="text-sm">Apps Used</span>
            </div>
            <p className="text-slate-900 text-2xl font-semibold">{apps.length}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
            <div className="flex items-center gap-2 text-purple-600 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Most Used</span>
            </div>
            <p className="text-slate-900 text-sm font-semibold truncate">{apps[0]?.appName || 'N/A'}</p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
            <div className="flex items-center gap-2 text-orange-600 mb-1">
              <Monitor className="w-4 h-4" />
              <span className="text-sm">Top App Time</span>
            </div>
            <p className="text-slate-900 text-2xl font-semibold">{apps[0]?.totalHours.toFixed(1) || '0'}h</p>
          </div>
        </div>

        {apps.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Monitor className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No application usage data for this period</p>
          </div>
        ) : (
          <>
            {/* Bar Chart - Time Breakdown */}
            <div className="mb-6">
              <h4 className="text-slate-700 font-medium mb-4">Time Breakdown by Application</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={apps}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="appName" 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    stroke="#64748b"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis stroke="#64748b" label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                    formatter={(value: number) => [`${value.toFixed(2)} hours`, '']}
                  />
                  <Legend />
                  <Bar dataKey="activeHours" fill="#10b981" name="Active Time" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="idleHours" fill="#f59e0b" name="Idle Time" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart and Detailed List */}
            <div className="grid grid-cols-2 gap-6">
              {/* Pie Chart - Usage Distribution */}
              <div>
                <h4 className="text-slate-700 font-medium mb-4">Usage Distribution</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={apps}
                      dataKey="percentage"
                      nameKey="appName"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry) => `${entry.appName}: ${entry.percentage}%`}
                      labelLine={false}
                    >
                      {apps.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`${value.toFixed(1)}%`, 'Usage']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Detailed Breakdown List */}
              <div>
                <h4 className="text-slate-700 font-medium mb-4">Detailed Breakdown</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {apps.map((app, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        ></div>
                        <div className="min-w-0 flex-1">
                          <p className="text-slate-900 font-medium truncate">{app.appName}</p>
                          <p className="text-slate-500 text-sm">{app.windowCount} windows opened</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-slate-900 font-semibold">{app.totalHours.toFixed(2)}h</p>
                        <p className="text-slate-500 text-sm">{app.percentage}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
