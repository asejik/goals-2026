import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { getTodayString, getStartOfWeek, formatDateReadable } from '../../lib/dateUtils';
import { Check, Flame, Trophy, Calendar } from 'lucide-react';

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
    // 1. Today's Logs
    const { data: logs } = await supabase.from('daily_logs').select('*').eq('log_date', today);
    const logMap = {};
    logs?.forEach(log => logMap[log.goal_id] = log);
    setTodaysLogs(logMap);

    // 2. Streaks (Last 14 days)
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const { data: historyLogs } = await supabase
      .from('daily_logs')
      .select('goal_id, log_date, is_complete, numeric_value')
      .gte('log_date', twoWeeksAgo.toISOString().split('T')[0])
      .order('log_date', { ascending: false });

    // Calculate Streaks
    const streakMap = {};
    goals.forEach(goal => {
      const goalLogs = historyLogs?.filter(l => l.goal_id === goal.id) || [];
      streakMap[goal.id] = calculateStreak(goalLogs, goal);
    });
    setStreaks(streakMap);

    // 3. Weekly Progress
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
      else if (i !== 0) break; // Don't break if today is missing, only yesterday

      checkDate.setDate(checkDate.getDate() - 1);
    }
    return streak;
  };

  const handleToggle = async (goal) => {
    const currentLog = todaysLogs[goal.id];
    const isComplete = currentLog ? !currentLog.is_complete : true;

    setTodaysLogs(prev => ({
      ...prev, [goal.id]: { ...prev[goal.id], is_complete: isComplete }
    }));

    setStreaks(prev => ({
      ...prev, [goal.id]: isComplete ? (prev[goal.id] || 0) + 1 : Math.max(0, (prev[goal.id] || 1) - 1)
    }));

    setSaving(goal.id);
    await supabase.from('daily_logs').upsert({
      user_id: user.id, goal_id: goal.id, log_date: today,
      is_complete: isComplete, numeric_value: isComplete ? 1 : 0
    }, { onConflict: 'goal_id, log_date' });

    if (onUpdate) onUpdate();
    setSaving(null);
  };

  const handleNumericBlur = async (goal, val) => {
    setSaving(goal.id);
    await supabase.from('daily_logs').upsert({
      user_id: user.id, goal_id: goal.id, log_date: today,
      numeric_value: val, is_complete: val >= (goal.target_value || 0)
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
    <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Row */}
      <div className="flex justify-between items-end mb-3 px-1">
        <div>
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Calendar size={16} className="text-blue-600" />
            Today's Focus
          </h2>
          <p className="text-xs text-gray-500 ml-6">{formatDateReadable(today)}</p>
        </div>
      </div>

      {/* TABLE-LIKE CONTAINER */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">

        {/* Table Header (Hidden on small mobile, visible on tablet+) */}
        <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
          <div className="col-span-6">Goal Name</div>
          <div className="col-span-2 text-center">Streak</div>
          <div className="col-span-2 text-center">Weekly</div>
          <div className="col-span-2 text-right">Action</div>
        </div>

        {/* Empty State */}
        {visibleGoals.length === 0 && (
          <div className="py-8 text-center text-gray-400 text-xs">
            No goals scheduled for today.
          </div>
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
                relative grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 p-3 sm:py-2.5 items-center transition-all
                ${index !== visibleGoals.length - 1 ? 'border-b border-gray-100' : ''}
                ${isDone ? 'bg-gray-50/60' : 'hover:bg-gray-50'}
              `}
            >
              {/* COL 1: GOAL NAME & PILLAR */}
              <div className="col-span-1 sm:col-span-6 flex items-center gap-3 min-w-0">
                 {/* Checkbox (Left aligned for mobile ease) */}
                 <button
                  onClick={() => goal.type === 'boolean' && handleToggle(goal)}
                  className={`
                    flex-shrink-0 w-4 h-4 rounded-[4px] border transition-all flex items-center justify-center
                    ${isDone
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-gray-300 hover:border-blue-400'
                    }
                  `}
                >
                  {isDone && <Check size={10} strokeWidth={4} />}
                </button>

                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium truncate leading-none ${isDone ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                    {goal.title}
                  </p>
                  {/* Category Badge (Tiny) */}
                  <span className="inline-flex sm:hidden mt-1 text-[10px] text-gray-400 border border-gray-100 px-1 rounded">
                    {goal.category}
                  </span>
                </div>
              </div>

              {/* COL 2: STREAK (Middle) */}
              <div className="col-span-1 sm:col-span-2 flex items-center sm:justify-center gap-4 sm:gap-1 text-xs text-gray-500 pl-7 sm:pl-0">
                <div className="flex items-center gap-1.5" title="Current Streak">
                  <Flame size={12} className={streak > 0 ? "text-orange-500 fill-orange-500" : "text-gray-300"} />
                  <span className={streak > 0 ? "font-semibold text-gray-700" : ""}>{streak} Day{streak !== 1 && 's'}</span>
                </div>
              </div>

              {/* COL 3: WEEKLY PROGRESS (Middle) */}
              <div className="col-span-1 sm:col-span-2 flex items-center sm:justify-center pl-7 sm:pl-0">
                 {goal.period === 'weekly' && progress ? (
                   <div className="flex items-center gap-2 w-full sm:w-auto">
                     <div className="h-1.5 flex-1 sm:w-16 bg-gray-100 rounded-full overflow-hidden">
                       <div
                         className="h-full bg-blue-500 rounded-full transition-all duration-500"
                         style={{ width: `${Math.min(100, (progress.current / progress.target) * 100)}%` }}
                       />
                     </div>
                     <span className="text-[10px] text-gray-500 font-medium whitespace-nowrap">
                       {progress.current}/{progress.target}
                     </span>
                   </div>
                 ) : (
                   <span className="hidden sm:block text-[10px] text-gray-300">-</span>
                 )}
              </div>

              {/* COL 4: ACTION (Numeric Input) */}
              <div className="col-span-1 sm:col-span-2 flex items-center justify-end pl-7 sm:pl-0">
                {goal.type === 'numeric' && (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      placeholder="0"
                      className="w-16 h-7 text-xs text-right border border-gray-200 bg-white rounded px-2 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      defaultValue={log?.numeric_value ?? ''}
                      onBlur={(e) => handleNumericBlur(goal, e.target.value)}
                    />
                    <span className="text-[10px] text-gray-400">/ {goal.target_value}</span>
                  </div>
                )}
                {isSaving && <span className="ml-2 text-[10px] text-gray-400">Saving...</span>}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}