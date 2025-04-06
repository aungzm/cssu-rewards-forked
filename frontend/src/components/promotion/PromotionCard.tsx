
interface PromotionCardProps {
  id: number;
  name: string;
  type: 'automatic' | 'oneTime';
  startTime: string;
  endTime?: string;
  minSpending: number;
  rate: number;
  points: number;
  description: string;
  onEdit: () => void; 
}

export default function PromotionsCard({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  id,
  name,
  type,
  startTime,
  endTime,
  minSpending,
  rate,
  points,
  description,
  onEdit, 
}: PromotionCardProps) {
  // Format date to display "Month Day, Year"
  const formatDate = (dateString: string): string => {
    const date: Date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Calculate the bonus percentage from the rate
  const bonusPercentage = Math.round(rate * 100);
  // Determine tag color based on type
  const tagColorClass =
    type === 'automatic' ? 'bg-blue-400' : 'bg-yellow-400';

  return (
    <div className="flex flex-col rounded-lg overflow-hidden shadow-md bg-white dark:bg-gray-800 aspect-square">
      {/* Header - Slate background with edit button */}
      <div className="bg-slate-600 dark:bg-slate-500 p-4 relative h-28 flex-shrink-0">
        {/* Edit button, onClick, cursor, hover styles */}
        {/* Used svg icon instead lucide for coloring issues */}
        <div
          className="absolute top-2 right-2 bg-white dark:bg-gray-200 p-2 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-300" 
          onClick={onEdit} 
          title="Edit Promotion"
          aria-label="Edit Promotion"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor" 
            strokeWidth="2"
            className="text-slate-700 dark:text-slate-800" 
          >
            <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
          </svg>
        </div>
        {/* Display minimum spend if present */}
        {minSpending > 0 && (
          <div className="absolute bottom-2 left-2 bg-white dark:bg-gray-600 text-gray-800 dark:text-white px-2 py-1 rounded-md font-medium text-xs">
            min: ${minSpending}
          </div>
        )}
        {/* Type tag */}
        <div
          className={`absolute bottom-2 right-2 ${tagColorClass} text-white px-3 py-1 rounded-md font-medium text-sm`}
        >
          {type === 'automatic' ? 'Automatic' : 'One time'}
        </div>
      </div>
      <div className="bg-white dark:bg-gray-700 p-4 flex flex-col flex-grow">
        <div className="flex-grow">
          {/* Title */}
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            {name}
          </h2>

          {/* Description */}
          <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm">
            {description}
          </p>

          {/* Date information */}
          <div className="mt-3 text-xs">
            <div className="flex items-center text-gray-600 dark:text-gray-300">
              <span className="font-medium">Starting:</span>
              <span className="ml-1">{formatDate(startTime)}</span>
            </div>

            {/* Only show ending if endTime exists */}
            {endTime && (
              <div className="flex items-center text-gray-600 dark:text-gray-300">
                <span className="font-medium">Ending:</span>
                <span className="ml-1">{formatDate(endTime)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Bonus and Points At the bottom */}
        <div className="flex justify-between items-end pt-3">
          <div className="text-blue-600 font-bold dark:text-blue-300">
            {bonusPercentage}% Bonus
          </div>
          <div className="text-blue-600 dark:text-blue-300">
            {points} points
          </div>
        </div>
      </div>
    </div>
  );
}
