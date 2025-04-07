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

const UserManagement: React.FC = () => {
  const { userData: currentUser, isLoading: isUserLoading } = useUser();

  // Data state
  const [users, setUsers] = useState<UserData[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Loading and Error state
  const [isLoading, setIsLoading] = useState(false); // For loading more items
  const [isInitialLoading, setIsInitialLoading] = useState(true); // For initial page load
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all"); // 'all', 'REGULAR', 'CASHIER', etc.
  const [verifiedFilter, setVerifiedFilter] = useState<string>("all"); // 'all', 'true', 'false'
  const [activatedFilter, setActivatedFilter] = useState<string>("all"); // 'all', 'true', 'false'
  const ITEMS_PER_PAGE = 10;

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Modal state
  const [modalState, setModalState] = useState<{
    type: "add" | "edit" | "view" | null;
    user: UserData | null;
  }>({ type: null, user: null });

  // Ref for Intersection Observer
  const observer = useRef<IntersectionObserver | null>(null);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  // Memoize query params so that API calls update when page, debounced search, or filters change
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("limit", ITEMS_PER_PAGE.toString());
    if (debouncedSearchTerm) params.append("name", debouncedSearchTerm);
    if (roleFilter !== "all") params.append("role", roleFilter);
    if (verifiedFilter !== "all") params.append("verified", verifiedFilter);
    if (activatedFilter !== "all") params.append("activated", activatedFilter);
    return params;
  }, [page, debouncedSearchTerm, roleFilter, verifiedFilter, activatedFilter]);

  const fetchUsers = useCallback(
    async (reset = false) => {
      if (isLoading && !reset) return;

      if (reset) {
        setIsInitialLoading(true);
        setUsers([]); // Clear users immediately on reset
        setError(null); // Clear previous errors on reset
      } else {
        setIsLoading(true); // Loading more
      }
      setError(null);

      const url = `${API_BASE_URL}/users?${queryParams.toString()}`;
      console.log("Fetching users:", url);

      try {
        const response = await fetchWithAuth(url);
        if (!response.ok) {
          throw new Error(
            `Failed to fetch users: ${response.status} ${response.statusText}`
          );
        }
        const data = await response.json();

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
    [queryParams]
  );

  // Effect for initial load and when filters/search change
  useEffect(() => {
    if (!isUserLoading && currentUser && currentUser.role !== "REGULAR") {
      setPage(1); // Reset page to 1 when filters change
      setHasMore(true);
      fetchUsers(true); // Reset users list
    } else if (!isUserLoading && (!currentUser || currentUser.role === "REGULAR")) {
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
    currentUser,
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
  }, [isLoading, hasMore, isInitialLoading]);

  // Effect to fetch data when page changes (after initial mount)
  useEffect(() => {
    if (page > 1 && !isInitialLoading) {
      fetchUsers(false);
    }
  }, [page, isInitialLoading, fetchUsers]);

  // Event handlers
  const handleSearchChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setSearchTerm(event.target.value);
  };

  const handleFilterChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    setter(event.target.value);
  };

  const handleOpenModal = (
    type: "add" | "edit" | "view",
    user: UserData | null = null
  ) => {
    setModalState({ type, user });
  };

  const handleCloseModal = () => {
    setModalState({ type: null, user: null });
  };

  const handleSuccess = () => {
    handleCloseModal();
    setPage(1);
    fetchUsers(true);
  };

  // Permissions
  const canManageUsers =
    currentUser?.role === "MANAGER" || currentUser?.role === "SUPERUSER";
  const canAddUsers = canManageUsers;

  // Render Logic
  if (isUserLoading) {
    return (
      <>
        <Navbar activeLink="user-management" />
        <div className="p-6 text-center">Loading user data...</div>
      </>
    );
  }

  if (!currentUser || currentUser.role === "REGULAR") {
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
      <div className="p-4 md:p-6 lg:p-8">
        <div className="bg-white px-4 py-5 shadow sm:rounded-lg sm:p-6">
          <div className="mb-4 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <h2 className="text-xl font-semibold leading-6 text-gray-900">
              User Management ({totalUsers})
            </h2>
            {canAddUsers && (
              <button
                onClick={() => handleOpenModal("add")}
                className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                Add New User
              </button>
            )}
          </div>

          {/* Search and Filters */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search by name or utorid..."
                className="block w-full rounded-md border-gray-300 px-4 py-2 pr-10 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                aria-label="Search users"
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <Search
                  className="h-5 w-5 text-gray-400"
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
                className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              >
                <option value="all">All Roles</option>
                <option value="Regular">Regular</option>
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
                className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              >
                <option value="all">Any Verified Status</option>
                <option value="true">Verified</option>
                <option value="false">Unverified</option>
              </select>
            </div>

            <div>
              <label htmlFor="activatedFilter" className="sr-only">
                Filter by Activated Status
              </label>
              <select
                id="activatedFilter"
                value={activatedFilter}
                onChange={(e) => handleFilterChange(e, setActivatedFilter)}
                className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              >
                <option value="all">Any Activated Status</option>
                <option value="true">Activated</option>
                <option value="false">Not Activated</option>
              </select>
            </div>
          </div>

          {/* User Table Area */}
          {isInitialLoading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : error && users.length === 0 ? (
            <div className="min-h-[200px] rounded border border-red-200 bg-red-50 p-4 text-center text-red-700">
              <p>Error loading users:</p>
              <p className="text-sm">{error}</p>
            </div>
          ) : !isInitialLoading && users.length === 0 ? (
            <div className="min-h-[200px] flex items-center justify-center text-gray-500">
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
            />
          )}
        </div>
      </div>

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
          onSuccess={handleSuccess}
          user={modalState.user}
        />
      )}
      {modalState.type === "view" && modalState.user && (
        <ViewUserModal
          isOpen={modalState.type === "view"}
          onClose={handleCloseModal}
          user={modalState.user}
        />
      )}
    </>
  );
};

export default UserManagement;
