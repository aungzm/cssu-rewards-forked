import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../../context/UserContext'; 
import { ChevronDown } from 'lucide-react';

// Define the shape of the filters managed by this component
export interface PromotionFilters {
  type: 'one-time' | 'automatic' | null;
  started: boolean | null;
  ended: boolean | null;
}

interface FilterDropdownProps {
  className?: string;
  activeFilters: PromotionFilters;
  onApplyFilters: (filters: PromotionFilters) => void;
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({
  activeFilters,
  onApplyFilters,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  // Internal state to hold selections before applying
  const [selectedOptions, setSelectedOptions] =
    useState<PromotionFilters>(activeFilters);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { userData } = useUser();
  const userRole = userData?.role;
  const isManagerOrHigher = userRole === 'MANAGER' || userRole === 'SUPERUSER';

  // Sync internal state if activeFilters prop changes (e.g., cleared externally)
  useEffect(() => {
    setSelectedOptions(activeFilters);
  }, [activeFilters]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        // Apply filters on close if desired, or just close
        // handleApply(); // Optional: Apply on outside click
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]); // Add handleApply dependency if applying on close

  const handleToggle = () => {
    setIsOpen(!isOpen);
    // Reset internal selections to currently active ones when opening
    if (!isOpen) {
      setSelectedOptions(activeFilters);
    }
  };

  const handleCheckboxChange = (
    filterKey: keyof PromotionFilters,
    value: boolean | 'one-time' | 'automatic' | null,
  ) => {
    setSelectedOptions((prev) => {
      const currentVal = prev[filterKey];
      let newVal = value;

      // Special handling for radio-button like behavior for 'type'
      if (filterKey === 'type') {
        newVal = currentVal === value ? null : value; // Toggle type or set null
      }
      // Special handling for boolean toggles (Started/Ended)
      else if (typeof value === 'boolean') {
         // If clicking the currently selected boolean value, set to null (All)
         // Otherwise, set to the clicked value (true or false)
        newVal = currentVal === value ? null : value;
      }


      return { ...prev, [filterKey]: newVal };
    });
  };


  const handleApply = () => {
    onApplyFilters(selectedOptions);
    setIsOpen(false);
  };

  const handleClear = () => {
    const defaultFilters: PromotionFilters = {
      type: null,
      started: null,
      ended: null,
    };
    setSelectedOptions(defaultFilters);
    // Apply immediately
    onApplyFilters(defaultFilters);
    setIsOpen(false);
  };

  // Calculate active filter count for button display
  const activeFilterCount = Object.values(activeFilters).filter(
    (value) => value !== null,
  ).length;

  return (
    <div className="relative inline-block text-left ">
      {/* Trigger Button */}
    <button
      ref={buttonRef}
      type="button"
      className="flex items-center space-x-2 rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
      id="filter-menu-button"
      aria-expanded={isOpen}
      aria-haspopup="true"
      onClick={handleToggle}
    >
      <span>
        Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
      </span>
      <ChevronDown className="h-5 w-5" aria-hidden="true" />
    </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute sm:right-20 md:right-0 lg:right-0 z-3 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-800 dark:ring-gray-700"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="filter-menu-button"
          tabIndex={-1}
        >
          <div className="px-4 py-3" role="none">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Filter By
            </p>
          </div>
          <div className="py-1" role="none">
            {/* Type Filter */}
            <div className="px-4 py-2">
              <p className="mb-1 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                Type
              </p>
              <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-200">
                <input
                  type="checkbox" // Use checkbox for visual consistency, logic handles radio behavior
                  checked={selectedOptions.type === 'automatic'}
                  onChange={() => handleCheckboxChange('type', 'automatic')}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-blue-600"
                />
                <span>Automatic</span>
              </label>
              <label className="mt-1 flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-200">
                <input
                  type="checkbox"
                  checked={selectedOptions.type === 'one-time'}
                  onChange={() => handleCheckboxChange('type', 'one-time')}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-blue-600"
                />
                <span>One Time</span>
              </label>
            </div>

            {/* Status Filters (Manager Only) */}
            {isManagerOrHigher && (
              <div className="border-t border-gray-200 px-4 py-2 dark:border-gray-700">
                <p className="mb-1 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                  Status
                </p>
                {/* Started Filter */}
                <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-200">
                  <input
                    type="checkbox"
                    checked={selectedOptions.started === true}
                    onChange={() => handleCheckboxChange('started', true)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-blue-600"
                  />
                  <span>Started</span>
                </label>
                 <label className="mt-1 flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-200">
                  <input
                    type="checkbox"
                    checked={selectedOptions.started === false}
                    onChange={() => handleCheckboxChange('started', false)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-blue-600"
                  />
                  <span>Not Started</span>
                </label>

                {/* Ended Filter */}
                 <label className="mt-2 flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-200">
                  <input
                    type="checkbox"
                    checked={selectedOptions.ended === true}
                    onChange={() => handleCheckboxChange('ended', true)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-blue-600"
                  />
                  <span>Ended</span>
                </label>
                 <label className="mt-1 flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-200">
                  <input
                    type="checkbox"
                    checked={selectedOptions.ended === false}
                    onChange={() => handleCheckboxChange('ended', false)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-blue-600"
                  />
                  <span>Not Ended</span>
                </label>
              </div>
            )}
          </div>
          {/* Action Buttons */}
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2 dark:border-gray-700">
            <button
              onClick={handleClear}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              Clear
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

export default FilterDropdown;
