import { useState } from 'react';
import { Clock, TrendingUp, Eye, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { formatLastActivity } from '../utils/timeUtils';

// Format time: show hours + minutes (e.g. "2h 30m" or "45m")
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
  screenshotsCount?: number;
}

interface EmployeeOverviewTableProps {
  employees: Employee[];
  onEmployeeClick: (employee: Employee) => void;
}

type SortField = 'name' | 'status' | 'screenTime' | 'activeTime' | 'idleTime' | 'productivity' | 'screenshots' | 'lastActivity';
type SortOrder = 'asc' | 'desc' | null;

export function EmployeeOverviewTable({ employees, onEmployeeClick }: EmployeeOverviewTableProps) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle through: asc -> desc -> null
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else if (sortOrder === 'desc') {
        setSortOrder(null);
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortedEmployees = () => {
    if (!sortField || !sortOrder) return employees;

    return [...employees].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'status':
          const statusOrder = { active: 3, idle: 2, offline: 1 };
          aValue = statusOrder[a.status as keyof typeof statusOrder] || 0;
          bValue = statusOrder[b.status as keyof typeof statusOrder] || 0;
          break;
        case 'screenTime':
          aValue = a.screenTime;
          bValue = b.screenTime;
          break;
        case 'activeTime':
          aValue = a.activeTime;
          bValue = b.activeTime;
          break;
        case 'idleTime':
          aValue = a.idleTime;
          bValue = b.idleTime;
          break;
        case 'productivity':
          aValue = a.productivity;
          bValue = b.productivity;
          break;
        case 'screenshots':
          aValue = a.screenshotsCount ?? a.screenshots?.length ?? 0;
          bValue = b.screenshotsCount ?? b.screenshots?.length ?? 0;
          break;
        case 'lastActivity':
          aValue = new Date(a.lastActivity || 0).getTime();
          bValue = new Date(b.lastActivity || 0).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-slate-400" />;
    }
    if (sortOrder === 'asc') {
      return <ArrowUp className="w-4 h-4 text-blue-600" />;
    }
    return <ArrowDown className="w-4 h-4 text-blue-600" />;
  };

  const sortedEmployees = getSortedEmployees();

  const getStatusColor = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
      case 'active':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'idle':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'offline':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusDotColor = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
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

  const getProductivityColor = (productivity: number) => {
    if (productivity >= 90) return 'text-emerald-600';
    if (productivity >= 75) return 'text-green-600';
    if (productivity >= 60) return 'text-yellow-600';
    return 'text-orange-600';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
        <h2 className="text-slate-900 text-xl font-semibold">All Employees</h2>
        <p className="text-slate-500 mt-1">Comprehensive view of team activity and performance</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th 
                className="px-6 py-4 text-left text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-2">
                  <span>Employee</span>
                  <SortIcon field="name" />
                </div>
              </th>
              <th 
                className="px-6 py-4 text-left text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-2">
                  <span>Status</span>
                  <SortIcon field="status" />
                </div>
              </th>
              <th 
                className="px-6 py-4 text-left text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleSort('screenTime')}
              >
                <div className="flex items-center gap-2">
                  <span>Screen Time</span>
                  <SortIcon field="screenTime" />
                </div>
              </th>
              <th 
                className="px-6 py-4 text-left text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleSort('activeTime')}
              >
                <div className="flex items-center gap-2">
                  <span>Active Time</span>
                  <SortIcon field="activeTime" />
                </div>
              </th>
              <th 
                className="px-6 py-4 text-left text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleSort('idleTime')}
              >
                <div className="flex items-center gap-2">
                  <span>Idle Time</span>
                  <SortIcon field="idleTime" />
                </div>
              </th>
              <th 
                className="px-6 py-4 text-left text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleSort('productivity')}
              >
                <div className="flex items-center gap-2">
                  <span>Productivity</span>
                  <SortIcon field="productivity" />
                </div>
              </th>
              <th 
                className="px-6 py-4 text-left text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleSort('screenshots')}
              >
                <div className="flex items-center gap-2">
                  <span>Screenshots</span>
                  <SortIcon field="screenshots" />
                </div>
              </th>
              <th 
                className="px-6 py-4 text-left text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleSort('lastActivity')}
              >
                <div className="flex items-center gap-2">
                  <span>Last Activity</span>
                  <SortIcon field="lastActivity" />
                </div>
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedEmployees.map((employee) => {
              // Get screenshots count from either screenshotsCount or screenshots array
              const screenshotsCount = employee.screenshotsCount ?? employee.screenshots?.length ?? 0;
              
              return (
                <tr 
                  key={employee.id}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                          {employee.name.charAt(0).toUpperCase()}
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${getStatusDotColor(employee.status)}`}></div>
                      </div>
                      <div>
                        <p className="text-slate-900 font-medium">{employee.name}</p>
                        <p className="text-sm text-slate-500">{employee.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium border capitalize ${getStatusColor(employee.status)}`}>
                      {employee.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">{formatTime(employee.screenTime)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-100 rounded-full h-2 w-20">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${employee.screenTime > 0 ? Math.min((employee.activeTime / employee.screenTime) * 100, 100) : 0}%` }}
                        ></div>
                      </div>
                      <span className="text-slate-700 font-medium">{formatTime(employee.activeTime)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-100 rounded-full h-2 w-20">
                        <div 
                          className="bg-orange-500 h-2 rounded-full transition-all"
                          style={{ width: `${employee.screenTime > 0 ? Math.min((employee.idleTime / employee.screenTime) * 100, 100) : 0}%` }}
                        ></div>
                      </div>
                      <span className="text-slate-700 font-medium">{formatTime(employee.idleTime)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className={`w-4 h-4 ${getProductivityColor(employee.productivity)}`} />
                      <span className={`font-semibold ${getProductivityColor(employee.productivity)}`}>
                        {employee.productivity}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-700 font-medium">{screenshotsCount}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-500">{formatLastActivity(employee.lastActivity)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => onEmployeeClick(employee)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Details</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {employees.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <p className="text-lg">No employees found</p>
            <p className="text-sm mt-2">Try adjusting your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
