import { useState, FormEvent, ChangeEvent } from "react";
import { Save } from "lucide-react";
import { fetchWithAuth } from "../../utils/authHelper";
import { API_BASE_URL } from "../../utils/auth";
import { EventDetails } from "../../types";
import { useNavigate } from "react-router-dom";


interface EventDetailsTabProps {
  event: EventDetails;
  onEventUpdate: (event: EventDetails) => void;
  isManagerOrHigher: boolean;
  isCreateMode?: boolean;
  isOrganizer?: boolean;
}

interface UpdateEventPayload {
  name?: string | null;
  description?: string | null;
  location?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  capacity?: number | null; // null means unlimited capacity
  points?: number | null;
  published?: boolean | null;
}

export function EventDetailsTab({
  event,
  onEventUpdate,
  isManagerOrHigher,
  isCreateMode = false,
}: EventDetailsTabProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<EventDetails>({
    id: event.id,
    name: event.name,
    description: event.description,
    location: event.location,
    startTime: toLocalDatetimeString(event.startTime),
    endTime: toLocalDatetimeString(event.endTime),
    capacity: event.capacity === null ? null : event.capacity,
    pointsRemain: event.pointsRemain || 0,
    pointsAwarded: event.pointsAwarded || 0,
    published: event.published || false,
    isGuest: event.isGuest,
    organizers: event.organizers,
    guests: event.guests || [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (name === "capacity" && value === "unlimited") {
      setFormData({ ...formData, capacity: null });
      return;
    }
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData({ ...formData, [name]: checked });
    } else if (name === "capacity") {
      setFormData({
        ...formData,
        [name]: value === "" ? null : parseInt(value),
      });
    } else if (name === "pointsRemain") {
      setFormData({
        ...formData,
        pointsRemain: value === "" ? null : parseInt(value),
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  function submitCompliantFormData(data: EventDetails): Record<string, unknown> {
    return {
      name: data.name,
      description: data.description,
      location: data.location,
      // Ensure the date strings are full ISO8601 strings (with seconds)
      startTime: ensureFullIso(data.startTime),
      endTime: ensureFullIso(data.endTime),
      capacity: data.capacity,
      // API expects "points" – use pointsRemain or default to 0.
      points: data.pointsRemain !== null && data.pointsRemain !== undefined ? data.pointsRemain : 0 + (data.pointsAwarded || 0),
      published: (data.published ? data.published : undefined),
    };
  }

  const ensureFullIso = (dateStr: string): string => {
    // If the string looks like "YYYY-MM-DDTHH:mm", append ":00" 
    return dateStr.length === 16 ? dateStr + ":00" : dateStr;
  };

  const getTimeValue = (datetime: string): string => {
    const parts = datetime.split("T");
    return parts.length > 1 ? parts[1].substring(0, 5) : "";
  };

  function toLocalDatetimeString(dateString: string): string {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      // Fallback: Return the current ISO string (sliced) if invalid.
      return new Date().toISOString().slice(0, 16);
    }
    const timezoneOffset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - timezoneOffset);
    return localDate.toISOString().slice(0, 16);
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
  
    // If in create mode, POST to create a new event
    if (isCreateMode) {
      try {

        // Check if date and time are not in the past 

        const now = new Date();
        const startTime = new Date(formData.startTime);
        const endTime = new Date(formData.endTime);
        if (startTime < now || endTime < now) {
          alert("Start and end times must be in the future.");
          setLoading(false);
          return;
        }
        if (startTime >= endTime) {
          alert("Start time must be before end time.");
          setLoading(false);
          return;
        }
        if (formData.capacity !== null && formData.capacity < 1) {
          alert("Capacity must be at least 1.");
          setLoading(false);
          return;
        }
        if (formData.pointsRemain != null && formData.pointsRemain < 0) {
          alert("Points remaining must be at least 0.");
          setLoading(false);
          return;
        }
        if (formData.name.trim() === "") {
          alert("Event name cannot be empty.");
          setLoading(false);
          return;
        }
        if (formData.description.trim() === "") {
          alert("Event description cannot be empty.");
          setLoading(false);
          return;
        }
        if (formData.location.trim() === "") {
          alert("Event location cannot be empty.");
          setLoading(false);
          return;
        }
        if (formData.startTime.trim() === "") {
          alert("Event start time cannot be empty.");
          setLoading(false);
          return;
        }
        if (formData.endTime.trim() === "") {
          alert("Event end time cannot be empty.");
          setLoading(false);
          return;
        }

        if (formData.pointsRemain != null && formData.pointsRemain < 1) {
          alert("Points remaining must be at least 1.");
          setLoading(false);
          return;
        }

        const response = await fetchWithAuth(`${API_BASE_URL}/events`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(submitCompliantFormData(formData)),
        });
        if (!response.ok) {
          throw new Error("Failed to create event");
        }
        const newEventData = await response.json();
        onEventUpdate(newEventData);
        setSuccess("Event created successfully!");
      } catch (err) {
        console.error("Failed to create event:", err);
        setError("Failed to create event. Please try again.");
      } finally {
        setLoading(false);
      }
      // Go back to events page
      window.location.href = "/events";
      return;
    }
  
    // Otherwise, update (PATCH) an existing event.
    const now = new Date();
    const eventStarted = new Date(event.startTime) <= now;
    const eventEnded = new Date(event.endTime) <= now;
    const payload: UpdateEventPayload = {};
  
    if (formData.name !== event.name) {
      payload.name = formData.name;
    }
    if (formData.description !== event.description) {
      payload.description = formData.description;
    }
    if (formData.location !== event.location) {
      payload.location = formData.location;
    }
    if (eventStarted) {
      if (
        formData.name !== event.name ||
        formData.description !== event.description ||
        formData.location !== event.location ||
        new Date(ensureFullIso(formData.startTime)).toISOString() !==
          new Date(ensureFullIso(event.startTime)).toISOString()
      ) {
        alert("Cannot update event details after the event has started.");
        setLoading(false);
        return;
      }
    }
    if (eventEnded) {
      alert("Cannot update details after event has ended");
      setLoading(false);
      return;
    }
    if (!eventStarted) {
      // Always include start time (passing our full ISO string)
      const newStartTime = new Date(ensureFullIso(formData.startTime)).toISOString();
      const currentStartTime = new Date(ensureFullIso(event.startTime)).toISOString();
      // Even if not changed, send the current valid ISO string.
      payload.startTime = newStartTime || currentStartTime;
    }
    if (!eventEnded) {
      const newEndTime = new Date(ensureFullIso(formData.endTime)).toISOString();
      const currentEndTime = new Date(ensureFullIso(event.endTime)).toISOString();
      payload.endTime = newEndTime || currentEndTime;
    }
    if (!eventStarted) {
      const currentCapacity = event.capacity;
      const newCapacity = formData.capacity;
      if (newCapacity !== currentCapacity) {
        payload.capacity = newCapacity;
      }
    }
    if (isManagerOrHigher) {
      // Always include points even if unchanged
      const newPoints = formData.pointsRemain ?? 0;
      payload.points = newPoints + (event.pointsAwarded ?? 0);
      const currentPublished = event.published || false;
      const newPublished = formData.published;
      if (newPublished !== currentPublished) {
        payload.published = newPublished;
      }
    }
  
    try {
      if (Object.keys(payload).length > 0) {
        const response = await fetchWithAuth(`${API_BASE_URL}/events/${event.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(submitCompliantFormData(formData)),
        });
        const updatedEventData = await response.json();
        onEventUpdate({ ...event, ...updatedEventData });
        setSuccess("Event updated successfully!");
        navigate("/events");
      } else {
        setSuccess("No changes made");
      }
    } catch (err) {
      console.error("Failed to update event:", err);
      setError("Failed to update event. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
        Event Details
      </h2>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-md bg-green-50 p-4 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          <p>{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Event Title
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            required
          />
        </div>
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            required
          />
        </div>
        <div className="flex flex-row gap-4">
          <div>
            <label
              htmlFor="date"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Start Date
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.startTime.split("T")[0]}
              onChange={(e) => {
                const newDate = e.target.value;
                const currentStartTime = formData.startTime.split("T")[1]
                  ? formData.startTime.split("T")[1]
                  : "00:00:00";
                setFormData({
                  ...formData,
                  startTime: `${newDate}T${currentStartTime}`,
                });
              }}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>
          <div>
            <label
              htmlFor="date"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              End Date
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.endTime.split("T")[0]}
              onChange={(e) => {
                const newDate = e.target.value;
                const currentEndTime = formData.endTime.includes("T")
                  ? formData.endTime.split("T")[1]
                  : "00:00:00";
                setFormData({
                  ...formData,
                  endTime: `${newDate}T${currentEndTime}`,
                });
              }}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="startTime"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Start Time
            </label>
            <input
              type="time"
              id="startTime"
              name="startTime"
              value={getTimeValue(formData.startTime)}
              onChange={(e) => {
                const currentDate = formData.startTime.includes("T")
                  ? formData.startTime.split("T")[0]
                  : new Date().toISOString().split("T")[0];
                setFormData({
                  ...formData,
                  startTime: `${currentDate}T${e.target.value}:00`,
                });
              }}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>
          <div>
            <label
              htmlFor="endTime"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              End Time
            </label>
            <input
              type="time"
              id="endTime"
              name="endTime"
              value={getTimeValue(formData.endTime)}
              onChange={(e) => {
                // Use safe logic: if formData.endTime includes a "T", use its date portion.
                const currentDate = formData.endTime.includes("T")
                  ? formData.endTime.split("T")[0]
                  : new Date().toISOString().split("T")[0];
                setFormData({
                  ...formData,
                  endTime: `${currentDate}T${e.target.value}:00`,
                });
              }}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm 
             focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="location"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Location
          </label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            required
          />
        </div>
        <div>
          <label
            htmlFor="capacity"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Capacity
          </label>
          <div className="mt-1 flex items-center">
            <select
              id="capacityType"
              name="capacityType"
              value={formData.capacity === null ? "unlimited" : "limited"}
              onChange={(e) => {
                if (e.target.value === "unlimited") {
                  setFormData({ ...formData, capacity: null });
                } else {
                  setFormData({ ...formData, capacity: 1 });
                }
              }}
              className="block rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="limited">Limited</option>
              <option value="unlimited">Unlimited</option>
            </select>
            {formData.capacity !== null && (
              <input
                type="number"
                id="capacity"
                name="capacity"
                value={formData.capacity}
                onChange={handleChange}
                min="1"
                className="ml-2 block w-24 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            )}
          </div>
        </div>
        {isManagerOrHigher && (
          <div>
            <label
              htmlFor="points"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Remaining Points
            </label>
            <input
              type="number"
              id="points"
              name="pointsRemain"
              value={formData.pointsRemain ?? ""}
              onChange={handleChange}
              min="0"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <p className="mt-1 text-sm text-gray-500">
              Points awarded to users who attend this event
            </p>
          </div>
        )}
        {isManagerOrHigher && (
          <div className="flex items-center">
            <input
              type="checkbox"
              id="published"
              name="published"
              checked={formData.published}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="published"
              className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
            >
              Publish Event (Make visible to all users)
            </label>
          </div>
        )}
        <div className="flex justify-end space-x-3 pt-5">
          <button
            type="button"
            onClick={() => navigate("/events")}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70"
          >
            {loading ? (
              <>
                <svg
                  className="mr-2 -ml-1 h-5 w-5 animate-spin text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 -ml-1 h-5 w-5" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
