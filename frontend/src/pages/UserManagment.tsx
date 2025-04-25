import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import type { UserData, CreateUserResponse } from "../types";
import { useUser } from "../context/UserContext";
import { fetchWithAuth } from "../utils/authHelper";
import { API_BASE_URL } from "../utils/auth";
import UserTable from "../components/userManagment/UserTable";
import AddUserModal from "../components/userManagment/AddUserModal";
import EditUserModal from "../components/userManagment/EditUserModal";
import ViewUserModal from "../components/userManagment/ViewUserModal";
import ResetTokenModal from "../components/userManagment/ResetTokenModal"; // Import the new modal
import Navbar from "../components/Navbar";
import FilterDropdown, {
  UserManagementFilters,
  defaultUserManagementFilters,
} from "../components/userManagment/UserFilterDropDown"; 
import { Plus, Loader2, Search } from "lucide-react"; 
import { useDebounce } from "../hooks/useDebounce"; 

// This reflects that Cashiers get fewer fields in the LIST view
type FetchedUser = Partial<UserData> &
  Pick<UserData, "id" | "name" | "verified"> & {
    email?: string; // Only for Manager/Superuser
    avatarUrl?: string;
    activated?: boolean; // Only for Manager/Superuser
    birthdate?: string; // Only for Manager/Superuser
    createdAt?: string; // Only for Manager/Superuser
    updatedAt?: string; // Only for Manager/Superuser
    lastLogin?: string; // Only for Manager/Superuser
    utorid?: string; // Only for Manager/Superuser
    avatar?: string;
  };

