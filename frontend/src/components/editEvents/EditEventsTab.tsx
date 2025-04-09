import { useState, FormEvent, ChangeEvent } from "react";
import { Save } from "lucide-react";
import { fetchWithAuth } from "../../utils/authHelper";
import { API_BASE_URL } from "../../utils/auth";
import { EventDetails } from "../../types";

interface EventDetailsTabProps {
  event: EventDetails;
  onEventUpdate: (event: EventDetails) => void;
  isManager: boolean;
  isOrganizer?: boolean;
}

export function EventDetailsTab({ event, onEventUpdate, isManager }: EventDetailsTabProps) {
  const [formData, setFormData] = useState({
    name: event.name,
    description: event.description,
    location: event.location,
    startTime: new Date(event.startTime).toISOString().slice(0, 16),
    endTime: new Date(event.endTime).toISOString().slice(0, 16),
    capacity: event.capacity === null ? null : event.capacity,
    points: event.pointsRemain || 0,
    published: event.published || false,
    isGuest: event.isGuest
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
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Prepare data for API
      const payload: Partial<EventDetails> = {};
      
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
      
      // Convert time to ISO strings for comparison
      const newStartTime = new Date(formData.startTime).toISOString();
      const currentStartTime = new Date(event.startTime).toISOString();
      if (newStartTime !== currentStartTime) {
        payload.startTime = newStartTime;
      }
      
      const newEndTime = new Date(formData.endTime).toISOString();
      const currentEndTime = new Date(event.endTime).toISOString();
      if (newEndTime !== currentEndTime) {
        payload.endTime = newEndTime;
      }
      
      // Handle capacity (null means unlimited)
      const currentCapacity = event.capacity;
      const newCapacity = formData.capacity;
      if (newCapacity !== currentCapacity) {
        payload.capacity = newCapacity;
      }
      
      // Manager-only fields
      if (isManager) {
        const currentPoints = event.pointsRemain || 0;
        const newPoints = formData.points;
        if (newPoints !== currentPoints) {
          payload.pointsRemain = newPoints;
        }
        
        const currentPublished = event.published || false;
        const newPublished = formData.published;
        if (newPublished !== currentPublished) {
          payload.published = newPublished;
        }
      }

      // If there are changes, send the PATCH request
      if (Object.keys(payload).length > 0) {
        const updatedEvent = await fetchWithAuth(`${API_BASE_URL}/events/${event.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        console.log("Updated event:", updatedEvent);
        
        onEventUpdate({ ...event, ...updatedEvent });
        setSuccess("Event updated successfully!");
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
        
        {isManager && (
          <div>
            <label htmlFor="points" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Total Points
            </label>
            <input
              type="number"
              id="points"
              name="points"
              value={formData.points}
              onChange={handleChange}
              min="0"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <p className="mt-1 text-sm text-gray-500">Points awarded to users who attend this event</p>
          </div>
        )}
        
        {isManager && (
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