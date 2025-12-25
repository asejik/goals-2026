import { useEffect, useState } from 'react';
import { useAuth, AuthProvider } from './context/AuthContext';
import Auth from './components/Auth';
import { supabase } from './lib/supabase';
import { Plus } from 'lucide-react';
import { Toaster, toast } from 'sonner'; // NEW IMPORT
import GoalForm from './components/goals/GoalForm';
import GoalList from './components/goals/GoalList';
import DailyTracker from './components/dashboard/DailyTracker';
import JournalSection from './components/dashboard/JournalSection';
import ProgressSection from './components/analytics/ProgressSection';
import AiCoach from './components/dashboard/AiCoach';
import ConfirmModal from './components/ui/ConfirmModal'; // NEW IMPORT

function AppContent() {
  const { user, signOut } = useAuth();
  const [goals, setGoals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // NEW: State for Deletion Modal
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, goalId: null });

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
      toast.error('Failed to load goals'); // NEW: Toast
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchGoals();
  }, [user]);

  // OLD: window.confirm
  // NEW: Open Modal
  const confirmDelete = (id) => {
    setDeleteModal({ isOpen: true, goalId: id });
  };

  // NEW: Execute Delete
  const executeDelete = async () => {
    const id = deleteModal.goalId;
    // Optimistic Update
    setGoals(goals.filter(g => g.id !== id));
    setDeleteModal({ isOpen: false, goalId: null });
    toast.success('Goal deleted successfully');

    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (error) {
      toast.error('Error deleting goal');
      fetchGoals(); // Revert on error
    }
  };

  if (!user) return <Auth />;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* GLOBAL TOASTER */}
      <Toaster position="top-center" richColors />

      {/* CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        onConfirm={executeDelete}
        title="Delete Goal?"
        message="Are you sure you want to delete this goal? All daily history and streaks associated with it will be permanently lost."
        confirmText="Yes, Delete It"
        isDestructive={true}
      />

      <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">2026 Goals</h1>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400 hidden sm:inline">Logged in as {user.email}</span>
          <button
            onClick={signOut}
            className="text-sm text-gray-500 hover:text-gray-800 font-medium transition-colors"
          >
            Sign Out
          </button>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto p-6 space-y-8">

        {/* 0. AI COACH */}
        <AiCoach goals={goals} />

        {/* 1. THE DAILY TRACKER */}
        <DailyTracker
          goals={goals}
          onUpdate={() => setLastUpdate(Date.now())}
        />

        {/* 2. THE JOURNAL SECTION */}
        <JournalSection />

        {/* 3. VISUALIZATION */}
        <div className="border-t border-gray-200 pt-8">
           <ProgressSection goals={goals} lastUpdate={lastUpdate} />
        </div>

        {/* 4. GOAL SETTINGS */}
        <div className="pt-8 border-t border-gray-200">
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
                toast.success('New goal created!'); // Success Toast
              }}
              onCancel={() => setShowForm(false)}
            />
          )}

          {loading ? (
            <div className="text-center py-10 text-gray-400">Loading goals...</div>
          ) : (
            // Pass the NEW confirmDelete function instead of the old handleDelete
            <GoalList goals={goals} onDelete={confirmDelete} />
          )}
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