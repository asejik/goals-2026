import { useEffect, useState } from 'react';
import { useAuth, AuthProvider } from './context/AuthContext';
import Auth from './components/Auth';
import { supabase } from './lib/supabase';
import { Plus } from 'lucide-react';
import GoalForm from './components/goals/GoalForm';
import GoalList from './components/goals/GoalList';
import JournalSection from './components/dashboard/JournalSection';
import DailyTracker from './components/dashboard/DailyTracker';

function AppContent() {
  const { user, signOut } = useAuth();
  const [goals, setGoals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch goals from DB
  const fetchGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGoals(data);
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchGoals();
  }, [user]);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this goal? History will be lost.')) return;

    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (!error) {
      setGoals(goals.filter(g => g.id !== id));
    }
  };

  if (!user) return <Auth />;

  // ... inside AppContent ...

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-bold text-blue-600">2026 Goals</h1>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400 hidden sm:inline">Logged in as {user.email}</span>
          <button
            onClick={signOut}
            className="text-sm text-gray-500 hover:text-gray-800 font-medium"
          >
            Sign Out
          </button>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto p-6">

        {/* 1. THE DAILY TRACKER (Main Focus) */}
        <DailyTracker goals={goals} />

        {/* 2. JOURNAL (New) */}
        <JournalSection />

        {/* 3. SETTINGS */}
        <div className="mt-12 border-t border-gray-200 pt-8"></div>

        {/* 4. THE GOAL MANAGER (Collapsible) */}
        <div className="mt-12 border-t border-gray-200 pt-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-900">Goal Settings</h2>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus size={16} />
              {showForm ? 'Cancel' : 'Add New Goal'}
            </button>
          </div>

          {showForm && (
            <GoalForm
              onGoalAdded={() => {
                fetchGoals();
                setShowForm(false);
              }}
              onCancel={() => setShowForm(false)}
            />
          )}

          <GoalList goals={goals} onDelete={handleDelete} />
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}