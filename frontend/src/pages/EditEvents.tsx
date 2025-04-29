import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
} from "@headlessui/react";
import {
  Users,
  UserPlus,
  Calendar,
  MapPin,
  Clock,
  Edit,
  AlertCircle,
  Award,
} from "lucide-react";
import { useUser } from "../context/UserContext";
import { fetchWithAuth } from "../utils/authHelper";
import { API_BASE_URL } from "../utils/auth";
import { EventDetails } from "../types";
import Navbar from "../components/Navbar";

// Import the actual tab components
import { EventDetailsTab } from "../components/editEvents/EditEventsTab";
import { AttendeesList } from "../components/editEvents/AttendeesTab";
import { OrganizersTab } from "../components/editEvents/OrganizersTab";

export default function EventDetailsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { userData } = useUser();
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [loading, setLoading] = useState(true);
  // Keep error only for unexpected errors (other than “not found”)
  const [error, setError] = useState<string | null>(null);
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  // A flag coming from the URL.
  const isInitialCreate = eventId === "create";

  // Define whether we are really editing:
  // We are editing only if the event ID is not "create" and we have event data.
  const isEditing = !isInitialCreate && event !== null;
  // Otherwise, treat it as creating a new event.
  const isCreating = !isEditing;

  // Determine if the current user is a manager or superuser.
  const isManagerOrHigher =
    userData?.role === "MANAGER" || userData?.role === "SUPERUSER";

  // Fetch event data only if not in initial create mode.
  useEffect(() => {
    const fetchEventData = async () => {
      if (isInitialCreate) {
        // Create mode – no need to fetch event data.
        setEvent(null);
        setLoading(false);
        return;
      }
      if (!eventId) {
        // Fallback: treat as create mode.
        setEvent(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await fetchWithAuth(
          `${API_BASE_URL}/events/${eventId}`,
          { method: "GET" }
        );
        const data: EventDetails = await response.json();
        // If no event data is returned, we want to create a new event.
        setEvent(data);
      } catch (err) {
        console.error("Failed to fetch event:", err);
        // If the API returns a 404, we no longer treat that as fatal.
        if (err instanceof Response && err.status === 404) {
          // Instead of showing an error, treat it as create mode.
          setEvent(null);
        } else {
          setError("Failed to load event details. Please try again later.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchEventData();
  }, [eventId, isInitialCreate]);

  // Define default (empty) event values for creation.
  const defaultEvent: EventDetails = {
    id: -1,
    name: "",
    description: "",
    location: "",
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    capacity: null,
    pointsRemain: 0,
    pointsAwarded: 0,
    published: undefined,
    isGuest: false,
    organizers: [],
    guests: [],
  };

  // Use default event when creating, otherwise use the fetched event.
  const eventForForm = isCreating ? defaultEvent : event!;

  // Optimistic event update callback.
  const handleEventUpdate = (updatedEvent: EventDetails) => {
    setEvent(updatedEvent);
  };

  // Loading state.
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-blue-600"></div>
      </div>
    );
  }

  // Only show a fatal error if one exists and we are editing.
  if (error && isEditing) {
    return (
      <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
        <div className="rounded-lg bg-red-50 p-6 text-center dark:bg-red-900/30">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500 dark:text-red-400" />
          <h3 className="mb-2 text-lg font-semibold text-red-800 dark:text-red-200">
            {error}
          </h3>
          <p className="text-red-600 dark:text-red-300">
            There was an issue loading the event details.
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

  // Determine if the current user is an organizer; only relevant in editing.
  const isOrganizer =
    event?.organizers?.some((o) => o.utorid === userData?.utorid) ?? false;
  const guestCount = event?.guests?.length ?? 0;
  const capacityDisplay =
    event?.capacity === null ? "Unlimited" : event?.capacity;

  return (
    <div className="min-h-screen w-full dark:bg-gray-900">
      <Navbar activeLink="events" />
      <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
            {isCreating ? "Create New Event" : event!.name}
          </h1>
          <button
            onClick={() => navigate("/events")}
            className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            Back to Events
          </button>
        </div>

        {/* Only show the summary card when editing an event. */}
        {isEditing && event && (
          <div className="mb-6 flex flex-col sm:flex-row justify-between gap-4 rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <div className="flex flex-col flex-1">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Date
              </span>
              <div className="mt-1 flex items-center text-gray-800 dark:text-gray-200">
                <Calendar className="mr-2 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                <span className="text-sm">
                  {new Date(event.startTime).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="flex flex-col flex-1">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Time
              </span>
              <div className="mt-1 flex items-center text-gray-800 dark:text-gray-200">
                <Clock className="mr-2 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                <span className="text-sm">
                  {new Date(event.startTime).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                  })} -{" "}
                  {new Date(event.endTime).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                  })}
                </span>
              </div>
            </div>
            <div className="flex flex-col flex-1">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Location
              </span>
              <div className="mt-1 flex items-center text-gray-800 dark:text-gray-200">
                <MapPin className="mr-2 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                <span className="text-sm">{event.location}</span>
              </div>
            </div>
            <div className="flex flex-col flex-1">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Points Awarded
              </span>
              <div className="mt-1 flex items-center text-gray-800 dark:text-gray-200">
                <Award className="mr-2 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                <span className="text-sm">{event.pointsAwarded ?? 0}</span>
              </div>
            </div>
            <div className="flex flex-col flex-1">
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
        )}

        {/* Render either the full tab group (for editing) or just the EventDetailsTab in create mode */}
        <div className="overflow-hidden rounded-xl bg-white shadow dark:bg-gray-800">
          {isEditing ? (
            <TabGroup
              defaultIndex={0}
              onChange={(index) => setActiveTabIndex(index)}
              selectedIndex={activeTabIndex}
            >
              <TabList className="flex border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-700">
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
                <TabPanel>
                  <EventDetailsTab
                    event={eventForForm}
                    onEventUpdate={handleEventUpdate}
                    isManagerOrHigher={isManagerOrHigher}
                  />
                </TabPanel>
                <TabPanel>
                  <AttendeesList
                    event={event!}
                    onEventUpdate={handleEventUpdate}
                    isManager={isManagerOrHigher}
                    isOrganizer={isOrganizer}
                  />
                </TabPanel>
                <TabPanel>
                  <OrganizersTab
                    event={event!}
                    onEventUpdate={handleEventUpdate}
                    isManager={isManagerOrHigher}
                  />
                </TabPanel>
              </TabPanels>
            </TabGroup>
          ) : (
            // Create mode: Render only the EventDetailsTab.
            <div>
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 flex items-center dark:border-gray-700 dark:bg-gray-700">
                <Edit className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  Event Details
                </span>
              </div>
              <div className="p-4 sm:p-6">
                <EventDetailsTab
                  event={eventForForm}
                  onEventUpdate={handleEventUpdate}
                  isManagerOrHigher={isManagerOrHigher}
                  isCreateMode={true}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
