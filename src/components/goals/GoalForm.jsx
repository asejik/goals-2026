import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Plus, X, Loader2, Calendar, Target, Check, Trash2, Settings, Flag } from 'lucide-react';
import { toast } from 'sonner';
import CategoryManager from './CategoryManager';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function GoalForm({ onGoalAdded, onCancel, initialData = null }) {
  const { user } = useAuth();

  // Views: 'MAIN' | 'CATEGORY_MANAGER'
  const [view, setView] = useState('MAIN');

  // Data Loading
  const [categories, setCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [identityTitle, setIdentityTitle] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('');
  const [dueDate, setDueDate] = useState(''); // New: Goal Deadline

  // Action Steps State
  const [actionSteps, setActionSteps] = useState([]);

  // New Step Input State
  const [newStep, setNewStep] = useState({
    title: '',
    period: 'daily',
    target_value: 1,
    specific_days: [],
    type: 'boolean'
  });

  // 1. Fetch Categories & Handle Edit Mode
  useEffect(() => {
    fetchCategories();

    // IF EDITING: Populate Form
    if (initialData) {
      setIdentityTitle(initialData.title);
      setSelectedCatId(initialData.category_id);
      setDueDate(initialData.due_date || ''); // Populate Date

      // Fetch the Action Steps for this Goal
      const fetchSteps = async () => {
        const { data } = await supabase
          .from('action_steps')
          .select('*')
          .eq('goal_id', initialData.id);
        if (data) setActionSteps(data);
      };
      fetchSteps();
    }
  }, [initialData]);

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    setCategories(data || []);
    // Only set default if NOT editing and NOT set yet
    if (data && data.length > 0 && !selectedCatId && !initialData) {
      setSelectedCatId('');
    }
    setLoadingCats(false);
  };

  const addActionStep = () => {
    if (!newStep.title.trim()) return toast.error('Action title is required');

    // For weekly, ensure days are picked
    if (newStep.period === 'weekly' && newStep.specific_days.length === 0) {
      return toast.error('Please select days for weekly action');
    }

    setActionSteps([...actionSteps, { ...newStep, id: Date.now().toString() }]); // Temp ID
    setNewStep({ title: '', period: 'daily', target_value: 1, specific_days: [], type: 'boolean' });
  };

  const removeActionStep = async (id) => {
    // If it's a real ID (from DB), we might want to track it to delete on save,
    // but for simplicity in MVP, we just remove from UI list.
    // (Note: In a full app, you'd delete from DB only on "Save Changes")
    setActionSteps(actionSteps.filter(s => s.id !== id));
  };

  const toggleDay = (day) => {
    setNewStep(prev => {
      const days = prev.specific_days.includes(day)
        ? prev.specific_days.filter(d => d !== day)
        : [...prev.specific_days, day];
      return { ...prev, specific_days: days };
    });
  };

  const handleFullSubmit = async () => {
    if (!identityTitle.trim()) return toast.error('Please enter your Identity Goal');
    if (!selectedCatId) return toast.error('Please select a Category');
    if (actionSteps.length === 0) return toast.error('Add at least one Action Step');

    setSubmitting(true);
    try {
      let goalId;

      // 1. Upsert Goal (Identity)
      const goalPayload = {
        user_id: user.id,
        category_id: selectedCatId,
        title: identityTitle,
        due_date: dueDate || null
      };

      if (initialData) {
        // UPDATE Existing
        await supabase.from('goals').update(goalPayload).eq('id', initialData.id);
        goalId = initialData.id;

        // Strategy: Delete old steps and re-insert (Simple way to handle edits)
        // In production, you might want to diff them to keep logs,
        // but for now, we will try to Upsert based on ID if it exists.

        // Actually, simplest for this stage:
        // We will just Insert new ones that lack UUIDs, and Update ones that have UUIDs.
        // For simplicity: We will rely on the UI list.
      } else {
        // CREATE New
        const { data, error } = await supabase.from('goals').insert(goalPayload).select().single();
        if (error) throw error;
        goalId = data.id;
      }

      // 2. Handle Action Steps
      // We need to loop through and Upsert
      for (const step of actionSteps) {
        const stepPayload = {
          user_id: user.id,
          goal_id: goalId,
          title: step.title,
          type: step.type,
          period: step.period,
          target_value: step.target_value,
          specific_days: step.period === 'weekly' ? step.specific_days : null
        };

        // If ID is numeric (temp), remove it so DB generates UUID. If string (UUID), keep it.
        if (typeof step.id === 'string' && step.id.length > 20) {
            // Existing step, update it
            await supabase.from('action_steps').update(stepPayload).eq('id', step.id);
        } else {
            // New step, insert it
            await supabase.from('action_steps').insert(stepPayload);
        }
      }

      // (Optional: Handle deletions if steps were removed from the UI list)

      toast.success(initialData ? 'Goal updated!' : 'Goal created!');
      onGoalAdded();
    } catch (error) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (view === 'CATEGORY_MANAGER') {
    return <CategoryManager onClose={() => setView('MAIN')} />;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8 animate-in fade-in slide-in-from-top-4 shadow-sm" id="goal-form-container">

      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{initialData ? 'Edit Goal' : 'Define Your Goal'}</h2>
          <p className="text-xs text-gray-500">Identity first, actions second.</p>
        </div>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
      </div>

      <div className="space-y-6">

        {/* STEP 1: IDENTITY */}
        <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1">
              <Target size={12} /> Step 1: Who are you becoming?
            </label>
            <button
              onClick={() => setView('CATEGORY_MANAGER')}
              className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
            >
              <Settings size={10} /> Manage Categories
            </button>
          </div>

          <div className="grid md:grid-cols-12 gap-3">
             {/* Category Select */}
             <div className="md:col-span-3">
               <select
                 className="w-full px-3 py-2.5 bg-white border border-blue-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                 value={selectedCatId}
                 onChange={e => setSelectedCatId(e.target.value)}
                 disabled={loadingCats}
               >
                 <option value="" disabled>Select Category</option>
                 {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
               </select>
             </div>

             {/* Identity Input */}
             <div className="md:col-span-6">
               <input
                  type="text"
                  placeholder="e.g., I am a consistent runner"
                  className="w-full px-3 py-2.5 bg-white border border-blue-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium placeholder:font-normal"
                  value={identityTitle}
                  onChange={e => setIdentityTitle(e.target.value)}
               />
             </div>

             {/* Due Date Input */}
             <div className="md:col-span-3 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Flag size={14} className="text-blue-400" />
                </div>
                <input
                  type="date"
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-blue-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  title="Goal Deadline"
                />
             </div>
          </div>
        </div>

        {/* STEP 2: ACTIONS */}
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
           <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1 mb-4">
              <Calendar size={12} /> Step 2: What actions prove this?
           </label>

           {/* List of Added Steps */}
           {actionSteps.length > 0 && (
             <div className="mb-6 space-y-2">
               {actionSteps.map((step) => (
                 <div key={step.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-100 text-green-700 p-1.5 rounded-md"><Check size={14} /></div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">{step.title}</p>
                        <p className="text-xs text-gray-400 capitalize">
                          {step.period} • {step.target_value}x {step.period === 'weekly' && step.specific_days?.length > 0 ? `(${step.specific_days.join(',')})` : ''}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => removeActionStep(step.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
                 </div>
               ))}
             </div>
           )}

           {/* Add New Step Form */}
           <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
             <div className="grid md:grid-cols-4 gap-3 mb-3">
               <div className="md:col-span-2">
                 <input
                   type="text"
                   placeholder="Action (e.g., Run 5km)"
                   className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-gray-400"
                   value={newStep.title}
                   onChange={e => setNewStep({...newStep, title: e.target.value})}
                 />
               </div>
               <div className="md:col-span-1">
                 <select
                   className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none"
                   value={newStep.period}
                   onChange={e => setNewStep({...newStep, period: e.target.value})}
                 >
                   <option value="daily">Daily</option>
                   <option value="weekly">Weekly</option>
                   <option value="monthly">Monthly</option>
                 </select>
               </div>
               <div className="md:col-span-1">
                 <input
                   type="number"
                   placeholder="Target (e.g. 1)"
                   className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none"
                   value={newStep.target_value}
                   onChange={e => setNewStep({...newStep, target_value: e.target.value})}
                 />
               </div>
             </div>

             {newStep.period === 'weekly' && (
               <div className="flex gap-2 mb-3">
                 {DAYS.map(day => (
                   <button
                     key={day}
                     onClick={() => toggleDay(day)}
                     className={`text-[10px] w-8 h-8 rounded-full font-bold transition-all ${newStep.specific_days.includes(day) ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                   >
                     {day.charAt(0)}
                   </button>
                 ))}
               </div>
             )}

             <button
               onClick={addActionStep}
               className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold rounded-lg transition-colors border border-gray-200"
             >
               + Add This Action Step
             </button>
           </div>
        </div>

        <button
          onClick={handleFullSubmit}
          disabled={submitting}
          className="w-full py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-bold shadow-lg shadow-gray-200 transition-all flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 className="animate-spin" /> : (initialData ? <Check /> : <Plus />)}
          {initialData ? 'Save Changes' : 'Create Identity Goal'}
        </button>

      </div>
    </div>
  );
}