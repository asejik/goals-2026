import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Target, Calendar, AlertCircle } from 'lucide-react';

export default function ProgressSection({ lastUpdate }) {
  const { user } = useAuth();
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) calculateStats();
  }, [user, lastUpdate]);

  const calculateStats = async () => {
    const { data: actions } = await supabase
      .from('action_steps')
      .select('*, goals (title, categories(name))');

    if (!actions || actions.length === 0) {
      setLoading(false);
      return;
    }

    const { data: logs } = await supabase
      .from('daily_logs')
      .select('action_step_id, numeric_value, is_complete');

    const computed = actions.map(action => {
      const actionLogs = logs?.filter(l => l.action_step_id === action.id) || [];

      let totalDone = 0;
      if (action.type === 'boolean') {
        totalDone = actionLogs.filter(l => l.is_complete).length;
      } else {
        totalDone = actionLogs.reduce((acc, curr) => acc + (curr.numeric_value || 0), 0);
      }

      let estimatedTotalTarget = action.target_value;
      if (action.period === 'daily') estimatedTotalTarget = 30;
      if (action.period === 'weekly') estimatedTotalTarget = 12;
      if (action.period === 'onetime') estimatedTotalTarget = action.target_value;

      const percentage = estimatedTotalTarget ? Math.min(100, Math.round((totalDone / estimatedTotalTarget) * 100)) : 0;

      let daysRemaining = null;
      let isOverdue = false;
      if (action.end_date) {
        const today = new Date();
        const due = new Date(action.end_date);
        const diffTime = due - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        daysRemaining = diffDays;
        if (diffDays < 0) isOverdue = true;
      }

      return {
        ...action,
        totalDone,
        percentage,
        daysRemaining,
        isOverdue,
        goalTitle: action.goals?.title,
        categoryName: action.goals?.categories?.name
      };
    });

    setStats(computed);
    setLoading(false);
  };

  if (loading) return null;
  if (stats.length === 0) return null;

  return (
    <div className="mb-12 animate-in fade-in duration-500">
      <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Target size={16} className="text-gray-700" />
        Performance & Deadlines
      </h2>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        {/* Header - Desktop Only */}
        <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-b border-gray-100 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
          <div className="col-span-5">Action Step</div>
          <div className="col-span-4">Progress</div>
          <div className="col-span-3 text-right">Deadline</div>
        </div>

        <div className="divide-y divide-gray-50">
          {stats.map(stat => (
            <div key={stat.id} className="p-4 sm:py-3 hover:bg-gray-50/50 transition-colors">

              {/* DESKTOP VIEW (Grid) */}
              <div className="hidden sm:grid grid-cols-12 gap-4 items-center">
                 <div className="col-span-5 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{stat.title}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">{stat.categoryName} • {stat.goalTitle}</p>
                 </div>
                 <div className="col-span-4">
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-1000 ${stat.totalDone > 0 ? 'bg-blue-600' : 'bg-gray-200'}`} style={{ width: `${Math.min(100, stat.totalDone * 5)}%` }} />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">{stat.totalDone} done</p>
                 </div>
                 <div className="col-span-3 flex justify-end">
                    {stat.end_date ? (
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${stat.isOverdue ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                        {stat.daysRemaining} Days Left
                      </span>
                    ) : <span className="text-[10px] text-gray-300">-</span>}
                 </div>
              </div>

              {/* MOBILE VIEW (Compact Flex Row) */}
              <div className="sm:hidden flex justify-between items-center gap-4">
                 <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-gray-900 truncate">{stat.title}</p>
                      {stat.end_date && (
                         <span className={`text-[10px] font-bold px-1.5 rounded ${stat.isOverdue ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                           {stat.daysRemaining}d
                         </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 truncate">{stat.goalTitle}</p>
                 </div>

                 <div className="w-24 text-right">
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mb-1">
                       <div className={`h-full rounded-full ${stat.totalDone > 0 ? 'bg-blue-600' : 'bg-gray-200'}`} style={{ width: `${Math.min(100, stat.totalDone * 5)}%` }} />
                    </div>
                    <p className="text-[10px] text-gray-500 font-medium">{stat.totalDone} completed</p>
                 </div>
              </div>

            </div>
          ))}
        </div>
      </div>
    </div>
  );
}