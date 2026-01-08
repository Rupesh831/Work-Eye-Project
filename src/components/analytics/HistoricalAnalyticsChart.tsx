import { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Calendar, BarChart3 } from 'lucide-react';
import { fetchAPI } from '../../config/api';

interface HistoricalDataPoint {
  date: string;
  displayDate: string;
  dayName: string;
  screenHours: number;
  activeHours: number;
  idleHours: number;
  productivity: number;
  activityCount: number;
  screenshotCount: number;
}

interface HistoricalAnalyticsChartProps {
  deviceId: string;
  userName: string;
}

export function HistoricalAnalyticsChart({ deviceId, userName }: HistoricalAnalyticsChartProps) {
  const [data, setData] = useState<HistoricalDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<'7days' | '30days' | '90days' | 'year'>('30days');

  useEffect(() => {
    loadHistoricalData();
  }, [deviceId, range]);

  const loadHistoricalData = async () => {
    try {
      setLoading(true);
      const response = await fetchAPI(`/api/analytics/historical/${deviceId}?range=${range}&granularity=day`);
      
      if (response.success) {
        setData(response.series || []);
      }
    } catch (error) {
      console.error('Failed to load historical data:', error);
    } finally {
      setLoading(false);
    }
  };

  const ranges = [
    { value: '7days', label: 'Last 7 Days' },
    { value: '30days', label: 'Last 30 Days' },
    { value: '90days', label: 'Last 90 Days' },
    { value: 'year', label: 'Last Year' }
  ];

  // Calculate statistics
  const stats = {
    avgScreenTime: data.length > 0 ? (data.reduce((sum, d) => sum + d.screenHours, 0) / data.length).toFixed(1) : '0',
    avgProductivity: data.length > 0 ? (data.reduce((sum, d) => sum + d.productivity, 0) / data.length).toFixed(1) : '0',
    totalDays: data.length,
    maxScreenTime: data.length > 0 ? Math.max(...data.map(d => d.screenHours)).toFixed(1) : '0'
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-64"></div>
          <div className="h-80 bg-slate-100 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-slate-900 font-semibold">Historical Analytics</h3>
            <p className="text-slate-500">Activity trends over time for {userName}</p>
          </div>
        </div>

        <select
          value={range}
          onChange={(e) => setRange(e.target.value as any)}
          className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          {ranges.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">Days Tracked</span>
          </div>
          <p className="text-slate-900 text-2xl font-semibold">{stats.totalDays}</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Avg Screen Time</span>
          </div>
          <p className="text-slate-900 text-2xl font-semibold">{stats.avgScreenTime}h</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
          <div className="flex items-center gap-2 text-purple-600 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Avg Productivity</span>
          </div>
          <p className="text-slate-900 text-2xl font-semibold">{stats.avgProductivity}%</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
          <div className="flex items-center gap-2 text-orange-600 mb-1">
            <BarChart3 className="w-4 h-4" />
            <span className="text-sm">Peak Day</span>
          </div>
          <p className="text-slate-900 text-2xl font-semibold">{stats.maxScreenTime}h</p>
        </div>
      </div>

      {/* Screen Time & Activity Chart */}
      <div className="mb-6">
        <h4 className="text-slate-700 font-medium mb-4">Screen Time & Activity Trends</h4>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorScreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="dayName" 
              stroke="#64748b"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              stroke="#64748b" 
              label={{ value: 'Hours', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
              formatter={(value: number) => `${value.toFixed(2)} hours`}
              labelFormatter={(label, payload) => {
                if (payload && payload[0]) {
                  return payload[0].payload.displayDate;
                }
                return label;
              }}
            />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="screenHours" 
              stroke="#3b82f6" 
              fillOpacity={1} 
              fill="url(#colorScreen)" 
              name="Screen Time"
            />
            <Area 
              type="monotone" 
              dataKey="activeHours" 
              stroke="#10b981" 
              fillOpacity={1} 
              fill="url(#colorActive)" 
              name="Active Time"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Productivity Trend */}
      <div>
        <h4 className="text-slate-700 font-medium mb-4">Productivity Trend</h4>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="dayName" 
              stroke="#64748b"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              stroke="#64748b"
              domain={[0, 100]}
              label={{ value: 'Productivity %', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
              formatter={(value: number) => `${value.toFixed(1)}%`}
              labelFormatter={(label, payload) => {
                if (payload && payload[0]) {
                  return payload[0].payload.displayDate;
                }
                return label;
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="productivity" 
              stroke="#8b5cf6" 
              strokeWidth={2}
              name="Productivity"
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {data.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No historical data available for this period</p>
        </div>
      )}
    </div>
  );
}
