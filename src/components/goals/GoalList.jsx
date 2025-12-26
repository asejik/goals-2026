import { Trash2, Tag, Repeat, Edit2 } from 'lucide-react';

export default function GoalList({ goals, onDelete, onEdit }) { // <--- 1. Check onEdit is here
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {goals.map((goal) => (
        <div key={goal.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative group">
          <div className="flex justify-between items-start mb-2">
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${getCategoryColor(goal.category)}`}>
              <Tag size={10} /> {goal.category}
            </span>
            <div className="flex gap-1">
              {/* 2. Check the onClick here */}
              <button
                onClick={() => onEdit(goal)}
                className="text-gray-300 hover:text-blue-500 p-1 transition-colors"
                title="Edit Goal"
              >
                <Edit2 size={12} />
              </button>
              <button
                onClick={() => onDelete(goal.id)}
                className="text-gray-300 hover:text-red-500 p-1 transition-colors"
                title="Delete Goal"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>

          <h3 className="font-semibold text-sm text-gray-800 leading-tight mb-2 pr-4 truncate">
            {goal.title}
          </h3>

          <div className="flex items-center gap-2 text-[10px] text-gray-500">
            <div className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded">
              <Repeat size={10} />
              <span className="capitalize">{goal.period}</span>
              {goal.period === 'weekly' && goal.target_value && ` (${goal.target_value}x)`}
            </div>
            {goal.type === 'boolean' ? <span>Checkbox</span> : <span>Numeric</span>}
          </div>
        </div>
      ))}
    </div>
  );
}