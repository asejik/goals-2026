import { Edit2, Trash2 } from 'lucide-react';

const FALLBACK_COLORS = {
  'Health': '#ef4444',
  'Business': '#3b82f6',
  'Spiritual': '#8b5cf6',
  'Learning': '#f59e0b',
  'Relationships': '#ec4899',
  'Academic': '#f97316'
};

export default function GoalList({ goals, onDelete, onEdit }) {
  if (goals.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {goals.map((goal) => {
        let displayColor = goal.color;
        if (!displayColor || displayColor === '#000000') {
           displayColor = FALLBACK_COLORS[goal.category] || '#6b7280';
        }

        return (
          <div
            key={goal.id}
            className="group relative bg-white rounded-xl border border-gray-100 hover:shadow-sm transition-all overflow-hidden"
          >
            {/* The Unified "Color Edge" */}
            <div
              className="absolute left-0 top-0 bottom-0 w-[4px]"
              style={{ backgroundColor: displayColor }}
            />

            <div className="p-3 pl-4">
              <div className="flex justify-between items-start mb-1">
                <span
                  className="text-[9px] font-bold uppercase tracking-wider"
                  style={{ color: displayColor }}
                >
                  {goal.category}
                </span>

                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onEdit(goal)} className="text-gray-300 hover:text-blue-600">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => onDelete(goal.id)} className="text-gray-300 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <h3 className="text-sm font-bold text-gray-900 leading-tight mb-2">{goal.title}</h3>

              {goal.action_steps && goal.action_steps.length > 0 && (
                 <div className="flex items-center gap-1.5">
                   <div className="flex -space-x-1.5">
                     {goal.action_steps.slice(0,3).map((_, i) => (
                       <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-200 ring-1 ring-white" />
                     ))}
                   </div>
                   <span className="text-[10px] text-gray-400 font-medium">
                     {goal.action_steps.length} actions
                   </span>
                 </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}