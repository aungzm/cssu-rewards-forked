import React from 'react';
import { Pencil, MapPin, Clock, User } from 'lucide-react';
import { useUser } from '../../context/UserContext';

interface EventCardProps {
  id: number;
  name: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  capacity: number | null; // null means unlimited capacity
  numGuests: number;
  pointsRemain?: number;
  pointsAwarded?: number;
  published?: boolean;
  onClick: () => void;
  onEdit: () => void;
  onRsvp?: () => void;
  isOrganizer: boolean;
  isGuest: boolean;
}

export default function EventsCard({
  name,
  description = "no description provided",
  startTime,
  endTime,
  location,
  capacity,
  numGuests,
  pointsRemain,
  pointsAwarded,
  isOrganizer,
  isGuest,
  published,
  onClick,
  onEdit,
  onRsvp,
}: EventCardProps) {
  const currentUserRole = useUser().userData?.role;

  // Format date functions
  const formatDate = (dateString: string, timeOnly = false): string => {
    const date: Date = new Date(dateString);
    if (timeOnly) {
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    }
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getMonthShort = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short" });
  };

  const getDayOfMonth = (dateString: string): string => {
    const date = new Date(dateString);
    return date.getDate().toString();
  };

  const handleRsvpClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    // Check if RSVP function is provided
    if (!onRsvp) return;
    onRsvp();
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    onEdit();
  };

  const isDisabled =
    new Date(endTime) < new Date() ||
    isOrganizer ||
    (capacity !== null && capacity <= numGuests);
  return (
    <div
      onClick={onClick}
      className="flex flex-col overflow-hidden rounded-lg bg-white dark:bg-slate-600 shadow-md transition-shadow duration-200 hover:shadow-xl aspect-square cursor-pointer"
    >
      {/* Event image with date badge */}
      <div className="relative h-2/5 bg-gray-200 dark:bg-slate-500 bg-cover bg-center">
        {/* Edit button for managers/superusers */}
        {(currentUserRole === "MANAGER" || currentUserRole === "SUPERUSER" || isOrganizer) && (
            <div
            className="absolute right-2 top-4 z-10 flex cursor-pointer aspect-square w-9 rounded-lg bg-white p-2 shadow-sm hover:bg-gray-100 items-center justify-center dark:bg-gray-200"
            onClick={handleEditClick}
            title="Edit Event"
            aria-label="Edit Event"
            >
            <Pencil className="h-4 w-4 text-gray-700" />
            </div>
        )}

        {/* Date display */}
        <div className="absolute left-4 top-4 flex w-16 aspect-square flex-col items-center rounded-lg bg-white p-2 text-center shadow-md dark:bg-slate-400">
          <span className="text-xs font-semibold uppercase text-purple-700 dark:text-purple-600">
            {getMonthShort(startTime)}
          </span>
          <span className="text-xl font-bold text-gray-800 dark:text-white">
            {getDayOfMonth(startTime)}
          </span>
        </div>

        {/* Published satus indicator*/}
        {(currentUserRole === "MANAGER" || currentUserRole === "SUPERUSER") && (published ? (
          <div className="absolute right-4 bottom-2 flex items-center justify-center rounded-lg bg-green-500 px-2 py-1 text-xs font-semibold text-white shadow-md dark:bg-green-800">
            Published
          </div>
        ) : (
          <div className="absolute right-4 bottom-2 flex items-center justify-center rounded-lg bg-red-500 px-2 py-1 text-xs font-semibold text-white shadow-md dark:bg-red-800">
            Unpublished
          </div>
        ))}
      </div>

      {/* Event content */}
      <div className="flex flex-grow flex-col p-4">
        <h3 className="mb-3 text-base font-semibold text-gray-800 dark:text-white">
          {name}
        </h3>

        {/* Event details section */}
        <div className="mb-3 space-y-1.5">
          {/* Time */}
          <div className="flex items-center text-sm text-gray-600 dark:text-white">
            <Clock className="mr-2 h-4 w-4" />
            <span>
                {formatDate(startTime) === formatDate(endTime) ? (
                <>
                  {formatDate(startTime, true)} - {formatDate(endTime, true)}
                </>
                ) : (
                <>
                  {formatDate(startTime)} {formatDate(startTime, true)} - {formatDate(endTime)} {formatDate(endTime, true)}
                </>
                )}
            </span>
          </div>

          {/* Location */}
          {location && (
            <div className="flex items-center text-sm text-gray-600 dark:text-white">
              <MapPin className="mr-2 h-4 w-4" />
              <span>{location}</span>
            </div>
          )}

          {/* Attendance */}
          <div className="flex items-center text-sm text-gray-600 dark:text-white">
            <User className="mr-2 h-4 w-4" />
            <span>
              {numGuests}
              {capacity ? ` / ${capacity}` : ""} attending
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="mb-4 text-sm text-gray-600 line-clamp-3 dark:text-white">
          {(() => {
            const words = description.split(" ");
            return words.length > 40 ? words.slice(0, 40).join(" ") + "..." : description;
          })()}
        </p>

        {/* Footer with points and RSVP button */}
        <div className="mt-auto flex items-center justify-between">
          {/* Points info */}
          {currentUserRole === "MANAGER" || currentUserRole === "SUPERUSER" ? (
           <div className='flex flex-col'>
            <span className="font-semibold text-blue-600 dark:text-blue-200">
              Points Remain: {pointsRemain}  
            </span>
            <span className="font-semibold text-blue-600 dark:text-blue-200">
              Points Awarded: {pointsAwarded}
            </span>
            </div>
          ) : (
            <span className="font-semibold text-blue-600 dark:text-blue-200">
              {pointsAwarded ? `Earned ${pointsAwarded} points` : ""}
            </span>
          )}

          {/* RSVP Button */}
            <button
              disabled={isDisabled}
              className={`rounded px-4 py-2 text-sm font-medium text-white transition-colors ${
              isDisabled
                ? "bg-gray-400 cursor-not-allowed"
                : isGuest
                ? "bg-purple-600 hover:bg-purple-800 dark:bg-purple-600 dark:hover:bg-purple-500"
                : "bg-[#0063C6] hover:bg-[#002A5C] dark:bg-blue-500 dark:hover:bg-blue-400"
              }`}
              onClick={handleRsvpClick}
            >
              {isGuest ? "RSVP'd" : "RSVP"}
            </button>
        </div>
      </div>
    </div>
  );
}
