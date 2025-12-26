import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Plus, X, Loader2, Calendar, Save, Flag } from 'lucide-react'; // Added Flag icon
import { toast } from 'sonner';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PRESET_CATEGORIES = ['Faith', 'Health', 'Career', 'Personal', 'Finance', 'Relationships'];

export default function GoalForm({ onGoalAdded, onCancel, initialData = null }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    category: 'Personal',
    type: 'boolean',
    period: 'yearly',
    target_value: '',
    specific_days: [],
    due_date: '' // NEW
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title,
        category: initialData.category,
        type: initialData.type,
        period: initialData.period,
        target_value: initialData.target_value || '',
        specific_days: initialData.specific_days || [],
        due_date: initialData.due_date || '' // Load existing date
      });
      if (!PRESET_CATEGORIES.includes(initialData.category)) {
        setIsCustomCategory(true);
      }
    }
  }, [initialData]);

  const toggleDay = (day) => {
    setFormData(prev => {
      const days = prev.specific_days.includes(day)
        ? prev.specific_days.filter(d => d !== day)
        : [...prev.specific_days, day];
      return { ...prev, specific_days: days };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        user_id: user.id,
        title: formData.title,
        category: formData.category,
        type: formData.type,
        period: formData.period,
        target_value: formData.target_value ? parseFloat(formData.target_value) : null,
        specific_days: formData.period === 'weekly' ? formData.specific_days : null,
        due_date: formData.due_date || null // Save date
      };

      let error;
      if (initialData) {
        const { error: updateError } = await supabase.from('goals').update(payload).eq('id', initialData.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('goals').insert(payload);
        error = insertError;
      }

      if (error) throw error;
      onGoalAdded();
      toast.success(initialData ? 'Goal updated' : 'Goal created');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 animate-in fade-in slide-in-from-top-2 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-gray-900">
          {initialData ? 'Edit Goal' : 'New Goal'}
        </h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <input
          type="text"
          required
          placeholder="What is your goal?"
          className="w-full text-sm px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-1 focus:ring-gray-400 outline-none transition-all placeholder:text-gray-400"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        />

        <div className="grid grid-cols-2 gap-3">
          {/* Category */}
          <div>
            {!isCustomCategory ? (
              <select
                className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-md outline-none text-gray-600"
                value={formData.category}
                onChange={(e) => {
                  if (e.target.value === 'CUSTOM') {
                    setIsCustomCategory(true);
                    setFormData({ ...formData, category: '' });
                  } else {
                    setFormData({ ...formData, category: e.target.value });
                  }
                }}
              >
                {PRESET_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                <option value="CUSTOM">+ Add Custom...</option>
              </select>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  autoFocus
                  placeholder="Category..."
                  className="w-full text-xs px-3 py-2 bg-white border border-blue-200 rounded-md outline-none text-blue-700"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
                <button type="button" onClick={() => setIsCustomCategory(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
              </div>
            )}
          </div>

          {/* Type */}
          <select
            className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-md outline-none text-gray-600"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          >
            <option value="boolean">Checkbox</option>
            <option value="numeric">Numeric</option>
          </select>
        </div>

        {/* Frequency & Target & Due Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex gap-2 items-center bg-gray-50 p-2 rounded-md border border-gray-100">
            <Calendar size={14} className="text-gray-400" />
            <select
              className="text-xs bg-transparent outline-none text-gray-700 font-medium flex-1"
              value={formData.period}
              onChange={(e) => setFormData({ ...formData, period: e.target.value })}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>

            {(formData.type === 'numeric' || formData.period !== 'daily') && (
               <input
                type="number"
                placeholder="Target"
                className="w-16 text-xs bg-white border border-gray-200 rounded px-2 py-1 outline-none"
                value={formData.target_value}
                onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
              />
            )}
          </div>

          {/* NEW: Due Date Input */}
          <div className="flex gap-2 items-center bg-gray-50 p-2 rounded-md border border-gray-100">
            <Flag size={14} className="text-gray-400" />
            <input
              type="date"
              className="text-xs bg-transparent outline-none text-gray-700 font-medium flex-1"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
          </div>
        </div>

        {/* Day Picker */}
        {formData.period === 'weekly' && (
          <div className="space-y-2">
             <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Select Days</label>
             <div className="flex justify-between gap-1">
               {DAYS.map(day => {
                 const isSelected = formData.specific_days?.includes(day);
                 return (
                   <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`w-8 h-8 rounded-full text-[10px] font-bold transition-all ${isSelected ? 'bg-blue-600 text-white shadow-sm scale-110' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                   >
                     {day.charAt(0)}
                   </button>
                 );
               })}
             </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white text-xs font-medium py-2.5 rounded-md transition-all"
        >
          {loading ? <Loader2 className="animate-spin" size={14} /> : (initialData ? <Save size={14} /> : <Plus size={14} />)}
          {initialData ? 'Save Changes' : 'Create Goal'}
        </button>
      </form>
    </div>
  );
}