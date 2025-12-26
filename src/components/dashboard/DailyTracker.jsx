import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { getTodayString, formatDateReadable } from '../../lib/dateUtils';
import { Check, Calendar, Activity } from 'lucide-react';

const getCurrentDayName = () => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[new Date().getDay()];
};

export default function DailyTracker({ onUpdate, lastUpdate }) {
  const { user } = useAuth();
  const today = getTodayString();
  const currentDayName = getCurrentDayName();

  const [actions, setActions] = useState([]);
  const [todaysLogs, setTodaysLogs] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    if (user) fetchData();
  }, [user, lastUpdate]);

  const fetchData = async () => {
    try {
      // 1. Fetch ALL Action Steps with their parent Goal and Category info
      // Note: We need a complex join. Supabase syntax:
      const { data: actionsData, error } = await supabase
        .from('action_steps')
        .select(`
          *,
          goals (
            title,
            categories ( name, color )
          )
        `);

      if (error) throw error;

      // 2. Fetch Today's Logs
      const { data: logs } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('log_date', today);

      const logMap = {};
      logs?.forEach(log => logMap[log.action_step_id] = log);

      setActions(actionsData || []);
      setTodaysLogs(logMap);
    } catch (err) {
      console.error('Error fetching tracker:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (action) => {
    const currentLog = todaysLogs[action.id];
    const isComplete = currentLog ? !currentLog.is_complete : true;

    // Optimistic Update
    setTodaysLogs(prev => ({
      ...prev, [action.id]: { ...prev[action.id], is_complete: isComplete }
    }));

    setSaving(action.id);
    await supabase.from('daily_logs').upsert({
      user_id: user.id,
      action_step_id: action.id,
      log_date: today,
      is_complete: isComplete,
      numeric_value: isComplete ? 1 : 0
    }, { onConflict: 'action_step_id, log_date' });

    if (onUpdate) onUpdate();
    setSaving(null);
  };

  const handleNumericBlur = async (action, val) => {
    setSaving(action.id);
    await supabase.from('daily_logs').upsert({
      user_id: user.id,
      action_step_id: action.id,
      log_date: today,
      numeric_value: val,
      is_complete: val >= (action.target_value || 0)
    }, { onConflict: 'action_step_id, log_date' });
    if (onUpdate) onUpdate();
    setSaving(null);
  };

  // Filter Actions for TODAY
  const visibleActions = actions.filter(action => {
    if (action.period === 'daily') return true;
    if (action.period === 'weekly') {
      // Only show if today is in the specific_days array
      return action.specific_days && action.specific_days.includes(currentDayName);
    }
    // Monthly/OneTime: show for now or add more logic
    return true;
  });

  if (loading) return <div className="p-4 text-center text-gray-400">Loading your focus...</div>;

  return (
    <div className="mb-8">
      <div className="flex justify-between items-end mb-2 px-1">
        <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <Calendar size={14} className="text-blue-600" /> Today's Focus
        </h2>
        <p className="text-[10px] text-gray-400 font-medium uppercase">{formatDateReadable(today)}</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {visibleActions.length === 0 && (
          <div className="py-8 text-center bg-gray-50">
            <Activity className="mx-auto text-gray-300 mb-2" size={24} />
            <p className="text-xs text-gray-400">No actions scheduled for {currentDayName}.</p>
          </div>
        )}

        {visibleActions.map((action, index) => {
          const log = todaysLogs[action.id];
          const isDone = log?.is_complete;
          const isSaving = saving === action.id;

          // Safe Accessors
          const categoryName = action.goals?.categories?.name || 'Uncategorized';
          const categoryColor = action.goals?.categories?.color || 'bg-gray-100 text-gray-600';
          const goalTitle = action.goals?.title || 'Unknown Goal';

          return (
            <div
              key={action.id}
              className={`
                flex items-center justify-between p-3 gap-3 transition-colors
                ${index !== visibleActions.length - 1 ? 'border-b border-gray-100' : ''}
                ${isDone ? 'bg-green-50/40' : 'hover:bg-gray-50'}
              `}
            >
              {/* Left: Checkbox & Details */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button
                  onClick={() => action.type === 'boolean' && handleToggle(action)}
                  className={`
                    flex-shrink-0 w-5 h-5 rounded-[4px] border transition-all flex items-center justify-center
                    ${isDone ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-gray-300 hover:border-green-400'}
                  `}
                >
                  {isDone && <Check size={12} strokeWidth={3} />}
                </button>

                <div className="min-w-0">
                  <p className={`text-sm font-bold truncate leading-tight ${isDone ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                    {action.title}
                  </p>

                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                    <span className={`px-1.5 py-0.5 rounded-[3px] font-bold ${categoryColor} bg-opacity-50`}>
                      {categoryName}
                    </span>
                    <span className="truncate max-w-[150px]">• {goalTitle}</span>
                  </div>
                </div>
              </div>

              {/* Right: Numeric Input */}
              <div className="flex items-center justify-end">
                {action.type === 'numeric' && (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      placeholder="0"
                      className="w-14 h-7 text-xs text-right border border-gray-200 bg-white rounded px-1 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      defaultValue={log?.numeric_value ?? ''}
                      onBlur={(e) => handleNumericBlur(action, e.target.value)}
                    />
                    <span className="text-[10px] text-gray-400">/ {action.target_value}</span>
                  </div>
                )}
                {isSaving && <span className="ml-2 text-[10px] text-gray-300">...</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}