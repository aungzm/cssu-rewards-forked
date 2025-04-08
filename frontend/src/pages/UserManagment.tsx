// src/pages/UserManagement.tsx
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import type { UserData } from "../types";
import { useUser } from "../context/UserContext";
import { fetchWithAuth } from "../utils/authHelper";
import { API_BASE_URL } from "../utils/auth";
import UserTable from "../components/userManagment/UserTable";
import AddUserModal from "../components/userManagment/AddUserModal";
import EditUserModal from "../components/userManagment/EditUserModal";
import ViewUserModal from "../components/userManagment/ViewUserModal";
import Navbar from "../components/Navbar";
import { Plus, Search, Loader2 } from "lucide-react";
import { useDebounce } from "../hooks/useDebounce";

// This reflects that Cashiers get fewer fields in the LIST view
type FetchedUser = Partial<UserData> &
  Pick<UserData, "id" | "name" | "verified"> & {
    email?: string; // Email might be present depending on backend logic for list
    avatarUrl?: string;
    activated?: boolean; // Only for Manager/Superuser
    birthdate?: string; // Only for Manager/Superuser
    createdAt?: string; // Only for Manager/Superuser
    updatedAt?: string; // Only for Manager/Superuser
    lastLogin?: string; // Only for Manager/Superuser
    utorid?: string; // Only for Manager/Superuser
  };

const UserManagement: React.FC = () => {
  const { userData: currentUser, isLoading: isUserLoading } = useUser();

  // Data state - Use the FetchedUser type
  const [users, setUsers] = useState<FetchedUser[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // State variables (isLoading, isInitialLoading, error, filters, modalState, refs)
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [verifiedFilter, setVerifiedFilter] = useState<string>("all");
  const [activatedFilter, setActivatedFilter] = useState<string>("all");
  const ITEMS_PER_PAGE = 10;
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [modalState, setModalState] = useState<{
    type: "add" | "edit" | "view" | null;
    user: FetchedUser | null; // Use FetchedUser here too
  }>({ type: null, user: null });
  const observer = useRef<IntersectionObserver | null>(null);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("limit", ITEMS_PER_PAGE.toString());
    if (debouncedSearchTerm) params.append("name", debouncedSearchTerm); // Backend searches 'name'
    if (roleFilter !== "all") params.append("role", roleFilter);
    if (verifiedFilter !== "all") params.append("verified", verifiedFilter);
    // Only include activated filter if user is Manager/Superuser, as Cashiers don't get this field in list
    if (
      activatedFilter !== "all" &&
      currentUser &&
      ["MANAGER", "SUPERUSER"].includes(currentUser.role)
    ) {
      params.append("activated", activatedFilter);
    }
    return params;
  }, [
    page,
    debouncedSearchTerm,
    roleFilter,
    verifiedFilter,
    activatedFilter,
    currentUser,
  ]);

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
        // Explicitly type the expected response structure
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
      setPage(1); // Reset page to 1 when filters change
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
  }, [
    debouncedSearchTerm,
    roleFilter,
    verifiedFilter,
    activatedFilter,
    currentUser, // Ensure currentUser is a dependency
    isUserLoading,
  ]);

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
  }, [isLoading, hasMore, isInitialLoading]); // Dependencies seem correct

  // Effect to fetch data when page changes (after initial mount)
  useEffect(() => {
    // Only fetch if page > 1 and not during the initial load triggered by filter changes
    if (page > 1 && !isInitialLoading) {
      fetchUsers(false); // Fetch next page, don't reset
    }
    // fetchUsers is memoized by queryParams, page change updates queryParams
  }, [page, isInitialLoading, fetchUsers]);

  // Event handlers (handleSearchChange, handleFilterChange, handleOpenModal, handleCloseModal, handleSuccess)
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleFilterChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
    setter: React.Dispatch<React.SetStateAction<string>>,
  ) => {
    setter(event.target.value);
  };

  const handleOpenModal = (
    type: "add" | "edit" | "view",
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
    setModalState({ type, user });
  };

  const handleCloseModal = () => {
    setModalState({ type: null, user: null });
  };

  const handleSuccess = () => {
    handleCloseModal();
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
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-800 px-4 py-5 shadow sm:rounded-lg sm:p-6">
          <div className="mb-4 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <h2 className="text-xl font-semibold leading-6 text-gray-900 dark:text-white">
              User Management ({totalUsers})
            </h2>
            {/* Add Users Button */}
            {canAddUsers && (
              <button
                onClick={() => handleOpenModal("add")}
                className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              >
                <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                Add New User
              </button>
            )}
          </div>

          {/* Search and Filters */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search by name..." // Backend searches name field
                className="block w-full rounded-md border-gray-300 px-4 py-2 pr-10 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                aria-label="Search users"
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <Search
                  className="h-5 w-5 text-gray-400 dark:text-gray-500"
                  aria-hidden="true"
                />
              </div>
            </div>
            <div>
              <label htmlFor="roleFilter" className="sr-only">
                Filter by Role
              </label>
              <select
                id="roleFilter"
                value={roleFilter}
                onChange={(e) => handleFilterChange(e, setRoleFilter)}
                className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="all">All Roles</option>
                <option value="regular">Regular</option> 
                <option value="cashier">Cashier</option>
                <option value="manager">Manager</option>
                <option value="superuser">Superuser</option>
              </select>
            </div>

            <div>
              <label htmlFor="verifiedFilter" className="sr-only">
                Filter by Verified Status
              </label>
              <select
                id="verifiedFilter"
                value={verifiedFilter}
                onChange={(e) => handleFilterChange(e, setVerifiedFilter)}
                className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="all">Any Verified Status</option>
                <option value="true">Verified</option>
                <option value="false">Unverified</option>
              </select>
            </div>

            {/* Only show Activated filter if user is Manager/Superuser */}
            {(currentUser?.role === "MANAGER" ||
              currentUser?.role === "SUPERUSER") && (
              <div>
                <label htmlFor="activatedFilter" className="sr-only">
                  Filter by Activated Status
                </label>
                <select
                  id="activatedFilter"
                  value={activatedFilter}
                  onChange={(e) => handleFilterChange(e, setActivatedFilter)}
                  className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="all">Any Activated Status</option>
                  <option value="true">Activated</option>
                  <option value="false">Not Activated</option>
                </select>
              </div>
            )}
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

      {/* Modals */}
      {/* Add Modal */}
      {modalState.type === "add" && (
        <AddUserModal
          isOpen={modalState.type === "add"}
          onClose={handleCloseModal}
          onSuccess={handleSuccess}
        />
      )}
      {/* Edit Modal - Only renders if opened, which Cashiers cannot do */}
      {modalState.type === "edit" && modalState.user && (
        <EditUserModal
          isOpen={modalState.type === "edit"}
          onClose={handleCloseModal}
          onSuccess={handleSuccess}
          user={modalState.user as UserData} 
        />
      )}
      {/* View Modal */}
      {modalState.type === "view" && modalState.user && (
        <ViewUserModal
          isOpen={modalState.type === "view"}
          onClose={handleCloseModal}
          user={modalState.user as UserData} 
        />
      )}
    </>
  );
};

export default UserManagement;
