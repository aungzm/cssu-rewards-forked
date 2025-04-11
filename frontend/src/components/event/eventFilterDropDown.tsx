import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../../context/UserContext'; 
import { ChevronDown, Filter } from 'lucide-react';


// Includes all boolean/nullable filters
interface EventFiltersForDropdown {
  hasStarted?: boolean | null;
  hasEnded?: boolean | null;
  isFull?: boolean | null; 
  isPublished?: boolean | null; // Only relevant for admins
}

// Define the props the component expects
interface FilterDropdownProps {
  className?: string;
  activeFilters: EventFiltersForDropdown;
  onApplyFilters: (filters: EventFiltersForDropdown) => void;
}

const EventFilterDropdown: React.FC<FilterDropdownProps> = ({
  activeFilters,
  onApplyFilters,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOptions, setSelectedOptions] =
    useState<EventFiltersForDropdown>(activeFilters);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { userData } = useUser();
  const userRole = userData?.role;
  const isManagerOrHigher = userRole === 'MANAGER' || userRole === 'SUPERUSER';

  // Sync internal state if activeFilters prop changes externally
  useEffect(() => {
    // Sync all relevant keys
    setSelectedOptions({
        hasStarted: activeFilters.hasStarted,
        hasEnded: activeFilters.hasEnded,
        isFull: activeFilters.isFull,
        isPublished: activeFilters.isPublished,
    });
  }, [activeFilters]);

  // Effect to handle closing the dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Toggle dropdown visibility
  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSelectedOptions(activeFilters); // Reset to active filters when opening
    }
  };

  // Updated handler: Applies mutual exclusion ONLY for hasStarted/hasEnded
  const handleCheckboxChange = (
    filterKey: keyof EventFiltersForDropdown,
    value: boolean, // The value associated with the specific checkbox clicked
  ) => {
    setSelectedOptions((prev) => {
      const currentVal = prev[filterKey];
      const isCheckingThisValue = currentVal !== value; 
      const newState = { ...prev }; // Start with a copy
      if (filterKey === 'hasStarted') {
        // If checking 'Started' (to true), set it true and clear 'Ended'
        const newStarted = isCheckingThisValue ? true : null;
        newState.hasStarted = newStarted;
        if (newStarted === true) {
          newState.hasEnded = null; // Mutually exclusive
        }
      } else if (filterKey === 'hasEnded') {
         // If unchecking 'Ended' (from true), set it null
        const newEnded = isCheckingThisValue ? true : null;
        newState.hasEnded = newEnded;
        if (newEnded === true) {
          newState.hasStarted = null; // Mutually exclusive
        }
      } else {
        // If unchecking this value set it to null (isFull/isPublished)
        newState[filterKey] = isCheckingThisValue ? value : null;
      }

      return newState;
    });
  };


  // Apply the selected filters
  const handleApply = () => {
    onApplyFilters(selectedOptions);
    setIsOpen(false);
  };

  // Clear ALL filters managed by this dropdown
  const handleClear = () => {
    const defaultFilters: EventFiltersForDropdown = {
      hasStarted: null,
      hasEnded: null,
      isFull: null, 
      ...(isManagerOrHigher && { isPublished: null }),
    };
    setSelectedOptions(defaultFilters);
    onApplyFilters(defaultFilters);
    setIsOpen(false);
  };

  // Calculate active filter count for ALL filters managed here
  const activeFilterCount = (Object.keys(selectedOptions) as Array<keyof EventFiltersForDropdown>)
    .filter(key => selectedOptions[key] !== null)
    .length;

  return (
    <div className={`relative inline-block text-left ${className}`}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 md:w-auto"
        id="event-filter-menu-button"
        aria-expanded={isOpen}
        aria-haspopup="true"
        onClick={handleToggle}
      >
        <Filter size={16} />
        <span>
          Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
        </span>
        <ChevronDown className={`h-5 w-5 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 z-10 mt-2 w-60 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-800 dark:ring-gray-700"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="event-filter-menu-button"
          tabIndex={-1}
        >
          {/* Header */}
          <div className="px-4 py-3" role="none">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Filter By
            </p>
          </div>

          {/* Filter Sections */}
          <div className="border-t border-gray-200 py-1 dark:border-gray-700" role="none">
            <div className="px-4 py-2">
              <p className="mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                Event Status
              </p>
              {/* Started Filter */}
              <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-200">
                <input
                  type="checkbox"
                  checked={selectedOptions.hasStarted === true}
                  onChange={() => handleCheckboxChange('hasStarted', true)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-blue-600"
                />
                <span>Started</span>
              </label>

              {/* Ended Filter (Only for MANAGER+)*/}
              {isManagerOrHigher && (
                <label className="mt-1 flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-200">
                  <input
                    type="checkbox"
                    checked={selectedOptions.hasEnded === true}
                    onChange={() => handleCheckboxChange('hasEnded', true)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-blue-600"
                  />
                  <span>Ended</span>
                </label>
              )}
            </div>

            {/* Capacity Filter */}
            <div className="border-t border-gray-200 px-4 py-2 dark:border-gray-700">
              <p className="mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                Capacity
              </p>
              <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-200">
                <input
                  type="checkbox"
                  checked={selectedOptions.isFull === true}
                  onChange={() => handleCheckboxChange('isFull', true)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-blue-600"
                />
                <span>Full</span>
              </label>
              <label className="mt-1 flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-200">
                <input
                  type="checkbox"
                  checked={selectedOptions.isFull === false}
                  onChange={() => handleCheckboxChange('isFull', false)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-blue-600"
                />
                <span>Not Full</span>
              </label>
            </div>

            {/* Visibility Filter */}
            {isManagerOrHigher && (
              <div className="border-t border-gray-200 px-4 py-2 dark:border-gray-700">
                <p className="mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                  Published
                </p>
                <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-200">
                  <input
                    type="checkbox"
                    checked={selectedOptions.isPublished === true}
                    onChange={() => handleCheckboxChange('isPublished', true)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-blue-600"
                  />
                  <span>Published</span>
                </label>
                <label className="mt-1 flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-200">
                  <input
                    type="checkbox"
                    checked={selectedOptions.isPublished === false}
                    onChange={() => handleCheckboxChange('isPublished', false)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-blue-600"
                  />
                  <span>Not Published</span>
                </label>
              </div>
            )}
          </div>

          {/* Action Buttons Footer */}
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2 dark:border-gray-700">
            <button
              onClick={handleClear}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              Clear Filters
            </button>
            <button
              onClick={handleApply}
              className="rounded-md bg-blue-600 px-3 py-1 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventFilterDropdown;
