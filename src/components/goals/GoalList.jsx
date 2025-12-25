import { Trash2, CheckSquare, Hash, Tag } from 'lucide-react';

export default function GoalList({ goals, onDelete }) {
  if (goals.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
        <p className="text-gray-500">No goals set for 2026 yet.</p>
        <p className="text-sm text-gray-400">Click "Add Goal" to start.</p>
      </div>
    );
  }

  const getCategoryColor = (cat) => {
    switch(cat) {
      case 'Faith': return 'bg-purple-100 text-purple-700';
      case 'Health': return 'bg-green-100 text-green-700';
      case 'Career': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {goals.map((goal) => (
        <div key={goal.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
          <div className="flex justify-between items-start">
            <div>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(goal.category)} mb-2`}>
                <Tag size={12} />
                {goal.category}
              </span>
              <h3 className="font-semibold text-gray-900">{goal.title}</h3>
            </div>
            <button
              onClick={() => onDelete(goal.id)}
              className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
              title="Delete Goal"
            >
              <Trash2 size={16} />
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
            {goal.type === 'boolean' ? (
              <>
                <CheckSquare size={16} className="text-gray-400" />
                <span>Daily Checkbox</span>
              </>
            ) : (
              <>
                <Hash size={16} className="text-gray-400" />
                <span>Target: {Number(goal.target_value).toLocaleString()}</span>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}