import React, { useState, useEffect, useRef } from "react";
import type { UserData } from "../../types"; 
import { ChevronDown } from "lucide-react";
import clsx from "clsx"; // Styling className stuff

// Define the filters managed
export interface UserManagementFilters {
  role: "all" | "regular" | "cashier" | "manager" | "superuser";
  verified: "all" | "true" | "false";
  activated: "all" | "true" | "false";
}

interface FilterDropdownProps {
  className?: string;
  activeFilters: UserManagementFilters; 
  onApplyFilters: (filters: UserManagementFilters) => void; 
  currentUserRole: UserData["role"] | undefined;
}

// Define the default state for filters 
export const defaultUserManagementFilters: UserManagementFilters = {
  role: "all",
  verified: "all",
  activated: "all",
};

const FilterDropdown: React.FC<FilterDropdownProps> = ({
  className,
  activeFilters,
  onApplyFilters,
  currentUserRole,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  // Internal state to hold selections before applying
  const [selectedOptions, setSelectedOptions] =
    useState<UserManagementFilters>(activeFilters);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const isManagerOrHigher =
    currentUserRole === "MANAGER" || currentUserRole === "SUPERUSER";

  // Sync internal state if activeFilters prop changes (cleared externally)
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
        // Don't apply on outside click, just close and revert changes
        setSelectedOptions(activeFilters); // Revert to last applied filters
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, activeFilters]); // Add activeFilters dependency

  const handleToggle = () => {
    setIsOpen(!isOpen);
    // Reset internal selections to currently active ones when opening
    if (!isOpen) {
      setSelectedOptions(activeFilters);
    }
  };

  // Updated to handle only select changes
  const handleSelectChange = (
    filterKey: keyof UserManagementFilters,
    value: string,
  ) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [filterKey]: value,
    }));
  };

  const handleApply = () => {
    onApplyFilters(selectedOptions);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSelectedOptions(defaultUserManagementFilters);
    // Apply immediately
    onApplyFilters(defaultUserManagementFilters);
    setIsOpen(false);
  };

  const activeFilterCount = Object.entries(activeFilters).filter(
    ([, value]) => value !== "all",
  ).length;

  return (
    <div className={clsx("relative inline-block text-left", className)}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        className="flex items-center space-x-2 rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
        id="filter-menu-button"
        aria-expanded={isOpen}
        aria-haspopup="true"
        onClick={handleToggle}
      >
        <span>
          Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}
        </span>
        <ChevronDown className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 z-10 mt-2 w-64 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-800 dark:ring-gray-700"
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

          {/* Search Input Removed */}

          {/* Role Filter (Manager/Superuser only) */}
          {isManagerOrHigher && (
            <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
              <label
                htmlFor="dropdown-roleFilter"
                className="mb-1 block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400"
              >
                Role
              </label>
              <select
                id="dropdown-roleFilter"
                value={selectedOptions.role}
                onChange={(e) => handleSelectChange("role", e.target.value)}
                className="block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2 pl-3 pr-10"
              >
                <option value="all">All Roles</option>
                <option value="regular">Regular</option>
                <option value="cashier">Cashier</option>
                <option value="manager">Manager</option>
                <option value="superuser">Superuser</option>
              </select>
            </div>
          )}

          {/* Status Filters */}
          <div
            className={clsx(
              "px-4 py-3",
              isManagerOrHigher
                ? "border-t border-gray-200 dark:border-gray-700"
                : "border-t border-gray-200 dark:border-gray-700", // Add border-t even if role isn't shown
            )}
          >
            <p className="mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
              Status
            </p>
            {/* Verified Filter */}
            <div className="mb-3">
              <label
                htmlFor="dropdown-verifiedFilter"
                className="sr-only" // Label is visually covered by the select itself
              >
                Verified Status
              </label>
              <select
                id="dropdown-verifiedFilter"
                value={selectedOptions.verified}
                onChange={(e) =>
                  handleSelectChange("verified", e.target.value)
                }
                className="block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2 pl-3 pr-10"
              >
                <option value="all">Any Verified Status</option>
                <option value="true">Verified</option>
                <option value="false">Unverified</option>
              </select>
            </div>

            {/* Activated Filter (Manager/Superuser only) */}
            {isManagerOrHigher && (
              <div>
                <label
                  htmlFor="dropdown-activatedFilter"
                  className="sr-only" // Label is visually covered by the select itself
                >
                  Activated Status
                </label>
                <select
                  id="dropdown-activatedFilter"
                  value={selectedOptions.activated}
                  onChange={(e) =>
                    handleSelectChange("activated", e.target.value)
                  }
                  className="block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2 pl-3 pr-10"
                >
                  <option value="all">Any Activated Status</option>
                  <option value="true">Activated</option>
                  <option value="false">Not Activated</option>
                </select>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2 dark:border-gray-700">
            <button
              onClick={handleClear}
              disabled={activeFilterCount === 0} // Disable clear if no filters active
              className="text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:hover:text-gray-600 dark:text-gray-400 dark:hover:text-white dark:disabled:hover:text-gray-400"
            >
              Clear All
            </button>
            <button
              onClick={handleApply}
              className="rounded-md bg-indigo-600 px-3 py-1 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
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
