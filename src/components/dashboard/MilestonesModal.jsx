import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Trophy, Flame, CheckCircle2, BookOpen, Zap, Medal, Lock } from 'lucide-react';

// DEFINITION OF BADGES
const BADGES = [
  {
    id: 'rookie',
    title: 'First Step',
    description: 'Complete your first action step.',
    icon: CheckCircle2,
    color: 'bg-blue-100 text-blue-600',
    condition: (stats) => stats.total_logs >= 1
  },
  {
    id: 'streak_3',
    title: 'Momentum',
    description: 'Reach a 3-day streak.',
    icon: Zap,
    color: 'bg-yellow-100 text-yellow-600',
    condition: (stats) => stats.streak >= 3
  },
  {
    id: 'streak_7',
    title: 'On Fire',
    description: 'Reach a 7-day streak.',
    icon: Flame,
    color: 'bg-orange-100 text-orange-600',
    condition: (stats) => stats.streak >= 7
  },
  {
    id: 'club_10',
    title: 'Double Digits',
    description: 'Complete 10 total actions.',
    icon: Medal,
    color: 'bg-indigo-100 text-indigo-600',
    condition: (stats) => stats.total_logs >= 10
  },
  {
    id: 'club_100',
    title: 'Centurion',
    description: 'Complete 100 total actions.',
    icon: Trophy,
    color: 'bg-purple-100 text-purple-600',
    condition: (stats) => stats.total_logs >= 100
  },
  {
    id: 'reflector',
    title: 'Self Aware',
    description: 'Complete your first Weekly Review.',
    icon: BookOpen,
    color: 'bg-green-100 text-green-600',
    condition: (stats) => stats.total_reviews >= 1
  }
];

export default function MilestonesModal({ onClose }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Call our new SQL function
      const { data, error } = await supabase.rpc('get_user_stats');
      if (error) throw error;
      setStats(data); // { total_logs: 5, streak: 2, total_reviews: 0 }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* HEADER */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Trophy className="text-yellow-500" /> Achievements
            </h2>
            <p className="text-xs text-gray-500"> milestones unlocked along your journey.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X /></button>
        </div>

        {/* STATS OVERVIEW */}
        {stats && (
          <div className="grid grid-cols-3 gap-1 px-6 py-4 border-b border-gray-100">
            <div className="text-center p-2">
              <div className="text-lg font-bold text-gray-900">{stats.streak}</div>
              <div className="text-[10px] uppercase font-bold text-gray-400">Current Streak</div>
            </div>
            <div className="text-center p-2 border-l border-r border-gray-100">
              <div className="text-lg font-bold text-gray-900">{stats.total_logs}</div>
              <div className="text-[10px] uppercase font-bold text-gray-400">Total Actions</div>
            </div>
            <div className="text-center p-2">
              <div className="text-lg font-bold text-gray-900">{stats.total_reviews}</div>
              <div className="text-[10px] uppercase font-bold text-gray-400">Reviews</div>
            </div>
          </div>
        )}

        {/* BADGES GRID */}
        <div className="p-6 overflow-y-auto bg-gray-50/50">
          {loading ? (
            <div className="text-center text-gray-400 py-10">Checking records...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {BADGES.map((badge) => {
                const isUnlocked = stats ? badge.condition(stats) : false;

                return (
                  <div
                    key={badge.id}
                    className={`
                      relative p-4 rounded-xl border flex items-center gap-4 transition-all
                      ${isUnlocked
                        ? 'bg-white border-gray-200 shadow-sm'
                        : 'bg-gray-100 border-gray-200 opacity-60 grayscale'
                      }
                    `}
                  >
                    {/* ICON */}
                    <div className={`p-3 rounded-full ${isUnlocked ? badge.color : 'bg-gray-200 text-gray-400'}`}>
                      <badge.icon size={20} />
                    </div>

                    {/* TEXT */}
                    <div>
                      <h3 className={`text-sm font-bold ${isUnlocked ? 'text-gray-900' : 'text-gray-500'}`}>
                        {badge.title}
                      </h3>
                      <p className="text-xs text-gray-500 leading-tight mt-0.5">
                        {badge.description}
                      </p>
                    </div>

                    {/* LOCK ICON (If locked) */}
                    {!isUnlocked && (
                      <div className="absolute top-4 right-4 text-gray-300">
                        <Lock size={14} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}