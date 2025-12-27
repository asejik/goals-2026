import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Calendar, Trash2, Edit2, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

// 1. DEFINE PRESETS
const CATEGORY_PRESETS = [
  { name: 'Health', color: '#ef4444' },
  { name: 'Business', color: '#3b82f6' },
  { name: 'Spiritual', color: '#8b5cf6' },
  { name: 'Learning', color: '#f59e0b' },
  { name: 'Relationships', color: '#ec4899' }
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function GoalForm({ onGoalAdded, onCancel, initialData = null }) {
  const [loading, setLoading] = useState(false);
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    category: 'Health',
    description: '',
    color: '#ef4444'
  });

  const [actions, setActions] = useState([]);

  // New Action Input State
  const [newAction, setNewAction] = useState({
    title: '',
    period: 'Daily',
    target_value: 1,
    end_date: '2026-12-31',
    frequency: [] // Stores ["Mon", "Wed"] etc.
  });

  const [editingIndex, setEditingIndex] = useState(-1);

  // 2. INITIALIZATION LOGIC
  useEffect(() => {
    if (initialData) {
      // Logic to determine if category is preset or custom
      const presetMatch = CATEGORY_PRESETS.find(c => c.name === initialData.category);
      const isPreset = !!presetMatch;

      setIsCustomCategory(!isPreset);

      setFormData({
        title: initialData.title,
        category: initialData.category || 'Health', // Fallback to avoid controlled/uncontrolled error
        description: initialData.description || '',
        color: initialData.color || (presetMatch ? presetMatch.color : '#000000')
      });
      fetchActions(initialData.id);
    }
  }, [initialData]);

  const fetchActions = async (goalId) => {
    const { data } = await supabase.from('action_steps').select('*').eq('goal_id', goalId);
    if (data) {
      // Parse frequency string back to array if needed
      const parsedActions = data.map(a => ({
        ...a,
        frequency: a.frequency ? a.frequency.split(',') : []
      }));
      setActions(parsedActions);
    }
  };

  // 3. HANDLERS
  const handleCategoryChange = (e) => {
    const value = e.target.value;

    if (value === 'custom_new') {
      setIsCustomCategory(true);
      setFormData({ ...formData, category: '', color: '#000000' });
    } else {
      setIsCustomCategory(false);
      const preset = CATEGORY_PRESETS.find(p => p.name === value);
      if (preset) {
        setFormData({ ...formData, category: preset.name, color: preset.color });
      }
    }
  };

  const toggleDay = (day) => {
    let newFreq = [...newAction.frequency];
    if (newFreq.includes(day)) {
      newFreq = newFreq.filter(d => d !== day);
    } else {
      newFreq.push(day);
    }
    // Update frequency AND target_value (target = number of days selected)
    setNewAction({
      ...newAction,
      frequency: newFreq,
      target_value: newFreq.length > 0 ? newFreq.length : 1
    });
  };

  const handleAddOrUpdateAction = () => {
    if (!newAction.title) return toast.error('Action title is required');

    // Prepare payload (convert frequency array to string for display/storage logic if strictly needed,
    // but we keep it as array in state)

    if (editingIndex >= 0) {
      const updatedActions = [...actions];
      updatedActions[editingIndex] = { ...newAction };
      setActions(updatedActions);
      setEditingIndex(-1);
      toast.success('Action updated in list');
    } else {
      setActions([...actions, { ...newAction }]);
    }

    // Reset
    setNewAction({
      title: '',
      period: 'Daily',
      target_value: 1,
      end_date: '2026-12-31',
      frequency: []
    });
  };

  const handleEditClick = (index) => {
    const actionToEdit = actions[index];
    setNewAction({ ...actionToEdit });
    setEditingIndex(index);
    // Scroll to input
    document.getElementById('action-input-area')?.scrollIntoView({ behavior: 'smooth' });
  };

  const removeAction = async (index) => {
    const actionToRemove = actions[index];
    if (actionToRemove.id) {
       const { error } = await supabase.from('action_steps').delete().eq('id', actionToRemove.id);
       if (error) {
         toast.error('Failed to delete action');
         return;
       }
    }
    setActions(actions.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(-1);
      setNewAction({ title: '', period: 'Daily', target_value: 1, end_date: '2026-12-31', frequency: [] });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.title || !formData.category) {
        toast.error("Please fill in Goal Title and Category");
        setLoading(false);
        return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      let goalId = initialData?.id;

      // A. UPSERT GOAL
      const goalPayload = {
        ...formData,
        user_id: user.id
      };

      let result;
      if (goalId) {
        result = await supabase.from('goals').update(goalPayload).eq('id', goalId).select().single();
      } else {
        result = await supabase.from('goals').insert([goalPayload]).select().single();
      }

      if (result.error) throw result.error;
      goalId = result.data.id;

      // B. UPSERT ACTIONS
      for (const action of actions) {
        const actionPayload = {
          goal_id: goalId,
          user_id: user.id,
          title: action.title,
          period: action.period,
          target_value: action.target_value,
          end_date: action.end_date,
          // Join array to string for DB storage "Mon,Tue"
          frequency: Array.isArray(action.frequency) ? action.frequency.join(',') : action.frequency
        };

        if (action.id) {
          const { error } = await supabase.from('action_steps').update(actionPayload).eq('id', action.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('action_steps').insert(actionPayload);
          if (error) throw error;
        }
      }

      toast.success(initialData ? 'Goal updated' : 'Goal created');
      onGoalAdded();
    } catch (error) {
      console.error("SAVE ERROR:", error);
      toast.error(`Error saving goal: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xl mb-8 animate-in slide-in-from-top-4">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-gray-900">
          {initialData ? 'Edit Goal' : 'Define Your Identity'}
        </h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* GOAL INPUTS */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">I want to become...</label>
            <input
              type="text"
              placeholder="e.g. An Athlete, A Polyglot, A Reader"
              className="w-full text-lg font-bold border-b-2 border-gray-200 focus:border-black outline-none py-2 bg-transparent placeholder:font-normal"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>

                {!isCustomCategory ? (
                   <select
                     className="w-full p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm font-medium"
                     value={formData.category}
                     onChange={handleCategoryChange}
                   >
                     {CATEGORY_PRESETS.map(preset => (
                       <option key={preset.name} value={preset.name}>{preset.name}</option>
                     ))}
                     <option value="custom_new">+ Create New Category</option>
                   </select>
                ) : (
                   <div className="flex gap-2">
                     <input
                        type="text"
                        placeholder="New Category Name"
                        className="w-full p-2 bg-white rounded-lg border border-gray-200 text-sm font-bold text-gray-900"
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                        autoFocus
                     />
                     <button
                        type="button"
                        onClick={() => { setIsCustomCategory(false); setFormData({...formData, category: 'Health', color: '#ef4444'}); }}
                        className="p-2 text-gray-400 hover:text-red-500"
                        title="Cancel Custom Category"
                     >
                       <X size={18} />
                     </button>
                   </div>
                )}
             </div>

             {/* COLOR PICKER: Only shows if Custom Category is active */}
             {isCustomCategory && (
               <div className="animate-in fade-in">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      className="w-full h-[42px] p-1 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    />
                  </div>
               </div>
             )}
          </div>
        </div>

        <div className="h-px bg-gray-100 my-4" />

        {/* ACTIONS SECTION */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Calendar size={16} />
            Step 2: What actions prove this?
          </h4>

          <div className="bg-gray-50 p-4 rounded-xl space-y-3" id="action-input-area">
            <div className="flex flex-col gap-3">

              {/* Top Row: Title, Period, Date */}
              <div className="flex flex-col md:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Action (e.g., Run 5km)"
                  className="flex-1 p-2 border border-gray-200 rounded-lg text-sm"
                  value={newAction.title}
                  onChange={(e) => setNewAction({ ...newAction, title: e.target.value })}
                />
                <div className="flex gap-2">
                  <select
                    className="p-2 border border-gray-200 rounded-lg text-sm bg-white"
                    value={newAction.period}
                    onChange={(e) => setNewAction({ ...newAction, period: e.target.value, frequency: [] })}
                  >
                    <option>Daily</option>
                    <option>Weekly</option>
                    <option>Monthly</option>
                  </select>

                  <input
                     type="date"
                     className="p-2 border border-gray-200 rounded-lg text-sm bg-white"
                     value={newAction.end_date}
                     onChange={(e) => setNewAction({ ...newAction, end_date: e.target.value })}
                  />
                </div>
              </div>

              {/* Weekly Day Selector (Only if Weekly) */}
              {newAction.period === 'Weekly' && (
                <div className="animate-in slide-in-from-top-2">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Select Days (Optional)</label>
                  <div className="flex gap-2 flex-wrap">
                    {DAYS_OF_WEEK.map(day => {
                      const isSelected = newAction.frequency?.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`
                            w-8 h-8 rounded-full text-[10px] font-bold transition-all border
                            ${isSelected
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                            }
                          `}
                        >
                          {day.charAt(0)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

            <button
              type="button"
              onClick={handleAddOrUpdateAction}
              className={`w-full py-2 rounded-lg text-sm font-bold transition-all ${
                editingIndex >= 0
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-white border-2 border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600'
              }`}
            >
              {editingIndex >= 0 ? 'Update Action Step' : '+ Add This Action Step'}
            </button>
          </div>

          {/* ACTION LIST */}
          <div className="space-y-2">
            {actions.map((action, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg group hover:border-blue-200 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${editingIndex === idx ? 'bg-blue-100 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                    {editingIndex === idx ? <Edit2 size={14} /> : <Check size={14} />}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">{action.title}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <span>{action.period}</span>

                      {/* Show selected days if any */}
                      {action.frequency && action.frequency.length > 0 && (
                        <>
                          <span className="w-1 h-1 bg-gray-300 rounded-full" />
                          <span className="text-blue-600 font-medium">
                            {Array.isArray(action.frequency) ? action.frequency.join(', ') : action.frequency}
                          </span>
                        </>
                      )}

                      <span className="w-1 h-1 bg-gray-300 rounded-full" />
                      <span className="text-orange-400 bg-orange-50 px-1.5 rounded text-[10px] font-medium border border-orange-100">
                        Ends {action.end_date}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleEditClick(idx)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeAction(idx)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}

            {actions.length === 0 && (
               <div className="text-center py-4 text-xs text-gray-400 flex flex-col items-center gap-1">
                  <AlertCircle size={16} />
                  No actions defined yet.
               </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-black text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 transition-all disabled:opacity-50"
          >
            {loading ? 'Saving...' : (initialData ? 'Save Changes' : 'Create Goal')}
          </button>
        </div>
      </form>
    </div>
  );
}