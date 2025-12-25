import { useEffect, useState } from 'react';
import { useAuth, AuthProvider } from './context/AuthContext';
import Auth from './components/Auth';
import { supabase } from './lib/supabase';
import { Plus } from 'lucide-react';
import GoalForm from './components/goals/GoalForm';
import GoalList from './components/goals/GoalList';

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

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-bold text-blue-600">2026 Goals</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={signOut}
            className="text-sm text-gray-500 hover:text-gray-800 font-medium"
          >
            Sign Out
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Your Ambitions</h2>
            <p className="text-gray-500 text-sm mt-1">Define what success looks like.</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-lg transition-all shadow-lg shadow-gray-200"
          >
            <Plus size={18} />
            {showForm ? 'Close' : 'Add Goal'}
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

        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading goals...</div>
        ) : (
          <GoalList goals={goals} onDelete={handleDelete} />
        )}
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