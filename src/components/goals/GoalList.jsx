import { Trash2, Tag, Repeat } from 'lucide-react';

export default function GoalList({ goals, onDelete }) {
  if (goals.length === 0) {
    return (
      <div className="text-center py-8 bg-white rounded-lg border border-dashed border-gray-200">
        <p className="text-xs text-gray-500">No goals set for 2026 yet.</p>
      </div>
    );
  }

  const getCategoryColor = (cat) => {
    switch(cat) {
      case 'Faith': return 'text-purple-600 bg-purple-50';
      case 'Health': return 'text-green-600 bg-green-50';
      case 'Career': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
       {/* List Header */}
       <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
          <div className="col-span-6">Goal</div>
          <div className="col-span-3">Category</div>
          <div className="col-span-2">Frequency</div>
          <div className="col-span-1 text-right"></div>
        </div>

      <div className="divide-y divide-gray-100">
        {goals.map((goal) => (
          <div key={goal.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 p-3 items-center hover:bg-gray-50 transition-colors group">

            {/* Title */}
            <div className="col-span-6 font-medium text-sm text-gray-800 truncate">
              {goal.title}
            </div>

            {/* Category Pill */}
            <div className="col-span-3">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${getCategoryColor(goal.category)}`}>
                <Tag size={10} /> {goal.category}
              </span>
            </div>

            {/* Frequency */}
            <div className="col-span-2 flex items-center gap-1 text-xs text-gray-500">
              <Repeat size={12} className="text-gray-400" />
              <span className="capitalize">{goal.period}</span>
              {goal.period === 'weekly' && goal.target_value && (
                <span className="text-gray-400">({goal.target_value}x)</span>
              )}
            </div>

            {/* Delete Action */}
            <div className="col-span-1 text-right">
              <button
                onClick={() => onDelete(goal.id)}
                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                title="Delete Goal"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}