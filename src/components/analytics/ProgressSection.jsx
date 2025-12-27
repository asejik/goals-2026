import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Check, X, Minus } from 'lucide-react';

export default function ProgressSection({ lastUpdate }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgress();
  }, [lastUpdate]);

  const fetchProgress = async () => {
    try {
      // 1. Get Action Steps with their Goal info
      const { data: actions, error } = await supabase
        .from('action_steps')
        .select(`
          id, title, target_value, period, created_at,
          goals ( title ),
          daily_logs ( log_date, is_complete, numeric_value )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 2. Generate Last 7 Days Array (reverse chronological)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i)); // -6 to 0 (Today)
        return {
          dateObj: d,
          dateStr: d.toISOString().split('T')[0],
          dayName: d.toLocaleDateString('en-US', { weekday: 'short' }) // "Mon", "Tue"
        };
      });

      // 3. Process Data
      const processed = actions.map(action => {
        // Calculate Progress (Existing Logic)
        const totalCompleted = action.daily_logs?.filter(l => l.is_complete || l.numeric_value > 0).length || 0;
        let progress = 0;
        if (action.target_value > 0) {
           progress = Math.min(100, Math.round((totalCompleted / action.target_value) * 100));
        }

        // Map Logs to Last 7 Days
        const history = last7Days.map(day => {
          const log = action.daily_logs?.find(l => l.log_date === day.dateStr);
          const isDone = log?.is_complete || (log?.numeric_value > 0);
          return {
            day: day.dayName,
            date: day.dateStr,
            status: isDone ? 'completed' : 'missed' // Simple logic: if logged, done. Else missed.
          };
        });

        // Determine Deadline (Existing Logic)
        let daysRemaining = null;
        let isOverdue = false;
        // (Simple deadline logic can be expanded if you have due_dates on actions)

        return {
          id: action.id,
          title: action.title,
          goalTitle: action.goals?.title,
          progress,
          history, // NEW: 7-Day History
          totalCompleted,
          target: action.target_value
        };
      });

      setItems(processed);
    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4 text-center text-sm text-gray-400">Loading progress...</div>;
  if (items.length === 0) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
        <span>Performance & Deadlines</span>
      </h2>

      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="p-4 bg-white border border-gray-100 rounded-xl hover:shadow-md transition-all duration-300"
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900">{item.title}</h3>
                <p className="text-xs text-gray-500">{item.goalTitle}</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-gray-900">{item.totalCompleted}</span>
                <span className="text-[10px] text-gray-400"> / {item.target > 0 ? item.target : '∞'} completed</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-gray-900 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${item.progress}%` }}
              />
            </div>

            {/* NEW: 7-Day History Bubbles */}
            <div className="flex justify-between items-center pt-2 border-t border-gray-50">
              {item.history.map((day, idx) => {
                const isToday = idx === 6; // Last item is today
                return (
                  <div key={day.date} className="flex flex-col items-center gap-1">
                    {/* Status Bubble */}
                    <div
                      className={`
                        w-6 h-6 rounded-full flex items-center justify-center text-[10px] border transition-all
                        ${day.status === 'completed'
                          ? 'bg-green-50 border-green-200 text-green-600'
                          : isToday
                            ? 'bg-blue-50 border-blue-200 text-blue-600 ring-2 ring-blue-100' // Highlight Today
                            : 'bg-gray-50 border-gray-100 text-gray-300'
                        }
                      `}
                    >
                      {day.status === 'completed' ? (
                        <Check size={12} strokeWidth={3} />
                      ) : isToday ? (
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                      ) : (
                        <Minus size={12} />
                      )}
                    </div>
                    {/* Day Label */}
                    <span className={`text-[9px] font-medium uppercase ${isToday ? 'text-blue-600' : 'text-gray-400'}`}>
                      {day.day.charAt(0)}
                    </span>
                  </div>
                );
              })}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}