import React from 'react';
import { Pencil } from 'lucide-react'; // Assuming you use lucide-react
import { useUser } from '../../context/UserContext';

interface PromotionCardProps {
  id: number;
  name: string;
  type: 'automatic' | 'one-time';
  startTime: string;
  endTime?: string;
  minSpending: number;
  rate: number;
  points: number;
  description: string;
  onEdit: () => void;
  onClick: () => void; 
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
  onClick, // Use this prop for card click
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

  const currentUserRole = useUser().userData?.role;

  // Calculate the bonus percentage from the rate
  const bonusPercentage = Math.round(rate * 100);
  // Determine tag color based on type
  const tagColorClass =
    type === 'automatic' ? 'bg-blue-400' : 'bg-yellow-400';

  // Prevent edit button click from triggering card click
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Stops click from bubbling up to the card
    onEdit();
  };

  return (
    // Card container triggers the onClick view details
    <div
      onClick={onClick}
      className="flex cursor-pointer flex-col overflow-hidden rounded-lg bg-white shadow-md transition-shadow duration-200 hover:shadow-lg dark:bg-gray-800 aspect-square"
    >
      {/* Header */}
      <div className="relative h-28 flex-shrink-0 bg-slate-600 p-4 dark:bg-slate-500">
        {/* Edit button container handles edit click only for manager+ */}
        {(currentUserRole === "MANAGER" || currentUserRole === "SUPERUSER") && (<div
          className="absolute right-2 top-2 z-10 cursor-pointer rounded-md bg-white p-2 hover:bg-gray-100 dark:bg-gray-200 dark:hover:bg-gray-300"
          onClick={handleEditClick} 
          title="Edit Promotion"
          aria-label="Edit Promotion"
        >
          <Pencil className="text-gray-600 dark:text-gray-800" size={16} />
        </div>)}

        {/* Min Spending Tag */}
        {minSpending > 0 && (
          <div className="absolute bottom-2 left-2 rounded-md bg-white px-2 py-1 text-xs font-medium text-gray-800 dark:bg-gray-600 dark:text-white">
            min: ${minSpending.toFixed(2)}
          </div>
        )}
        {/* Type Tag */}
        <div
          className={`absolute bottom-2 right-2 rounded-md px-3 py-1 text-sm font-medium text-white ${tagColorClass}`}
        >
          {type === 'automatic' ? 'Automatic' : 'One time'}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-grow flex-col bg-white p-4 dark:bg-gray-700">
        <div className="flex-grow">
          {/* Title */}
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            {name}
          </h2>
          {/* Description */}
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {description.length > 30
              ? description.substring(0, 30) + '...'
              : description}
          </p>
          {/* Date Info */}
          <div className="mt-3 text-xs">
            <div className="flex items-center text-gray-600 dark:text-gray-300">
              <span className="font-medium">Starting:</span>
              <span className="ml-1">{formatDate(startTime)}</span>
            </div>
            {endTime && (
              <div className="flex items-center text-gray-600 dark:text-gray-300">
                <span className="font-medium">Ending:</span>
                <span className="ml-1">{formatDate(endTime)}</span>
              </div>
            )}
          </div>
        </div>
        {/* Footer Info */}
        <div className="flex items-end justify-between pt-3">
          <div className="font-bold text-blue-600 dark:text-blue-300">
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
