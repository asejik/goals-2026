import { useEffect, useState } from 'react';
import { useAuth, AuthProvider } from './context/AuthContext';
import Auth from './components/Auth';
import { supabase } from './lib/supabase';
import { Plus, LayoutDashboard, BookOpen, LogOut, ClipboardList } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import GoalForm from './components/goals/GoalForm';
import GoalList from './components/goals/GoalList';
import DailyTracker from './components/dashboard/DailyTracker';
import JournalPage from './components/journal/JournalPage';
import ProgressSection from './components/analytics/ProgressSection';
import AiCoach from './components/dashboard/AiCoach';
import ConfirmModal from './components/ui/ConfirmModal';
import WeeklyReviewModal from './components/dashboard/WeeklyReviewModal';

function AppContent() {
  const { user, signOut } = useAuth();

  // Data State
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // UI State
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, goalId: null });
  const [activeView, setActiveView] = useState('dashboard');
  const [showReview, setShowReview] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getUserName = () => {
    let name = 'Friend';
    if (user?.user_metadata?.full_name) {
      name = user.user_metadata.full_name.split(' ')[0];
    } else if (user?.email) {
      name = user.email.split('@')[0];
    }
    // Capitalize first letter
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

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
    toast.success('Goal deleted');

    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (error) {
      toast.error('Error deleting goal');
      fetchGoals();
    }
  };

  const handleEdit = (goal) => {
    setEditingGoal(goal);
    setShowForm(true);
    setTimeout(() => {
      const formElement = document.getElementById('goal-form-container');
      if (formElement) formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleAddClick = () => {
    setEditingGoal(null);
    setActiveView('dashboard');
    setShowForm(true);
    setTimeout(() => {
      const formElement = document.getElementById('goal-form-container');
      if (formElement) formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        message="This will delete the Identity Goal and all associated Action Steps."
        confirmText="Delete Forever"
        isDestructive={true}
      />

      {showReview && <WeeklyReviewModal onClose={() => setShowReview(false)} />}

      {/* DESKTOP NAVIGATION */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10 hidden md:block">
        <div className="px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Align</h1> {/* APP NAME */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowReview(true)}
              className="text-xs font-bold bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-black transition-colors flex items-center gap-2"
            >
              <ClipboardList size={14} />
              Weekly Review
            </button>
            <span className="text-sm font-medium text-gray-600 border-l border-gray-200 pl-4 ml-2">
              {getGreeting()}, {getUserName()}
            </span>
            <button onClick={signOut} className="text-sm text-gray-400 hover:text-gray-800 transition-colors">Sign Out</button>
          </div>
        </div>
        <div className="px-6 flex gap-6 text-sm font-medium border-t border-gray-100">
          <button onClick={() => setActiveView('dashboard')} className={`py-3 flex items-center gap-2 border-b-2 transition-colors ${activeView === 'dashboard' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <LayoutDashboard size={16} /> Dashboard
          </button>
          <button onClick={() => setActiveView('journal')} className={`py-3 flex items-center gap-2 border-b-2 transition-colors ${activeView === 'journal' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <BookOpen size={16} /> Journal
          </button>
        </div>
      </nav>

      {/* MOBILE HEADER */}
      <div className="md:hidden bg-white border-b border-gray-200 p-4 sticky top-0 z-10 flex justify-between items-center shadow-sm">
        <h1 className="text-lg font-bold text-gray-900 tracking-tight">Align</h1> {/* APP NAME */}
        <div className="flex items-center gap-2">
          <button onClick={() => setShowReview(true)} className="p-2 text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><ClipboardList size={20} /></button>
          <button onClick={handleAddClick} className="p-2 text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors active:scale-95"><Plus size={20} /></button>
          <button onClick={signOut} className="p-2 text-gray-400 hover:text-red-600 transition-colors"><LogOut size={20} /></button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {activeView === 'dashboard' ? (
          <div className="animate-in fade-in duration-300">

            {/* MOBILE GREETING (Visible only on mobile) */}
            <div className="md:hidden mb-2">
              <h2 className="text-2xl font-bold text-gray-900">{getGreeting()}, {getUserName()}</h2>
              <p className="text-xs text-gray-500">Ready to build your legacy?</p>
            </div>

            <AiCoach goals={goals} />
            <DailyTracker onUpdate={() => setLastUpdate(Date.now())} lastUpdate={lastUpdate} />

            <div className="border-t border-gray-200 pt-8">
               <ProgressSection lastUpdate={lastUpdate} />
            </div>

            <div className="pt-8 border-t border-gray-200">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-900">Goal Settings</h2>
                <button
                  onClick={() => { setEditingGoal(null); setShowForm(!showForm); }}
                  className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Plus size={16} />
                  {showForm ? 'Cancel' : 'Add Goal'}
                </button>
              </div>

              <div id="goal-form-container">
                {showForm && (
                  <GoalForm
                    initialData={editingGoal}
                    onGoalAdded={() => { fetchGoals(); setShowForm(false); setEditingGoal(null); setLastUpdate(Date.now()); }}
                    onCancel={() => { setShowForm(false); setEditingGoal(null); }}
                  />
                )}
              </div>

              {loading ? (
                <div className="text-center text-gray-400 text-sm">Loading...</div>
              ) : (
                <GoalList goals={goals} onDelete={confirmDelete} onEdit={handleEdit} />
              )}
            </div>
          </div>
        ) : (
          <div className="animate-in slide-in-from-right-4 duration-300">
            <JournalPage />
          </div>
        )}
      </main>

      {/* MOBILE BOTTOM NAV */}
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