const UserManagement: React.FC = () => {
  const { userData: currentUser, isLoading: isUserLoading } = useUser();

  // Data state - Use the FetchedUser type
  const [users, setUsers] = useState<FetchedUser[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // State variables (isLoading, isInitialLoading, error, modalState, refs)
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 10;

  // Search State 
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Dropdown Filter State uses the imported type
  const [filters, setFilters] = useState<UserManagementFilters>(
    defaultUserManagementFilters,
  );

  // Add resetTokenData state to store the reset token information
  const [resetTokenData, setResetTokenData] = useState<Partial<CreateUserResponse> | null>(null);

  const [modalState, setModalState] = useState<{
    type: "add" | "edit" | "view" | "reset-token" | null; // Add reset-token option
    user: FetchedUser | null; // Use FetchedUser here too
  }>({ type: null, user: null });
  const observer = useRef<IntersectionObserver | null>(null);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  // Update queryParams
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("limit", ITEMS_PER_PAGE.toString());
    // Use debouncedSearchTerm for name
    if (debouncedSearchTerm) params.append("name", debouncedSearchTerm);
    // Use filters state for dropdown values
    if (filters.role !== "all") params.append("role", filters.role);
    if (filters.verified !== "all") params.append("verified", filters.verified);
    // Only include activated filter if user is Manager/Superuser
    if (
      filters.activated !== "all" &&
      currentUser &&
      ["MANAGER", "SUPERUSER"].includes(currentUser.role)
    ) {
      params.append("activated", filters.activated);
    }
    return params;
  }, [page, debouncedSearchTerm, filters, currentUser]); // debounced user search

  const fetchUsers = useCallback(
    async (reset = false) => {
      if (isLoading && !reset) return;

      if (reset) {
        setIsInitialLoading(true);
        setUsers([]);
        setError(null);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const url = `${API_BASE_URL}/users?${queryParams.toString()}`;
      console.log("Fetching users:", url);
      try {
        const response = await fetchWithAuth(url);
        if (!response.ok) {
          throw new Error(
            `Failed to fetch users: ${response.status} ${response.statusText}`,
          );
        }
        // Explicitly typing the response data
        const data: { count: number; results: FetchedUser[] } =
          await response.json();
        console.log("Fetched users data:", data);
        console.log("Fetched users count:", data.count);
        console.log("Fetched users results:", data.results);
        if (data && Array.isArray(data.results) && data.count !== undefined) {
          setUsers((prevUsers) => {
            const newUsers = reset
              ? data.results
              : [...prevUsers, ...data.results];
            setHasMore(newUsers.length < data.count);
            return newUsers;
          });
          setTotalUsers(data.count);
        } else {
          console.warn("Received unexpected data structure:", data);
          if (reset) setUsers([]);
          setHasMore(false);
          throw new Error("Received unexpected data structure from API.");
        }
      } catch (err) {
        console.error("Error fetching users:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch users");
        if (reset) setUsers([]);
        setHasMore(false);
      } finally {
        setIsLoading(false);
        setIsInitialLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryParams],
  );

  // Effect for initial load and when filters/search change
  useEffect(() => {
    // Allow CASHIER, MANAGER, SUPERUSER
    if (
      !isUserLoading &&
      currentUser &&
      ["CASHIER", "MANAGER", "SUPERUSER"].includes(currentUser.role)
    ) {
      setPage(1); // Reset page to 1 when filters or search change
      setHasMore(true);
      fetchUsers(true); // Reset users list
    } else if (
      !isUserLoading &&
      (!currentUser || currentUser.role === "REGULAR")
    ) {
      setError("You don't have permission to view this page.");
      setIsInitialLoading(false);
      setUsers([]);
      setHasMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm, filters, currentUser, isUserLoading]); // Add debouncedSearchTerm 

  // Effect for Intersection Observer (infinite scroll)
  useEffect(() => {
    if (isLoading || !hasMore || isInitialLoading) return;

    const callback = (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasMore && !isLoading) {
        console.log("Intersection detected, loading more...");
        setPage((prevPage) => prevPage + 1);
      }
    };

    observer.current = new IntersectionObserver(callback);
    const currentLoaderRef = loaderRef.current;
    if (currentLoaderRef) {
      observer.current.observe(currentLoaderRef);
    }

    return () => {
      if (observer.current && currentLoaderRef) {
        observer.current.unobserve(currentLoaderRef);
      }
      observer.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, hasMore, isInitialLoading]);

  // Effect to fetch data when page changes (after initial mount)
  useEffect(() => {
    // Only fetch if page > 1 and not during the initial load triggered by filter/search changes
    if (page > 1 && !isInitialLoading) {
      fetchUsers(false); // Fetch next page, don't reset
    }
  }, [page, isInitialLoading, fetchUsers]);

  // Event handlers
  // Handler for the search input
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  // Handler for the FilterDropdown component (accepts updated type)
  const handleApplyFilters = (newFilters: UserManagementFilters) => {
    setFilters(newFilters);
    // Page reset is handled by the useEffect hook that depends on 'filters'
  };

  const handleOpenModal = (
    type: "add" | "edit" | "view" | "reset-token",
    user: FetchedUser | null = null,
  ) => {
    // We only try to edit if the user has the necessary role
    if (
      type === "edit" &&
      currentUser?.role === "CASHIER" &&
      user !== null
    ) {
      console.warn("Cashiers cannot edit users.");
      return; // Prevent opening edit modal for cashiers
    }

    // For reset-token modal, set the token data
    if (type === "reset-token") {
      // Example data - in a real app, you would fetch this from an API
      setResetTokenData({
        id: 1,
        utorid: "johndoe1",
        name: "John Doe",
        email: "john.doe@mail.utoronto.ca",
        verified: false,
        expiresAt: "2025-03-10T01:41:47.000Z",
        resetToken: "ad71d4e1-8614-46aa-b96f-cb894e346506"
      });
    }
    
    setModalState({ type, user });
  };

  const handleCloseModal = () => {
    setModalState({ type: null, user: null });
    if (modalState.type === "reset-token") {
      setResetTokenData(null);
    }
  };

  const handleSuccess = (responseData: CreateUserResponse) => {
    handleCloseModal();
    // If we have reset token data, show the reset token modal
    if (responseData && responseData.resetToken) {
      setResetTokenData(responseData);
      setModalState({ type: "reset-token", user: null });
      return;
    }
    
    setPage(1); // Reset to page 1 after add/edit
    fetchUsers(true); // Refetch and reset the list
  };

  const canAddUsers =
    currentUser?.role === "CASHIER" ||
    currentUser?.role === "MANAGER" ||
    currentUser?.role === "SUPERUSER";

  // Render Logic
  if (isUserLoading) {
    return (
      <>
        <Navbar activeLink="user-management" />
        <div className="p-6 text-center">Loading user data...</div>
      </>
    );
  }

  if (
    !currentUser ||
    !["CASHIER", "MANAGER", "SUPERUSER"].includes(currentUser.role)
  ) {
    return (
      <>
        <Navbar activeLink="user-management" />
        <div className="p-6 text-center text-red-600">
          {error || "Access Denied."}
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar activeLink="user-management" />
      <div className="bg-gray-100 dark:bg-gray-900 min-h-screen">
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto dark:bg-gray-900 min-h-screen">
        {/* Main content card */}
        <div className="bg-white dark:bg-gray-800 px-4 py-5 shadow sm:rounded-lg sm:p-6">
          {/* Header Section: Title */}
          <div className="mb-4 border-b border-gray-200 pb-4 dark:border-gray-700">
            <h2 className="text-xl font-semibold leading-6 text-gray-900 dark:text-white">
              User Management ({totalUsers})
            </h2>
          </div>

          {/* Controls Section: Search, Filters, Add Button */}
          <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative w-full sm:max-w-xs rounded border border-gray-400">
              <label htmlFor="search-users" className="sr-only">
                Search Users
              </label>
              <input
                id="search-users"
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search by name..."
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 py-2 px-3 pr-10"
                aria-label="Search users by name"
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 bg-">
                <Search
                  className="h-5 w-5 text-gray-400 dark:text-gray-500 "
                  aria-hidden="true"
                />
              </div>
            </div>

            {/* Filter Dropdown and Add Button */}
            <div className="flex items-center gap-3">
              <FilterDropdown
                activeFilters={filters} // Pass the dropdown-specific filters
                onApplyFilters={handleApplyFilters}
                currentUserRole={currentUser?.role}
              />
              {canAddUsers && (
                <button
                  onClick={() => handleOpenModal("add")}
                  className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 whitespace-nowrap"
                >
                  <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                  Add User
                </button>
              )}              
            </div>
          </div>

          {/* User Table Area */}
          {isInitialLoading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
            </div>
          ) : error && users.length === 0 ? (
            <div className="min-h-[200px] rounded border border-red-300 bg-red-50 p-4 text-center text-red-700 dark:bg-red-900 dark:border-red-700 dark:text-red-200">
              <p>Error loading users:</p>
              <p className="text-sm">{error}</p>
            </div>
          ) : !isInitialLoading && users.length === 0 ? (
            <div className="min-h-[200px] flex items-center justify-center text-gray-500 dark:text-gray-400">
              No users found matching the criteria.
            </div>
          ) : (
            <UserTable
              users={users}
              isLoading={isLoading}
              error={error && !isInitialLoading ? error : null}
              onViewInfo={(user) => handleOpenModal("view", user)}
              onEditUser={(user) => handleOpenModal("edit", user)}
              loaderRef={loaderRef}
              hasMore={hasMore}
              currentUserRole={currentUser.role}
            />
          )}
        </div>
      </div>
      </div>

      {/* Infinite Scroll Loader */}

      {/* Modals */}
      {modalState.type === "add" && (
        <AddUserModal
          isOpen={modalState.type === "add"}
          onClose={handleCloseModal}
          onSuccess={handleSuccess}
        />
      )}
      {modalState.type === "edit" && modalState.user && (
        <EditUserModal
          isOpen={modalState.type === "edit"}
          onClose={handleCloseModal}
          onSuccess={() => handleSuccess({} as CreateUserResponse)}
          userId={modalState.user.id as number}
        />
      )}
      {modalState.type === "view" && modalState.user && (
        <ViewUserModal
          isOpen={modalState.type === "view"}
          onClose={handleCloseModal}
          user={modalState.user as UserData} // View modal fetches details
        />
      )}
      {/* New Reset Token Modal */}
      {modalState.type === "reset-token" && resetTokenData && (
        <ResetTokenModal
          isOpen={modalState.type === "reset-token"}
          onClose={handleCloseModal}
          userData={resetTokenData}
        />
      )}
    </>
  );
};

export default UserManagement;