import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { getTodayString, formatDateReadable } from '../../lib/dateUtils';
import { Book, Heart, ChevronLeft, ChevronRight, Loader2, ClipboardList, BarChart2 } from 'lucide-react';
import { toast } from 'sonner';

export default function JournalPage() {
  const { user } = useAuth();
  const today = getTodayString();

  const [activeTab, setActiveTab] = useState('DIARY');

  // DIARY STATE
  const [selectedDate, setSelectedDate] = useState(today);
  const [entry, setEntry] = useState({ diary_content: '', testimony_content: '' });
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // REVIEW STATE
  const [reviews, setReviews] = useState([]);
  const [categories, setCategories] = useState({}); // Lookup Map: { id: { name: 'Health', color: 'bg-red...' } }
  const [selectedReview, setSelectedReview] = useState(null);
  const [loadingReviews, setLoadingReviews] = useState(false);

  useEffect(() => {
    if (user) {
      if (activeTab === 'DIARY') {
        fetchDiaryHistory();
        fetchEntryForDate(selectedDate);
      } else {
        fetchReviewsAndCats();
      }
    }
  }, [user, activeTab, selectedDate]);

  // --- DIARY LOGIC ---
  const fetchDiaryHistory = async () => {
    const { data } = await supabase.from('journal_entries').select('entry_date, diary_content, testimony_content').order('entry_date', { ascending: false });
    setHistoryList(data || []);
  };

  const fetchEntryForDate = async (date) => {
    setLoading(true);
    const { data } = await supabase.from('journal_entries').select('*').eq('entry_date', date).maybeSingle();
    setEntry({ diary_content: data?.diary_content || '', testimony_content: data?.testimony_content || '' });
    setLoading(false);
  };

  const handleSaveDiary = async (field, value) => {
    setSaving(true);
    const newEntry = { ...entry, [field]: value };
    setEntry(newEntry);
    const { error } = await supabase.from('journal_entries').upsert({ user_id: user.id, entry_date: selectedDate, ...newEntry }, { onConflict: 'user_id, entry_date' });
    if (!error && !historyList.find(h => h.entry_date === selectedDate)) fetchDiaryHistory();
    setSaving(false);
  };

  const changeDate = (days) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  // --- REVIEW LOGIC ---
  const fetchReviewsAndCats = async () => {
    setLoadingReviews(true);

    // 1. Fetch Categories for Color Lookup
    const { data: catData } = await supabase.from('categories').select('*');
    const catMap = {};
    catData?.forEach(c => {
      catMap[c.id] = { name: c.name, color: c.color };
    });
    setCategories(catMap);

    // 2. Fetch Reviews
    const { data: reviewData } = await supabase.from('weekly_reviews').select('*').order('week_start_date', { ascending: false });
    setReviews(reviewData || []);
    if (reviewData && reviewData.length > 0) setSelectedReview(reviewData[0]);

    setLoadingReviews(false);
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-140px)]">

      {/* SIDEBAR */}
      <div className="flex flex-col w-full md:w-64 bg-white rounded-xl border border-gray-200 overflow-hidden flex-shrink-0">
        <div className="flex border-b border-gray-200">
          <button onClick={() => setActiveTab('DIARY')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'DIARY' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:bg-gray-50'}`}>Daily Diary</button>
          <button onClick={() => setActiveTab('REVIEWS')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'REVIEWS' ? 'bg-purple-50 text-purple-600 border-b-2 border-purple-600' : 'text-gray-400 hover:bg-gray-50'}`}>Weekly Reviews</button>
        </div>

        <div className="overflow-y-auto flex-1 p-2 space-y-1">
          {activeTab === 'DIARY' ? (
            <>
               {historyList.map(item => (
                <button key={item.entry_date} onClick={() => setSelectedDate(item.entry_date)} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${selectedDate === item.entry_date ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                  <div className="flex justify-between items-center"><span>{formatDateReadable(item.entry_date)}</span>{item.testimony_content && <Heart size={10} className="text-pink-400" />}</div>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{item.diary_content || '...'}</p>
                </button>
              ))}
              {historyList.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No entries yet.</p>}
            </>
          ) : (
            <>
              {reviews.map(item => (
                <button key={item.id} onClick={() => setSelectedReview(item)} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${selectedReview?.id === item.id ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                  <div className="flex items-center gap-2"><ClipboardList size={14} className="text-purple-400" /><span>Week of {item.week_start_date}</span></div>
                </button>
              ))}
               {reviews.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No reviews yet.</p>}
            </>
          )}
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-h-0">
        {activeTab === 'DIARY' ? (
          <>
            <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
              <button onClick={() => changeDate(-1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"><ChevronLeft size={20} /></button>
              <div className="text-center"><h2 className="text-lg font-bold text-gray-800">{formatDateReadable(selectedDate)}</h2><p className="text-xs text-gray-400">{selectedDate === today ? 'Today' : 'Past Entry'}</p></div>
              <button onClick={() => changeDate(1)} disabled={selectedDate === today} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 disabled:opacity-30"><ChevronRight size={20} /></button>
            </div>
            {loading ? <div className="flex-1 flex items-center justify-center text-gray-400"><Loader2 className="animate-spin mr-2" /> Loading...</div> : (
              <div className="grid lg:grid-cols-2 gap-4 flex-1 overflow-y-auto">
                <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col shadow-sm"><div className="flex items-center gap-2 mb-4 text-blue-600 font-bold"><Book size={18} /><h3>Dear Diary</h3></div><textarea className="flex-1 w-full resize-none outline-none text-gray-700 leading-relaxed placeholder:text-gray-300 bg-transparent text-sm" placeholder="Write here..." value={entry.diary_content} onChange={(e) => setEntry({ ...entry, diary_content: e.target.value })} onBlur={(e) => handleSaveDiary('diary_content', e.target.value)} /></div>
                <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col shadow-sm"><div className="flex items-center gap-2 mb-4 text-pink-500 font-bold"><Heart size={18} /><h3>Today's Testimony</h3></div><textarea className="flex-1 w-full resize-none outline-none text-gray-700 leading-relaxed placeholder:text-gray-300 bg-transparent text-sm" placeholder="Share your testimony..." value={entry.testimony_content} onChange={(e) => setEntry({ ...entry, testimony_content: e.target.value })} onBlur={(e) => handleSaveDiary('testimony_content', e.target.value)} /></div>
              </div>
            )}
             {saving && <div className="text-right text-xs text-gray-400 mt-2">Saving...</div>}
          </>
        ) : (
          <>
            {selectedReview ? (
               <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-gray-200 p-8 shadow-sm animate-in fade-in">
                 <div className="border-b border-gray-100 pb-6 mb-6">
                   <h2 className="text-2xl font-bold text-gray-900">Review: Week of {selectedReview.week_start_date}</h2>
                   <p className="text-sm text-gray-400 mt-1">Here is how you performed that week.</p>
                 </div>

                 <div className="mb-8">
                   <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2"><BarChart2 size={14}/> Category Scores</h3>
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     {Object.entries(selectedReview.category_scores || {}).map(([catId, score]) => {
                       const cat = categories[catId] || { name: 'Unknown', color: 'bg-gray-100 text-gray-600' };
                       return (
                         <div key={catId} className={`p-4 rounded-xl border border-white/20 shadow-sm relative overflow-hidden group ${cat.color.replace('text-', 'bg-').replace('bg-', 'bg-opacity-10 ')}`}>
                            <span className={`absolute top-2 right-2 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-white/50`}>{cat.name}</span>
                            <div className="text-3xl font-bold text-gray-800 mt-2">{score}<span className="text-sm text-gray-400 opacity-60">/10</span></div>
                         </div>
                       );
                     })}
                   </div>
                 </div>

                 <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Book size={14}/> Reflection Notes</h3>
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 text-gray-700 whitespace-pre-wrap leading-relaxed text-sm">
                      {selectedReview.notes}
                    </div>
                 </div>
               </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400 bg-white rounded-xl border border-gray-200">
                {loadingReviews ? <Loader2 className="animate-spin" /> : 'Select a review to view details.'}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}