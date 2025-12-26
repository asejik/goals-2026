import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { getTodayString, getStartOfWeek, formatDateReadable } from '../../lib/dateUtils';
import { Check, Flame, Calendar } from 'lucide-react';

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
  const [streaks, setStreaks] = useState({});
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    if (user && goals.length > 0) fetchData();
  }, [user, goals]);

  const fetchData = async () => {
    const { data: logs } = await supabase.from('daily_logs').select('*').eq('log_date', today);
    const logMap = {};
    logs?.forEach(log => logMap[log.goal_id] = log);
    setTodaysLogs(logMap);

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const { data: historyLogs } = await supabase
      .from('daily_logs')
      .select('goal_id, log_date, is_complete, numeric_value')
      .gte('log_date', twoWeeksAgo.toISOString().split('T')[0]);

    const streakMap = {};
    goals.forEach(goal => {
      const goalLogs = historyLogs?.filter(l => l.goal_id === goal.id) || [];
      streakMap[goal.id] = calculateStreak(goalLogs, goal);
    });
    setStreaks(streakMap);

    const progressMap = {};
    goals.forEach(goal => {
      if (goal.period === 'weekly') {
        const weeklyLogs = historyLogs?.filter(l => l.goal_id === goal.id && l.log_date >= startOfWeek) || [];
        const count = goal.type === 'boolean'
          ? weeklyLogs.filter(l => l.is_complete).length
          : weeklyLogs.reduce((acc, curr) => acc + (curr.numeric_value || 0), 0);
        progressMap[goal.id] = { current: count, target: goal.target_value };
      }
    });
    setPeriodProgress(progressMap);
  };

  const calculateStreak = (logs, goal) => {
    let streak = 0;
    const checkDate = new Date();
    checkDate.setHours(0,0,0,0);
    for (let i = 0; i < 14; i++) {
      const dateStr = checkDate.toISOString().split('T')[0];
      const log = logs.find(l => l.log_date === dateStr);
      let isDone = false;
      if (log) {
        if (goal.type === 'boolean') isDone = log.is_complete;
        else isDone = (log.numeric_value >= (goal.target_value || 0));
      }
      if (isDone) streak++;
      else if (i !== 0) break;
      checkDate.setDate(checkDate.getDate() - 1);
    }
    return streak;
  };

  const handleToggle = async (goal) => {
    const currentLog = todaysLogs[goal.id];
    const isComplete = currentLog ? !currentLog.is_complete : true;
    setTodaysLogs(prev => ({ ...prev, [goal.id]: { ...prev[goal.id], is_complete: isComplete } }));
    setStreaks(prev => ({ ...prev, [goal.id]: isComplete ? (prev[goal.id] || 0) + 1 : Math.max(0, (prev[goal.id] || 1) - 1) }));
    setSaving(goal.id);
    await supabase.from('daily_logs').upsert({
      user_id: user.id, goal_id: goal.id, log_date: today, is_complete: isComplete, numeric_value: isComplete ? 1 : 0
    }, { onConflict: 'goal_id, log_date' });
    if (onUpdate) onUpdate();
    setSaving(null);
  };

  const handleNumericBlur = async (goal, val) => {
    setSaving(goal.id);
    await supabase.from('daily_logs').upsert({
      user_id: user.id, goal_id: goal.id, log_date: today, numeric_value: val, is_complete: val >= (goal.target_value || 0)
    }, { onConflict: 'goal_id, log_date' });
    if (onUpdate) onUpdate();
    setSaving(null);
  };

  const visibleGoals = goals.filter(goal => {
    if (goal.period !== 'weekly') return true;
    if (!goal.specific_days || goal.specific_days.length === 0) return true;
    return goal.specific_days.includes(currentDayName);
  });

  if (goals.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex justify-between items-end mb-2 px-1">
        <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <Calendar size={14} className="text-blue-600" /> Today's Focus
        </h2>
        <p className="text-[10px] text-gray-400 font-medium uppercase">{formatDateReadable(today)}</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {visibleGoals.length === 0 && (
          <div className="py-6 text-center text-gray-400 text-xs">No goals scheduled for today.</div>
        )}

        {visibleGoals.map((goal, index) => {
          const log = todaysLogs[goal.id];
          const isDone = log?.is_complete;
          const streak = streaks[goal.id] || 0;
          const progress = periodProgress[goal.id];
          const isSaving = saving === goal.id;

          return (
            <div
              key={goal.id}
              className={`
                flex items-center justify-between p-3 gap-3 transition-colors
                ${index !== visibleGoals.length - 1 ? 'border-b border-gray-100' : ''}
                ${isDone ? 'bg-gray-50/80' : 'hover:bg-gray-50'}
              `}
            >
              {/* Left: Checkbox & Details */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button
                  onClick={() => goal.type === 'boolean' && handleToggle(goal)}
                  className={`
                    flex-shrink-0 w-5 h-5 rounded-[4px] border transition-all flex items-center justify-center
                    ${isDone ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 hover:border-blue-400'}
                  `}
                >
                  {isDone && <Check size={12} strokeWidth={3} />}
                </button>

                <div className="min-w-0">
                  <p className={`text-sm font-medium truncate leading-tight ${isDone ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                    {goal.title}
                  </p>

                  {/* Meta Row: Category | Streak | Weekly Progress */}
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                    <span className="font-medium text-gray-500">{goal.category}</span>

                    {streak > 0 && (
                      <span className="flex items-center gap-0.5 text-orange-600 font-semibold bg-orange-50 px-1 rounded">
                        <Flame size={8} fill="currentColor" /> {streak}
                      </span>
                    )}

                    {goal.period === 'weekly' && progress && (
                      <span className="text-blue-600 font-medium bg-blue-50 px-1 rounded">
                        {progress.current}/{progress.target} this week
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Numeric Input or Status */}
              <div className="flex items-center justify-end">
                {goal.type === 'numeric' && (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      placeholder="0"
                      className="w-14 h-7 text-xs text-right border border-gray-200 bg-white rounded px-1 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      defaultValue={log?.numeric_value ?? ''}
                      onBlur={(e) => handleNumericBlur(goal, e.target.value)}
                    />
                    <span className="text-[10px] text-gray-400">/ {goal.target_value}</span>
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