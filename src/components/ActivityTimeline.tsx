import { Clock, AppWindow } from 'lucide-react';
import { formatLocalTime } from '../utils/timezoneUtils';

interface Activity {
  time: string; // ISO timestamp from backend
  timestamp?: string; // Optional full timestamp
  action: string;
  app: string;
}

interface ActivityTimelineProps {
  activities: Activity[];
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-slate-900 mb-4">Recent Activities</h3>

      <div className="space-y-4">
        {activities.map((activity, index) => {
          // Convert UTC timestamp to local time
          const localTime = activity.time ? formatLocalTime(activity.time, 'time') : 'Recent';
          
          return (
            <div key={index} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                {index !== activities.length - 1 && (
                  <div className="w-0.5 h-full bg-slate-200 mt-2"></div>
                )}
              </div>

              <div className="flex-1 pb-6">
                <div className="flex items-start justify-between mb-1">
                  <p className="text-slate-900">{activity.action}</p>
                  {/* Display local time instead of UTC */}
                  <span className="text-slate-500">{localTime}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <AppWindow className="w-3.5 h-3.5" />
                  <span>{activity.app}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {activities.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No recent activities</p>
        </div>
      )}
    </div>
  );
}
