import { CiCalendar } from "react-icons/ci";
import { FaLocationDot } from "react-icons/fa6";
import { EventDetails } from "../../types";

interface EventListEntryProps {
  event: EventDetails; // Ideally, replace "any" with a proper type
  onClick?: () => void;
}

function EventListEntry({ event, onClick }: EventListEntryProps) {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer flex flex-row bg-white border-t border-gray-300 py-2 justify-between  hover:bg-gray-200 dark:bg-slate-600 dark:hover:bg-gray-500"
    >
      {/* Name and time */}
      <div className="flex flex-col dark:text-white">
        <p>{event.name}</p>
        <p className="text-gray-500 dark:text-white">
          {event.startTime.slice(11, 19)} to {event.endTime.slice(11, 19)}
        </p>
      </div>
      {/* Date */}
      <div className="flex flex-row items-center gap-1 text-sm text-gray-500 dark:text-white">
        <CiCalendar className="text-xl text-red-700 dark:text-red-400" />
        <p>{event.endTime.slice(0, 10)}</p>
      </div>
      {/* Location */}
      <div className="flex flex-row items-center gap-1 text-sm text-gray-500  dark:text-white">
        <FaLocationDot className="text-md text-green-700 dark:text-green-400" />
        <p className="w-[10rem] truncate overflow-hidden">{event.location}</p>
      </div>
      <button
        onClick={() => {}}
        className="bg-[#0063C6] text-white text-sm border border-[#0063C6] rounded-sm px-2 py-2 mx-2 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600"
      >
        View Details
      </button>
    </div>
  );
}

export default EventListEntry;
