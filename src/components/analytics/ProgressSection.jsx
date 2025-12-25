import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Activity } from 'lucide-react';

export default function ProgressSection({ goals, lastUpdate }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([]);

  useEffect(() => {
    if (user && goals.length > 0) {
      calculateStats();
    }
  }, [user, goals, lastUpdate]);

  const calculateStats = async () => {
    // 1. Fetch all logs for this user (for MVP this is fine, later we limit to last 30 days)
    const { data: logs } = await supabase
      .from('daily_logs')
      .select('goal_id, numeric_value, is_complete, log_date')
      .order('log_date', { ascending: true });

    if (!logs) return;

    // 2. Process data for each goal
    const computedStats = goals.map(goal => {
      // Filter logs for this specific goal
      const goalLogs = logs.filter(l => l.goal_id === goal.id);

      // Calculate Total Completions / Sum
      const totalNumeric = goalLogs.reduce((sum, l) => sum + (l.numeric_value || 0), 0);
      const completionCount = goalLogs.filter(l => l.is_complete).length;

      // Prepare Chart Data (Last 7 entries for cleanliness)
      const chartData = goalLogs.slice(-7).map(l => ({
        date: new Date(l.log_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: goal.type === 'numeric' ? l.numeric_value : (l.is_complete ? 1 : 0)
      }));

      return {
        ...goal,
        totalNumeric,
        completionCount,
        chartData
      };
    });

    setStats(computedStats);
    setLoading(false);
  };

  if (loading) return <div className="text-center py-8 text-gray-400">Loading insights...</div>;
  if (goals.length === 0) return null;

  return (
    <div className="mb-12">
      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <TrendingUp className="text-blue-600" />
        Performance Insights
      </h2>

      <div className="grid md:grid-cols-2 gap-6">
        {stats.map(stat => (
          <div key={stat.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-gray-800">{stat.title}</h3>
                <span className="text-xs text-gray-500 uppercase tracking-wide">{stat.category}</span>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">
                  {stat.type === 'numeric'
                    ? stat.totalNumeric.toLocaleString()
                    : `${stat.completionCount} Days`}
                </p>
                <p className="text-xs text-gray-400">Total {stat.type === 'numeric' ? 'Volume' : 'Done'}</p>
              </div>
            </div>

            {/* The Chart */}
            <div className="h-32 w-full mt-4">
              {stat.chartData.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  {stat.type === 'numeric' ? (
                    <LineChart data={stat.chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="date" hide />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        itemStyle={{ color: '#2563eb', fontWeight: 'bold' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#2563eb' }}
                      />
                    </LineChart>
                  ) : (
                    <BarChart data={stat.chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="date" hide />
                      <Tooltip cursor={{fill: '#f8fafc'}} />
                      <Bar dataKey="value" fill="#4ade80" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-xs bg-gray-50 rounded-lg">
                  <Activity size={16} className="mr-2" />
                  Need more data to visualize
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}