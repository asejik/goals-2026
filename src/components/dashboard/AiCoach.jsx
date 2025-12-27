import { useState } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from '../../lib/supabase';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

export default function AiCoach({ goals }) {
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateInsight = async () => {
    // Check for API Key
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      toast.error("Missing API Key. Check Vercel Environment Variables.");
      return;
    }

    setLoading(true);
    try {
      // 1. FETCH CONTEXT DATA
      const { data: reviews } = await supabase
        .from('weekly_reviews')
        .select('*')
        .order('week_start_date', { ascending: false })
        .limit(1);
      const latestReview = reviews?.[0] || null;

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: recentLogs } = await supabase
        .from('daily_logs')
        .select('action_step_id, is_complete, numeric_value, log_date')
        .gte('log_date', sevenDaysAgo.toISOString().split('T')[0]);

      const { data: actions } = await supabase
        .from('action_steps')
        .select('id, title, target_value, period, goals(title, categories(name))');

      // 2. FORMAT DATA
      const performanceSummary = actions?.map(action => {
        const actionLogs = recentLogs?.filter(l => l.action_step_id === action.id) || [];
        const totalDone = actionLogs.filter(l => l.is_complete || l.numeric_value > 0).length;
        return `- Action: "${action.title}" (Identity: ${action.goals?.title}). Completed ${totalDone} times in last 7 days.`;
      }).join('\n');

      const reviewSummary = latestReview
        ? `Last Review Notes:\n${latestReview.notes}\nCategory Scores: ${JSON.stringify(latestReview.category_scores)}`
        : "No weekly review found yet.";

      // 3. CONSTRUCT PROMPT
      const prompt = `
        You are an elite productivity coach for an app called "Align".
        Your goal is to connect the user's STATED IDENTITY (Goals) with their ACTUAL BEHAVIOR (Logs) and REFLECTIONS (Review).

        DATA CONTEXT:
        1. IDENTITY GOALS:
        ${goals.map(g => `- ${g.title} (${g.category})`).join('\n')}

        2. ACTUAL PERFORMANCE (Last 7 Days):
        ${performanceSummary}

        3. USER'S LATEST REFLECTION:
        ${reviewSummary}

        INSTRUCTIONS:
        - Analyze the gap between their goals and their actions.
        - Look for patterns in their Weekly Review scores vs their missed actions.
        - Be concise (max 3 sentences).
        - Be encouraging but direct. Call them out if they are slacking in an area they rated low.
        - Address the user as "you".
      `;

      // 4. CALL GEMINI (Updated to 2.0-flash)
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;

      setInsight(response.text());

    } catch (error) {
      console.error(error);
      toast.error('Coach is offline. Check API Key or try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-5 text-white shadow-lg mb-8 relative overflow-hidden animate-in fade-in">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <Sparkles size={100} />
      </div>

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-3">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Sparkles className="text-yellow-400" size={16} />
            Weekly Coach
          </h2>

          {!insight && !loading && (
            <button
              onClick={generateInsight}
              className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors backdrop-blur-sm border border-white/10 flex items-center gap-2"
            >
              Analyze My Week
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center gap-3 py-2 animate-pulse">
            <Loader2 className="animate-spin text-blue-400" size={18} />
            <span className="text-sm text-gray-300">Connecting dots between your review and actions...</span>
          </div>
        ) : insight ? (
          <div className="animate-in fade-in duration-500">
            <div className="text-sm text-gray-100 leading-relaxed font-medium bg-white/5 p-3 rounded-lg border border-white/10 shadow-inner">
              {insight}
            </div>
            <div className="flex justify-end mt-2">
              <button
                onClick={() => setInsight(null)}
                className="text-[10px] text-white/50 hover:text-white flex items-center gap-1 transition-colors"
              >
                <RefreshCw size={10} /> Reset
              </button>
            </div>
          </div>
        ) : (
          <p className="text-gray-400 text-xs max-w-lg">
            Tap analyze to have the Weekly Coach review your recent logs, scores, and notes to give you a personalized strategy.
          </p>
        )}
      </div>
    </div>
  );
}