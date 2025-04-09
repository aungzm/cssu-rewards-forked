import { useState, useEffect } from "react";
import { Search, Trash, Award, ChevronLeft, ChevronRight, User } from "lucide-react";
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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedAttendees, setSelectedAttendees] = useState<number[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pointsToAward, setPointsToAward] = useState<number>(100);
  const [remark, setRemark] = useState<string>("");
  const itemsPerPage = 5;

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
      setTransactions(data);
      return data;
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
      return [];
    }
  };

  // Calculate points for each guest based on transactions
  const calculateGuestPoints = (utorid: string, allTransactions: Transaction[]) => {
    return allTransactions
      .filter(
        (t) => t.recipient === utorid && t.type === "event" && t.relatedId === event.id
      )
      .reduce((total, current) => total + current.awarded, 0);
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
          const convertedAttendees = convertGuestsToAttendees(event.guests, txData);
          setAttendees(convertedAttendees);
          setTotalPages(Math.ceil(convertedAttendees.length / itemsPerPage));
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

  const filteredAttendees = attendees.filter(
    (attendee) =>
      attendee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      attendee.utorid.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedAttendees = filteredAttendees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page on new search
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedAttendees(paginatedAttendees.map((a) => a.id));
    } else {
      setSelectedAttendees([]);
    }
  };

  const handleSelectAttendee = (id: number) => {
    if (selectedAttendees.includes(id)) {
      setSelectedAttendees(selectedAttendees.filter((attendeeId) => attendeeId !== id));
    } else {
      setSelectedAttendees([...selectedAttendees, id]);
    }
  };

  const handleAwardPoints = async (attendee: GuestWithStatus) => {
    if (!isManager && !isOrganizer) return;

    setLoading(true);
    try {
      const response = await fetchWithAuth(
        `${API_BASE_URL}/events/${event.id}/transactions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "event",
            utorid: attendee.utorid,
            amount: pointsToAward,
            remark: remark || `Points for ${event.name}`,
          }),
        }
      );

      const newTransaction = await response.json();
      setTransactions([...transactions, newTransaction]);

      // Update attendee points in the list
      const updatedAttendees = attendees.map((att) =>
        att.id === attendee.id
          ? {
              ...att,
              points: att.points + pointsToAward,
            }
          : att
      );

      setAttendees(updatedAttendees);
      setError(null);
    } catch (err) {
      console.error("Failed to award points:", err);
      setError("Failed to award points");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAwardPoints = async () => {
    if ((!isManager && !isOrganizer) || selectedAttendees.length === 0) return;

    setLoading(true);
    try {
      // Award points to all selected attendees
      const selectedUTORIDs = selectedAttendees.map(
        (id) => attendees.find((a) => a.id === id)?.utorid
      ).filter(Boolean) as string[];

      for (const utorid of selectedUTORIDs) {
        await fetchWithAuth(`${API_BASE_URL}/events/${event.id}/transactions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "event",
            utorid: utorid,
            amount: pointsToAward,
            remark: remark || `Bulk points for ${event.name}`,
          }),
        });
      }

      // Refresh transactions and attendees
      const newTransactions = await fetchTransactions();
      const updatedAttendees = convertGuestsToAttendees(
        event.guests || [],
        newTransactions
      );
      setAttendees(updatedAttendees);
      setSelectedAttendees([]);
      setError(null);
    } catch (err) {
      console.error("Failed to award points in bulk:", err);
      setError("Failed to award points to some or all attendees");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAttendee = async (attendeeId: number) => {
    if (!isManager) return;

    setLoading(true);
    try {
      await fetchWithAuth(`${API_BASE_URL}/events/${event.id}/guests/${attendeeId}`, {
        method: "DELETE",
      });

      // Remove from the list
      const updatedAttendees = attendees.filter((a) => a.id !== attendeeId);
      setAttendees(updatedAttendees);

      // Update the event
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
      {/* Top navigation with tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex">
          <button className="px-4 py-2 text-gray-500 dark:text-gray-400">
            Event Details
          </button>
          <button className="border-b-2 border-blue-500 px-4 py-2 text-blue-600 dark:text-blue-400">
            Attendees ({attendees.length})
          </button>
        </div>
      </div>

      {/* Search and actions area */}
      <div className="my-4 flex flex-wrap items-center gap-2">
        <form onSubmit={handleSearch} className="flex">
          <input
            type="text"
            placeholder="Search attendees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-l-md border border-r-0 border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <button
            type="submit"
            className="rounded-r-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            <Search size={18} />
          </button>
        </form>

        {(isManager || isOrganizer) && selectedAttendees.length > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <input
              type="number"
              min="1"
              value={pointsToAward}
              onChange={(e) => setPointsToAward(Number(e.target.value))}
              className="w-24 rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Points"
            />
            <input
              type="text"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              className="w-40 rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Remark (optional)"
            />
            <button
              onClick={handleBulkAwardPoints}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-blue-300"
            >
              Award Points
            </button>
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          <p>{error}</p>
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="mb-4 rounded-md bg-blue-50 p-4 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          <p>Loading...</p>
        </div>
      )}

      {/* Attendees table */}
      <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th scope="col" className="px-3 py-3">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={
                    selectedAttendees.length === paginatedAttendees.length &&
                    paginatedAttendees.length > 0
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
            {paginatedAttendees.length > 0 ? (
              paginatedAttendees.map((attendee: GuestWithStatus) => (
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
                    {attendee.utorid}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {attendee.points > 0 ? `+${attendee.points}` : attendee.points}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <div className="flex space-x-2">
                      {(isManager || isOrganizer) && (
                        <>
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              min="1"
                              defaultValue={pointsToAward}
                              onChange={(e) => setPointsToAward(Number(e.target.value))}
                              className="w-16 rounded-md border border-gray-300 px-1 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            />
                            <button
                              onClick={() => handleAwardPoints(attendee)}
                              className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                              title="Award Points"
                            >
                              <Award size={16} />
                            </button>
                          </div>
                        </>
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

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-700 dark:text-gray-300">
          Showing{" "}
          {filteredAttendees.length > 0
            ? (currentPage - 1) * itemsPerPage + 1
            : 0}
          -{Math.min(currentPage * itemsPerPage, filteredAttendees.length)} of{" "}
          {filteredAttendees.length} attendees
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="flex items-center rounded-md border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <ChevronLeft size={16} />
            <span>Previous</span>
          </button>

          {Array.from({ length: Math.min(totalPages, 5) }).map((_, idx) => {
            const pageNum = idx + 1;
            return (
              <button
                key={idx}
                onClick={() => setCurrentPage(pageNum)}
                className={`rounded-md px-3 py-1 text-sm font-medium ${
                  currentPage === pageNum
                    ? "bg-blue-600 text-white"
                    : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          {totalPages > 5 && (
            <>
              <span className="text-gray-500 dark:text-gray-400">...</span>
              <button
                onClick={() => setCurrentPage(totalPages)}
                className={`rounded-md px-3 py-1 text-sm font-medium ${
                  currentPage === totalPages
                    ? "bg-blue-600 text-white"
                    : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                }`}
              >
                {totalPages}
              </button>
            </>
          )}

          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center rounded-md border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <span>Next</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
