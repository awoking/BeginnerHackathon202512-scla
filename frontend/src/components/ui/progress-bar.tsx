interface ProgressBarProps {
  value: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  className?: string;
  barClassName?: string;
}

export function ProgressBar({
  value,
  label,
  showPercentage = true,
  className = "",
  barClassName = "",
}: ProgressBarProps) {
  const percentage = Math.min(Math.max(value, 0), 100);
  
  // 進捗度に応じた色を決定
  const getColorClass = () => {
    if (percentage === 100) return "bg-green-500";
    if (percentage >= 70) return "bg-blue-500";
    if (percentage >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex justify-between items-center mb-1">
          <p className="text-xs font-medium text-gray-700">{label}</p>
          {showPercentage && <p className="text-xs font-semibold text-gray-600">{percentage}%</p>}
        </div>
      )}
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${getColorClass()} ${barClassName}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
