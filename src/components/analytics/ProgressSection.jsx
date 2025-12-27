import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
// Removed Check, Minus icons as they are no longer needed

export default function ProgressSection({ lastUpdate }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const fetchProgress = async () => {
      const { data: actions } = await supabase
        .from('action_steps')
        .select(`
          id, title, target_value, period, created_at, end_date, frequency,
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
        // --- SMART TARGET CALCULATION (Unchanged) ---
        let realTarget = action.target_value;
        const normalizedPeriod = action.period ? action.period.toLowerCase() : '';

        if (action.end_date) {
           const start = new Date(action.created_at);
           const end = new Date(action.end_date);
           const diffTime = Math.max(0, end - start);
           const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

           if (normalizedPeriod === 'daily') {
             realTarget = totalDays > 0 ? totalDays : 1;
           } else if (normalizedPeriod === 'weekly') {
             const totalWeeks = Math.ceil(totalDays / 7);
             const weeklyFreq = action.target_value > 0 ? action.target_value : 1;
             realTarget = totalWeeks * weeklyFreq;
           } else if (normalizedPeriod === 'monthly') {
             const totalMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
             const monthlyFreq = action.target_value > 0 ? action.target_value : 1;
             realTarget = Math.max(1, totalMonths) * monthlyFreq;
           }
        }

        // --- PROGRESS (Unchanged) ---
        const totalCompleted = action.daily_logs?.filter(l => l.is_complete || l.numeric_value > 0).length || 0;
        let progress = 0;
        if (realTarget > 0) {
           progress = Math.min(100, Math.round((totalCompleted / realTarget) * 100));
        }

        // --- HISTORY (Unchanged) ---
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
          target: realTarget,
          endDate: action.end_date
        };
      });
      setItems(processed);
    };

    fetchProgress();
  }, [lastUpdate]);

  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold text-gray-900 tracking-tight">
        Performance & Deadlines
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
              <div className="text-right flex-shrink-0 flex flex-col items-end">
                <div>
                   <span className="text-xs font-bold text-gray-900">{item.totalCompleted}</span>
                   <span className="text-[10px] text-gray-400"> / {item.target > 0 ? item.target : '∞'}</span>
                </div>
                {item.endDate && (
                  <span className="text-[9px] text-orange-500 font-medium bg-orange-50 px-1.5 rounded-sm mt-0.5 border border-orange-100">
                    Ends {new Date(item.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
            </div>

            <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gray-900 rounded-full transition-all duration-500"
                style={{ width: `${item.progress}%` }}
              />
            </div>

            {/* UPDATED INDICATORS SECTION */}
            <div className="flex justify-between items-center pt-1.5 px-1">
              {item.history.map((day, idx) => {
                const isToday = idx === 6;

                // Determine styles based on status
                let ringColor = 'border-gray-300';
                let dotColor = 'bg-gray-300';

                if (day.status === 'completed') {
                  ringColor = 'border-green-500'; // Bright Green Ring
                  dotColor = 'bg-green-500';       // Bright Green Dot
                } else if (isToday) {
                  ringColor = 'border-blue-500';  // Bright Blue Ring
                  dotColor = 'bg-blue-500';       // Bright Blue Dot
                }

                return (
                  <div key={idx} className="flex flex-col items-center gap-1">
                    {/* The Ring Container */}
                    <div
                      className={`
                        w-3.5 h-3.5 rounded-full flex items-center justify-center border-[1.5px] bg-white transition-all
                        ${ringColor}
                      `}
                    >
                      {/* The Inner Dot */}
                      <div className={`w-[5px] h-[5px] rounded-full ${dotColor}`} />
                    </div>

                    {/* Day Label */}
                    <span className={`text-[8px] font-bold uppercase ${isToday ? 'text-blue-600' : 'text-gray-400'}`}>
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