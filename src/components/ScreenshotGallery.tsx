import { Camera, Clock } from 'lucide-react';
import { formatScreenshotTime } from '../utils/timezoneUtils';

interface Screenshot {
  id: number;
  timestamp: string; // ISO format from backend
  url: string;
}

interface ScreenshotGalleryProps {
  screenshots: Screenshot[];
  employeeName: string;
}

export function ScreenshotGallery({ screenshots, employeeName }: ScreenshotGalleryProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-900">Recent Screenshots</h3>
        <div className="flex items-center gap-2 text-slate-500">
          <Camera className="w-4 h-4" />
          <span>Captured every 30 mins</span>
        </div>
      </div>

      {screenshots.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No screenshots available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {screenshots.map((screenshot) => (
            <div key={screenshot.id} className="group relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              <img
                src={screenshot.url}
                alt={`Screenshot at ${screenshot.timestamp}`}
                className="w-full h-40 object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <div className="flex items-center gap-2 text-white">
                    <Clock className="w-3.5 h-3.5" />
                    {/* Convert UTC timestamp to local time */}
                    <span>{formatScreenshotTime(screenshot.timestamp)}</span>
                  </div>
                </div>
              </div>
              <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-slate-700">
                {/* Convert UTC timestamp to local time */}
                {formatScreenshotTime(screenshot.timestamp)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
