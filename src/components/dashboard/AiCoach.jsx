import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Sparkles, Loader2 } from 'lucide-react';

export default function AiCoach({ goals }) {
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateInsight = async () => {
    setLoading(true);
    try {
      // 1. Gather Data (Last 7 days of logs)
      const { data: logs } = await supabase
        .from('daily_logs')
        .select('*')
        .limit(20);

      const { data: journal } = await supabase
        .from('journal_entries')
        .select('*')
        .limit(5);

      // 2. Call our Python API
      // Note: In production Vercel handles /api path.
      // Locally, we might need to deploy to test this fully if we don't have Vercel CLI.
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goals: goals.map(g => ({ title: g.title, category: g.category })),
          logs: logs,
          journal: journal
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setInsight(data.insight);

    } catch (err) {
      console.error(err);
      alert("AI is warming up. Please try again or deploy to Vercel to see it work!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-lg mb-8">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Sparkles className="text-yellow-300" />
          AI Weekly Coach
        </h2>
        {!insight && (
          <button
            onClick={generateInsight}
            disabled={loading}
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors backdrop-blur-sm"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : 'Generate Review'}
          </button>
        )}
      </div>

      {insight ? (
        <div className="animate-in fade-in duration-500">
          <p className="leading-relaxed bg-white/10 p-4 rounded-lg border border-white/10">
            {insight}
          </p>
          <button
            onClick={() => setInsight(null)}
            className="text-xs text-white/60 mt-3 hover:text-white"
          >
            Clear & Refresh
          </button>
        </div>
      ) : (
        <p className="text-indigo-100 text-sm opacity-90">
          Tap the button to let Gemini analyze your logs and give you a strategy for next week.
        </p>
      )}
    </div>
  );
}