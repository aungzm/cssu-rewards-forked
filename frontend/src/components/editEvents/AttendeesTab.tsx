import { useState, useEffect } from "react";
import {
  Search,
  Trash,
  Award,
  User,
  PlusCircle,
  X,
} from "lucide-react";
import { fetchWithAuth } from "../../utils/authHelper";
import { API_BASE_URL } from "../../utils/auth";
import { EventDetails, Guest } from "../../types";

// Extended Guest interface with additional properties for the attendee list
interface GuestWithStatus extends Guest {
  points: number;
}

interface Transaction {
  id: number;
  recipient: string;
  awarded: number;
  type: string;
  relatedId: number;
  remark: string;
  createdBy: string;
}

interface AttendeesListProps {
  event: EventDetails;
  onEventUpdate: (updatedEvent: EventDetails) => void;
  isManager: boolean;
  isOrganizer: boolean;
}

export function AttendeesList({
  event,
  onEventUpdate,
  isManager,
  isOrganizer,
}: AttendeesListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [attendees, setAttendees] = useState<GuestWithStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedAttendees, setSelectedAttendees] = useState<number[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [newAttendees, setNewAttendees] = useState<string>("");
  const [addingAttendees, setAddingAttendees] = useState(false);
  // State for the award modal
  const [awardModalOpen, setAwardModalOpen] = useState(false);
  // When awarding a single attendee, currentAttendee will be set; otherwise (bulk) it's null.
  const [currentAttendee, setCurrentAttendee] =
    useState<GuestWithStatus | null>(null);
  const [modalPoints, setModalPoints] = useState(100);
  const [modalRemark, setModalRemark] = useState("");

  // Fetch transactions for this event
  const fetchTransactions = async () => {
    try {
      const response = await fetchWithAuth(
        `${API_BASE_URL}/events/${event.id}/transactions`,
        {
          method: "GET",
        }
      );
      const data = await response.json();
      console.log("Transactions data:", data); // Log the response data

      // If the API returns an object, e.g. { transactions: [...] }, use that.
      const transactionsData: Transaction[] = Array.isArray(data)
        ? data
        : data.transactions || [];
      setTransactions(transactionsData);
      return transactionsData;
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
      return [];
    }
  };

  // Update calculateGuestPoints to ensure a case-insensitive comparison
  // and that the awarded value is a number.
  const calculateGuestPoints = (
    utorid: string,
    allTransactions: Transaction[]
  ) => {
    return allTransactions
      .filter(
        (t) =>
          t.recipient.toLowerCase() === utorid.toLowerCase() &&
          t.type === "event" &&
          t.relatedId === event.id
      )
      .reduce((total, current) => total + Number(current.awarded), 0);
  };

  // Convert basic guest data to extended format with points info
  const convertGuestsToAttendees = (
    guests: Guest[],
    allTransactions: Transaction[]
  ): GuestWithStatus[] => {
    return guests.map((guest) => {
      const points = calculateGuestPoints(guest.utorid, allTransactions);
      return {
        ...guest,
        email: `${guest.utorid.toLowerCase()}@mail.utoronto.ca`,
        points: points,
      };
    });
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const txData = await fetchTransactions();
        if (event.guests) {
          const convertedAttendees = convertGuestsToAttendees(
            event.guests,
            txData
          );
          setAttendees(convertedAttendees);
        }
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Failed to load attendee data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [event.guests, event.id]);

  const handleAddAttendee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttendees.trim() || (!isManager && !isOrganizer)) return;

    setAddingAttendees(true);
    setError(null);
    setSuccess(null);

    // Parse UTORIDs - split by commas or spaces
    const utoridsToAdd = newAttendees
      .split(/[,\s]+/)
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (utoridsToAdd.length === 0) {
      setError("Please enter valid UTORIDs");
      setAddingAttendees(false);
      return;
    }


    // Check for each utorid length is exactly 8 characters
    const invalidUtorids = utoridsToAdd.filter((id) => id.length !== 8);
    if (invalidUtorids.length > 0) {
      setError(
        `Invalid UTORIDs: ${invalidUtorids.join(", ")}. Each UTORID must be exactly 8 characters.`
      );
      setAddingAttendees(false);
      return;
    }

    let successCount = 0;
    const failedUtorids: string[] = [];
    const newGuestsList = [...(event.guests || [])];

    try {
      // Add each UTORID one by one
      for (const utorid of utoridsToAdd) {
        try {
          const response = await fetchWithAuth(
            `${API_BASE_URL}/events/${event.id}/guests`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ utorid }),
            }
          );
          const data = await response.json();
          console.log("Add attendee response:", data); // Log the response data 
          if (!response.ok) {
            let errorMessage = "";
            if (Array.isArray(data.error)) {
              // data.error is an array of objects. Extract their 'message' properties.
              interface ErrorObject {
                message: string;
              }
              errorMessage = (data.error as ErrorObject[]).map((errObj: ErrorObject) => errObj.message).join(", ");
            } else if (data.error && typeof data.error === "object" && data.error.message) {
              // data.error might be a single object with .message
              errorMessage = data.error.message;
            } else {
              // Fallback if data.error is just a string or we can't parse it
              errorMessage = data.error || "Unknown error";
            }

            // Push that error message into the array
            failedUtorids.push(`${utorid}: "${errorMessage}"`);
            continue;
          }

          // Add new guest if data.guestAdded exists
          if (data.guestAdded) {
            newGuestsList.push(data.guestAdded);
            successCount++;
          }
        } catch {
          failedUtorids.push(`${utorid}: "Unexpected error"`);
        }
      }

      // Update the event with the new guests
      onEventUpdate({
        ...event,
        guests: newGuestsList,
      });

      if (successCount > 0) {
        setSuccess(
          `Successfully added ${successCount} attendee${successCount !== 1 ? "s" : ""
          }.`
        );
      }
      if (failedUtorids.length > 0) {
        setError(
          `Failed to add the following UTORIDs:\n${failedUtorids.join("\n")}`
        );
      }

      // Clear the input field if at least some additions succeeded
      if (successCount > 0) {
        setNewAttendees("");
      }
    } catch (err) {
      console.error("Error adding attendees:", err);
      setError("Failed to add attendees. Please try again.");
    } finally {
      setAddingAttendees(false);
    }
  };

  // Filter attendees based on search query
  const filteredAttendees = attendees.filter(
    (attendee) =>
      attendee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      attendee.utorid.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayedAttendees = filteredAttendees;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // No pagination to reset here.
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedAttendees(displayedAttendees.map((a) => a.id));
    } else {
      setSelectedAttendees([]);
    }
  };

  const handleSelectAttendee = (id: number) => {
    if (selectedAttendees.includes(id)) {
      setSelectedAttendees(
        selectedAttendees.filter((attendeeId) => attendeeId !== id)
      );
    } else {
      setSelectedAttendees([...selectedAttendees, id]);
    }
  };

  // Open modal for awarding points to a specific attendee
  const openAwardModalForSingle = (attendee: GuestWithStatus) => {
    setCurrentAttendee(attendee);
    setModalPoints(100);
    setModalRemark(`Points for ${event.name}`);
    setAwardModalOpen(true);
  };

  // Open modal for bulk awarding (when no single attendee is specified)
  const openAwardModalBulk = () => {
    setCurrentAttendee(null);
    setModalPoints(100);
    setModalRemark(`Points for ${event.name}`);
    setAwardModalOpen(true);
  };

  const closeAwardModal = () => {
    setAwardModalOpen(false);
    setCurrentAttendee(null);
  };

  // Award points based on modal inputs
  const handleAwardPointsFromModal = async () => {
    setLoading(true);
    try {
      // If a single attendee is targeted...
      if (currentAttendee) {
        const response = await fetchWithAuth(
          `${API_BASE_URL}/events/${event.id}/transactions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type: "event",
              utorid: currentAttendee.utorid,
              amount: modalPoints,
              remark: modalRemark || `Points for ${event.name}`,
            }),
          }
        );

        const newTransaction = await response.json();
        setTransactions([...transactions, newTransaction]);

        // Update the attendee points in the list
        const updatedAttendees = attendees.map((att) =>
          att.id === currentAttendee.id
            ? { ...att, points: att.points + modalPoints }
            : att
        );
        setAttendees(updatedAttendees);
      } else if (selectedAttendees.length > 0) {
        // Bulk awarding to all selected attendees
        const selectedUTORIDs = selectedAttendees
          .map((id) => attendees.find((a) => a.id === id)?.utorid)
          .filter(Boolean) as string[];

        for (const utorid of selectedUTORIDs) {
          await fetchWithAuth(`${API_BASE_URL}/events/${event.id}/transactions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type: "event",
              utorid: utorid,
              amount: modalPoints,
              remark: modalRemark || `Bulk points for ${event.name}`,
            }),
          });
        }
      } else {
        // If no attendee is specifically selected, apply to all attendees
        for (const attendee of attendees) {
          await fetchWithAuth(`${API_BASE_URL}/events/${event.id}/transactions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type: "event",
              utorid: attendee.utorid,
              amount: modalPoints,
              remark: modalRemark || `Points for ${event.name}`,
            }),
          });
        }
      }

      // Refresh transactions and update attendees list
      const txData = await fetchTransactions();
      const updatedAttendees = convertGuestsToAttendees(event.guests || [], txData);
      setAttendees(updatedAttendees);
      setSelectedAttendees([]);
      setError(null);
      closeAwardModal();
    } catch (err) {
      console.error("Failed to award points:", err);
      setError("Failed to award points");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAttendee = async (attendeeId: number) => {
    if (!isManager) return;

    setLoading(true);
    try {
      await fetchWithAuth(
        `${API_BASE_URL}/events/${event.id}/guests/${attendeeId}`,
        {
          method: "DELETE",
        }
      );

      // Remove the attendee from the local list
      const updatedAttendees = attendees.filter((a) => a.id !== attendeeId);
      setAttendees(updatedAttendees);

      // Update the event with the new guest list
      if (event.guests) {
        onEventUpdate({
          ...event,
          guests: event.guests.filter((g) => g.id !== attendeeId),
        });
      }
    } catch (err) {
      console.error("Failed to remove attendee:", err);
      setError("Failed to remove attendee");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Error display */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          <p>{error}</p>
        </div>
      )}
      {/* Success display */}
      {success && (
        <div className="mb-4 rounded-md bg-green-50 p-4 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          <p>{success}</p>
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="mb-4 rounded-md bg-blue-50 p-4 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          <p>Loading...</p>
        </div>
      )}

      {/* Add attendee form */}
      {(isManager || isOrganizer) && (
        <form onSubmit={handleAddAttendee} className="mb-6">
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-x-3 sm:space-y-0">
            <div className="flex-grow">
              <label htmlFor="newAttendees" className="sr-only">
                UofT IDs (comma or space separated)
              </label>
              <input
                type="text"
                id="newAttendees"
                placeholder="Enter UofT IDs (comma or space separated)"
                value={newAttendees}
                onChange={(e) => setNewAttendees(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={addingAttendees || !newAttendees.trim()}
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70"
            >
              {addingAttendees ? (
                "Adding..."
              ) : (
                <>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Attendees
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Controls: search and Award Points */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form onSubmit={handleSearch} className="mr-auto flex">
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
        <button
          onClick={openAwardModalBulk}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-blue-300"
        >
          Award Points
        </button>
      </div>

      {/* Attendees table with vertical scroll */}
      <div className="overflow-x-auto max-h-96 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th colSpan={6} className="px-4 py-2"></th>
            </tr>
            <tr>
              <th className="px-3 py-3">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={
                    selectedAttendees.length === displayedAttendees.length &&
                    displayedAttendees.length > 0
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
                Email
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                UTORID
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                Points
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
            {displayedAttendees.length > 0 ? (
              displayedAttendees.map((attendee: GuestWithStatus) => (
                <tr key={attendee.id}>
                  <td className="whitespace-nowrap px-3 py-4">
                    <input
                      type="checkbox"
                      checked={selectedAttendees.includes(attendee.id)}
                      onChange={() => handleSelectAttendee(attendee.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
                    />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
                        <User size={16} />
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {attendee.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {`${attendee.utorid.toLowerCase()}@mail.utoronto.ca`}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {attendee.utorid}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {attendee.points > 0
                        ? `+${attendee.points}`
                        : attendee.points}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <div className="flex space-x-2">
                      {(isManager || isOrganizer) && (
                        <button
                          onClick={() => openAwardModalForSingle(attendee)}
                          className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                          title="Award Points"
                        >
                          <Award size={16} />
                        </button>
                      )}
                      {isManager && (
                        <button
                          onClick={() => handleRemoveAttendee(attendee.id)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          title="Remove Attendee"
                        >
                          <Trash size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  No attendees found matching your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Award Points Modal */}
      {awardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {currentAttendee
                  ? `Award Points to ${currentAttendee.name}`
                  : selectedAttendees.length > 0
                    ? "Award Points to Selected Attendees"
                    : "Award Points to All Attendees"}
              </h3>
              <button
                onClick={closeAwardModal}
                className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="pointsAmount"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  Points
                </label>
                <input
                  type="number"
                  id="pointsAmount"
                  min="1"
                  value={modalPoints}
                  onChange={(e) => setModalPoints(Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label
                  htmlFor="remarkText"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  Remark (optional)
                </label>
                <input
                  type="text"
                  id="remarkText"
                  value={modalRemark}
                  onChange={(e) => setModalRemark(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="Reason for awarding points"
                />
              </div>
              <div className="mt-5 flex justify-end space-x-3">
                <button
                  onClick={closeAwardModal}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAwardPointsFromModal}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Award Points
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
