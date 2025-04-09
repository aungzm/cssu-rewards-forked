import React from 'react';
import { Pencil } from 'lucide-react'; // Assuming you use lucide-react
import { useUser } from '../../context/UserContext';

interface EventCardProps {
  id: number;
  name: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  capacity: string;
  pointsRemain: number;
  pointsAwarded: number;
  published: boolean;
  onClick: () => void;
  onEdit: () => void;
}

export default function EventsCard({
  id,
  name,
  description = "no description provided",
  startTime,
  endTime,
  location,
  capacity,
  pointsRemain,
  pointsAwarded,
  published,
  onClick,
  onEdit,
} : EventCardProps) {
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
  const handleEditClick = (e: React.MouseEvent) => {
      e.stopPropagation(); // Stops click from bubbling up to the card
      onEdit();
    };
  return (
    <div
          onClick={onClick}
          className="flex cursor-pointer flex-col overflow-hidden rounded-lg bg-white shadow-md transition-shadow duration-200 hover:shadow-lg dark:bg-gray-800 aspect-square"
        >
          {/* Header */}
          <div className="relative h-28 flex-shrink-0 bg-slate-600 p-4 dark:bg-slate-500">
            {/* Edit button container handles edit click */}
            {(currentUserRole === "MANAGER" || currentUserRole === "SUPERUSER") && (<div
              className="absolute right-2 top-2 z-10 cursor-pointer rounded-md bg-white p-2 hover:bg-gray-100 dark:bg-gray-200 dark:hover:bg-gray-300"
              onClick={handleEditClick} 
              title="Edit Event"
              aria-label="Edit Event"
            >
              <Pencil className="text-gray-600 dark:text-gray-800" size={16} />
            </div>)}
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
              
            </div>
          </div>
        </div>
  )
}