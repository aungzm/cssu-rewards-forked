import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import Navbar from '../components/Navbar';
import PromotionsCard from '../components/promotion/PromotionCard';
import CreateEditPromotionModal from '../components/promotion/CreateEditPromotionModal';
import PromotionDetailsModal from '../components/promotion/PromotionDetailsModal';
import FilterDropdown, { PromotionFilters } from '../components/promotion/FilterDropDown'; 
import { API_BASE_URL } from '../utils/auth';
import { fetchWithAuth } from '../utils/authHelper';
import { useDebounce } from '../hooks/useDebounce';
import { useUser } from '../context/UserContext';

// Interfaces
export interface Promotion {
  id: number;
  name: string;
  type: 'one-time' | 'automatic';
  startTime: string;
  endTime: string;
  minSpending: number;
  rate: number;
  points: number;
  description: string;
}

interface ApiPromotionResponse {
  count: number;
  results: Promotion[];
}

// Sort options
type SortOption =
  | 'default'
  | 'nameAsc'
  | 'nameDesc'
  | 'startNewest'
  | 'startOldest'
  | 'endSoonest'
  | 'endLatest'
  | 'rateHighest'
  | 'rateLowest'
  | 'pointsHighest'
  | 'pointsLowest'
  | 'minSpendHighest'
  | 'minSpendLowest';

const ITEMS_PER_PAGE = 12;

