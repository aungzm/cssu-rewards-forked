import { useState, FormEvent, ChangeEvent } from "react";
import { Save } from "lucide-react";
import { fetchWithAuth } from "../../utils/authHelper";
import { API_BASE_URL } from "../../utils/auth";
import { EventDetails } from "../../types";

interface EventDetailsTabProps {
  event: EventDetails;
  onEventUpdate: (event: EventDetails) => void;
  isManagerOrHigher: boolean;
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

export function EventDetailsTab({ event, onEventUpdate, isManagerOrHigher }: EventDetailsTabProps) {
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
    organizers: event.organizers
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (name === 'capacity' && value === 'unlimited') {
      setFormData({ ...formData, capacity: null });
      return;
    }
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData({ ...formData, [name]: checked });
    } else if (name === 'capacity') {
      setFormData({ ...formData, [name]: value === '' ? null : parseInt(value) });
    } else if (name === 'pointsRemain') {
      setFormData({ ...formData, pointsRemain: value === '' ? null : parseInt(value) });
    }
    else {
      setFormData({ ...formData, [name]: value });
    }
  };

  function toLocalDatetimeString(dateString: string): string {
    const date = new Date(dateString);
    // Subtract the timezone offset in milliseconds
    const timezoneOffset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - timezoneOffset);
    return localDate.toISOString().slice(0, 16);
  }
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Prepare data for API
      const payload: UpdateEventPayload = {};

      // Process each field to detect changes
      if (formData.name !== event.name) {
        payload.name = formData.name;
      }

      if (formData.description !== event.description) {
        payload.description = formData.description;
      }

      if (formData.location !== event.location) {
        payload.location = formData.location;
      }

      // Check if the event has already started
      const now = new Date();
      const eventStarted = new Date(event.startTime) <= now;
      const eventEnded = new Date(event.endTime) <= now;
      if (eventStarted) {
        if (
          formData.name !== event.name ||
          formData.description !== event.description ||
          formData.location !== event.location ||
          new Date(formData.startTime).toISOString() !== new Date(event.startTime).toISOString()
        ) {
          alert("Cannot update event details after the event has started.");
          setLoading(false);
          return;
        }
      }

      // If the event has ended, disallow changes to endTime
      if (eventEnded) {
        alert("Cannot update details after event has ended");
        setLoading(false);
        return;
      }

      // If capacity is being reduced, check that it is not below the number of confirmed guests
      // (Assuming event.confirmedGuests holds the confirmed guest count)
      if (
        formData.capacity !== null &&
        event.capacity !== null &&
        formData.capacity < (event.guests?.length ?? 0)) {
        alert("Cannot reduce capacity below the number of confirmed guests.");
        setLoading(false);
        return;
      }

      // Only update the start time if the event hasn't started
      if (!eventStarted) {
        const newStartTime = new Date(formData.startTime).toISOString();
        const currentStartTime = new Date(event.startTime).toISOString();
        if (newStartTime !== currentStartTime) {
          payload.startTime = newStartTime;
        }
      }

      // Allow updating the end time if the event hasn't ended
      if (!eventEnded) {
        const newEndTime = new Date(formData.endTime).toISOString();
        const currentEndTime = new Date(event.endTime).toISOString();
        if (newEndTime !== currentEndTime) {
          payload.endTime = newEndTime;
        }
      }

      // Only update capacity if the event hasn't started
      if (!eventStarted) {
        const currentCapacity = event.capacity;
        const newCapacity = formData.capacity;
        if (newCapacity !== currentCapacity) {
          payload.capacity = newCapacity;
        }
      }
      // Manager-only fields
      if (isManagerOrHigher) {
        const currentPoints = event.pointsRemain || 0;
        const newPoints = formData.pointsRemain;
        if (newPoints !== null && newPoints !== undefined && newPoints !== currentPoints) {
          payload.points = newPoints + (event.pointsAwarded ?? 0);
        }
        const currentPublished = event.published || false;
        const newPublished = formData.published;
        if (newPublished !== currentPublished) {
          payload.published = newPublished;
        }
      }
      // If there are changes, send the PATCH request
      if (Object.keys(payload).length > 0) {
        const response = await fetchWithAuth(`${API_BASE_URL}/events/${event.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        const updatedEventData = await response.json();
        console.log("Updated event data:", updatedEventData); // Now logs the actual event data
        onEventUpdate({ ...event, ...updatedEventData });
        setSuccess("Event updated successfully!");
      } else {
        setSuccess("No changes made");
      }
    } catch (err) {
      console.error("Failed to update event:", err);
      // Log the error details for debugging
      setError("Failed to update event. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Event Details</h2>

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
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Date
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.startTime.split('T')[0]}
              onChange={(e) => {
                const newDate = e.target.value;
                const currentStartTime = formData.startTime.split('T')[1];
                const currentEndTime = formData.endTime.split('T')[1];

                setFormData({
                  ...formData,
                  startTime: `${newDate}T${currentStartTime}`,
                  endTime: `${newDate}T${currentEndTime}`
                });
              }}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Start Time
            </label>
            <input
              type="time"
              id="startTime"
              name="startTime"
              value={formData.startTime.split('T')[1].substring(0, 5)}
              onChange={(e) => {
                const currentDate = formData.startTime.split('T')[0];
                setFormData({
                  ...formData,
                  startTime: `${currentDate}T${e.target.value}:00`
                });
              }}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              End Time
            </label>
            <input
              type="time"
              id="endTime"
              name="endTime"
              value={formData.endTime.split('T')[1].substring(0, 5)}
              onChange={(e) => {
                const currentDate = formData.endTime.split('T')[0];
                setFormData({
                  ...formData,
                  endTime: `${currentDate}T${e.target.value}:00`
                });
              }}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
          <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Capacity
          </label>
          <div className="mt-1 flex items-center">
            <select
              id="capacityType"
              name="capacityType"
              value={formData.capacity === null ? 'unlimited' : 'limited'}
              onChange={(e) => {
                if (e.target.value === 'unlimited') {
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
            <label htmlFor="points" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Remaining Points
            </label>
            <input
              type="number"
              id="points"
              name="pointsRemain" // Changed here from "points" to "pointsRemain"
              value={formData.pointsRemain ?? ""}
              onChange={handleChange}
              min="0"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <p className="mt-1 text-sm text-gray-500">Points awarded to users who attend this event</p>
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
            <label htmlFor="published" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Publish Event (Make visible to all users)
            </label>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-5">
          <button
            type="button"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Cancel
          </button>

          <button
            type="button"
            className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Delete Event
          </button>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70"
          >
            {loading ? (
              <>
                <svg className="mr-2 -ml-1 h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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