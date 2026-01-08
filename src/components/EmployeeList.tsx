import { Clock } from 'lucide-react';

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
  screenshots: any[];
  activities: any[];
}

interface EmployeeListProps {
  employees: Employee[];
  selectedEmployee: Employee;
  onSelectEmployee: (employee: Employee) => void;
}

export function EmployeeList({ employees, selectedEmployee, onSelectEmployee }: EmployeeListProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-slate-900 mb-4">Team Members</h2>
      
      <div className="space-y-3">
        {employees.map((employee) => (
          <button
            key={employee.id}
            onClick={() => onSelectEmployee(employee)}
            className={`w-full text-left p-4 rounded-lg border transition-all ${
              selectedEmployee.id === employee.id
                ? 'bg-blue-50 border-blue-200 shadow-sm'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={employee.avatar}
                  alt={employee.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                  employee.status === 'active' ? 'bg-green-500' : 'bg-slate-400'
                }`}></div>
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-slate-900 truncate">{employee.name}</p>
                <p className="text-slate-500 truncate">{employee.role}</p>
              </div>
            </div>
            
            <div className="mt-3 flex items-center justify-between text-slate-500">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>{employee.screenTime}h</span>
              </div>
              <span>{employee.lastActivity}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
