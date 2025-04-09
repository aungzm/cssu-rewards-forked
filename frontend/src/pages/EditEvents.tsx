import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import {
  Users,
  UserPlus,
  Calendar,
  MapPin,
  Clock,
  Edit,
  AlertCircle,
} from "lucide-react";
import { useUser } from "../context/UserContext";
import { fetchWithAuth } from "../utils/authHelper";
import { API_BASE_URL } from "../utils/auth";
import { EventDetails } from "../types";
import Navbar from "../components/Navbar";

// Import the actual tab components you provided
import { EventDetailsTab } from "../components/editEvents/EditEventsTab";
import { AttendeesList } from "../components/editEvents/AttendeesTab";
import { OrganizersTab } from "../components/editEvents/OrganizersTab";

export default function EventDetailsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { userData } = useUser();
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  // Determine if the current user is a manager or superuser
  const isManagerOrHigher =
    userData?.role === "MANAGER" || userData?.role === "SUPERUSER";

  // Fetch event data
  useEffect(() => {
    const fetchEventData = async () => {
      if (!eventId) {
        setError("Event ID is missing.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null); // Reset error on new fetch
      try {
        // Use fetchWithAuth for authenticated requests
        const response = await fetchWithAuth(
          `${API_BASE_URL}/events/${eventId}`,
          {
            method: "GET",
          }
        );
        const data: EventDetails = await response.json();
        setEvent(data);
      } catch (err) {
        console.error("Failed to fetch event:", err);
        if (err instanceof Response && err.status === 404) {
          setError("Event not found.");
        } else {
          setError("Failed to load event details. Please try again later.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchEventData();
  }, [eventId]); // Dependency array includes eventId

  // Format date for the summary card
  const formatDateRange = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    const startDate = start.toLocaleDateString(undefined, options);
    const endDate = end.toLocaleDateString(undefined, options);
    const sameDay = start.toDateString() === end.toDateString();
    return sameDay ? startDate : `${startDate} - ${endDate}`;
  };

  // Format time for the summary card
  const formatTimeRange = (startTime: string, endTime: string) => {
    const formatOptions: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
    const startFormatted = new Date(startTime).toLocaleTimeString(
      [],
      formatOptions
    );
    const endFormatted = new Date(endTime).toLocaleTimeString(
      [],
      formatOptions
    );
    return `${startFormatted} - ${endFormatted}`;
  };

  // Callback function for child components to update the event state
  // Implements optimistic updates
  const handleEventUpdate = (updatedEvent: EventDetails) => {
    console.log("Updated event data:", updatedEvent);
    setEvent(updatedEvent);
  };

  // Loading state display
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-blue-600"></div>
      </div>
    );
  }

  // Error state display or if event is null after loading
  if (error || !event) {
    return (
      <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
        <div className="rounded-lg bg-red-50 p-6 text-center dark:bg-red-900/30">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500 dark:text-red-400" />
          <h3 className="mb-2 text-lg font-semibold text-red-800 dark:text-red-200">
            {error || "Event Not Found"}
          </h3>
          <p className="text-red-600 dark:text-red-300">
            {error
              ? "There was an issue loading the event details."
              : "The requested event could not be found."}
          </p>
          <button
            onClick={() => navigate("/events")}
            className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  // Determine if the current user is an organizer for this specific event
  const isOrganizer = event.organizers.some(
    (o) => o.utorid === userData?.utorid
  );

  // Calculate the number of guests (using the latest data)
  const guestCount = event.guests?.length ?? 0;
  const capacityDisplay = event.capacity === null ? "Unlimited" : event.capacity;

  // Main component render
  return (
    <div className="min-h-screen w-full dark:bg-gray-900">
      <Navbar activeLink="events" />
      {/* Main content area */}
      <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
            {event.name}
          </h1>
          <button
            onClick={() => navigate("/events")}
            className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            Back to Events
          </button>
        </div>

        {/* Event Summary Card */}
        <div className="mb-6 flex flex-row justify-between gap-4 rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          {/* Date */}
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Date
            </span>
            <div className="mt-1 flex items-center text-gray-800 dark:text-gray-200">
              <Calendar className="mr-2 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
              <span className="text-sm">
                {formatDateRange(event.startTime, event.endTime)}
              </span>
            </div>
          </div>
          {/* Time */}
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Time
            </span>
            <div className="mt-1 flex items-center text-gray-800 dark:text-gray-200">
              <Clock className="mr-2 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
              <span className="text-sm">
                {formatTimeRange(event.startTime, event.endTime)}
              </span>
            </div>
          </div>
          {/* Location */}
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Location
            </span>
            <div className="mt-1 flex items-center text-gray-800 dark:text-gray-200">
              <MapPin className="mr-2 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
              <span className="text-sm">{event.location}</span>
            </div>
          </div>
          {/* Attendance */}
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Attendance
            </span>
            <div className="mt-1 flex items-center text-gray-800 dark:text-gray-200">
              <Users className="mr-2 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
              <span className="text-sm">
                {guestCount} / {capacityDisplay}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="overflow-hidden rounded-xl bg-white shadow dark:bg-gray-800">
          <TabGroup 
            defaultIndex={0} 
            onChange={(index) => setActiveTabIndex(index)}
            selectedIndex={activeTabIndex}
          >
            <TabList className="flex border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-700">
              {/* Event Details Tab */}
              <Tab
                className={({ selected }) =>
                  `flex flex-1 items-center justify-center gap-2 px-1 py-3 text-center text-sm font-medium transition-colors focus:outline-none sm:text-base ${
                    selected
                      ? "border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                      : "border-b-2 border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300"
                  }`
                }
              >
                <Edit className="h-4 w-4" />
                <span>Event Details</span>
              </Tab>
              {/* Attendees Tab */}
              <Tab
                className={({ selected }) =>
                  `flex flex-1 items-center justify-center gap-2 px-1 py-3 text-center text-sm font-medium transition-colors focus:outline-none sm:text-base ${
                    selected
                      ? "border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                      : "border-b-2 border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300"
                  }`
                }
              >
                <Users className="h-4 w-4" />
                <span>Attendees</span>
              </Tab>
              {/* Organizers Tab */}
              <Tab
                className={({ selected }) =>
                  `flex flex-1 items-center justify-center gap-2 px-1 py-3 text-center text-sm font-medium transition-colors focus:outline-none sm:text-base ${
                    selected
                      ? "border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                      : "border-b-2 border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300"
                  }`
                }
              >
                <UserPlus className="h-4 w-4" />
                <span>Organizers</span>
              </Tab>
            </TabList>
            <TabPanels className="p-4 sm:p-6">
              {/* Panel for Event Details */}
              <TabPanel>
                <EventDetailsTab
                  event={event}
                  onEventUpdate={handleEventUpdate}
                  isManagerOrHigher={isManagerOrHigher}
                />
              </TabPanel>
              {/* Panel for Attendees */}
              <TabPanel>
                <AttendeesList
                  event={event}
                  onEventUpdate={handleEventUpdate}
                  isManager={isManagerOrHigher}
                  isOrganizer={isOrganizer}
                />
              </TabPanel>
              {/* Panel for Organizers */}
              <TabPanel>
                <OrganizersTab
                  event={event}
                  onEventUpdate={handleEventUpdate}
                  isManager={isManagerOrHigher}
                />
              </TabPanel>
            </TabPanels>
          </TabGroup>
        </div>
      </div>
    </div>
  );
}
