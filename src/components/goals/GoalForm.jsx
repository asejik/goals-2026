import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Plus, X, Loader2 } from 'lucide-react';

export default function GoalForm({ onGoalAdded, onCancel }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    category: 'Personal', // Default
    type: 'boolean',      // Default
    target_value: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('goals').insert({
        user_id: user.id,
        title: formData.title,
        category: formData.category,
        type: formData.type,
        // Only send target_value if numeric, otherwise null
        target_value: formData.type === 'numeric' ? parseFloat(formData.target_value) : null
      });

      if (error) throw error;

      onGoalAdded(); // Notify parent to refresh list
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">New 2026 Goal</h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Goal Title</label>
          <input
            type="text"
            required
            placeholder="e.g., Read Bible in a Year"
            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Category</label>
            <select
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              <option value="Faith">Faith</option>
              <option value="Career">Career</option>
              <option value="Health">Health</option>
              <option value="Personal">Personal</option>
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Tracking Type</label>
            <select
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            >
              <option value="boolean">Checkbox (Yes/No)</option>
              <option value="numeric">Numeric (Count/Sum)</option>
            </select>
          </div>
        </div>

        {/* Conditional Target Input */}
        {formData.type === 'numeric' && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
              Yearly Target Amount
            </label>
            <input
              type="number"
              required
              placeholder="e.g., 5000"
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.target_value}
              onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
          Create Goal
        </button>
      </form>
    </div>
  );
}