import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Plus, X, Loader2, Calendar, Target, Check, Trash2, Settings, Flag } from 'lucide-react';
import { toast } from 'sonner';
import CategoryManager from './CategoryManager';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function GoalForm({ onGoalAdded, onCancel, initialData = null }) {
  const { user } = useAuth();

  // Views
  const [view, setView] = useState('MAIN');

  // Data Loading
  const [categories, setCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State - STEP 1 (Identity)
  const [identityTitle, setIdentityTitle] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('');

  // Form State - STEP 2 (Actions)
  const [actionSteps, setActionSteps] = useState([]);

  // New Action Step Input State
  const [newStep, setNewStep] = useState({
    title: '',
    period: 'daily',
    target_value: 1,
    specific_days: [],
    type: 'boolean',
    end_date: '' // NEW: Moved here
  });

  // 1. Fetch Categories & Handle Edit Mode
  useEffect(() => {
    fetchCategories();

    if (initialData) {
      setIdentityTitle(initialData.title);
      setSelectedCatId(initialData.category_id);

      const fetchSteps = async () => {
        const { data } = await supabase
          .from('action_steps')
          .select('*')
          .eq('goal_id', initialData.id);
        if (data) setActionSteps(data);
      };
      fetchSteps();
    }
  }, [initialData, view]);

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    setCategories(data || []);
    setLoadingCats(false);
  };

  // --- ACTION STEP LOGIC ---

  const addActionStep = () => {
    if (!newStep.title.trim()) return toast.error('Action title is required');

    if (newStep.period === 'weekly' && newStep.specific_days.length === 0) {
      return toast.error('Please select days for weekly action');
    }

    // Add to list
    setActionSteps([...actionSteps, { ...newStep, id: Date.now().toString() }]);

    // Reset inputs
    setNewStep({
      title: '',
      period: 'daily',
      target_value: 1,
      specific_days: [],
      type: 'boolean',
      end_date: ''
    });
  };

  const removeActionStep = (id) => {
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

  // --- SUBMIT LOGIC ---

  const handleFullSubmit = async () => {
    if (!identityTitle.trim()) return toast.error('Please enter your Identity Goal');
    if (!selectedCatId) return toast.error('Please select a Category');
    if (actionSteps.length === 0) return toast.error('Add at least one Action Step');

    setSubmitting(true);
    try {
      let goalId;

      // 1. Upsert Goal (Identity) - No due date here anymore
      const goalPayload = {
        user_id: user.id,
        category_id: selectedCatId,
        title: identityTitle
      };

      if (initialData) {
        await supabase.from('goals').update(goalPayload).eq('id', initialData.id);
        goalId = initialData.id;
      } else {
        const { data, error } = await supabase.from('goals').insert(goalPayload).select().single();
        if (error) throw error;
        goalId = data.id;
      }

      // 2. Upsert Action Steps (With end_date)
      for (const step of actionSteps) {
        const stepPayload = {
          user_id: user.id,
          goal_id: goalId,
          title: step.title,
          type: step.type,
          period: step.period,
          target_value: step.target_value,
          specific_days: step.period === 'weekly' ? step.specific_days : null,
          end_date: step.end_date || null // Save the date!
        };

        if (typeof step.id === 'string' && step.id.length > 20) {
            await supabase.from('action_steps').update(stepPayload).eq('id', step.id);
        } else {
            await supabase.from('action_steps').insert(stepPayload);
        }
      }

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

        {/* STEP 1: IDENTITY (Timeless) */}
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
             <div className="md:col-span-4">
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
             <div className="md:col-span-8">
               <input
                  type="text"
                  placeholder="e.g., I am a consistent runner"
                  className="w-full px-3 py-2.5 bg-white border border-blue-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium placeholder:font-normal"
                  value={identityTitle}
                  onChange={e => setIdentityTitle(e.target.value)}
               />
             </div>
          </div>
        </div>

        {/* STEP 2: ACTIONS (Time-bound) */}
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
                        <div className="flex gap-2 text-xs text-gray-400 capitalize items-center">
                          <span>{step.period} • {step.target_value}x</span>
                          {step.end_date && (
                             <span className="flex items-center gap-1 text-orange-400 bg-orange-50 px-1.5 rounded border border-orange-100">
                               <Flag size={10} /> Ends {step.end_date}
                             </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => removeActionStep(step.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
                 </div>
               ))}
             </div>
           )}

           {/* Add New Step Form */}
           <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
             <div className="grid md:grid-cols-12 gap-3 mb-3">

               {/* Title */}
               <div className="md:col-span-5">
                 <input
                   type="text"
                   placeholder="Action (e.g., Run 5km)"
                   className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-gray-400"
                   value={newStep.title}
                   onChange={e => setNewStep({...newStep, title: e.target.value})}
                 />
               </div>

               {/* Period */}
               <div className="md:col-span-3">
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

               {/* Target */}
               <div className="md:col-span-2">
                 <input
                   type="number"
                   placeholder="Target"
                   className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none"
                   value={newStep.target_value}
                   onChange={e => setNewStep({...newStep, target_value: e.target.value})}
                 />
               </div>

               {/* NEW: End Date */}
               <div className="md:col-span-2">
                 <input
                   type="date"
                   className="w-full px-2 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none text-gray-500"
                   value={newStep.end_date}
                   onChange={e => setNewStep({...newStep, end_date: e.target.value})}
                   title="End Date"
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