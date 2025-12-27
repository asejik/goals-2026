import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Check, Minus } from 'lucide-react';

export default function ProgressSection({ lastUpdate }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const fetchProgress = async () => {
      const { data: actions } = await supabase
        .from('action_steps')
        .select(`
          id, title, target_value, period, created_at,
          goals ( title ),
          daily_logs ( log_date, is_complete, numeric_value )
        `)
        .order('created_at', { ascending: false });

      if (!actions) return;

      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return {
          dateStr: d.toISOString().split('T')[0],
          dayName: d.toLocaleDateString('en-US', { weekday: 'narrow' })
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
          return {
            day: day.dayName,
            status: (log?.is_complete || log?.numeric_value > 0) ? 'completed' : 'missed'
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
    };

    fetchProgress();
  }, [lastUpdate]);

  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* UNIFORM HEADER */}
      <h2 className="text-sm font-bold text-gray-900 tracking-tight">
        Performance & Deadlines
      </h2>

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="p-3 bg-white border border-gray-100 rounded-xl hover:shadow-sm transition-all"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="min-w-0 pr-2">
                <h3 className="text-sm font-bold text-gray-900 truncate leading-tight">{item.title}</h3>
                <p className="text-[10px] text-gray-400 truncate mt-0.5">{item.goalTitle}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-xs font-bold text-gray-900">{item.totalCompleted}</span>
                <span className="text-[10px] text-gray-400"> / {item.target > 0 ? item.target : '∞'}</span>
              </div>
            </div>

            <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gray-900 rounded-full transition-all duration-500"
                style={{ width: `${item.progress}%` }}
              />
            </div>

            <div className="flex justify-between items-center pt-1">
              {item.history.map((day, idx) => {
                const isToday = idx === 6;
                return (
                  <div key={idx} className="flex flex-col items-center gap-0.5">
                    <div
                      className={`
                        w-4 h-4 rounded-full flex items-center justify-center text-[8px] border transition-all
                        ${day.status === 'completed'
                          ? 'bg-green-50 border-green-200 text-green-600'
                          : isToday
                            ? 'bg-blue-50 border-blue-200 text-blue-600'
                            : 'bg-gray-50 border-gray-100 text-gray-300'
                        }
                      `}
                    >
                      {day.status === 'completed' ? <Check size={8} strokeWidth={4} /> : <Minus size={8} />}
                    </div>
                    <span className={`text-[8px] font-bold uppercase ${isToday ? 'text-blue-600' : 'text-gray-300'}`}>
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