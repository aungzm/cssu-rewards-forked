import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import Navbar from '../components/Navbar'; 
import EventsCard from '../components/event/eventCard'; 
import EventDetailsModal from '../components/event/eventDetailsModal';
import { API_BASE_URL } from '../utils/auth'; 
import { fetchWithAuth } from '../utils/authHelper'; 
import { useDebounce } from '../hooks/useDebounce'; 
import { useUser } from '../context/UserContext'; 
import { Search, ArrowUpDown } from 'lucide-react'; 
import EventFilterDropdown from '../components/event/eventFilterDropDown';
import { useNavigate } from 'react-router-dom';

// --- Interfaces & Enums ---
export interface Event {
  id: number;
  name: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  numGuests: number;
  capacity: number | null; // Capacity can be null
  pointsAwarded?: number;
  pointsRemain?: number;
  published?: boolean;
  isOrganizer: boolean;
  isGuest: boolean;
}

interface EventFiltersForDropdown {
  hasStarted?: boolean | null;
  hasEnded?: boolean | null;
  isFull?: boolean | null;
  isPublished?: boolean | null;
}


interface ApiEventsResponse {
  count: number;
  results: Event[];
}

// Updated Filters Interface
interface EventFilters {
  name?: string;
  location?: string;
  hasStarted?: boolean | null; // Use null for "don't care" state
  hasEnded?: boolean | null;
  isFull?: boolean | null;
  isPublished?: boolean | null; // Admin only filter
}

// Updated Sort Options
type EventSortOption =
  | 'default'
  | 'nameAsc'
  | 'nameDesc'
  | 'startNewest' // Sorts by absolute start time (latest first)
  | 'startOldest' // Sorts by absolute start time (earliest first)
  | 'endSoonest' // Sorts by absolute end time (earliest first)
  | 'endLatest' // Sorts by absolute end time (latest first)
  | 'pointsHighest'
  | 'pointsLowest'
  | 'capacityHighest' // New
  | 'capacityLowest' // New
  | 'guestsHighest' // New
  | 'guestsLowest'; // New

const ITEMS_PER_PAGE = 12;

