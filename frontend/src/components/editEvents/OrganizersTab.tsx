import { AlertCircle, UserPlus, Trash, PlusCircle, Search } from "lucide-react";
import { useState } from "react";
import { fetchWithAuth } from "../../utils/authHelper";
import { API_BASE_URL } from "../../utils/auth";
import { EventDetails, Organizer } from "../../types";

interface TabProps {
  event: EventDetails;
  onEventUpdate: (event: EventDetails) => void;
  isManager: boolean;
}

export function OrganizersTab({ event, onEventUpdate, isManager }: TabProps) {
  const [newOrganizers, setNewOrganizers] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [organizers, setOrganizers] = useState<Organizer[]>(event.organizers);
  const [selectedOrganizers, setSelectedOrganizers] = useState<number[]>([]);

  // Only managers can add/remove organizers
  if (!isManager) {
    return (
      <div className="rounded-md bg-yellow-50 p-6 text-center dark:bg-yellow-900/30">
        <AlertCircle className="mx-auto h-10 w-10 text-yellow-600 dark:text-yellow-500" />
        <h3 className="mt-2 text-sm font-medium text-yellow-800 dark:text-yellow-400">
          Restricted Access
        </h3>
        <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
          Only managers can manage event organizers.
        </p>
      </div>
    );
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const filteredOrganizers = organizers.filter((organizer) =>
      organizer.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setOrganizers(filteredOrganizers);
  }

  const handleAddOrganizer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrganizers.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    // Split by commas or spaces to support multiple UTORIDs
    const utoridList = newOrganizers
      .split(/[,\s]+/)
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    let successCount = 0;
    const failedUtorids: string[] = [];

    // Check if utoridList of utorid are exactly 8 characters long
    const invalidUtorids = utoridList.filter((id) => id.length !== 8);
    if (invalidUtorids.length > 0) {
      setError(
        `Invalid UTORIDs: ${invalidUtorids.join(", ")}. Each UTORID must be exactly 8 characters.`
      );
      // Reset the input field
      setNewOrganizers("");
      setLoading(false);
      return;
    }
   
    try {
      for (const utorid of utoridList) {
        try {
          const response = await fetchWithAuth(
        `${API_BASE_URL}/events/${event.id}/organizers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ utorid }),
        }
          );
          const data = await response.json();
          if (!response.ok) {
        failedUtorids.push(`${utorid}: "${data.error}"`);
        continue;
          }
          // Only update state if the addition was successful
          setOrganizers(data.organizers);
          onEventUpdate({
        ...event,
        organizers: data.organizers,
          });
          successCount++;
        } catch (err: unknown) {
          console.error(`Failed to add organizer ${utorid}:`, err);
        }
      }

      if (successCount > 0) {
        setSuccess(
          `Successfully added ${successCount} organizer${successCount !== 1 ? "s" : ""}`
        );
      }

      if (failedUtorids.length > 0) {
        setError(
          `Failed to add the following UTORIDs:\n${failedUtorids.join("\n")}`
        );
      }

      // Clear the input field if at least some additions succeeded
      if (successCount > 0) {
        setNewOrganizers("");
      }
    } catch (err: unknown) {
      console.error("Failed during bulk add operation:", err);
      setError("An error occurred during the bulk add operation.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveOrganizer = async (organizerId: number) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await fetchWithAuth(
        `${API_BASE_URL}/events/${event.id}/organizers/${organizerId}`,
        {
          method: "DELETE",
        }
      );

      // Remove from the list
      const updatedOrganizers = organizers.filter((o) => o.id !== organizerId);
      setOrganizers(updatedOrganizers);
      onEventUpdate({
        ...event,
        organizers: updatedOrganizers,
      });
      setSuccess("Organizer removed successfully");
    } catch (err) {
      console.error("Failed to remove organizer:", err);
      setError("Failed to remove organizer");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkRemove = async () => {
    if (selectedOrganizers.length === 0) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    let successCount = 0;
    let failCount = 0;

    try {
      for (const organizerId of selectedOrganizers) {
        try {
          await fetchWithAuth(
            `${API_BASE_URL}/events/${event.id}/organizers/${organizerId}`,
            {
              method: "DELETE",
            }
          );
          successCount++;
        } catch (err) {
          console.error(`Failed to remove organizer ID ${organizerId}:`, err);
          failCount++;
        }
      }

      // Update the list by removing all successfully deleted organizers
      const updatedOrganizers = organizers.filter(
        (o) => !selectedOrganizers.includes(o.id)
      );
      setOrganizers(updatedOrganizers);
      onEventUpdate({
        ...event,
        organizers: updatedOrganizers,
      });

      // Clear selection
      setSelectedOrganizers([]);

      if (successCount > 0) {
        setSuccess(
          `Successfully removed ${successCount} organizer${
            successCount !== 1 ? "s" : ""
          }`
        );
      }
      if (failCount > 0) {
        setError(
          `Failed to remove ${failCount} organizer${
            failCount !== 1 ? "s" : ""
          }`
        );
      }
    } catch (err) {
      console.error("Failed during bulk remove operation:", err);
      setError("An error occurred during the bulk remove operation");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedOrganizers(organizers.map((o) => o.id));
    } else {
      setSelectedOrganizers([]);
    }
  };

  const handleSelectOrganizer = (id: number) => {
    if (selectedOrganizers.includes(id)) {
      setSelectedOrganizers(
        selectedOrganizers.filter((organizerId) => organizerId !== id)
      );
    } else {
      setSelectedOrganizers([...selectedOrganizers, id]);
    }
  };

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
        Organize Event - Organizers ({organizers.length})
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

      {/* Add New Organizer Form */}
      <form onSubmit={handleAddOrganizer} className="mb-6">
        <div className="flex flex-col space-y-2 sm:flex-row sm:space-x-3 sm:space-y-0">
          <div className="flex-grow">
            <label htmlFor="newOrganizers" className="sr-only">
              UofT IDs (comma or space separated)
            </label>
            <input
              type="text"
              id="newOrganizers"
              placeholder="Enter UofT IDs (comma or space separated)"
              value={newOrganizers}
              onChange={(e) => setNewOrganizers(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !newOrganizers.trim()}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70"
          >
            {loading ? (
              "Adding..."
            ) : (
              <>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Organizers
              </>
            )}
          </button>
        </div>
      </form>

      {/* Bulk Remove Action */}
      {selectedOrganizers.length > 0 && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={handleBulkRemove}
            disabled={loading}
            className="inline-flex items-center rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            <Trash className="mr-2 h-4 w-4" />
            Remove Selected ({selectedOrganizers.length})
          </button>
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form onSubmit={handleSearch} className="flex mb-4 w-full ">
          <input
            type="text"
            placeholder="Search attendees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-l-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
            <button
              type="submit"
              className="rounded-r-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              <Search size={18} />
            </button>
          </form>
      </div>
        

      {/* Organizers List */}
      {organizers.length > 0 ? (
        <div className="overflow-hidden rounded-md border border-gray-200 dark:border-gray-700">
        
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800 flex-co">
              <tr>
                <th scope="col" className="px-4 py-3">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={
                      selectedOrganizers.length === organizers.length &&
                      organizers.length > 0
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
                  />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  UofT ID
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  Actions
                </th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
              {organizers.map((organizer: Organizer) => (
                <tr
                  key={organizer.id}
                  className={
                    selectedOrganizers.includes(organizer.id)
                      ? "bg-blue-50 dark:bg-blue-900/20"
                      : ""
                  }
                >
                  <td className="whitespace-nowrap px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedOrganizers.includes(organizer.id)}
                      onChange={() => handleSelectOrganizer(organizer.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
                    />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                    {organizer.name}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {organizer.utorid}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <button
                      onClick={() => handleRemoveOrganizer(organizer.id)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-md border border-gray-200 bg-gray-50 p-6 text-center dark:border-gray-700 dark:bg-gray-800">
          <UserPlus className="mx-auto h-10 w-10 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            No organizers
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Add organizers to help manage this event.
          </p>
        </div>
      )}
    </div>
  );
}
