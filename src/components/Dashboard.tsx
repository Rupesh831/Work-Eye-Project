import { useState, useMemo, useEffect } from 'react';
import { fetchAPI, API_ENDPOINTS } from '../config/api';
import { EmployeeOverviewTable } from './EmployeeOverviewTable';
import { EmployeeDetailView } from './EmployeeDetailView';
import { DashboardStats } from './DashboardStats';
import { DashboardFilters, FilterState } from './DashboardFilters';
import { MembersManagement } from './MembersManagement';
import { Activity, LogOut, Users, LayoutDashboard, RefreshCw, UserPlus } from 'lucide-react';
import { formatLastActivity } from '../utils/timeUtils';

const MOCK_EMPLOYEES = [
  {
    id: 1,
    name: 'Sarah Johnson',
    avatar: '',
    role: 'Frontend Developer',
    status: 'active',
    screenTime: 7.5,
    activeTime: 6.8,
    idleTime: 0.7,
    lastActivity: '2 mins ago',
    productivity: 91,
    screenshots: [],
    activities: []
  },
];

interface DashboardProps {
  onLogout: () => void;
}

export function Dashboard({ onLogout }: DashboardProps) {
  const [employees, setEmployees] = useState(MOCK_EMPLOYEES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingMockData, setUsingMockData] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<typeof employees[0] | null>(null);
  const [view, setView] = useState<'overview' | 'detail' | 'members'>('overview');
  const [filters, setFilters] = useState<FilterState>({
    searchName: '',
    status: 'all',
    screenTimeMin: '',
    screenTimeMax: '',
    activeTimeMin: '',
    activeTimeMax: '',
    idleTimeMin: '',
    idleTimeMax: '',
    productivityMin: '',
    productivityMax: '',
    screenshotsMin: '',
    screenshotsMax: '',
  });

  const loadEmployees = async () => {
    try {
      const data = await fetchAPI(API_ENDPOINTS.employees);
      
      if (data.success && data.employees && data.employees.length > 0) {
        const transformedEmployees = data.employees.map((emp: any) => {
          // Determine status based on backend data
          let normalizedStatus = 'offline';
          
          // Use the status from backend if available
          if (emp.status) {
            normalizedStatus = emp.status.toLowerCase();
          } else if (emp.workdayHours > 0 || emp.activeHours > 0) {
            normalizedStatus = 'active';
          } else if (emp.idleHours > 0) {
            normalizedStatus = 'idle';
          }
          
          // Use lastActivity (when user was last active with mouse/keyboard)
          // This is the correct field for "Last Activity" - shows when user last interacted
          const rawLastActivity = emp.lastActivity || emp.lastSeen;
          
          return {
            id: emp.id || emp.deviceId,
            device_id: emp.deviceId || emp.id,
            name: emp.name || 'Unknown',
            avatar: '',
            role: 'Employee',
            status: normalizedStatus,
            screenTime: emp.workdayHours || 0,
            activeTime: emp.activeHours || 0,
            idleTime: emp.idleHours || 0,
            lastActivity: rawLastActivity, // Store raw timestamp for real user activity
            productivity: emp.productivity || 0,
            screenshotsCount: emp.screenshotsCount || 0,
            screenshots: [],
            activities: []
          };
        });
        
        setEmployees(transformedEmployees);
        setUsingMockData(false);
      }
    } catch (err: any) {
      console.error('Refresh failed:', err);
    }
  };

  useEffect(() => {
    loadEmployees();
    const interval = setInterval(loadEmployees, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (view === 'detail' && selectedEmployee) {
      const refreshDetails = async () => {
        try {
          const deviceId = selectedEmployee.device_id || selectedEmployee.id;
          
          const [screenshotsData, detailData] = await Promise.all([
            fetchAPI(API_ENDPOINTS.screenshots(deviceId)).catch(() => null),
            fetchAPI(API_ENDPOINTS.employeeDetails(deviceId)).catch(() => null)
          ]);

          let screenshots = selectedEmployee.screenshots || [];
          if (screenshotsData && screenshotsData.screenshots) {
            screenshots = screenshotsData.screenshots.map((s: any, index: number) => ({
              id: s.id || index + 1,
              url: s.url || '',
              timestamp: s.timestamp || 'Recent'
            }));
          }

          let activities = selectedEmployee.activities || [];
          if (detailData && detailData.employee && detailData.employee.activities) {
            activities = detailData.employee.activities.map((a: any) => ({
              time: a.time || 'Recent',
              action: a.action || a.window || a.current_window || 'Working',
              app: a.app || a.process || a.current_process || 'Active'
            }));
          }

          setSelectedEmployee({
            ...selectedEmployee,
            screenshots,
            activities
          });
        } catch (err) {
          console.warn('Detail refresh failed:', err);
        }
      };

      refreshDetails();
      const interval = setInterval(refreshDetails, 5000);
      return () => clearInterval(interval);
    }
  }, [view, selectedEmployee?.id]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      if (filters.searchName && !employee.name.toLowerCase().includes(filters.searchName.toLowerCase())) {
        return false;
      }
      if (filters.status !== 'all' && employee.status !== filters.status) {
        return false;
      }
      if (filters.screenTimeMin && employee.screenTime < parseFloat(filters.screenTimeMin)) {
        return false;
      }
      if (filters.screenTimeMax && employee.screenTime > parseFloat(filters.screenTimeMax)) {
        return false;
      }
      if (filters.activeTimeMin && employee.activeTime < parseFloat(filters.activeTimeMin)) {
        return false;
      }
      if (filters.activeTimeMax && employee.activeTime > parseFloat(filters.activeTimeMax)) {
        return false;
      }
      if (filters.idleTimeMin && employee.idleTime < parseFloat(filters.idleTimeMin)) {
        return false;
      }
      if (filters.idleTimeMax && employee.idleTime > parseFloat(filters.idleTimeMax)) {
        return false;
      }
      if (filters.productivityMin && employee.productivity < parseFloat(filters.productivityMin)) {
        return false;
      }
      if (filters.productivityMax && employee.productivity > parseFloat(filters.productivityMax)) {
        return false;
      }
      const screenshotCount = (employee as any).screenshotsCount || employee.screenshots?.length || 0;
      if (filters.screenshotsMin && screenshotCount < parseInt(filters.screenshotsMin)) {
        return false;
      }
      if (filters.screenshotsMax && screenshotCount > parseInt(filters.screenshotsMax)) {
        return false;
      }
      return true;
    });
  }, [filters, employees]);

  const handleEmployeeClick = async (employee: any) => {
    try {
      const deviceId = employee.device_id || employee.id;
      console.log('🔍 Fetching ALL data for:', deviceId);

      setSelectedEmployee({
        ...employee,
        screenshots: [],
        activities: [{
          time: 'Loading...',
          action: 'Fetching ALL activity data...',
          app: 'Please wait'
        }]
      });
      setView('detail');

      const fetchWithTimeout = (promise: Promise<any>, timeout = 10000) => {
        return Promise.race([
          promise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), timeout)
          )
        ]);
      };

      try {
        const screenshotsData = await fetchWithTimeout(
          fetchAPI(API_ENDPOINTS.screenshots(deviceId))
        );

        const detailData = await fetchWithTimeout(
          fetchAPI(API_ENDPOINTS.employeeDetails(deviceId))
        );

        let screenshots = [];
        if (screenshotsData && screenshotsData.screenshots) {
          screenshots = screenshotsData.screenshots.map((s: any, index: number) => ({
            id: s.id || index + 1,
            url: s.url || '',
            timestamp: s.timestamp || 'Recent'
          }));
        }

        let activities = [];
        if (detailData && detailData.employee && detailData.employee.activities) {
          activities = detailData.employee.activities.map((a: any) => ({
            time: a.time || 'Recent',
            action: a.action || a.window || a.current_window || 'Working',
            app: a.app || a.process || a.current_process || 'Active'
          }));
        }

        if (activities.length === 0) {
          activities = [{
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            action: 'Currently active',
            app: 'Tracking in progress'
          }];
        }

        setSelectedEmployee({
          ...employee,
          screenshots: screenshots,
          activities: activities
        });

        console.log('✅ Loaded ALL data:', { screenshots: screenshots.length, activities: activities.length });

      } catch (fetchError) {
        console.warn('⚠️ Timeout:', fetchError);
        setSelectedEmployee({
          ...employee,
          screenshots: [],
          activities: [{
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            action: 'Activity tracking active',
            app: 'Data loading...'
          }]
        });
      }

    } catch (err) {
      console.error('❌ Failed:', err);
      setSelectedEmployee({
        ...employee,
        screenshots: [],
        activities: []
      });
      setView('detail');
    }
  };

  const handleBackToOverview = () => {
    setView('overview');
    setSelectedEmployee(null);
  };

  const handleFilterReset = () => {
    setFilters({
      searchName: '',
      status: 'all',
      screenTimeMin: '',
      screenTimeMax: '',
      activeTimeMin: '',
      activeTimeMax: '',
      idleTimeMin: '',
      idleTimeMax: '',
      productivityMin: '',
      productivityMax: '',
      screenshotsMin: '',
      screenshotsMax: '',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-slate-900 text-2xl font-bold">Work Eye Dashboard</h1>
                <p className="text-slate-500">Real-time employee monitoring</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-700 font-medium">Live Tracking Active</span>
              </div>
              
              <button
                onClick={loadEmployees}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-slate-700"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
              
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-slate-700"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-slate-200">
        <div className="max-w-[1800px] mx-auto px-8">
          <div className="flex gap-1">
            <button
              onClick={() => { setView('overview'); setSelectedEmployee(null); }}
              className={`flex items-center gap-2 px-6 py-4 transition-all ${
                view === 'overview'
                  ? 'text-blue-600 border-b-2 border-blue-600 font-medium'
                  : 'text-slate-600 hover:text-slate-900 border-b-2 border-transparent'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Overview</span>
            </button>
            <button
              onClick={() => setView('members')}
              className={`flex items-center gap-2 px-6 py-4 transition-all ${
                view === 'members'
                  ? 'text-blue-600 border-b-2 border-blue-600 font-medium'
                  : 'text-slate-600 hover:text-slate-900 border-b-2 border-transparent'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Members</span>
            </button>
            {selectedEmployee && (
              <button
                className={`flex items-center gap-2 px-6 py-4 transition-all ${
                  view === 'detail'
                    ? 'text-blue-600 border-b-2 border-blue-600 font-medium'
                    : 'text-slate-600 hover:text-slate-900 border-b-2 border-transparent'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>{selectedEmployee.name}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-8 py-8">
        {view === 'overview' ? (
          <>
            <DashboardStats employees={filteredEmployees} />
            <DashboardFilters 
              filters={filters}
              onFilterChange={setFilters}
              onReset={handleFilterReset}
            />
            <EmployeeOverviewTable 
              employees={filteredEmployees}
              onEmployeeClick={handleEmployeeClick}
            />
          </>
        ) : view === 'members' ? (
          <MembersManagement />
        ) : selectedEmployee ? (
          <EmployeeDetailView 
            employee={selectedEmployee}
            onBack={handleBackToOverview}
          />
        ) : null}
      </div>
    </div>
  );
}