export default function EventsPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<EventFilters>({
    name: '',
    location: '',
    hasStarted: null,
    hasEnded: null,
    isFull: null,
    isPublished: null,
  });
  const debouncedFilters = useDebounce(filters, 500);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  // Sort State
  const [sortOption, setSortOption] = useState<EventSortOption>('default');

  // Modal State
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingEvent, setViewingEvent] = useState<Event | null>(null);

  // User Context
  const { userData } = useUser();
  const currentUserRole = userData?.role;
  const observerTarget = useRef<HTMLDivElement | null>(null);

  // Derived State
  const hasMore = useMemo(() => {
    return !error && Array.isArray(events) && events.length < totalCount;
  }, [events, totalCount, error]);

  // Data Fetching
  const fetchEvents = useCallback(
    async (page: number, currentFilters: EventFilters) => {
      if (page === 1) {
        setIsLoading(true);
        setError(null);
      } else {
        setIsLoadingMore(true);
      }

      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', ITEMS_PER_PAGE.toString());

      // Apply standard filters
      if (currentFilters.name) params.append('name', currentFilters.name);
      if (currentFilters.location) params.append('location', currentFilters.location);

      // Apply new boolean filters (only if not null)
      if (currentFilters.hasStarted !== null) params.append('started', String(currentFilters.hasStarted));
      if (currentFilters.hasEnded !== null) params.append('ended', String(currentFilters.hasEnded));
      if (currentFilters.isFull !== null) params.append('showFull', String(currentFilters.isFull)); // Assuming API param is 'full'

      // Handle 'published' filter based on role
      const isAdmin = currentUserRole === 'MANAGER' || currentUserRole === 'SUPERUSER';
      if (isAdmin && currentFilters.isPublished !== null) {
        params.append('published', String(currentFilters.isPublished));
      } else if (!isAdmin) {
        params.append('published', 'true'); // Non-admins only see published
      }

      console.log(`Fetching Events: ${API_BASE_URL}/events?${params.toString()}`);

      try {
        const response = await fetchWithAuth(`${API_BASE_URL}/events?${params.toString()}`);
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || `HTTP error! status: ${response.status}`);
        }
        const data: ApiEventsResponse = await response.json();
        setTotalCount(data.count);
        const resultsArray = Array.isArray(data.results) ? data.results : [];
        setEvents((prev) => (page === 1 ? resultsArray : [...prev, ...resultsArray]));
        setCurrentPage(page);
      } catch (err) {
        console.error('Failed to fetch events:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        if (page === 1) {
          setEvents([]);
          setTotalCount(0);
        }
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [currentUserRole],
  );

  // Effect for Initial Load & Filter Changes
  useEffect(() => {
    setEvents([]);
    setCurrentPage(1);
    setTotalCount(0);
    fetchEvents(1, debouncedFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedFilters, fetchEvents]); // fetchEvents is stable

  // Infinite Scroll
  const loadMoreItems = useCallback(() => {
    if (!isLoading && !isLoadingMore && hasMore && !error) {
      fetchEvents(currentPage + 1, debouncedFilters);
    }
  }, [isLoading, isLoadingMore, hasMore, currentPage, debouncedFilters, fetchEvents, error]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore && hasMore) {
          loadMoreItems();
        }
      }, { threshold: 0.8 }
    );
    const currentTarget = observerTarget.current;
    if (currentTarget) observer.observe(currentTarget);
    return () => { if (currentTarget) observer.unobserve(currentTarget); };
  }, [loadMoreItems, isLoadingMore, hasMore]);

  // Sorting
  const sortedEvents = useMemo(() => {
    if (!Array.isArray(events)) return [];
    const sortable = [...events];
    sortable.sort((a, b) => {
      switch (sortOption) {
        case 'nameAsc': return a.name.localeCompare(b.name);
        case 'nameDesc': return b.name.localeCompare(a.name);
        case 'startNewest': return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
        case 'startOldest': return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        case 'endSoonest': return new Date(a.endTime).getTime() - new Date(b.endTime).getTime(); // Earliest end first
        case 'endLatest': return new Date(b.endTime).getTime() - new Date(a.endTime).getTime(); // Latest end first
        case 'pointsHighest': return (b.pointsAwarded ?? 0) - (a.pointsAwarded ?? 0);
        case 'pointsLowest': return (a.pointsAwarded ?? 0) - (b.pointsAwarded ?? 0);
        case 'capacityHighest': {
          // Treat null capacity as effectively infinite (comes last when sorting lowest first)
          const capAHigh = a.capacity ?? Infinity;
          const capBHigh = b.capacity ?? Infinity;
          return capBHigh - capAHigh;
        }
        case 'capacityLowest': {
          // Treat null capacity as effectively infinite (comes first when sorting lowest first)
          const capALow = a.capacity ?? Infinity;
          const capBLow = b.capacity ?? Infinity;
          return capALow - capBLow;
        }
        case 'guestsHighest': return b.numGuests - a.numGuests;
        case 'guestsLowest': return a.numGuests - b.numGuests;
        case 'default':
        default: {
          const now = Date.now();
          const timeA = a.endTime ? new Date(a.endTime).getTime() : 0;
          const timeB = b.endTime ? new Date(b.endTime).getTime() : 0;
          const aIsPast = timeA > 0 && timeA < now;
          const bIsPast = timeB > 0 && timeB < now;
          if (aIsPast !== bIsPast) return aIsPast ? 1 : -1;
          const startTimeA = a.startTime ? new Date(a.startTime).getTime() : 0;
          const startTimeB = b.startTime ? new Date(b.startTime).getTime() : 0;
          return startTimeB - startTimeA; // Newest start time first among non-past/past groups
        }
      }
    });
    return sortable;
  }, [events, sortOption]);

  // Handlers
  // Apply filters from the dropdown/modal
  const handleApplyFilters = (filtersFromDropdown: EventFiltersForDropdown) => { // Use the type defined in dropdown
    setFilters(prevPageFilters => ({
      name: prevPageFilters.name,
      location: prevPageFilters.location,
      hasStarted: filtersFromDropdown.hasStarted,
      hasEnded: filtersFromDropdown.hasEnded,
      isFull: filtersFromDropdown.isFull,
      isPublished: filtersFromDropdown.isPublished,
    }));
    if (isFilterDropdownOpen === true) { setIsFilterDropdownOpen(false) }; // Close dropdown
  };

  // Handler for search input (updates only the name filter)
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, name: e.target.value }));
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortOption(e.target.value as EventSortOption);
  };

  const handleOpenViewModal = (event: Event) => {
    setViewingEvent(event);
    setIsViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setViewingEvent(null);
  };

  const handleEditClick = (eventId: number) => {
    navigate(`/edit/events/${eventId}`);
  };

  const handleCreateEvent = () => { 
    navigate('/create/event');
  }

  const handleRsvpToggle = useCallback(
    async (eventId: number, isOrganizer: boolean, isGuest: boolean, endTimeStr: string) => {
      const now = new Date();
      const endTime = new Date(endTimeStr);
      if (endTime < now) {
        alert('Cannot RSVP to an event that has already ended.');
        return false;
      }
      if (isGuest) {
        const response = await fetchWithAuth(`${API_BASE_URL}/events/${eventId}/guests/me`, { method: 'DELETE' });
        if (response.status === 204) { // Optimistic update
          setEvents((prevEvents) =>
            prevEvents.map((ev) =>
              ev.id === eventId ? { ...ev, isGuest: false, numGuests: ev.numGuests - 1 } : ev
            )
          );
          alert('RSVP cancelled!');
          return true;
        }
      }
      if (isOrganizer) {
        alert('Organizers cannot RSVP to their own event.');
        return false;
      }
      try {
        const response = await fetchWithAuth(`${API_BASE_URL}/events/${eventId}/guests/me`, { method: 'POST' });
        if (response.status === 201) {
          setEvents((prevEvents) =>
            prevEvents.map((ev) =>
              ev.id === eventId ? { ...ev, isGuest: true, numGuests: ev.numGuests + 1 } : ev
            )
          );
          alert('RSVP successful!');
          return true;
        } else {
          const errorData = await response.json().catch(() => ({}));
          if (response.status === 409) {
            alert('Already RSVPed (sync issue?).');
            setEvents((prevEvents) => prevEvents.map((ev) => ev.id === eventId ? { ...ev, isGuest: true } : ev));
          } else if (response.status === 410) {
            alert('Event has ended or is full.');
            fetchEvents(1, debouncedFilters); 
          } else {
            alert(`Failed to RSVP: ${errorData.message || 'Unknown error'}`);
          }
          return false;
        }
      } catch (err) {
        console.error('RSVP Error:', err);
        alert(`Failed to RSVP: ${err instanceof Error ? err.message : 'Network error'}`);
        return false;
      }
    },
    [fetchEvents, debouncedFilters], 
  );

  // Render
  const stickyHeaderTopOffset = 'top-14';

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Navbar activeLink="Events" />
      <div className="container mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Sticky Header */}
        <div className={`sticky ${stickyHeaderTopOffset} z-20 mb-6 bg-gray-100 py-4 dark:bg-gray-900`}>
          <div className="mb-4 flex flex-col items-baseline justify-between gap-4 md:flex-row">
            <h1 className="text-2xl font-bold text-blue-900 dark:text-blue-300">
              Events ({!isLoading && !error ? totalCount : '...'})
            </h1>
            {/* Create Event Button */}
            {(currentUserRole === 'MANAGER' || currentUserRole === 'SUPERUSER') && (
            <button className='rounded-md bg-blue-600 px-4 py-2 text-lg font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600' onClick={handleCreateEvent}> 
                Create Event
            </button>)}
          </div>
          <div className="flex flex-col flex-wrap items-stretch gap-3 md:flex-row md:items-center">
            {/* Search Input */}
            <div className="relative flex-grow">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400"><Search size={18} /></span>
              <input
                type="text"
                placeholder="Search events by name..."
                value={filters.name ?? ''}
                onChange={handleSearchChange} // Updates only name filter immediately
                className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                aria-label="Search events by name"
                disabled={isLoading}
              />
            </div>

            {/* Filter Button */}
            <div className="relative">
              <EventFilterDropdown
                activeFilters={filters} 
                onApplyFilters={handleApplyFilters} 
              />
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                className="w-full appearance-none rounded-md border border-gray-300 bg-white py-2 pl-4 pr-10 text-sm text-gray-700 hover:bg-gray-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 md:w-auto"
                value={sortOption}
                onChange={handleSortChange}
                aria-label="Sort events"
                disabled={isLoading || !Array.isArray(events) || events.length === 0}
              >
                <option value="default">Sort: Default</option>
                <option value="nameAsc">Name (A-Z)</option>
                <option value="nameDesc">Name (Z-A)</option>
                <option value="startNewest">Starts (Latest First)</option>
                <option value="startOldest">Starts (Earliest First)</option>
                <option value="endSoonest">Ends (Earliest First)</option>
                <option value="endLatest">Ends (Latest First)</option>
                <option value="pointsHighest">Points (Highest)</option>
                <option value="pointsLowest">Points (Lowest)</option>
                <option value="capacityHighest">Capacity (Highest)</option>
                <option value="capacityLowest">Capacity (Lowest)</option>
                <option value="guestsHighest">Guests (Highest)</option>
                <option value="guestsLowest">Guests (Lowest)</option>
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                <ArrowUpDown size={16} />
              </span>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && <div className="py-12 text-center"><p className="text-gray-500 dark:text-gray-400">Loading events...</p></div>}

        {/* Error State */}
        {error && !isLoading && (
          <div className="rounded-md bg-red-100 p-6 text-center text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <p className="font-medium">Error loading events:</p>
            <p className="mb-4 text-sm">{error}</p>
            <button onClick={() => fetchEvents(1, debouncedFilters)} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600">Retry</button>
          </div>
        )}

        {/* Event Grid */}
        {!isLoading && !error && Array.isArray(events) && events.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
            {sortedEvents.map((event) => (
              <EventsCard
                key={event.id}
                id={event.id}
                name={event.name}
                description={event.description}
                onClick={() => handleOpenViewModal(event)}
                startTime={event.startTime}
                endTime={event.endTime}
                location={event.location}
                capacity={event.capacity}
                numGuests={event.numGuests}
                pointsRemain={event.pointsRemain}
                pointsAwarded={event.pointsAwarded}
                published={event.published}
                isOrganizer={event.isOrganizer}
                isGuest={event.isGuest}
                onRsvp={() => handleRsvpToggle(event.id, event.isOrganizer, event.isGuest, event.endTime)}
                onEdit={() => handleEditClick(event.id)}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && Array.isArray(events) && events.length === 0 && totalCount === 0 && (
          <div className="py-12 text-center"><p className="text-gray-500 dark:text-gray-400">No events found matching your criteria.</p></div>
        )}

        {/* Infinite Scroll Target & Indicators */}
        <div ref={observerTarget} className="h-10 py-4 text-center">
          {isLoadingMore && <p className="text-sm text-gray-500 dark:text-gray-400">Loading more events...</p>}
          {!isLoadingMore && !hasMore && Array.isArray(events) && events.length > 0 && !error && (
            <p className="text-sm text-gray-500 dark:text-gray-400">You've reached the end.</p>
          )}
        </div>
      </div>

      {/* Event Details Modal */}
      <EventDetailsModal
        isOpen={isViewModalOpen}
        onClose={handleCloseViewModal}
        eventId={viewingEvent?.id}
        onEdit={() => viewingEvent && handleEditClick(viewingEvent.id)}
      />
    </div>
  );
}
