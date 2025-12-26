import { useEffect, useState } from 'react';
import { useAuth, AuthProvider } from './context/AuthContext';
import Auth from './components/Auth';
import { supabase } from './lib/supabase';
import { Plus, LayoutDashboard, BookOpen, LogOut, User } from 'lucide-react';
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
  const [activeView, setActiveView] = useState('dashboard');

  // NEW: Track which goal is being edited
  const [editingGoal, setEditingGoal] = useState(null);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getUserName = () => {
    const metaName = user?.user_metadata?.full_name;
    if (metaName) return metaName.split(' ')[0];
    if (!user?.email) return 'Friend';
    return user.email.split('@')[0];
  };

  const fetchGoals = async () => {
    try {
      const { data, error } = await supabase.from('goals').select('*').order('created_at', { ascending: false });
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
    toast.success('Goal deleted');

    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (error) {
      toast.error('Error deleting goal');
      fetchGoals();
    }
  };

  // 1. The Edit Logic
  const handleEdit = (goal) => {
    setEditingGoal(goal); // Store the goal data
    setShowForm(true);    // Open the form

    // Scroll to the form area
    setTimeout(() => {
      const formElement = document.getElementById('new-goal-form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleAddClick = () => {
    setEditingGoal(null); // Clear previous edits
    setActiveView('dashboard');
    setShowForm(true);
    setTimeout(() => {
      const formElement = document.getElementById('new-goal-form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
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
        message="History will be lost."
        confirmText="Delete"
        isDestructive={true}
      />

      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10 hidden md:block">
        <div className="px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">2026 Goals</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-600">{getGreeting()}, {getUserName()}</span>
            <button onClick={signOut} className="text-sm text-gray-400 hover:text-gray-800">Sign Out</button>
          </div>
        </div>
        <div className="px-6 flex gap-6 text-sm font-medium border-t border-gray-100">
          <button onClick={() => setActiveView('dashboard')} className={`py-3 flex items-center gap-2 border-b-2 transition-colors ${activeView === 'dashboard' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>
            <LayoutDashboard size={16} /> Dashboard
          </button>
          <button onClick={() => setActiveView('journal')} className={`py-3 flex items-center gap-2 border-b-2 transition-colors ${activeView === 'journal' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>
            <BookOpen size={16} /> Journal
          </button>
        </div>
      </nav>

      <div className="md:hidden bg-white border-b border-gray-200 p-4 sticky top-0 z-10 flex justify-between items-center shadow-sm">
        <div>
          <p className="text-xs text-gray-400 font-medium">{getGreeting()}</p>
          <h1 className="text-lg font-bold text-gray-900">{getUserName()}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleAddClick}
            className="p-2 text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors active:scale-95"
          >
            <Plus size={20} />
          </button>
          <button onClick={signOut} className="p-2 text-gray-400 hover:text-red-600">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {activeView === 'dashboard' ? (
          <div className="animate-in fade-in duration-300">
            <AiCoach goals={goals} />
            <DailyTracker onUpdate={() => setLastUpdate(Date.now())} />

            <div className="border-t border-gray-200 pt-8">
               <ProgressSection goals={goals} lastUpdate={lastUpdate} />
            </div>

            <div className="pt-8 border-t border-gray-200" id="new-goal-form">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-900">Goal Settings</h2>
                <button
                  onClick={() => {
                    setEditingGoal(null);
                    setShowForm(!showForm);
                  }}
                  className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg"
                >
                  <Plus size={16} />
                  {showForm ? 'Cancel' : 'Add'}
                </button>
              </div>

              {showForm && (
                <GoalForm
                  initialData={editingGoal} // Pass the data to the form
                  onGoalAdded={() => {
                    fetchGoals();
                    setShowForm(false);
                    setEditingGoal(null);
                  }}
                  onCancel={() => {
                    setShowForm(false);
                    setEditingGoal(null);
                  }}
                />
              )}

              {loading ? (
                <div className="text-center text-gray-400 text-sm">Loading...</div>
              ) : (
                <GoalList
                  goals={goals}
                  onDelete={confirmDelete}
                  onEdit={handleEdit} // <--- 2. MAKE SURE THIS IS HERE
                />
              )}
            </div>
          </div>
        ) : (
          <div className="animate-in slide-in-from-right-4 duration-300">
            <JournalPage />
          </div>
        )}
      </main>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe pt-2 px-6 flex justify-around items-center z-50 h-[70px]">
        <button onClick={() => setActiveView('dashboard')} className={`flex flex-col items-center gap-1 w-full ${activeView === 'dashboard' ? 'text-blue-600' : 'text-gray-400'}`}>
          <LayoutDashboard size={24} strokeWidth={activeView === 'dashboard' ? 2.5 : 2} />
          <span className="text-[10px] font-medium">Focus</span>
        </button>
        <button onClick={() => setActiveView('journal')} className={`flex flex-col items-center gap-1 w-full ${activeView === 'journal' ? 'text-blue-600' : 'text-gray-400'}`}>
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