import { useState, useEffect } from 'react';
import { ArrowLeft, Clock, Activity, Moon, Camera, History, BarChart3, Globe, ExternalLink, ChevronDown, RefreshCw } from 'lucide-react';
import { formatLastActivity } from '../utils/timeUtils';
import { formatScreenshotTime, formatActivityTime } from '../utils/timezoneUtils';
import { EmployeeAnalyticsView } from './analytics/EmployeeAnalyticsView';
import { fetchAPI } from '../config/api';

// Format time: show hours + minutes
function formatTime(hours: number): string {
  if (hours === 0) return '0m';
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

interface Employee {
  id: number;
  device_id?: string;
  name: string;
  avatar: string;
  role: string;
  status: string;
  screenTime: number;
  activeTime: number;
  idleTime: number;
  lastActivity: string;
  productivity: number;
  screenshots: any[];
  activities: any[];
}

interface EmployeeDetailViewProps {
  employee: Employee;
  onBack: () => void;
}

export function EmployeeDetailView({ employee, onBack }: EmployeeDetailViewProps) {
  // Add view state: 'details' or 'analytics'
  const [currentView, setCurrentView] = useState<'details' | 'analytics'>('details');
  
  // Activity log pagination state
  const [allActivities, setAllActivities] = useState<any[]>([]);
  const [displayedActivities, setDisplayedActivities] = useState<any[]>([]);
  const [activityOffset, setActivityOffset] = useState(0);
  const [activityLimit] = useState(10); // Load 10 at a time
  const [hasMoreActivities, setHasMoreActivities] = useState(true);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [totalActivities, setTotalActivities] = useState(0);

  // Website visits state
  const [websites, setWebsites] = useState<any[]>([]);
  const [loadingWebsites, setLoadingWebsites] = useState(false);
  const [websitePeriod, setWebsitePeriod] = useState<'today' | 'yesterday' | 'week' | 'month'>('today');
  
  // Ensure arrays are never undefined
  const screenshots = employee.screenshots || [];
  
  // Load initial activities
  useEffect(() => {
    loadActivities(0, true); // true = reset
    loadWebsiteVisits();
  }, [employee.device_id || employee.id]);

  // Reload websites when period changes
  useEffect(() => {
    loadWebsiteVisits();
  }, [websitePeriod]);

  const loadActivities = async (offset: number, reset: boolean = false) => {
    if (loadingActivities) return;
    
    try {
      setLoadingActivities(true);
      const deviceId = employee.device_id || employee.id;
      
      const response = await fetchAPI(
        `/api/activity-log?device_id=${deviceId}&offset=${offset}&limit=${activityLimit}`
      );

      if (response.success) {
        const newActivities = response.activities.map((a: any) => ({
          time: a.timestamp,
          action: a.window || 'Working',
          app: a.process || 'Active',
          isIdle: a.isIdle,
          isLocked: a.isLocked
        }));

        if (reset) {
          // Reset - replace all activities
          setAllActivities(newActivities);
          setDisplayedActivities(newActivities);
          setActivityOffset(activityLimit);
        } else {
          // Append - add more activities
          setAllActivities([...allActivities, ...newActivities]);
          setDisplayedActivities([...displayedActivities, ...newActivities]);
          setActivityOffset(offset + activityLimit);
        }

        setTotalActivities(response.total || 0);
        setHasMoreActivities(response.hasMore || false);
      }
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setLoadingActivities(false);
    }
  };

  const loadWebsiteVisits = async () => {
    try {
      setLoadingWebsites(true);
      const deviceId = employee.device_id || employee.id;
      
      const response = await fetchAPI(
        `/api/website-visits/${deviceId}?period=${websitePeriod}&limit=20`
      );

      if (response.success) {
        setWebsites(response.websites || []);
      }
    } catch (error) {
      console.error('Failed to load website visits:', error);
      setWebsites([]);
    } finally {
      setLoadingWebsites(false);
    }
  };

  const handleLoadMore = () => {
    loadActivities(activityOffset, false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'idle':
        return 'bg-yellow-500';
      case 'offline':
        return 'bg-slate-400';
      default:
        return 'bg-slate-400';
    }
  };

  // If in analytics view, show the analytics component
  if (currentView === 'analytics') {
    return (
      <EmployeeAnalyticsView
        employee={employee}
        onBack={() => setCurrentView('details')}
      />
    );
  }

  // Deduplicate activities for display (only show when window changes)
  const deduplicatedActivities = displayedActivities.reduce((acc: any[], activity, index) => {
    if (index === 0) {
      return [activity];
    }
    const lastActivity = acc[acc.length - 1];
    // Only add if the window title (action) is different
    if (lastActivity.action !== activity.action) {
      acc.push(activity);
    }
    return acc;
  }, []);

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Overview</span>
      </button>

      {/* Employee Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-4xl shadow-lg">
              {employee.name.charAt(0).toUpperCase()}
            </div>
            <div className={`absolute -bottom-2 -right-2 w-6 h-6 rounded-full border-4 border-white ${getStatusColor(employee.status)}`}></div>
          </div>
          
          <div className="flex-1">
            <h2 className="text-slate-900 text-2xl font-bold mb-1">{employee.name}</h2>
            <p className="text-slate-500 text-lg mb-3">{employee.role}</p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-slate-600">
                <span className="text-slate-500">Status:</span>
                <span className="capitalize font-medium">{employee.status}</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-slate-300"></div>
              <div className="flex items-center gap-2 text-slate-600">
                <span className="text-slate-500">Last seen:</span>
                <span className="font-medium">{formatLastActivity(employee.lastActivity)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {/* Productivity Badge */}
            <div className="flex items-center justify-center w-32 h-32 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200">
              <div className="text-center">
                <div className="text-3xl font-bold text-slate-900 mb-1">{employee.productivity}%</div>
                <div className="text-slate-500 text-sm">Productivity</div>
              </div>
            </div>
            
            {/* Analytics Button */}
            <button
              onClick={() => setCurrentView('analytics')}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl font-medium"
            >
              <BarChart3 className="w-5 h-5" />
              <span>View Analytics</span>
            </button>
          </div>
        </div>
      </div>

      {/* Time Stats */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <div className="text-xl font-semibold">Screen Time</div>
          </div>
          <div className="text-4xl font-bold text-white mb-1">{formatTime(employee.screenTime)}</div>
          <p className="text-blue-100 mt-1">Today's total</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6" />
            </div>
            <div className="text-xl font-semibold">Active Time</div>
          </div>
          <div className="text-4xl font-bold text-white mb-1">{formatTime(employee.activeTime)}</div>
          <p className="text-green-100 mt-1">{employee.screenTime > 0 ? Math.round((employee.activeTime / employee.screenTime) * 100) : 0}% of screen time</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <Moon className="w-6 h-6" />
            </div>
            <div className="text-xl font-semibold">Idle Time</div>
          </div>
          <div className="text-4xl font-bold text-white mb-1">{formatTime(employee.idleTime)}</div>
          <p className="text-orange-100 mt-1">{employee.screenTime > 0 ? Math.round((employee.idleTime / employee.screenTime) * 100) : 0}% of screen time</p>
        </div>
      </div>

      {/* Three Column Layout */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Screenshots */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
              <Camera className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-slate-900 font-semibold">Recent Screenshots</h3>
              <p className="text-slate-500 text-sm">Captured every 30 minutes</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {screenshots.slice(0, 4).map((screenshot) => (
              <div key={screenshot.id} className="group relative overflow-hidden rounded-xl border border-slate-200">
                <img
                  src={screenshot.url}
                  alt={`Screenshot at ${screenshot.timestamp}`}
                  className="w-full h-32 object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-slate-700 text-xs">
                  {formatScreenshotTime(screenshot.timestamp)}
                </div>
              </div>
            ))}
          </div>

          {screenshots.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No screenshots available</p>
            </div>
          )}
        </div>

        {/* Activity Log with Load More */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <History className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-slate-900 font-semibold">Activity Log</h3>
                <p className="text-slate-500 text-sm">
                  {totalActivities > 0 ? `${deduplicatedActivities.length} of ${totalActivities} activities` : 'Recent activity'}
                </p>
              </div>
            </div>
            <button
              onClick={() => loadActivities(0, true)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="Refresh activities"
            >
              <RefreshCw className="w-4 h-4 text-slate-600" />
            </button>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {deduplicatedActivities.map((activity, index) => (
              <div key={index} className="flex gap-4 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-slate-900 text-sm font-medium line-clamp-2">{activity.action}</p>
                    <span className="text-slate-500 flex-shrink-0 text-sm">{formatActivityTime(activity.time)}</span>
                  </div>
                  <p className="text-slate-500 text-sm truncate">{activity.app}</p>
                  {(activity.isIdle || activity.isLocked) && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">
                      {activity.isLocked ? 'Locked' : 'Idle'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Load More Button */}
          {hasMoreActivities && !loadingActivities && (
            <button
              onClick={handleLoadMore}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600 rounded-lg hover:from-blue-100 hover:to-indigo-100 transition-all font-medium border border-blue-200"
            >
              <ChevronDown className="w-5 h-5" />
              <span>Load More Activities ({totalActivities - deduplicatedActivities.length} remaining)</span>
            </button>
          )}

          {loadingActivities && (
            <div className="mt-4 text-center py-3">
              <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-slate-500 text-sm mt-2">Loading...</p>
            </div>
          )}

          {!hasMoreActivities && deduplicatedActivities.length > 0 && (
            <div className="mt-4 text-center py-3 text-slate-500 text-sm">
              All activities loaded
            </div>
          )}

          {deduplicatedActivities.length === 0 && !loadingActivities && (
            <div className="text-center py-12 text-slate-400">
              <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No recent activities</p>
            </div>
          )}
        </div>

        {/* Website Visits - NEW */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                <Globe className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-slate-900 font-semibold">Website Visits</h3>
                <p className="text-slate-500 text-sm">Time spent browsing</p>
              </div>
            </div>
            <select
              value={websitePeriod}
              onChange={(e) => setWebsitePeriod(e.target.value as any)}
              className="px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {websites.map((website, index) => (
              <div key={index} className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-slate-900 font-medium text-sm truncate">{website.domain}</h4>
                      {website.url && (
                        <a
                          href={website.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 text-blue-600 hover:text-blue-700"
                          title="Open website"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                    <p className="text-slate-500 text-xs truncate mt-0.5">{website.title}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-green-600 font-semibold">
                      {website.totalHours > 0 ? `${website.totalHours}h` : `${website.totalMinutes}m`}
                    </span>
                    <span className="text-slate-500">
                      {website.visitCount} visit{website.visitCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {loadingWebsites && (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-3 border-green-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-slate-500 text-sm mt-2">Loading websites...</p>
            </div>
          )}

          {!loadingWebsites && websites.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No website visits found</p>
              <p className="text-xs mt-1">for selected period</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
