import { useEffect, useState } from 'react';
import { useAuth, AuthProvider } from './context/AuthContext';
import Auth from './components/Auth';
import { supabase } from './lib/supabase';
import {
  Plus,
  LayoutDashboard,
  BookOpen,
  LogOut,
  ClipboardList,
  Flame,
  Trophy,
  Trash2,
  PenLine // Icon for Vision Edit
} from 'lucide-react';
import { Toaster, toast } from 'sonner';

// Components
import GoalForm from './components/goals/GoalForm';
import GoalList from './components/goals/GoalList';
import DailyTracker from './components/dashboard/DailyTracker';
import JournalPage from './components/journal/JournalPage';
import ProgressSection from './components/analytics/ProgressSection';
import AiCoach from './components/dashboard/AiCoach';
import ConfirmModal from './components/ui/ConfirmModal';
import WeeklyReviewModal from './components/dashboard/WeeklyReviewModal';
import MilestonesModal from './components/dashboard/MilestonesModal';

// --- SUB-COMPONENT: VISION HEADER ---
function VisionHeader({ user }) {
  const [vision, setVision] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVision();
  }, []);

  const fetchVision = async () => {
    try {
      // Try to get existing setting
      const { data, error } = await supabase
        .from('user_settings')
        .select('vision')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setVision(data.vision || '');
      } else if (error && error.code !== 'PGRST116') { // Ignore "not found" error
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  };

  const saveVision = async () => {
    if (!vision.trim()) return setIsEditing(false);

    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({ user_id: user.id, vision: vision })
        .select();

      if (error) throw error;
      setIsEditing(false);
      toast.success('Vision updated');
    } catch (err) {
      toast.error('Failed to save vision');
      console.error(err);
    }
  };

  if (loading) return <div className="h-8 w-48 bg-gray-100 rounded animate-pulse mb-6" />;

  return (
    <div className="mb-8">
      {isEditing ? (
        <div className="flex items-center gap-2 animate-in fade-in">
          <input
            type="text"
            autoFocus
            className="text-2xl md:text-3xl font-bold text-gray-900 bg-transparent border-b-2 border-black outline-none w-full placeholder:text-gray-300"
            placeholder="What is your Vision for 2026?"
            value={vision}
            onChange={(e) => setVision(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveVision()}
            onBlur={saveVision}
          />
        </div>
      ) : (
        <div
          onClick={() => setIsEditing(true)}
          className="group cursor-pointer inline-flex items-center gap-3 transition-opacity hover:opacity-80"
        >
          <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${vision ? 'text-gray-900' : 'text-gray-300 italic'}`}>
            {vision || "Click to set your 2026 Vision..."}
          </h1>
          <PenLine size={20} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-all -ml-1" />
        </div>
      )}
    </div>
  );
}

// --- MAIN APP CONTENT ---
function AppContent() {
  const { user, signOut } = useAuth();

  // Data State
  const [goals, setGoals] = useState([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // UI State
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, goalId: null });
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [showReview, setShowReview] = useState(false);
  const [showMilestones, setShowMilestones] = useState(false);

  // --- HELPERS ---

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
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  // --- DATA FETCHING ---

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

  const fetchStreak = async () => {
    try {
      const { data, error } = await supabase.rpc('get_current_streak');
      if (error) throw error;
      setStreak(data || 0);
    } catch (err) {
      console.error('Error fetching streak:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchGoals();
      fetchStreak();
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchStreak();
  }, [lastUpdate, user]);

  // --- HANDLERS ---

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

  const handleResetAccount = async () => {
    try {
      const { error } = await supabase.rpc('reset_user_data');
      if (error) throw error;

      toast.success('Account reset successfully');
      setShowResetConfirm(false);

      setGoals([]);
      setStreak(0);
      setLastUpdate(Date.now());
      // Force reload vision component slightly by triggering re-render if needed, or simple toast
    } catch (err) {
      console.error(err);
      toast.error('Failed to reset account');
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
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-gray-900 selection:text-white pb-24 md:pb-0 relative">
      <Toaster position="top-center" richColors theme="light" />

      {/* 1. GLOBAL BACKGROUND (Grid Pattern) */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-grid-pattern opacity-60" />

      {/* MODALS */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        onConfirm={executeDelete}
        title="Delete Goal?"
        message="This will delete the Identity Goal and all associated Action Steps."
        confirmText="Delete Forever"
        isDestructive={true}
      />

      <ConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleResetAccount}
        title="Reset Account?"
        message="DANGER: This will delete ALL your goals, logs, and reviews. This cannot be undone."
        confirmText="Yes, Wipe Everything"
        isDestructive={true}
      />

      {showReview && <WeeklyReviewModal onClose={() => setShowReview(false)} />}
      {showMilestones && <MilestonesModal onClose={() => setShowMilestones(false)} />}

      {/* DESKTOP NAV */}
      <nav className="glass-panel sticky top-0 z-20 hidden md:block border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">

          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold tracking-tight text-gray-900">Align</h1>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-orange-50/50 text-orange-600 px-3 py-1 rounded-full border border-orange-100/50 hover:bg-orange-50 transition-colors cursor-default" title="Current Streak">
                <Flame size={14} fill="currentColor" className="animate-pulse" />
                <span className="text-xs font-bold font-mono tracking-tight">{streak}d</span>
              </div>

              <button
                onClick={() => setShowMilestones(true)}
                className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-full transition-colors relative group"
              >
                <Trophy size={16} />
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Achievements</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowReview(true)}
              className="btn-beam text-xs font-bold bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-black transition-all shadow-lg shadow-gray-200 flex items-center gap-2"
            >
              <ClipboardList size={14} />
              Weekly Review
            </button>

            <div className="h-4 w-px bg-gray-200 mx-2"></div>

            <button
              onClick={() => setShowResetConfirm(true)}
              className="text-gray-300 hover:text-red-500 transition-colors"
              title="Reset Account Data"
            >
              <Trash2 size={16} />
            </button>

            <span className="text-xs font-medium text-gray-500">
              {getGreeting()}, <span className="text-gray-900 font-semibold">{getUserName()}</span>
            </span>
            <button onClick={signOut} className="text-xs text-gray-400 hover:text-red-500 transition-colors ml-2">Sign Out</button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 flex gap-8 text-sm font-medium border-t border-gray-100/50">
          <button onClick={() => setActiveView('dashboard')} className={`py-3 relative group transition-colors ${activeView === 'dashboard' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            <span className="flex items-center gap-2"><LayoutDashboard size={14} /> Dashboard</span>
            {activeView === 'dashboard' && <span className="absolute bottom-0 left-0 w-full h-[2px] bg-gray-900 rounded-t-full animate-fade-in" />}
          </button>
          <button onClick={() => setActiveView('journal')} className={`py-3 relative group transition-colors ${activeView === 'journal' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            <span className="flex items-center gap-2"><BookOpen size={14} /> Journal</span>
            {activeView === 'journal' && <span className="absolute bottom-0 left-0 w-full h-[2px] bg-gray-900 rounded-t-full animate-fade-in" />}
          </button>
        </div>
      </nav>

      {/* MOBILE HEADER */}
      <div className="md:hidden glass-panel sticky top-0 z-20 border-b border-gray-100 p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold tracking-tight text-gray-900">Align</h1>
          <div className="flex items-center gap-1 bg-orange-50/50 text-orange-600 px-2 py-0.5 rounded-full border border-orange-100/50">
             <Flame size={12} fill="currentColor" />
             <span className="text-[10px] font-bold font-mono">{streak}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowReview(true)}
            className="flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-1.5 rounded-full hover:bg-gray-200 transition-colors"
          >
            <ClipboardList size={14} />
            <span className="text-[10px] font-bold">Review</span>
          </button>

          <button onClick={handleAddClick} className="btn-beam p-1.5 text-white bg-gray-900 rounded-full hover:bg-black transition-all shadow-md active:scale-95"><Plus size={18} /></button>

          <button onClick={() => setShowMilestones(true)} className="p-1.5 text-gray-400 hover:text-yellow-600"><Trophy size={18} /></button>

          <button
            onClick={() => setShowResetConfirm(true)}
            className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
          >
            <Trash2 size={18} />
          </button>

           <button onClick={signOut} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"><LogOut size={18} /></button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main className="relative z-10 max-w-5xl mx-auto p-4 md:p-8 md:pt-8 space-y-8">
        {activeView === 'dashboard' ? (
          <div className="animate-enter">

            {/* MOBILE GREETING */}
            <div className="md:hidden mb-6 animate-enter">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{getGreeting()}, {getUserName()}</h2>
              <p className="text-sm text-gray-500 mt-1">Ready to build your legacy?</p>
            </div>

            {/* --- NEW: VISION HEADER --- */}
            <VisionHeader user={user} />

            {/* 1. Coach Section */}
            <div className="animate-enter delay-100">
               <AiCoach goals={goals} />
            </div>

            {/* 2. Tracker Section */}
            <div className="animate-enter delay-200">
               <DailyTracker onUpdate={() => setLastUpdate(Date.now())} lastUpdate={lastUpdate} />
            </div>

            {/* 3. Stats Section */}
            <div className="animate-enter delay-300 border-t border-gray-100 pt-8 mt-8">
               <ProgressSection lastUpdate={lastUpdate} />
            </div>

            {/* 4. Settings Section */}
            <div className="animate-enter delay-300 pt-8 mt-8 border-t border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-900 tracking-tight">Goal Settings</h2>
                <button
                  onClick={() => { setEditingGoal(null); setShowForm(!showForm); }}
                  className="group flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <div className="p-1 rounded-md bg-gray-100 group-hover:bg-gray-200 transition-colors"><Plus size={14} /></div>
                  {showForm ? 'Cancel' : 'Add Goal'}
                </button>
              </div>

              <div id="goal-form-container" className="transition-all duration-300 ease-in-out">
                {showForm && (
                  <div className="animate-enter">
                    <GoalForm
                      initialData={editingGoal}
                      onGoalAdded={() => { fetchGoals(); setShowForm(false); setEditingGoal(null); setLastUpdate(Date.now()); }}
                      onCancel={() => { setShowForm(false); setEditingGoal(null); }}
                    />
                  </div>
                )}
              </div>

              {loading ? (
                <div className="text-center py-12 text-gray-400 text-sm animate-pulse">Loading your vision...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <GoalList goals={goals} onDelete={confirmDelete} onEdit={handleEdit} />
                </div>
              )}
            </div>
          </div>
        ) : (
          /* JOURNAL VIEW */
          <div className="animate-enter">
            <JournalPage />
          </div>
        )}
      </main>

      {/* MOBILE BOTTOM NAV */}
      <div className="md:hidden glass-panel fixed bottom-0 left-0 right-0 border-t border-gray-200 pb-safe pt-2 px-6 flex justify-around items-center z-50 h-[70px]">
        <button onClick={() => setActiveView('dashboard')} className={`flex flex-col items-center gap-1 w-full transition-all active:scale-95 ${activeView === 'dashboard' ? 'text-gray-900' : 'text-gray-400'}`}>
          <LayoutDashboard size={24} strokeWidth={activeView === 'dashboard' ? 2.5 : 2} />
          <span className="text-[10px] font-bold">Focus</span>
        </button>
        <button onClick={() => setActiveView('journal')} className={`flex flex-col items-center gap-1 w-full transition-all active:scale-95 ${activeView === 'journal' ? 'text-gray-900' : 'text-gray-400'}`}>
          <BookOpen size={24} strokeWidth={activeView === 'journal' ? 2.5 : 2} />
          <span className="text-[10px] font-bold">Journal</span>
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