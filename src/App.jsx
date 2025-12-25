import { useEffect, useState } from 'react';
import { useAuth, AuthProvider } from './context/AuthContext';
import Auth from './components/Auth';
import { supabase } from './lib/supabase';
import { Plus, LayoutDashboard, BookOpen } from 'lucide-react'; // Added icons
import { Toaster, toast } from 'sonner';
import GoalForm from './components/goals/GoalForm';
import GoalList from './components/goals/GoalList';
import DailyTracker from './components/dashboard/DailyTracker';
// import JournalSection from './components/dashboard/JournalSection'; // REMOVE THIS
import JournalPage from './components/journal/JournalPage'; // NEW IMPORT
import ProgressSection from './components/analytics/ProgressSection';
import AiCoach from './components/dashboard/AiCoach';
import ConfirmModal from './components/ui/ConfirmModal';

function AppContent() {
  const { user, signOut } = useAuth();
  const [goals, setGoals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, goalId: null });

  // NEW: View State
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' | 'journal'

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
      toast.error('Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchGoals();
  }, [user]);

  const confirmDelete = (id) => {
    setDeleteModal({ isOpen: true, goalId: id });
  };

  const executeDelete = async () => {
    const id = deleteModal.goalId;
    setGoals(goals.filter(g => g.id !== id));
    setDeleteModal({ isOpen: false, goalId: null });
    toast.success('Goal deleted successfully');

    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (error) {
      toast.error('Error deleting goal');
      fetchGoals();
    }
  };

  if (!user) return <Auth />;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Toaster position="top-center" richColors />

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        onConfirm={executeDelete}
        title="Delete Goal?"
        message="Are you sure?"
        confirmText="Delete"
        isDestructive={true}
      />

      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">2026 Goals</h1>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400 hidden sm:inline">{user.email}</span>
            <button onClick={signOut} className="text-sm text-gray-500 hover:text-gray-800">Sign Out</button>
          </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="px-6 flex gap-6 text-sm font-medium border-t border-gray-100">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`py-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeView === 'dashboard'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <LayoutDashboard size={16} /> Dashboard
          </button>
          <button
            onClick={() => setActiveView('journal')}
            className={`py-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeView === 'journal'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <BookOpen size={16} /> Journal & Testimonies
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-6 space-y-8">

        {/* VIEW SWITCHER */}
        {activeView === 'dashboard' ? (
          <div className="animate-in fade-in duration-300">
            <AiCoach goals={goals} />

            <DailyTracker
              goals={goals}
              onUpdate={() => setLastUpdate(Date.now())}
            />

            {/* Note: JournalSection removed from here */}

            <div className="border-t border-gray-200 pt-8">
               <ProgressSection goals={goals} lastUpdate={lastUpdate} />
            </div>

            <div className="pt-8 border-t border-gray-200">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-900">Goal Settings</h2>
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Plus size={16} />
                  {showForm ? 'Cancel' : 'Add Goal'}
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
                <div className="text-center py-10 text-gray-400">Loading...</div>
              ) : (
                <GoalList goals={goals} onDelete={confirmDelete} />
              )}
            </div>
          </div>
        ) : (
          /* JOURNAL VIEW */
          <div className="animate-in slide-in-from-right-4 duration-300">
            <JournalPage />
          </div>
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