import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Employee {
  id: number;
  name: string;
  screenTime: number;
  activeTime: number;
  idleTime: number;
}

interface TimeTrackingChartProps {
  employee: Employee;
}

// Mock data for the week
const generateWeekData = (employee: Employee) => {
  return [
    { day: 'Mon', active: 7.2, idle: 0.8, screen: 8.0 },
    { day: 'Tue', active: 6.5, idle: 1.0, screen: 7.5 },
    { day: 'Wed', active: 7.8, idle: 0.5, screen: 8.3 },
    { day: 'Thu', active: 6.9, idle: 0.9, screen: 7.8 },
    { day: 'Fri', active: employee.activeTime, idle: employee.idleTime, screen: employee.screenTime },
  ];
};

export function TimeTrackingChart({ employee }: TimeTrackingChartProps) {
  const data = generateWeekData(employee);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-slate-900 mb-4">Weekly Time Tracking</h3>
      
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="day" stroke="#64748b" />
          <YAxis stroke="#64748b" label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#fff', 
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}
          />
          <Legend />
          <Bar dataKey="active" fill="#10b981" name="Active Time" radius={[4, 4, 0, 0]} />
          <Bar dataKey="idle" fill="#f59e0b" name="Idle Time" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
