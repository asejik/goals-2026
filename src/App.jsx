import { useEffect, useState } from 'react';
import { useAuth, AuthProvider } from './context/AuthContext';
import Auth from './components/Auth';
import { supabase } from './lib/supabase';
import { Plus, LayoutDashboard, BookOpen, LogOut } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import GoalForm from './components/goals/GoalForm';
import GoalList from './components/goals/GoalList';
import DailyTracker from './components/dashboard/DailyTracker';
import JournalPage from './components/journal/JournalPage';
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
    <div className="min-h-screen bg-gray-50 font-sans pb-24 md:pb-0">
      <Toaster position="top-center" richColors />

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        onConfirm={executeDelete}
        title="Delete Goal?"
        message="Are you sure you want to delete this goal? All daily history associated with it will be lost."
        confirmText="Delete"
        isDestructive={true}
      />

      {/* DESKTOP NAVIGATION (Hidden on Mobile) */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10 hidden md:block">
        <div className="px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">2026 Goals</h1>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400">{user.email}</span>
            <button onClick={signOut} className="text-sm text-gray-500 hover:text-gray-800 font-medium transition-colors">Sign Out</button>
          </div>
        </div>

        <div className="px-6 flex gap-6 text-sm font-medium border-t border-gray-100">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`py-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeView === 'dashboard' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <LayoutDashboard size={16} /> Dashboard
          </button>
          <button
            onClick={() => setActiveView('journal')}
            className={`py-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeView === 'journal' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <BookOpen size={16} /> Journal
          </button>
        </div>
      </nav>

      {/* MOBILE HEADER (Visible only on Mobile) */}
      <div className="md:hidden bg-white border-b border-gray-200 p-4 sticky top-0 z-10 flex justify-between items-center shadow-sm">
        <h1 className="text-lg font-bold text-gray-900">2026 Goals</h1>
        <div className="flex items-center gap-3">
          {/* Quick Add Button */}
          <button
            onClick={() => {
              setActiveView('dashboard');
              setShowForm(true);
              // Small delay to ensure form renders before scrolling
              setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
            }}
            className="p-2 text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors active:scale-95"
            title="Add New Goal"
          >
            <Plus size={20} />
          </button>

          <button onClick={signOut} className="p-2 text-gray-500 hover:text-red-600 transition-colors">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {activeView === 'dashboard' ? (
          <div className="animate-in fade-in duration-300">
            {/* AI Coach Section */}
            <AiCoach goals={goals} />

            {/* Daily Tracker */}
            <DailyTracker
              goals={goals}
              onUpdate={() => setLastUpdate(Date.now())}
            />

            {/* Analytics Section */}
            <div className="border-t border-gray-200 pt-8">
               <ProgressSection goals={goals} lastUpdate={lastUpdate} />
            </div>

            {/* Goal Management Section */}
            <div className="pt-8 border-t border-gray-200">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-900">Goal Settings</h2>
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Plus size={16} />
                  {showForm ? 'Cancel' : 'Add'}
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
          /* Journal View */
          <div className="animate-in slide-in-from-right-4 duration-300">
            <JournalPage />
          </div>
        )}
      </main>

      {/* MOBILE BOTTOM TAB BAR (Updated: 2 Tabs Only) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe pt-2 px-6 flex justify-around items-center z-50 h-[70px]">
        <button
          onClick={() => setActiveView('dashboard')}
          className={`flex flex-col items-center gap-1 w-full ${activeView === 'dashboard' ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <LayoutDashboard size={24} strokeWidth={activeView === 'dashboard' ? 2.5 : 2} />
          <span className="text-[10px] font-medium">Focus</span>
        </button>

        <button
          onClick={() => setActiveView('journal')}
          className={`flex flex-col items-center gap-1 w-full ${activeView === 'journal' ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <BookOpen size={24} strokeWidth={activeView === 'journal' ? 2.5 : 2} />
          <span className="text-[10px] font-medium">Journal</span>
        </button>
      </div>
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