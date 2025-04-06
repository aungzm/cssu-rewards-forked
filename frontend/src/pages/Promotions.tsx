import React, { useState, useMemo } from 'react';
import Navbar from '../components/Navbar';
import PromotionsCard from '../components/promotion/PromotionCard';
import CreateEditPromotionModal from '../components/promotion/CreateEditPromotionModal';

interface Promotion {
  id: number;
  name: string;
  type: PromotionType;
  startTime: string; // ISO String
  endTime: string | null; // ISO String or null
  minSpending: number;
  rate: number;
  points: number;
  description: string;
}
type PromotionType = 'oneTime' | 'automatic';

// Initial mock data
const initialMockPromotions: Promotion[] = [
  {
    id: 1,
    name: 'Double Points on Dining',
    type: 'oneTime',
    startTime: '2024-10-01T00:00:00Z',
    endTime: '2024-10-31T23:59:59Z',
    minSpending: 0,
    rate: 1.5,
    points: 0,
    description:
      'Earn double points when you redeem at any campus dining location. Valid for all students and faculty.',
  },
  {
    id: 2,
    name: 'Referral Bonus',
    type: 'automatic',
    startTime: '2025-09-01T00:00:00Z',
    endTime: '2025-09-02T23:59:59Z',
    minSpending: 0,
    rate: 2.0,
    points: 5,
    description:
      'Refer a friend to UofT Rewards and both of you will receive 500 bonus points when they complete their first transaction.',
  },
  {
    id: 4,
    name: "First-Time User Bonus",
    type: "automatic",
    startTime: "2024-10-01T00:00:00Z",
    endTime: "2024-10-31T23:59:59Z",
    minSpending: 50,
    rate: 1.20,
    points: 20,
    description: "New to UofT Rewards? Complete your first transaction and receive 200 bonus points."
  },
  {
    id: 7,
    name: 'Ancient Promotion',
    type: 'oneTime',
    startTime: '2023-01-01T00:00:00Z',
    endTime: '2023-01-31T23:59:59Z',
    minSpending: 5,
    rate: 1.0,
    points: 2,
    description: 'An old promotion.',
  },
];

// Filter and Sort Types
type FilterCriteria =
  | 'All'
  | 'Type'
  | 'Ending Soon'
  | 'Has Points'
  | 'Has Min Spending'
  | 'Has Rate';
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

