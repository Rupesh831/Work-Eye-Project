import { Clock, Activity, Moon, User } from 'lucide-react';

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
}

interface EmployeeStatsProps {
  employee: Employee;
}

export function EmployeeStats({ employee }: EmployeeStatsProps) {
  const activePercentage = (employee.activeTime / employee.screenTime) * 100;
  const idlePercentage = (employee.idleTime / employee.screenTime) * 100;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="relative">
          <img
            src={employee.avatar}
            alt={employee.name}
            className="w-16 h-16 rounded-full object-cover"
          />
          <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-3 border-white ${
            employee.status === 'active' ? 'bg-green-500' : 'bg-slate-400'
          }`}></div>
        </div>
        <div>
          <h2 className="text-slate-900">{employee.name}</h2>
          <p className="text-slate-500">{employee.role}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <Clock className="w-4 h-4" />
            <span>Screen Time</span>
          </div>
          <p className="text-slate-900">{employee.screenTime}h</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <Activity className="w-4 h-4" />
            <span>Active</span>
          </div>
          <p className="text-slate-900">{employee.activeTime}h</p>
          <div className="mt-2 bg-green-200 rounded-full h-1.5">
            <div 
              className="bg-green-500 h-1.5 rounded-full transition-all"
              style={{ width: `${activePercentage}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-orange-600 mb-2">
            <Moon className="w-4 h-4" />
            <span>Idle</span>
          </div>
          <p className="text-slate-900">{employee.idleTime}h</p>
          <div className="mt-2 bg-orange-200 rounded-full h-1.5">
            <div 
              className="bg-orange-500 h-1.5 rounded-full transition-all"
              style={{ width: `${idlePercentage}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
