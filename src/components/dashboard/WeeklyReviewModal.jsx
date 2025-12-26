import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { X, ChevronRight, Check, Star, TrendingUp, Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function WeeklyReviewModal({ onClose }) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [scores, setScores] = useState({});
  const [wins, setWins] = useState('');
  const [improvements, setImprovements] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const getThisWeekDate = () => {
    const today = new Date();
    const day = today.getDay(); // 0 (Sun) - 6 (Sat)
    const diff = today.getDate() - day;
    const sunday = new Date(today.setDate(diff));
    return sunday.toISOString().split('T')[0];
  };

  const loadData = async () => {
    try {
      // 1. Fetch Categories
      const { data: cats } = await supabase.from('categories').select('*').order('name');
      setCategories(cats || []);

      // Initialize scores default
      const initialScores = {};
      cats?.forEach(c => initialScores[c.id] = 5);

      // 2. Check for EXISTING Review for this week
      const weekDateStr = getThisWeekDate();
      const { data: existingReview } = await supabase
        .from('weekly_reviews')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start_date', weekDateStr)
        .maybeSingle();

      if (existingReview) {
        // PRE-FILL DATA (Edit Mode)
        if (existingReview.category_scores) setScores(existingReview.category_scores);

        // Parse the notes back into Wins/Improvements if possible
        // (Simple split by our known separators)
        const notes = existingReview.notes || '';
        if (notes.includes('🏆 WINS:')) {
            const parts = notes.split('🛠 ADJUSTMENTS:');
            setWins(parts[0].replace('🏆 WINS:\n', '').trim());
            if (parts[1]) setImprovements(parts[1].trim());
        } else {
            setWins(notes); // Fallback
        }
      } else {
        setScores(initialScores);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (catId, val) => {
    setScores(prev => ({ ...prev, [catId]: parseInt(val) }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const weekDateStr = getThisWeekDate();
      const finalNotes = `🏆 WINS:\n${wins}\n\n🛠 ADJUSTMENTS:\n${improvements}`;

      const { error } = await supabase.from('weekly_reviews').upsert({
        user_id: user.id,
        week_start_date: weekDateStr,
        category_scores: scores,
        notes: finalNotes
      }, { onConflict: 'user_id, week_start_date' });

      if (error) throw error;

      toast.success('Weekly Review Saved!');
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <Loader2 className="animate-spin text-white" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

        {/* HEADER */}
        <div className="bg-gray-900 text-white p-6 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Calendar className="text-blue-400" /> Weekly Review
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {step === 1 ? "Score your performance (0-10)" : "Reflect and adjust"}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X /></button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto">
          {step === 1 ? (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              {categories.map(cat => (
                <div key={cat.id}>
                  <div className="flex justify-between items-end mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${cat.color}`}>
                      {cat.name}
                    </span>
                    <span className="font-bold text-lg text-gray-700">{scores[cat.id]}<span className="text-gray-300 text-sm">/10</span></span>
                  </div>
                  <input
                    type="range"
                    min="0" max="10"
                    value={scores[cat.id] || 5}
                    onChange={(e) => handleScoreChange(cat.id, e.target.value)}
                    className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>Needs Work</span>
                    <span>Excellent</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <Star size={16} className="text-yellow-500" /> What went well? (Wins)
                </label>
                <textarea
                  className="w-full h-24 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  placeholder="I stayed consistent with my gym routine..."
                  value={wins}
                  onChange={e => setWins(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <TrendingUp size={16} className="text-blue-500" /> What needs adjusting?
                </label>
                <textarea
                  className="w-full h-24 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  placeholder="I need to sleep earlier to wake up for prayer..."
                  value={improvements}
                  onChange={e => setImprovements(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between">
          {step === 2 ? (
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Back
            </button>
          ) : (
             <div></div>
          )}

          {step === 1 ? (
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 bg-gray-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-black transition-all"
            >
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
            >
              {submitting ? "Saving..." : "Save Review"} <Check size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}