export default function PromotionsPage() {
  // --- State Management ---
  const [promotions, setPromotions] =
    useState<Promotion[]>(initialMockPromotions); // Use state for promotions list
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCriteria, setFilterCriteria] = useState<FilterCriteria>('All');
  const [typeFilter, setTypeFilter] = useState<PromotionType>('oneTime');
  const [sortOption, setSortOption] = useState<SortOption>('default');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(
    null,
  );

  // Modal Handlers
  const handleOpenCreateModal = () => {
    setEditingPromotion(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPromotion(null);
  };


  const handleSuccess = (resultPromotion?: Promotion) => {
    console.log('Operation successful:', resultPromotion);
    if (resultPromotion) {
      setPromotions((prevPromotions) => {
        const index = prevPromotions.findIndex(
          (p) => p.id === resultPromotion.id,
        );
        if (index !== -1) {
          // Edit
          const updatedPromotions = [...prevPromotions];
          updatedPromotions[index] = {
            ...prevPromotions[index],
            ...resultPromotion,
          };
          return updatedPromotions;
        } else {
          // Create
          return [...prevPromotions, resultPromotion];
        }
      });
    } else {
      console.warn(
        'Success callback received no promotion data. List might be stale.',
      );
    }
    handleCloseModal();
  };

  // Filtering Logic 
  const filteredPromotions = useMemo(() => {
    const now = new Date();
    const soonEndDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Filter the `promotions` state array
    return promotions.filter((promo) => {
      const matchesSearch =
        searchTerm === '' ||
        promo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        promo.description.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      switch (filterCriteria) {
        case 'Type':
          return promo.type === typeFilter;
        case 'Ending Soon': {
          if (!promo.endTime) return false;
          const endDate = new Date(promo.endTime);
          return endDate > now && endDate <= soonEndDate;
        }
        case 'Has Points':
          return promo.points > 0;
        case 'Has Min Spending':
          return promo.minSpending > 0;
        case 'Has Rate':
          return promo.rate > 0;
        case 'All':
        default:
          return true;
      }
    });
  }, [promotions, searchTerm, filterCriteria, typeFilter]);

  // Sorting Logic
  const sortedAndFilteredPromotions = useMemo(() => {
    const sortable = [...filteredPromotions]; // Sort the already filtered list
    sortable.sort((a, b) => {
      switch (sortOption) {
        case 'nameAsc':
          return a.name.localeCompare(b.name);
        case 'nameDesc':
          return b.name.localeCompare(a.name);
        case 'startNewest':
          return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
        case 'startOldest':
          return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        case 'endSoonest': {
          const timeA = a.endTime ? new Date(a.endTime).getTime() : 0;
          const timeB = b.endTime ? new Date(b.endTime).getTime() : 0;
          return timeA - timeB;
        }
        case 'endLatest': {
          const timeA = a.endTime ? new Date(a.endTime).getTime() : 0;
          const timeB = b.endTime ? new Date(b.endTime).getTime() : 0;
          return timeB - timeA;
        }
        case 'rateHighest':
          return b.rate - a.rate;
        case 'rateLowest':
          return a.rate - b.rate;
        case 'pointsHighest':
          return b.points - a.points;
        case 'pointsLowest':
          return a.points - b.points;
        case 'minSpendHighest':
          return b.minSpending - a.minSpending;
        case 'minSpendLowest':
          return a.minSpending - b.minSpending;
        case 'default':
        default: {
          const timeA = a.endTime ? new Date(a.endTime).getTime() : 0;
          const timeB = b.endTime ? new Date(b.endTime).getTime() : 0;
          return timeB - timeA;
        }
      }
    });
    return sortable;
  }, [filteredPromotions, sortOption]); // Depends on filteredPromotions

  // Event Handlers
  const handleCriteriaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterCriteria(e.target.value as FilterCriteria);
  };
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTypeFilter(e.target.value as PromotionType);
  };
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortOption(e.target.value as SortOption);
  };

  const stickyHeaderTopOffset = 'top-14';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar activeLink="Promotions" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-16 py-6 ">
      <div
          className={`
            sticky ${stickyHeaderTopOffset} z-10
            bg-gray-50 dark:bg-gray-900
            pt-6 pb-4 /* Add padding within the sticky header */
            flex flex-col gap-4
            md:flex-row md:items-center md:justify-between
            /* Removed mb-6 */
          `}
        >
          <h1 className="text-2xl font-bold text-blue-900 dark:text-blue-300">
            Promotions
          </h1>

          {/* Filter & Sort Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Create Button */}
            <button
              className="order-last mt-2 w-full rounded bg-slate-600 px-4 py-2 text-white hover:bg-slate-700 dark:bg-gray-700 dark:hover:bg-slate-600 md:order-first md:mt-0 md:w-auto"
              onClick={handleOpenCreateModal}
              aria-label="Create new promotion"
            >
              Create New Promotion
            </button>
            {/* Filter Criteria Select */}
            <select
              className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              value={filterCriteria}
              onChange={handleCriteriaChange}
              aria-label="Filter by criteria"
            >
              <option value="All">All Promotions</option>
              <option value="Type">Filter by Type</option>
              <option value="Ending Soon">Ending Soon (7 days)</option>
              <option value="Has Points">Has Points Awarded</option>
              <option value="Has Min Spending">Requires Min Spending</option>
              <option value="Has Rate">Has Bonus Rate</option>
            </select>

            {/* Conditional Type Filter Select */}
            {filterCriteria === 'Type' && (
              <select
                className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                value={typeFilter}
                onChange={handleTypeChange}
                aria-label="Select promotion type"
              >
                <option value="oneTime">One Time</option>
                <option value="automatic">Automatic</option>
              </select>
            )}

            {/* Sort Options Select */}
            <select
              className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              value={sortOption}
              onChange={handleSortChange}
              aria-label="Sort promotions"
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
              placeholder="Search promotions..."
              className="flex-grow rounded border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 md:flex-grow-0"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search promotions"
            />
          </div>
        </div>

        {/* Grid of Promotion Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedAndFilteredPromotions.map((promotion) => (
            <PromotionsCard
              key={promotion.id}
              {...promotion}
              endTime={promotion.endTime ?? undefined} // Handle null endTime
              // Pass the specific handler for editing this promotion
              onEdit={() => handleOpenEditModal(promotion)} 
            />
          ))}
        </div>

        {/* Empty state */}
        {sortedAndFilteredPromotions.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              No promotions found matching your criteria.
            </p>
          </div>
        )}
      </div>

      {/* Modal Rendering */}
      <CreateEditPromotionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        promotionToEdit={editingPromotion ?? undefined} // Pass null/undefined for create, object for edit
        onSuccess={handleSuccess}
      />
    </div>
  );
}