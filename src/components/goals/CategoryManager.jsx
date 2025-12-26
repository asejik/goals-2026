import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Trash2, Plus, X, Tag, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

const COLORS = [
  { label: 'Purple', value: 'bg-purple-50 text-purple-700 border-purple-200' },
  { label: 'Blue', value: 'bg-blue-50 text-blue-700 border-blue-200' },
  { label: 'Green', value: 'bg-green-50 text-green-700 border-green-200' },
  { label: 'Red', value: 'bg-red-50 text-red-700 border-red-200' },
  { label: 'Orange', value: 'bg-orange-50 text-orange-700 border-orange-200' },
  { label: 'Gray', value: 'bg-gray-50 text-gray-700 border-gray-200' },
  { label: 'Pink', value: 'bg-pink-50 text-pink-700 border-pink-200' },
  { label: 'Indigo', value: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
];

export default function CategoryManager({ onClose }) {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0].value);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from('categories').select('*').order('created_at');
      if (error) throw error;
      setCategories(data);
    } catch (error) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);

    try {
      const { data, error } = await supabase.from('categories').insert({
        user_id: user.id,
        name: name.trim(),
        color: selectedColor
      }).select();

      if (error) throw error;
      setCategories([...categories, data[0]]);
      setName('');
      toast.success('Category added');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this category? Associated goals might lose their tag.')) return;
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      setCategories(categories.filter(c => c.id !== id));
      toast.success('Category deleted');
    } catch (error) {
      toast.error('Error deleting category');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden max-w-md w-full mx-auto">
      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <h3 className="font-bold text-gray-800">Manage Categories</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>
      </div>

      <div className="p-6">
        {/* ADD NEW FORM */}
        <form onSubmit={handleAdd} className="mb-8 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">New Category Name</label>
            <input
              type="text"
              placeholder="e.g., Financial Freedom"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 transition-colors"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Color Tag</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((color) => (
                <button
                  key={color.label}
                  type="button"
                  onClick={() => setSelectedColor(color.value)}
                  className={`w-6 h-6 rounded-full border ${color.value.split(' ')[0]} ${color.value.split(' ')[2]} ${selectedColor === color.value ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'opacity-70 hover:opacity-100'}`}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-black transition-all"
          >
            {submitting ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
            Add Category
          </button>
        </form>

        {/* EXISTING LIST */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Your Categories</label>
          {loading ? (
            <div className="text-center py-4"><Loader2 className="animate-spin mx-auto text-gray-400" /></div>
          ) : categories.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center">No categories yet.</p>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 group transition-colors">
                  <span className={`px-2 py-1 rounded text-xs font-bold border ${cat.color}`}>
                    {cat.name}
                  </span>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}