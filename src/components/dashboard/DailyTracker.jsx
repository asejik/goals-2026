import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle2, Check } from 'lucide-react';
import { toast } from 'sonner';

const FALLBACK_COLORS = {
  'Health': '#ef4444',
  'Business': '#3b82f6',
  'Spiritual': '#8b5cf6',
  'Learning': '#f59e0b',
  'Relationships': '#ec4899',
  'Academic': '#f97316'
};

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

      const { data, error } = await supabase
        .from('action_steps')
        .select(`
          id, title, period, target_value, frequency,
          goals ( title, category, color ),
          daily_logs ( id, is_complete, numeric_value, log_date )
        `);

      if (error) throw error;

      const todaysActions = data.filter(action => {
        const period = action.period ? action.period.toLowerCase() : 'daily';
        if (period === 'daily') return true;
        if (period === 'monthly') return true;
        if (period === 'weekly') {
           if (!action.frequency || action.frequency.length === 0) return true;
           const freqString = Array.isArray(action.frequency) ? action.frequency.join(',') : (String(action.frequency || ''));
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
        await supabase.from('daily_logs').delete().eq('id', currentLog.id);
      } else {
        await supabase.from('daily_logs').insert([{
          user_id: user.id,
          action_step_id: action.id,
          log_date: today,
          is_complete: true,
          numeric_value: 1
        }]);
      }
      onUpdate();
      fetchTodaysActions();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-3">
      {/* Header */}
      <h2 className="text-sm font-bold text-gray-900 tracking-tight flex items-center justify-between">
        <span>Today's Focus</span>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>
      </h2>

      {/* Grid Container */}
      {actions.length === 0 ? (
        <div className="p-6 text-center text-gray-400 bg-white border border-gray-100 rounded-xl">
          <p className="text-xs">No actions scheduled.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {actions.map((action) => {
            const isDone = !!action.currentLog;
            const categoryName = action.goals?.category || 'General';

            let categoryColor = action.goals?.color;
            if (!categoryColor || categoryColor === '#000000') {
               categoryColor = FALLBACK_COLORS[categoryName] || '#6b7280';
            }

            return (
              <div
                key={action.id}
                onClick={() => toggleAction(action, action.currentLog)}
                className={`
                  group relative flex items-center justify-between py-2.5 px-3
                  bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:border-gray-200
                  transition-all cursor-pointer select-none overflow-hidden
                  ${isDone ? 'opacity-70' : ''}
                `}
              >
                {/* The Colored Edge */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-[4px]"
                  style={{ backgroundColor: categoryColor }}
                />

                <div className="flex items-center gap-3 pl-2 w-full">
                  {/* Compact Checkbox */}
                  <div className={`
                    w-4 h-4 rounded flex items-center justify-center transition-all duration-300 flex-shrink-0 border
                    ${isDone
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'bg-white border-gray-300 text-transparent group-hover:border-gray-400'
                    }
                  `}>
                    <Check size={10} strokeWidth={4} />
                  </div>

                  {/* Text Content */}
                  <div className="min-w-0 flex-1">
                    <h3 className={`text-sm font-bold text-gray-900 truncate leading-tight ${isDone ? 'line-through text-gray-400' : ''}`}>
                      {action.title}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className="text-[9px] font-bold uppercase tracking-wide opacity-80"
                        style={{ color: categoryColor }}
                      >
                        {categoryName}
                      </span>
                      <span className="text-[9px] text-gray-300">•</span>
                      <span className="text-[10px] text-gray-400 truncate">
                        {action.goals?.title}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}