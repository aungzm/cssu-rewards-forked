import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import Navbar from '../components/Navbar';
import { API_BASE_URL } from '../utils/auth';
import { fetchWithAuth } from '../utils/authHelper';
import { useDebounce } from '../hooks/useDebounce';
import { useUser } from '../context/UserContext';
import EventsCard from '../components/event/eventCard';



export interface Event {
  id: number;
  name: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  capacity: string;
  pointsRemain: number;
  pointsAwarded: number;
  published: boolean;
}

interface ApiEventsResponse {
  count: number;
  results: Event[];
}
 
interface EventFilters {
  name?: string;
  location?: string;
  started? : boolean;
  ended?: boolean;
  showFull?: boolean;
  published?: boolean;
}
const ITEMS_PER_PAGE = 12;

export default function EventsPage() {
  const stickyHeaderTopOffset = 'top-14'; // Or Navbar's height
  const user = useUser();
  const [events, setEvents] = useState<Event[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState(user.userData?.role);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<EventFilters>({});
  const debouncedFilters = useDebounce(filters, 500);
  
  const observerTarget = useRef<HTMLDivElement | null>(null);
    const hasMore = useMemo(() => {
      return !error && events.length < totalCount;
    }, [events.length, totalCount, error]);

  
  const fetchEvents = useCallback(
    async (
      page: number,
      filters: EventFilters,
    ) => {
      
      if (page === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      if (page === 1) setError(null);

      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', ITEMS_PER_PAGE.toString());

      if (filters.name) {
        params.append('name', filters.name);
      }
      if (filters.location) {
        params.append('name', filters.location);
      }
      if (filters.started !== undefined && filters.started !== null) {
        params.append('started', filters.started.toString())
      }
      if (filters.ended !== undefined && filters.ended !== null) {
        params.append('ended', filters.ended.toString())
      }
      if (filters.showFull !== undefined && filters.showFull !== null) {
        params.append('showFull',filters.showFull.toString())
      }
      if (filters.published  !== undefined && filters.published !== null && (currentUserRole==="MANAGER" || currentUserRole==="SUPERUSER" )) {
        params.append("published", filters.published.toString());
      } else if (currentUserRole!=="MANAGER"&& currentUserRole!=="SUPERUSER" ) {
        params.append("published", "true");
      }


      console.log(
        `Fetching: ${API_BASE_URL}/events?${params.toString()}`, {
          cache: 'no-cache'
        },
      );


      try {
        const response = await fetchWithAuth(
          `${API_BASE_URL}/events?${params.toString()}`,
        );
        if (!response.ok) {
          let errorMsg = `HTTP error! status: ${response.status}`;
          try {
            const errData = await response.json();
            errorMsg = errData.message || errorMsg;
          } catch { /* Ignore */ }
          throw new Error(errorMsg);
        }
        const data: ApiEventsResponse = await response.json();
        setTotalCount(data.count);
        setEvents((prev) => page === 1 ? data.results : [...prev, ...data.results]);
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
    },[],);

  useEffect(() => {
    setEvents([]);
    setCurrentPage(1);
    setTotalCount(0);
    fetchEvents(1, debouncedFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedFilters]);

  // Effect for Infinite Scroll Observer 
   const loadMoreItems = useCallback(() => {
    if (!isLoading && !isLoadingMore && hasMore && !error) {
      fetchEvents(
        currentPage + 1,
        debouncedFilters,
      );
    }
  }, [
    isLoading,
    isLoadingMore,
    hasMore,
    currentPage,
    debouncedFilters,
    fetchEvents,
    error,
  ]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore) {
          loadMoreItems();
        }
      },
      { threshold: 0.8 },
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [loadMoreItems, isLoadingMore]);
  return (
    <div className="min-h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Navbar activeLink="Events" />

      <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-16 ">
        {/* Sticky Header */}
        <div
          className={`
            sticky ${stickyHeaderTopOffset} z-10
            flex flex-col gap-4 bg-gray-50 pb-4 pt-6
            dark:bg-gray-900 md:flex-row md:items-center md:justify-between
          `}
        >
          <h1 className="text-2xl font-bold text-blue-900 dark:text-blue-300">
            Events
          </h1>
          {!isLoading && !error && (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {events.map((event) => (
                        <EventsCard
                          key={event.id}
                          {...event}
                          endTime={event.endTime ?? undefined}
                          onEdit={() => {}}
                          onClick={() => {}}
                        />
                      ))}
                    </div>
                  )}
          
        </div>

      </div>
    </div>

)}