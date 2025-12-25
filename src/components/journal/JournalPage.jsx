import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { getTodayString, formatDateReadable } from '../../lib/dateUtils';
import { Book, Heart, ChevronLeft, ChevronRight, Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function JournalPage() {
  const { user } = useAuth();
  const today = getTodayString();

  const [selectedDate, setSelectedDate] = useState(today);
  const [entry, setEntry] = useState({ diary_content: '', testimony_content: '' });
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchHistory();
      fetchEntryForDate(selectedDate);
    }
  }, [user, selectedDate]);

  // 1. Fetch list of dates that HAVE entries (for the sidebar)
  const fetchHistory = async () => {
    const { data } = await supabase
      .from('journal_entries')
      .select('entry_date, diary_content, testimony_content')
      .order('entry_date', { ascending: false });
    setHistoryList(data || []);
  };

  // 2. Fetch content for the SPECIFIC selected date
  const fetchEntryForDate = async (date) => {
    setLoading(true);
    const { data } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('entry_date', date)
      .maybeSingle(); // Use maybeSingle to avoid 406 error if not found

    if (data) {
      setEntry({
        diary_content: data.diary_content || '',
        testimony_content: data.testimony_content || ''
      });
    } else {
      setEntry({ diary_content: '', testimony_content: '' }); // Reset if no entry
    }
    setLoading(false);
  };

  // 3. Auto-save on blur
  const handleSave = async (field, value) => {
    setSaving(true);
    // Optimistic Update
    const newEntry = { ...entry, [field]: value };
    setEntry(newEntry);

    const { error } = await supabase
      .from('journal_entries')
      .upsert({
        user_id: user.id,
        entry_date: selectedDate,
        ...newEntry
      }, { onConflict: 'user_id, entry_date' });

    if (error) {
      toast.error('Failed to save entry');
    } else {
      // Refresh history list if this is a new entry
      if (!historyList.find(h => h.entry_date === selectedDate)) {
        fetchHistory();
      }
    }
    setSaving(false);
  };

  const changeDate = (days) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-140px)]">
      {/* LEFT SIDEBAR: History List (Desktop) */}
      <div className="hidden md:flex flex-col w-64 bg-white rounded-xl border border-gray-200 overflow-hidden flex-shrink-0">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-bold text-gray-700 flex items-center gap-2">
            <Calendar size={16} /> Past Entries
          </h3>
        </div>
        <div className="overflow-y-auto flex-1 p-2 space-y-1">
          {historyList.map(item => (
            <button
              key={item.entry_date}
              onClick={() => setSelectedDate(item.entry_date)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                selectedDate === item.entry_date
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex justify-between items-center">
                <span>{formatDateReadable(item.entry_date)}</span>
                {item.testimony_content && <Heart size={10} className="text-pink-400" />}
              </div>
              <p className="text-xs text-gray-400 truncate mt-0.5">
                {item.diary_content || item.testimony_content || 'Empty entry...'}
              </p>
            </button>
          ))}
          {historyList.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">No history yet.</p>
          )}
        </div>
      </div>

      {/* RIGHT MAIN: Editor */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Date Navigator */}
        <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
          <button onClick={() => changeDate(-1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            <ChevronLeft size={20} />
          </button>

          <div className="text-center">
            <h2 className="text-lg font-bold text-gray-800">
              {formatDateReadable(selectedDate)}
            </h2>
            <p className="text-xs text-gray-400">
              {selectedDate === today ? 'Today' : 'Past Entry'}
            </p>
          </div>

          <button
            onClick={() => changeDate(1)}
            disabled={selectedDate === today}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <Loader2 className="animate-spin mr-2" /> Loading entry...
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-4 flex-1 overflow-y-auto">
            {/* DIARY CARD */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-blue-600 font-bold">
                <Book size={18} />
                <h3>Dear Diary</h3>
              </div>
              <textarea
                className="flex-1 w-full resize-none outline-none text-gray-700 leading-relaxed placeholder:text-gray-300 bg-transparent text-sm"
                placeholder="How was your day? Write it down..."
                value={entry.diary_content}
                onChange={(e) => setEntry({ ...entry, diary_content: e.target.value })}
                onBlur={(e) => handleSave('diary_content', e.target.value)}
              />
            </div>

            {/* TESTIMONY CARD */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-pink-500 font-bold">
                <Heart size={18} />
                <h3>Today's Testimony</h3>
              </div>
              <textarea
                className="flex-1 w-full resize-none outline-none text-gray-700 leading-relaxed placeholder:text-gray-300 bg-transparent text-sm"
                placeholder="Did something amazing happen? Share your testimony..."
                value={entry.testimony_content}
                onChange={(e) => setEntry({ ...entry, testimony_content: e.target.value })}
                onBlur={(e) => handleSave('testimony_content', e.target.value)}
              />
            </div>
          </div>
        )}

        {saving && (
          <div className="text-right text-xs text-gray-400 mt-2 flex justify-end items-center gap-1">
            <Loader2 size={10} className="animate-spin" /> Saving changes...
          </div>
        )}
      </div>
    </div>
  );
}