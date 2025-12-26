import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
      // REPLACED Alert
      toast.info("AI Service Warming Up", {
        description: "Please try again in 10 seconds or check your API quotas."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-5 text-white shadow-lg mb-8">
      <div className="flex justify-between items-start mb-3">
        <h2 className="text-base font-bold flex items-center gap-2">
          <Sparkles className="text-yellow-400" size={16} />
          Weekly Coach
        </h2>
        {!insight && (
          <button
            onClick={generateInsight}
            disabled={loading}
            className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors backdrop-blur-sm border border-white/10"
          >
            {loading ? <Loader2 className="animate-spin" size={14} /> : 'Get Analysis'}
          </button>
        )}
      </div>

      {insight ? (
        <div className="animate-in fade-in duration-500">
          <p className="leading-relaxed text-sm text-gray-200">
            {insight}
          </p>
          <button
            onClick={() => setInsight(null)}
            className="text-xs text-white/50 mt-2 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      ) : (
        <p className="text-gray-400 text-xs">
          Get a personalized review of your progress and tips for the week ahead.
        </p>
      )}
    </div>
  );
}