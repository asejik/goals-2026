import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { getTodayString, getStartOfWeek, formatDateReadable } from '../../lib/dateUtils';
import { Check, Save, Flame } from 'lucide-react'; // Import Flame

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
  const [streaks, setStreaks] = useState({}); // Stores streak count per goal
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    if (user && goals.length > 0) {
      fetchData();
    }
  }, [user, goals]);

  const fetchData = async () => {
    // 1. Fetch Today's Logs
    const { data: logs } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('log_date', today);

    const logMap = {};
    logs?.forEach(log => {
      logMap[log.goal_id] = log;
    });
    setTodaysLogs(logMap);

    // 2. Fetch History for Streaks (Last 14 days)
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const { data: historyLogs } = await supabase
      .from('daily_logs')
      .select('goal_id, log_date, is_complete, numeric_value')
      .gte('log_date', twoWeeksAgo.toISOString().split('T')[0])
      .order('log_date', { ascending: false }); // Newest first

    // Calculate Streaks
    const streakMap = {};
    goals.forEach(goal => {
      const goalLogs = historyLogs?.filter(l => l.goal_id === goal.id) || [];
      streakMap[goal.id] = calculateStreak(goalLogs, goal);
    });
    setStreaks(streakMap);

    // 3. Weekly Progress (Keep existing logic)
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

  // Helper: Count consecutive days
  const calculateStreak = (logs, goal) => {
    let streak = 0;
    // We check backwards from Today or Yesterday
    const checkDate = new Date();

    // Normalize time to midnight to avoid timezone issues
    checkDate.setHours(0,0,0,0);

    // Allow for "yesterday" to count if today isn't done yet
    // Loop back 14 days
    for (let i = 0; i < 14; i++) {
      const dateStr = checkDate.toISOString().split('T')[0];

      // Find log for this date
      const log = logs.find(l => l.log_date === dateStr);

      // Determine if "Done"
      let isDone = false;
      if (log) {
        if (goal.type === 'boolean') isDone = log.is_complete;
        else isDone = (log.numeric_value >= (goal.target_value || 0));
      }

      if (isDone) {
        streak++;
      } else {
        // If we miss TODAY, the streak is not broken yet (unless we're checking yesterday)
        // If i=0 (Today) and it's not done, we don't increment, but we don't break either.
        if (i === 0) {
          // Do nothing, just continue to yesterday
        } else {
          break; // Break streak on first missed day (yesterday or before)
        }
      }

      // Move back one day
      checkDate.setDate(checkDate.getDate() - 1);
    }
    return streak;
  };

  const handleToggle = async (goal) => {
    const currentLog = todaysLogs[goal.id];
    const isComplete = currentLog ? !currentLog.is_complete : true;

    // Optimistic Update
    setTodaysLogs(prev => ({
      ...prev,
      [goal.id]: { ...prev[goal.id], is_complete: isComplete }
    }));

    // Update Streak Optimistically (Simple add/subtract 1 if today)
    setStreaks(prev => ({
      ...prev,
      [goal.id]: isComplete ? (prev[goal.id] || 0) + 1 : Math.max(0, (prev[goal.id] || 1) - 1)
    }));

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

  // ... handleNumericChange & handleNumericBlur (Keep same as before) ...
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

  // Filter Logic
  const visibleGoals = goals.filter(goal => {
    if (goal.period !== 'weekly') return true;
    if (!goal.specific_days || goal.specific_days.length === 0) return true;
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
    <div className="mb-24 md:mb-10"> {/* Extra margin on mobile for fab */}
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
          const streak = streaks[goal.id] || 0;
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
              {/* Progress Bar (Weekly) */}
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
                    {/* GAMIFICATION: Streak Badge */}
                    {streak > 1 && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-full">
                        <Flame size={10} fill="currentColor" /> {streak}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <p className="text-[11px] text-gray-400">{goal.category}</p>
                    {goal.period === 'weekly' && (
                        <span className="text-[10px] text-blue-500 font-medium">
                         • {progress?.current || 0}/{progress?.target} this week
                        </span>
                    )}
                  </div>
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