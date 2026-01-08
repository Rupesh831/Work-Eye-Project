import { useState, useEffect } from 'react';
import { Users, Activity, Clock, TrendingUp, Camera, Zap } from 'lucide-react';

interface Employee {
  id: number;
  name: string;
  status: string;
  screenTime: number;
  productivity: number;
  screenshots: any[];
}

interface DashboardStatsProps {
  employees: Employee[];
}

export function DashboardStats({ employees }: DashboardStatsProps) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('https://backend-35m2.onrender.com/api/stats');
        const data = await response.json();
        if (data.success) {
          setStats(data.stats);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const totalEmployees = stats?.total_employees ?? employees.length;
  const activeNow = stats?.active_now ?? employees.filter(e => e.status === 'active').length;
  const activePercentage = totalEmployees > 0 ? Math.round((activeNow / totalEmployees) * 100) : 0;
  
  const totalScreenTime = employees.reduce((sum, e) => sum + (e.screenTime || 0), 0);
  const avgScreenTime = employees.length > 0 ? (totalScreenTime / employees.length).toFixed(1) : stats?.today?.average_screen_time?.toFixed(1) ?? '0.0';
  
  const totalActiveTime = employees.reduce((sum, e) => {
    const emp = e as any;
    return sum + (emp.activeTime || 0);
  }, 0);
  const activeTimeHours = employees.length > 0 ? (totalActiveTime / employees.length).toFixed(1) : stats?.today?.average_active_time?.toFixed(1) ?? '0.0';
  
  const totalProductivity = employees.reduce((sum, e) => sum + (e.productivity || 0), 0);
  const avgProductivity = employees.length > 0 ? Math.round(totalProductivity / employees.length) : stats?.today?.average_productivity ?? 0;
  
  const productivityChange = '+5%';
  
  const screenshotsToday = stats?.today?.total_screenshots ?? employees.reduce((sum, e) => {
    const count = (e as any).screenshotsCount ?? e.screenshots?.length ?? 0;
    return sum + count;
  }, 0);
  
  const peakHours = stats?.today?.peak_hours ?? '2-5 PM';

  if (loading && !employees.length) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-6">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-pulse">
            <div className="h-12 w-12 bg-slate-200 rounded-xl mb-4"></div>
            <div className="h-4 bg-slate-200 rounded mb-2"></div>
            <div className="h-8 bg-slate-200 rounded mb-2"></div>
            <div className="h-3 bg-slate-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-slate-500">Total Employees</p>
          <p className="text-slate-900 text-3xl font-semibold">{totalEmployees}</p>
          <p className="text-slate-500 text-sm">
            {activeNow} active, {totalEmployees - activeNow} inactive
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
            <Activity className="w-6 h-6 text-green-600" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-slate-500">Active Now</p>
          <p className="text-slate-900 text-3xl font-semibold">{activeNow}</p>
          <p className="text-slate-500 text-sm">{activePercentage}% of team</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6 text-purple-600" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-slate-500">Avg Screen Time</p>
          <p className="text-slate-900 text-3xl font-semibold">{avgScreenTime}h</p>
          <p className="text-slate-500 text-sm">{activeTimeHours}h active time</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-amber-600" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-slate-500">Avg Productivity</p>
          <p className="text-slate-900 text-3xl font-semibold">{avgProductivity}%</p>
          <p className="text-green-600 text-sm font-medium">{productivityChange} from yesterday</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-cyan-50 rounded-xl flex items-center justify-center">
            <Camera className="w-6 h-6 text-cyan-600" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-slate-500">Screenshots Today</p>
          <p className="text-slate-900 text-3xl font-semibold">{screenshotsToday}</p>
          <p className="text-slate-500 text-sm">Captured automatically</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center">
            <Zap className="w-6 h-6 text-rose-600" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-slate-500">Peak Hours</p>
          <p className="text-slate-900 text-3xl font-semibold">{peakHours}</p>
          <p className="text-slate-500 text-sm">Highest activity</p>
        </div>
      </div>
    </div>
  );
}
