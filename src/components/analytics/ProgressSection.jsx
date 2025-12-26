import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Target, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ProgressSection({ goals, lastUpdate }) {
  const { user } = useAuth();
  const [stats, setStats] = useState([]);

  useEffect(() => {
    if (user && goals.length > 0) calculateStats();
  }, [user, goals, lastUpdate]);

  const calculateStats = async () => {
    // Fetch ALL logs (for "All Time" progress)
    const { data: logs } = await supabase
      .from('daily_logs')
      .select('goal_id, numeric_value, is_complete');

    if (!logs) return;

    const computed = goals.map(goal => {
      // 1. Calculate Progress
      const goalLogs = logs.filter(l => l.goal_id === goal.id);

      let totalDone = 0;
      if (goal.type === 'boolean') {
        totalDone = goalLogs.filter(l => l.is_complete).length;
      } else {
        totalDone = goalLogs.reduce((acc, curr) => acc + (curr.numeric_value || 0), 0);
      }

      // Determine Target (If yearly, use target_value directly. If weekly, multiply by ~52?
      // For now, if no yearly target is set, we just show the Count without a % bar, or assume 365 for daily)
      let target = goal.target_value;

      // Heuristic: If it's a daily boolean goal without a specific target number, assume 365 days goal
      if (!target && goal.period === 'daily') target = 365;
      if (!target && goal.period === 'weekly') target = 52;

      const percentage = target ? Math.min(100, Math.round((totalDone / target) * 100)) : 0;

      // 2. Calculate Days Remaining
      let daysRemaining = null;
      let isOverdue = false;

      if (goal.due_date) {
        const today = new Date();
        const due = new Date(goal.due_date);
        const diffTime = due - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        daysRemaining = diffDays;
        if (diffDays < 0) isOverdue = true;
      }

      return {
        ...goal,
        totalDone,
        target,
        percentage,
        daysRemaining,
        isOverdue
      };
    });

    setStats(computed);
  };

  if (goals.length === 0) return null;

  return (
    <div className="mb-12 animate-in fade-in duration-500">
      <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Target size={18} className="text-gray-700" />
        Performance & Deadlines
      </h2>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        {/* Table Header - Desktop Only */}
        <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-b border-gray-100 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          <div className="col-span-5">Goal</div>
          <div className="col-span-3">Progress</div>
          <div className="col-span-4 text-right">Deadline</div>
        </div>

        <div className="divide-y divide-gray-50">
          {stats.map(stat => (
            <div key={stat.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 p-4 sm:py-3 items-center hover:bg-gray-50/50 transition-colors">

              {/* 1. Goal Name */}
              <div className="col-span-5 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{stat.title}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{stat.category}</p>
              </div>

              {/* 2. Progress Bar */}
              <div className="col-span-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-medium text-gray-600">
                    {stat.totalDone} <span className="text-gray-300">/ {stat.target || '?'}</span>
                  </span>
                  <span className="text-[10px] font-bold text-gray-900 ml-auto">{stat.percentage}%</span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      stat.percentage >= 100 ? 'bg-green-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${stat.percentage}%` }}
                  />
                </div>
              </div>

              {/* 3. Deadline Status */}
              <div className="col-span-4 flex items-center justify-end gap-2">
                {stat.due_date ? (
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium border ${
                    stat.isOverdue
                      ? 'bg-red-50 text-red-600 border-red-100'
                      : stat.daysRemaining <= 30
                        ? 'bg-yellow-50 text-yellow-700 border-yellow-100'
                        : 'bg-gray-50 text-gray-600 border-gray-100'
                  }`}>
                    {stat.isOverdue ? <AlertCircle size={10} /> : <Calendar size={10} />}
                    {stat.isOverdue
                      ? `${Math.abs(stat.daysRemaining)} Days Overdue`
                      : `${stat.daysRemaining} Days Left`
                    }
                  </div>
                ) : (
                  <span className="text-[10px] text-gray-300 italic">No deadline</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}