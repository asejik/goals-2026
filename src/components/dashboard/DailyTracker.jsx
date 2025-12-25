import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { getTodayString, formatDateReadable } from '../../lib/dateUtils';
import { CheckCircle2, Circle, Save } from 'lucide-react';

export default function DailyTracker({ goals }) {
  const { user } = useAuth();
  const today = getTodayString();

  // State to store today's logs (Map: goal_id -> log_object)
  const [logs, setLogs] = useState({});
  const [saving, setSaving] = useState(null); // stores goal_id being saved

  useEffect(() => {
    if (user && goals.length > 0) {
      fetchTodayLogs();
    }
  }, [user, goals]);

  const fetchTodayLogs = async () => {
    const { data, error } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('log_date', today);

    if (error) console.error('Error fetching logs:', error);

    // Convert array to an object for easier lookup: { goal_id: log_data }
    const logMap = {};
    data?.forEach(log => {
      logMap[log.goal_id] = log;
    });
    setLogs(logMap);
  };

  const handleToggle = async (goal) => {
    const currentLog = logs[goal.id];
    const isComplete = currentLog ? !currentLog.is_complete : true;

    // Optimistic Update (Update UI instantly)
    setLogs(prev => ({
      ...prev,
      [goal.id]: { ...prev[goal.id], is_complete: isComplete }
    }));
    setSaving(goal.id);

    // Send to DB
    const { error } = await supabase
      .from('daily_logs')
      .upsert({
        user_id: user.id,
        goal_id: goal.id,
        log_date: today,
        is_complete: isComplete,
        numeric_value: isComplete ? 1 : 0 // For booleans, 1=Done
      }, { onConflict: 'goal_id, log_date' });

    if (error) {
      console.error('Error saving:', error);
      // Revert if failed (optional, but good practice)
    }
    setSaving(null);
  };

  const handleNumericChange = async (goal, value) => {
    const numValue = parseFloat(value) || 0;

    // Update local state immediately for smooth typing
    setLogs(prev => ({
      ...prev,
      [goal.id]: { ...prev[goal.id], numeric_value: numValue }
    }));
  };

  const handleNumericBlur = async (goal) => {
    // Only save when user clicks away (onBlur) to prevent spamming DB while typing
    setSaving(goal.id);
    const val = logs[goal.id]?.numeric_value || 0;

    const { error } = await supabase
      .from('daily_logs')
      .upsert({
        user_id: user.id,
        goal_id: goal.id,
        log_date: today,
        numeric_value: val,
        is_complete: val >= (goal.target_value || 0) // Auto-mark complete if target reached?
      }, { onConflict: 'goal_id, log_date' });

    if (error) console.error(error);
    setSaving(null);
  };

  if (goals.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Today's Focus</h2>
          <p className="text-sm text-gray-500">{formatDateReadable(today)}</p>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {goals.map(goal => {
          const log = logs[goal.id];
          const isDone = log?.is_complete;
          const isSaving = saving === goal.id;

          return (
            <div key={goal.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                {/* Icon Wrapper */}
                <div className={`p-2 rounded-lg ${isDone ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  {isDone ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                </div>

                <div>
                  <p className={`font-medium ${isDone ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                    {goal.title}
                  </p>
                  <p className="text-xs text-gray-400">{goal.category}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {isSaving && <Save size={14} className="animate-pulse text-blue-500" />}

                {goal.type === 'boolean' ? (
                  <button
                    onClick={() => handleToggle(goal)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isDone
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {isDone ? 'Completed' : 'Mark Done'}
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-right focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="0"
                      value={log?.numeric_value ?? ''}
                      onChange={(e) => handleNumericChange(goal, e.target.value)}
                      onBlur={() => handleNumericBlur(goal)}
                    />
                    <span className="text-xs text-gray-400">/ {goal.target_value}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}