export default function PromotionsPage() {
  // State Management
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  // Combined filter state
  const [activeFilters, setActiveFilters] = useState<PromotionFilters>({
    type: null,
    started: null,
    ended: null,
  });

  // Sort State
  const [sortOption, setSortOption] = useState<SortOption>('default');
  // Edit/Create Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(
    null,
  );
  // View Details Modal
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingPromotion, setViewingPromotion] = useState<Promotion | null>(
    null,
  );

  // Infinite Scroll
  const observerTarget = useRef<HTMLDivElement | null>(null);
  const hasMore = useMemo(() => {
    return !error && promotions.length < totalCount;
  }, [promotions.length, totalCount, error]);

  const { userData } = useUser(); // Get user data from context
  const userRole = userData?.role;

  // Data Fetching Logic
  const fetchPromotions = useCallback(
    async (
      page: number,
      search: string,
      filters: PromotionFilters, // Use the combined filters object
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

      if (search) {
        params.append('name', search);
      }
      // Append filters from the object if they are not null
      if (filters.type !== null) {
        params.append('type', filters.type);
      }
      if (filters.started !== null) {
        params.append('started', String(filters.started)); // Send 'true' or 'false'
      }
      if (filters.ended !== null) {
        params.append('ended', String(filters.ended)); // Send 'true' or 'false'
      }

      console.log(
        `Fetching: ${API_BASE_URL}/promotions?${params.toString()}`, {
          cache: 'no-cache'
        },
      );

      try {
        const response = await fetchWithAuth(
          `${API_BASE_URL}/promotions?${params.toString()}`,
        );
        if (!response.ok) {
          let errorMsg = `HTTP error! status: ${response.status}`;
          try {
            const errData = await response.json();
            errorMsg = errData.message || errorMsg;
          } catch { /* Ignore */ }
          throw new Error(errorMsg);
        }
        const data: ApiPromotionResponse = await response.json();
        setTotalCount(data.count);
        setPromotions((prev) => page === 1 ? data.results : [...prev, ...data.results]);
        setCurrentPage(page);
      } catch (err) {
        console.error('Failed to fetch promotions:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        if (page === 1) {
          setPromotions([]);
          setTotalCount(0);
        }
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [], // Remain empty as fetch logic itself doesn't depend on external state here
  );


  // Effect for Initial Load & Filter Changes
  useEffect(() => {
    setPromotions([]); // Reset promotions when filters change
    setCurrentPage(1);  // Go back to page 1 when filters change
    setTotalCount(0);   // Reset count
    fetchPromotions(1, debouncedSearchTerm, activeFilters); // Use combined filters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm, activeFilters, fetchPromotions]); // Add activeFilters dependency

  // Effect for Infinite Scroll Observer
   const loadMoreItems = useCallback(() => {
    if (!isLoading && !isLoadingMore && hasMore && !error) {
      fetchPromotions(
        currentPage + 1,
        debouncedSearchTerm,
        activeFilters, // Use combined filters
      );
    }
  }, [
    isLoading,
    isLoadingMore,
    hasMore,
    currentPage,
    debouncedSearchTerm,
    activeFilters, // Use combined filters
    fetchPromotions,
    error,
  ]);

  // Infinite scroll observer 
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


  // Sorting Logic 
  const sortedPromotions = useMemo(() => {
    const sortable = [...promotions];
    sortable.sort((a, b) => {
      switch (sortOption) {
        case 'nameAsc': return a.name.localeCompare(b.name);
        case 'nameDesc': return b.name.localeCompare(a.name);
        case 'startNewest': return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
        case 'startOldest': return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        case 'endSoonest': {

          const timeA = new Date(a.endTime).getTime();
          const timeB = new Date(b.endTime).getTime();
          return timeA - timeB;
        }
        case 'endLatest': {
          const timeA = new Date(a.endTime).getTime()
          const timeB = new Date(b.endTime).getTime()  
          return timeB - timeA;
        }
        case 'rateHighest': return b.rate - a.rate;
        case 'rateLowest': return a.rate - b.rate;
        case 'pointsHighest': return b.points - a.points;
        case 'pointsLowest': return a.points - b.points;
        case 'minSpendHighest': return b.minSpending - a.minSpending;
        case 'minSpendLowest': return a.minSpending - b.minSpending;
        case 'default':
        default: return new Date(b.startTime).getTime() - new Date(a.startTime).getTime(); // Default sort by newest start time
      }
    });
    return sortable;
  }, [promotions, sortOption]);

  // Modal Handlers
  const handleOpenCreateModal = () => {
    setEditingPromotion(null);
    setIsEditModalOpen(true);
  };

  const handleOpenEditModal = (promotion: Promotion) => {
    handleCloseViewModal();
    setEditingPromotion(promotion);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingPromotion(null);
  };

  const handleOpenViewModal = (promotion: Promotion) => {
    setViewingPromotion(promotion);
    setIsViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setViewingPromotion(null);
  };

  // Success Handler
  const handleSuccess = (resultPromotion?: Promotion) => {
    console.log('Operation successful:', resultPromotion);
    // Refetch data from page 1 with current filters
    fetchPromotions(1, debouncedSearchTerm, activeFilters); // Use combined filters
    handleCloseEditModal();
  };

  // Handler for applying filters from the dropdown
  const handleApplyFilters = (newFilters: PromotionFilters) => {
    // Only update state if filters actually changed to prevent unnecessary refetch
    if (JSON.stringify(newFilters) !== JSON.stringify(activeFilters)) {
        setActiveFilters(newFilters);
        // No need to call fetchPromotions
    }
  };


  // Event Handlers for Controls
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortOption(e.target.value as SortOption);
  };

  // Delete Click Handler
  const handleDeleteClick = (promotion: Promotion) => {
    if (window.confirm(`Are you sure you want to delete the promotion "${promotion.name}"?`)) {
      const currentTime = new Date().getTime();
      const startTime = new Date(promotion.startTime).getTime();
      // Handle potentially null endTime
      const endTime = promotion.endTime ? new Date(promotion.endTime).getTime() : null;

      // Prevent deleting active promotions
      if (startTime <= currentTime && (endTime === null || endTime >= currentTime)) {
          alert('Cannot delete a promotion that is currently active.');
          return;
      }
      // Prevent deleting past promotions 
      if (endTime !== null && currentTime >= endTime) {
        alert('Cannot delete a promotion that has already ended.');
        return;
      }

      fetchWithAuth(`${API_BASE_URL}/promotions/${promotion.id}/`, {
        method: 'DELETE',
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Failed to delete promotion');
          }
          // Refetch promotions after deletion using current filters
          fetchPromotions(1, debouncedSearchTerm, activeFilters); // Use combined filters
        })
        .catch((error) => {
          console.error('Error deleting promotion:', error);
          setError(error.message);
        });
    }
  }

  const stickyHeaderTopOffset = 'top-14';

  return (
    <div className="min-h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Navbar activeLink="Promotions" />

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
            Promotions ({!isLoading && !error ? totalCount : '...'})
          </h1>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Create Button */}
            {(userRole === "MANAGER" || userRole === "SUPERUSER") && (<button
              className="order-last mt-2 w-full rounded bg-slate-600 px-4 py-2 text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-gray-700 dark:hover:bg-slate-600 md:order-first md:mt-0 md:w-auto"
              onClick={handleOpenCreateModal}
              aria-label="Create new promotion"
              disabled={isLoading}
            >
              Create New Promotion
            </button>)}

            {/* Filter Dropdown*/}
            <FilterDropdown
                activeFilters={activeFilters}
                onApplyFilters={handleApplyFilters}
            />

            {/* Sort Dropdown */}
            <select
              className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              value={sortOption}
              onChange={handleSortChange}
              aria-label="Sort promotions"
              disabled={isLoading || promotions.length === 0}
            >
              <option value="default">Sort by Default</option>
              <option value="nameAsc">Name (A-Z)</option>
              <option value="nameDesc">Name (Z-A)</option>
              <option value="startNewest">Start Date (Newest)</option>
              <option value="startOldest">Start Date (Oldest)</option>
              <option value="endSoonest">End Date (Soonest)</option>
              <option value="endLatest">End Date (Latest)</option>
              <option value="rateHighest">Rate (Highest)</option>
              <option value="rateLowest">Rate (Lowest)</option>
              <option value="pointsHighest">Points (Highest)</option>
              <option value="pointsLowest">Points (Lowest)</option>
              <option value="minSpendHighest">Min Spend (Highest)</option>
              <option value="minSpendLowest">Min Spend (Lowest)</option>
            </select>

            {/* Search Input */}
            <input
              type="text"
              placeholder="Search by name..."
              className="flex-grow rounded border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 md:flex-grow-0"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search promotions by name"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              Loading promotions...
            </p>
          </div>
        )}

        {/* Error State - Updated retry button */}
        {error && !isLoading && (
          <div className="py-12 text-center text-red-600 dark:text-red-400">
            <p>Error loading promotions: {error}</p>
            <button
              onClick={() => fetchPromotions(1, debouncedSearchTerm, activeFilters)} // Use combined filters
              className="mt-2 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        )}

        {/* Promotion Grid */}
        {!isLoading && !error && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sortedPromotions.map((promotion) => (
              <PromotionsCard
                key={promotion.id}
                {...promotion}
                endTime={promotion.endTime ?? undefined} 
                onEdit={() => handleOpenEditModal(promotion)}
                onClick={() => handleOpenViewModal(promotion)}
                onDelete={() => handleDeleteClick(promotion)}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && totalCount === 0 && (
          <div className="py-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              No promotions found matching your criteria.
            </p>
          </div>
        )}

        {/* Infinite Scroll Target & Indicators */}
        <div ref={observerTarget} className="h-10 py-4 text-center">
          {isLoadingMore && (
            <p className="text-gray-500 dark:text-gray-400">Loading more...</p>
          )}
          {!isLoadingMore && !hasMore && promotions.length > 0 && !error && (
            <p className="text-gray-500 dark:text-gray-400">
              No more promotions.
            </p>
          )}
        </div>
      </div>

      {/* Edit/Create Modal */}
      <CreateEditPromotionModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        promotionToEdit={editingPromotion ?? undefined}
        onSuccess={handleSuccess}
      />

      {/* View Details Modal */}
      <PromotionDetailsModal
        isOpen={isViewModalOpen}
        onClose={handleCloseViewModal}
        promotion={viewingPromotion}
        onEdit={() => handleOpenEditModal(viewingPromotion as Promotion)}
      />
    </div>
  );
}
