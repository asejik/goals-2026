import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { getTodayString } from '../../lib/dateUtils';
import { Book, Heart, Save, Loader2 } from 'lucide-react';

export default function JournalSection() {
  const { user } = useAuth();
  const today = getTodayString();

  const [entries, setEntries] = useState({ diary_content: '', testimony_content: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) fetchJournal();
  }, [user]);

  const fetchJournal = async () => {
    const { data } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('entry_date', today)
      .single(); // .single() returns object instead of array

    if (data) {
      setEntries({
        diary_content: data.diary_content || '',
        testimony_content: data.testimony_content || ''
      });
    }
    setLoading(false);
  };

  const handleSave = async (field, value) => {
    setSaving(true);
    // Update local state first
    const newEntries = { ...entries, [field]: value };
    setEntries(newEntries);

    // Save to DB
    const { error } = await supabase
      .from('journal_entries')
      .upsert({
        user_id: user.id,
        entry_date: today,
        ...newEntries
      }, { onConflict: 'user_id, entry_date' });

    if (error) console.error('Error saving journal:', error);
    setSaving(false);
  };

  if (loading) return <div className="animate-pulse h-40 bg-gray-100 rounded-xl mb-8"></div>;

  return (
    <div className="grid md:grid-cols-2 gap-6 mb-12">
      {/* 1. DEAR DIARY */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-gray-800 font-bold">
            <Book size={20} className="text-blue-500" />
            <h3>Dear Diary</h3>
          </div>
          {saving && <span className="text-xs text-gray-400 flex items-center gap-1"><Loader2 size={10} className="animate-spin"/> Saving...</span>}
        </div>
        <textarea
          className="flex-1 w-full bg-yellow-50/50 border-0 rounded-lg p-4 text-gray-700 placeholder-gray-400 resize-none focus:ring-2 focus:ring-blue-100 outline-none leading-relaxed text-sm min-h-[150px]"
          placeholder="How was your day? What's on your mind?..."
          value={entries.diary_content}
          onChange={(e) => setEntries(prev => ({ ...prev, diary_content: e.target.value }))}
          onBlur={(e) => handleSave('diary_content', e.target.value)}
        />
      </div>

      {/* 2. TESTIMONY */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-gray-800 font-bold">
            <Heart size={20} className="text-pink-500" />
            <h3>Today's Testimony</h3>
          </div>
          {saving && <span className="text-xs text-gray-400 flex items-center gap-1"><Loader2 size={10} className="animate-spin"/> Saving...</span>}
        </div>
        <textarea
          className="flex-1 w-full bg-pink-50/30 border-0 rounded-lg p-4 text-gray-700 placeholder-gray-400 resize-none focus:ring-2 focus:ring-pink-100 outline-none leading-relaxed text-sm min-h-[150px]"
          placeholder="What are you grateful for? What miracle happened today?..."
          value={entries.testimony_content}
          onChange={(e) => setEntries(prev => ({ ...prev, testimony_content: e.target.value }))}
          onBlur={(e) => handleSave('testimony_content', e.target.value)}
        />
      </div>
    </div>
  );
}