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
      const { data: actions, error } = await supabase
        .from('action_steps')
        .select(`
          id, title, target_value, period, created_at,
          goals ( title ),
          daily_logs ( log_date, is_complete, numeric_value )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return {
          dateObj: d,
          dateStr: d.toISOString().split('T')[0],
          dayName: d.toLocaleDateString('en-US', { weekday: 'narrow' }) // "M", "T" (Single Letter)
        };
      });

      const processed = actions.map(action => {
        const totalCompleted = action.daily_logs?.filter(l => l.is_complete || l.numeric_value > 0).length || 0;
        let progress = 0;
        if (action.target_value > 0) {
           progress = Math.min(100, Math.round((totalCompleted / action.target_value) * 100));
        }

        const history = last7Days.map(day => {
          const log = action.daily_logs?.find(l => l.log_date === day.dateStr);
          const isDone = log?.is_complete || (log?.numeric_value > 0);
          return {
            day: day.dayName,
            date: day.dateStr,
            status: isDone ? 'completed' : 'missed'
          };
        });

        return {
          id: action.id,
          title: action.title,
          goalTitle: action.goals?.title,
          progress,
          history,
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

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-bold text-gray-900 tracking-tight flex items-center gap-2">
        <span>Performance & Deadlines</span>
      </h2>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="p-3 bg-white border border-gray-100 rounded-xl hover:shadow-sm transition-all duration-300"
          >
            {/* Header: Title & Count */}
            <div className="flex justify-between items-start mb-1.5">
              <div className="min-w-0 pr-2">
                <h3 className="text-xs font-bold text-gray-900 truncate">{item.title}</h3>
                <p className="text-[10px] text-gray-400 truncate">{item.goalTitle}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-xs font-bold text-gray-900">{item.totalCompleted}</span>
                <span className="text-[10px] text-gray-400"> / {item.target > 0 ? item.target : '∞'}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gray-900 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${item.progress}%` }}
              />
            </div>

            {/* 7-Day History Bubbles */}
            <div className="flex justify-between items-center pt-1.5 border-t border-gray-50/50">
              {item.history.map((day, idx) => {
                const isToday = idx === 6;
                return (
                  <div key={day.date} className="flex flex-col items-center gap-0.5">
                    {/* Status Bubble */}
                    <div
                      className={`
                        w-4 h-4 rounded-full flex items-center justify-center text-[8px] border transition-all
                        ${day.status === 'completed'
                          ? 'bg-green-50 border-green-200 text-green-600'
                          : isToday
                            ? 'bg-blue-50 border-blue-200 text-blue-600 ring-1 ring-blue-100'
                            : 'bg-gray-50 border-gray-100 text-gray-300'
                        }
                      `}
                    >
                      {day.status === 'completed' ? (
                        <Check size={8} strokeWidth={4} />
                      ) : isToday ? (
                        <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" />
                      ) : (
                        <Minus size={8} />
                      )}
                    </div>
                    {/* Day Label */}
                    <span className={`text-[8px] font-medium uppercase ${isToday ? 'text-blue-600' : 'text-gray-300'}`}>
                      {day.day}
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