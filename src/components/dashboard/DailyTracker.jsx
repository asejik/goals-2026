import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function DailyTracker({ onUpdate, lastUpdate }) {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodaysActions();
  }, [lastUpdate]);

  const fetchTodaysActions = async () => {
    try {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const dayName = today.toLocaleDateString('en-US', { weekday: 'short' });

      // 1. Fetch ALL Actions
      const { data, error } = await supabase
        .from('action_steps')
        .select(`
          id, title, period, target_value, frequency,
          goals (
            title,
            category,
            color
          ),
          daily_logs (
            id,
            is_complete,
            numeric_value,
            log_date
          )
        `);

      if (error) throw error;

      // 2. Permissive Filter
      const todaysActions = data.filter(action => {
        const period = action.period ? action.period.toLowerCase() : 'daily';

        if (period === 'daily') return true;
        if (period === 'monthly') return true;

        if (period === 'weekly') {
           if (!action.frequency || action.frequency.length === 0) return true;
           const freqString = Array.isArray(action.frequency)
              ? action.frequency.join(',')
              : (String(action.frequency || ''));
           return freqString.includes(dayName);
        }
        return true;
      }).map(action => {
        const todayLog = action.daily_logs?.find(log => log.log_date === dateStr);
        return { ...action, currentLog: todayLog };
      });

      setActions(todaysActions);
    } catch (error) {
      console.error('Error fetching actions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAction = async (action, currentLog) => {
    const today = new Date().toISOString().split('T')[0];
    const user = (await supabase.auth.getUser()).data.user;

    try {
      if (currentLog) {
        const { error } = await supabase.from('daily_logs').delete().eq('id', currentLog.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('daily_logs').insert([{
          user_id: user.id,
          action_step_id: action.id,
          log_date: today,
          is_complete: true,
          numeric_value: 1
        }]);
        if (error) throw error;
      }
      onUpdate();
      fetchTodaysActions();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update status');
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-400 animate-pulse text-xs">Loading today's focus...</div>;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
        <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <span>📅 Today's Focus</span>
        </h2>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          {new Date().toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
        </span>
      </div>

      <div className="divide-y divide-gray-50">
        {actions.length === 0 ? (
          <div className="p-6 text-center text-gray-400 flex flex-col items-center gap-2">
            <CheckCircle2 size={24} className="opacity-20" />
            <p className="text-xs">No actions scheduled.</p>
          </div>
        ) : (
          actions.map((action) => {
            const isDone = !!action.currentLog;
            const categoryColor = action.goals?.color || '#000000';
            const categoryName = action.goals?.category || 'General';

            return (
              <div
                key={action.id}
                className={`
                  group flex items-center justify-between py-2.5 px-4 hover:bg-gray-50 transition-colors cursor-pointer select-none
                  ${isDone ? 'bg-gray-50/50' : ''}
                `}
                onClick={() => toggleAction(action, action.currentLog)}
              >
                <div className="flex items-center gap-3">
                  {/* CHECKBOX */}
                  <div className={`
                    w-5 h-5 rounded flex items-center justify-center transition-all duration-300 flex-shrink-0
                    ${isDone
                      ? 'bg-green-500 text-white scale-100 shadow-sm'
                      : 'border-2 border-gray-200 text-transparent scale-95 group-hover:border-gray-300'
                    }
                  `}>
                    <CheckCircle2 size={14} strokeWidth={3} />
                  </div>

                  {/* TEXT CONTENT */}
                  <div className={`min-w-0 ${isDone ? 'opacity-50 transition-opacity' : ''}`}>
                    <h3 className={`text-sm font-bold text-gray-900 truncate ${isDone ? 'line-through text-gray-400' : ''}`}>
                      {action.title}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {/* CATEGORY BADGE */}
                      <span
                        className="text-[9px] font-bold px-1.5 py-px rounded border truncate max-w-[80px]"
                        style={{
                          color: categoryColor,
                          backgroundColor: `${categoryColor}10`,
                          borderColor: `${categoryColor}20`
                        }}
                      >
                        {categoryName}
                      </span>

                      <span className="text-[10px] text-gray-300">•</span>
                      <span className="text-[10px] text-gray-400 truncate max-w-[120px] sm:max-w-[200px]">
                        {action.goals?.title || 'Goal'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}