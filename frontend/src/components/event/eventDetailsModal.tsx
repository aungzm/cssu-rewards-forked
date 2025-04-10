import { useState, useEffect } from "react";
import { Pencil, X, MapPin, Calendar, Clock, Users, Award } from "lucide-react";
import { useUser } from "../../context/UserContext";
import { fetchWithAuth } from "../../utils/authHelper";
import { API_BASE_URL } from "../../utils/auth";

interface EventDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  eventId?: number;
}

interface Organizer {
  id: number;
  utorid: string;
  name: string;
}

interface Guest {
  id: number;
  utorid: string;
  name: string;
}

interface EventDetails {
  id: number;
  name: string;
  description: string;
  location: string;
  startTime: string;
  endTime: string;
  capacity: number;
  numGuests?: number;
  pointsRemain?: number;
  pointsAwarded?: number;
  published?: boolean;
  organizers: Organizer[];
  guests?: Guest[];
}

// Helper function to format time only
const formatTime = (dateString: string | null | undefined): string => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Helper function to format date only
const formatDateOnly = (dateString: string | null | undefined): string => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export default function EventDetailsModal({
  isOpen,
  onClose,
  onEdit,
  eventId,
}: EventDetailsModalProps) {
  const { userData } = useUser();
  const userRole = userData?.role;
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch event details when modal opens
  useEffect(() => {
    const fetchEventDetails = async () => {
      if (!isOpen || !eventId) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetchWithAuth(`${API_BASE_URL}/events/${eventId}`, {
          method: "GET",
        });
        const data = await response.json();
        setEvent(data);
      } catch (err) {
        console.error("Failed to fetch event details:", err);
        setError("Failed to load event details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [isOpen, eventId]);

  if (!isOpen) return null;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 transition-opacity duration-300 ease-in-out"
      onClick={onClose}
    >
      {/* Modal Content */}
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with background color and event name */}
        <div className="relative bg-[#002A5C] p-6 text-white">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-1.5 text-white transition hover:bg-white/20"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>

          {/* Edit Button - only for managers and super users */}
          {(userRole === "MANAGER" || userRole === "SUPERUSER") && (
            <button
              onClick={onEdit}
              className="absolute right-14 top-4 rounded-full bg-white/10 p-1.5 text-white transition hover:bg-white/20"
              aria-label="Edit event"
            >
              <Pencil size={20} />
            </button>
          )}

          <h2 className="text-2xl font-bold">{loading ? "Loading..." : event?.name}</h2>

          {/* Date badge */}
          {event && (
            <div className="mt-2 flex items-center text-sm">
              <Calendar className="mr-2 h-4 w-4" />
              <span>
                {formatDateOnly(event.startTime)}
                {formatDateOnly(event.startTime) !== formatDateOnly(event.endTime) &&
                  ` - ${formatDateOnly(event.endTime)}`}
              </span>
            </div>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex h-64 flex-col items-center justify-center p-6">
            <p className="text-red-500">{error}</p>
            <button
              onClick={onClose}
              className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-white"
            >
              Close
            </button>
          </div>
        )}

        {/* Event details content */}
        {!loading && !error && event && (
          <div className="p-6">
            {/* Main details grid */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Left column */}
              <div>
                {/* Time */}
                <div className="mb-6">
                  <h3 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Time
                  </h3>
                  <div className="flex items-center text-gray-800 dark:text-gray-200">
                    <Clock className="mr-2 h-5 w-5 text-[#0063C6]" />
                    <span>
                      {formatTime(event.startTime)} - {formatTime(event.endTime)}
                    </span>
                  </div>
                </div>

                {/* Location */}
                {event.location && (
                  <div className="mb-6">
                    <h3 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Location
                    </h3>
                    <div className="flex items-center text-gray-800 dark:text-gray-200">
                      <MapPin className="mr-2 h-5 w-5 text-[#0063C6]" />
                      <span>{event.location}</span>
                    </div>
                  </div>
                )}

                {/* Capacity */}
                <div className="mb-6">
                  <h3 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Attendance
                  </h3>
                  <div className="flex items-center text-gray-800 dark:text-gray-200">
                    <Users className="mr-2 h-5 w-5 text-[#0063C6]" />
                    <span>
                      {event.numGuests !== undefined
                        ? event.numGuests
                        : event.guests?.length || 0}{" "}
                      / {event.capacity} attendees
                    </span>
                  </div>
                </div>

                {/* Points (Only for managers/superusers) */}
                {(userRole === "MANAGER" || userRole === "SUPERUSER") && (
                  <div className="mb-6">
                    <h3 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Points
                    </h3>
                    <div className="flex items-center text-gray-800 dark:text-gray-200">
                      <Award className="mr-2 h-5 w-5 text-[#0063C6]" />
                      <span>
                        {event.pointsAwarded} awarded / {event.pointsRemain} remaining
                      </span>
                    </div>
                    {event.published !== undefined && (
                      <div className="mt-2 text-sm">
                        <span className="font-medium">Status: </span>
                        <span
                          className={`${
                            event.published ? "text-green-600" : "text-amber-600"
                          }`}
                        >
                          {event.published ? "Published" : "Unpublished"}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right column - Description */}
              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                  Description
                </h3>
                <p className="whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200">
                  {event.description || "No description provided."}
                </p>
              </div>
            </div>

            {/* Organizers section */}
            <div className="mt-8">
              <h3 className="mb-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                Organizers
              </h3>
              <div className="flex flex-wrap gap-2">
                {event.organizers.map((organizer) => (
                  <div
                    key={organizer.id}
                    className="rounded-full bg-gray-100 px-3 py-1 text-sm dark:bg-gray-700"
                  >
                    {organizer.utorid} 
                  </div>
                ))}
              </div>
            </div>

            {/* Guests section - only for managers/superusers */}
            {(userRole === "MANAGER" || userRole === "SUPERUSER") && event.guests && (
              <div className="mt-8">
                <h3 className="mb-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                  Guests ({event.guests.length})
                </h3>
                {event.guests.length > 0 ? (
                  <div className="max-h-40 overflow-y-auto">
                    <div className="flex flex-wrap gap-2">
                      {event.guests.map((guest) => (
                        <div
                          key={guest.id}
                          className="rounded-full bg-gray-100 px-3 py-1 text-sm dark:bg-gray-700"
                        >
                          {guest.utorid}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No guests registered yet.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
