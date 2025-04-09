import React from 'react';
import { Pencil, MapPin, Clock } from 'lucide-react'; // Assuming you use lucide-react
import { useUser } from '../../context/UserContext';

interface EventCardProps {
  id: number;
  name: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  capacity?: number;
  numGuests: number
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
  numGuests,
  pointsRemain,
  pointsAwarded,
  published,
  onClick,
  onEdit,
} : EventCardProps) {
  // Format date to display "Month Day, Year"
  const formatDate = (dateString: string,timeOnly=false): string => {
    const date: Date = new Date(dateString);
    if (timeOnly) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: "2-digit"
      });
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };
  const currentUserRole = useUser().userData?.role;
  let tagColorClass = null;
  if (!capacity) {
    tagColorClass='bg-green-400'
  } else if (numGuests>=capacity) {
    tagColorClass='bg-red-400'
  } else if (numGuests>=capacity*0.8) {
    tagColorClass='bg-yellow-400'
  } else {
    tagColorClass='bg-green-400'
  }
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
            {/*Start Date Tag */}
            <div className="absolute top-2 left-2 rounded-md bg-white p-2 dark:text-white" >
              {formatDate(startTime)}
            </div>
            {/* Location Tag */}
            {location ? (
              <div className="absolute bottom-2 left-2 rounded-md bg-white px-2 py-1 text-xs font-medium text-gray-800 dark:bg-gray-600 dark:text-white flex items-center ">
              <MapPin size={20}/>
              {location}
            </div>
            ): <></>}
            {/* Capacity Tag */}
              <div
                className={`absolute bottom-2 right-2 rounded-md px-3 py-1 text-sm font-medium text-white ${tagColorClass}`}
              >
                {numGuests}{capacity?`/${capacity}`:""}
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
                  ? description.substring(0, 200) + '...'
                  : description}
              </p>
              {/* Date Info */}
              <div className="mt-3 text-xs flex items-center text-gray-600 dark:text-gray-300">
                  <Clock size={16}/>
                  <span className="ml-1">{formatDate(startTime,true)} - </span>
                  <span className="ml-1">{formatDate(startTime)===formatDate(endTime)? "": formatDate(endTime)} {formatDate(endTime,true)}</span>
              </div>
              

            </div>
            {/* Footer Info */}
            <div className="flex items-end justify-between pt-3">
              
            </div>
          </div>
        </div>
  )
}