import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { getTodayString, getStartOfWeek, formatDateReadable } from '../../lib/dateUtils';
import { Check, Save } from 'lucide-react';

const getCurrentDayName = () => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[new Date().getDay()];
};

export default function DailyTracker({ goals, onUpdate }) {
  const { user } = useAuth();
  const today = getTodayString();
  const startOfWeek = getStartOfWeek();
  const currentDayName = getCurrentDayName();

  const [todaysLogs, setTodaysLogs] = useState({});
  const [periodProgress, setPeriodProgress] = useState({});
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    if (user && goals.length > 0) {
      fetchData();
    }
  }, [user, goals]);

  const fetchData = async () => {
    // 1. Fetch Today's Logs (for the checkboxes)
    const { data: logs } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('log_date', today);

    const logMap = {};
    logs?.forEach(log => {
      logMap[log.goal_id] = log;
    });
    setTodaysLogs(logMap);

    // 2. Fetch Weekly Progress
    // We get all logs from the start of the week to calculate "2/3 done"
    const { data: periodLogs } = await supabase
      .from('daily_logs')
      .select('goal_id, numeric_value, is_complete')
      .gte('log_date', startOfWeek);

    const progressMap = {};

    goals.forEach(goal => {
      if (goal.period === 'weekly') {
        const relevantLogs = periodLogs?.filter(l => l.goal_id === goal.id) || [];

        const count = goal.type === 'boolean'
          ? relevantLogs.filter(l => l.is_complete).length
          : relevantLogs.reduce((acc, curr) => acc + (curr.numeric_value || 0), 0);

        progressMap[goal.id] = { current: count, target: goal.target_value };
      }
    });
    setPeriodProgress(progressMap);
  };

  const handleToggle = async (goal) => {
    const currentLog = todaysLogs[goal.id];
    const isComplete = currentLog ? !currentLog.is_complete : true;

    // Optimistic Update: Checkbox
    setTodaysLogs(prev => ({
      ...prev,
      [goal.id]: { ...prev[goal.id], is_complete: isComplete }
    }));

    // Optimistic Update: Weekly Progress
    if (goal.period === 'weekly') {
      setPeriodProgress(prev => {
        const curr = prev[goal.id]?.current || 0;
        return {
          ...prev,
          [goal.id]: {
            ...prev[goal.id],
            current: isComplete ? curr + 1 : Math.max(0, curr - 1)
          }
        };
      });
    }

    setSaving(goal.id);

    const { error } = await supabase.from('daily_logs').upsert({
      user_id: user.id,
      goal_id: goal.id,
      log_date: today,
      is_complete: isComplete,
      numeric_value: isComplete ? 1 : 0
    }, { onConflict: 'goal_id, log_date' });

    if (!error && onUpdate) onUpdate();
    setSaving(null);
  };

  const handleNumericChange = (goal, value) => {
    const numValue = parseFloat(value) || 0;
    setTodaysLogs(prev => ({
      ...prev,
      [goal.id]: { ...prev[goal.id], numeric_value: numValue }
    }));
  };

  const handleNumericBlur = async (goal) => {
    setSaving(goal.id);
    const val = todaysLogs[goal.id]?.numeric_value || 0;

    await supabase.from('daily_logs').upsert({
      user_id: user.id,
      goal_id: goal.id,
      log_date: today,
      numeric_value: val,
      is_complete: val >= (goal.target_value || 0)
    }, { onConflict: 'goal_id, log_date' });

    if (onUpdate) onUpdate();
    setSaving(null);
  };

  // Logic: Filter visible goals based on Specific Days
  const visibleGoals = goals.filter(goal => {
    // Show all if not weekly
    if (goal.period !== 'weekly') return true;
    // Show if no specific days set
    if (!goal.specific_days || goal.specific_days.length === 0) return true;
    // Show only if Today matches one of the specific days
    return goal.specific_days.includes(currentDayName);
  });

  if (goals.length === 0) return null;

  if (visibleGoals.length === 0) {
    return (
      <div className="mb-10 text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
        <p className="text-sm font-medium text-gray-600">No goals scheduled for {currentDayName}.</p>
        <p className="text-xs text-gray-400 mt-1">Take a rest or work on your backlog.</p>
      </div>
    );
  }

  return (
    <div className="mb-10">
      <div className="flex justify-between items-end mb-4 px-1">
        <div>
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Today's Focus</h2>
          <p className="text-xs text-gray-400 mt-0.5">{formatDateReadable(today)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {visibleGoals.map((goal, index) => {
          const log = todaysLogs[goal.id];
          const isDone = log?.is_complete;
          const progress = periodProgress[goal.id];

          const percent = progress && progress.target
            ? Math.min(100, (progress.current / progress.target) * 100)
            : 0;

          return (
            <div
              key={goal.id}
              className={`
                group relative flex items-center justify-between p-4 transition-all
                ${index !== visibleGoals.length - 1 ? 'border-b border-gray-100' : ''}
                ${isDone ? 'bg-gray-50/50' : 'hover:bg-gray-50'}
              `}
            >
              {/* Progress Bar (Weekly Goals Only) */}
              {goal.period === 'weekly' && (
                <div
                  className="absolute bottom-0 left-0 h-[3px] bg-blue-500/20 transition-all duration-500"
                  style={{ width: `${percent}%` }}
                />
              )}

              <div className="flex items-center gap-4 overflow-hidden">
                <button
                  onClick={() => goal.type === 'boolean' && handleToggle(goal)}
                  className={`
                    flex-shrink-0 size-6 rounded-md border transition-all flex items-center justify-center
                    ${isDone
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm scale-95'
                      : 'bg-white border-gray-300 text-transparent hover:border-blue-400'
                    }
                  `}
                >
                  <Check size={14} strokeWidth={3} />
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium truncate transition-colors ${isDone ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                      {goal.title}
                    </p>
                    {goal.period === 'weekly' && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full font-bold">
                        {progress?.current || 0}/{progress?.target}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400">{goal.category}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 pl-4">
                {saving === goal.id && <Save size={14} className="text-gray-300 animate-pulse" />}

                {goal.type === 'numeric' && (
                   <input
                      type="number"
                      className="w-20 px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-md text-right focus:ring-1 focus:ring-blue-500 outline-none transition-all font-medium"
                      placeholder="0"
                      value={log?.numeric_value ?? ''}
                      onChange={(e) => handleNumericChange(goal, e.target.value)}
                      onBlur={() => handleNumericBlur(goal)}
                    />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}