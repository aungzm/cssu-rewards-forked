import React, { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import ThemeToggle from "../components/ThemeToggle";

// --- Data Structures (TypeScript Interfaces) ---
interface User {
  id: string;
  name: string;
  email: string;
  avatarInitials: string;
  isVerified: boolean;
  role: Role;
  joinedDate: string;
}

type Role =
  | "Regular User"
  | "Cashier"
  | "Manager"
  | "Event Organizer"
  | "Superuser";

interface RoleDescription {
  title: string;
  text: string;
}

// --- Static Data ---
const initialUsers: User[] = [
  {
    id: "jsmith42",
    name: "John Smith",
    email: "john.smith@mail.utoronto.ca",
    avatarInitials: "JS",
    isVerified: true,
    role: "Manager",
    joinedDate: "Oct 10, 2023",
  },
  {
    id: "apatel23",
    name: "Aisha Patel",
    email: "aisha.patel@mail.utoronto.ca",
    avatarInitials: "AP",
    isVerified: true,
    role: "Cashier",
    joinedDate: "Sep 15, 2023",
  },
  {
    id: "dkim78",
    name: "David Kim",
    email: "david.kim@mail.utoronto.ca",
    avatarInitials: "DK",
    isVerified: true,
    role: "Event Organizer",
    joinedDate: "Aug 22, 2023",
  },
  {
    id: "mlopez35",
    name: "Maria Lopez",
    email: "maria.lopez@mail.utoronto.ca",
    avatarInitials: "ML",
    isVerified: true,
    role: "Regular User",
    joinedDate: "Nov 5, 2023",
  },
  {
    id: "rjohnson19",
    name: "Robert Johnson",
    email: "robert.johnson@mail.utoronto.ca",
    avatarInitials: "RJ",
    isVerified: true,
    role: "Superuser",
    joinedDate: "Jul 12, 2023",
  },
];

const roleDescriptions: Record<string, RoleDescription> = {
  user: {
    title: "Regular User",
    text: "Regular users can earn and spend points, view promotions, and attend events. They have basic access to the rewards system.",
  },
  cashier: {
    title: "Cashier",
    text: "Cashiers can process transactions and redemption requests. They have limited administrative capabilities focused on point transactions.",
  },
  manager: {
    title: "Manager",
    text: "Managers can manage users, transactions, promotions, and events. They have broad administrative access but cannot promote users to superuser.",
  },
  event_organizer: {
    title: "Event Organizer",
    text: "Event organizers can create and manage events, add users to events, and award points to event attendees.",
  },
  superuser: {
    title: "Superuser",
    text: "Superusers have complete administrative access to the system. They can manage all users, including promoting others to manager or superuser roles. This is the highest level of access and should be granted with caution.",
  },
};

const roleToValue = (role: Role): string => {
  switch (role) {
    case "Regular User": return "user";
    case "Cashier": return "cashier";
    case "Manager": return "manager";
    case "Event Organizer": return "event_organizer";
    case "Superuser": return "superuser";
    default: return "user";
  }
};

const valueToRole = (value: string): Role => {
  switch (value) {
    case "user": return "Regular User";
    case "cashier": return "Cashier";
    case "manager": return "Manager";
    case "event_organizer": return "Event Organizer";
    case "superuser": return "Superuser";
    default: return "Regular User";
  }
};

const RoleManagementPage: React.FC = () => {
  // --- State ---
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRoleInDialog, setSelectedRoleInDialog] = useState("user");
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // --- Memoized Calculations ---
  const filteredAndSortedUsers = useMemo(() => {
    const result = users.filter((user) => {
      const lowerSearchTerm = searchTerm.toLowerCase();
      const matchesSearch =
        user.name.toLowerCase().includes(lowerSearchTerm) ||
        user.email.toLowerCase().includes(lowerSearchTerm) ||
        user.id.toLowerCase().includes(lowerSearchTerm);

      const matchesRole = !roleFilter || roleToValue(user.role) === roleFilter;
      const matchesStatus =
        !statusFilter ||
        (statusFilter === "verified" && user.isVerified) ||
        (statusFilter === "unverified" && !user.isVerified);

      return matchesSearch && matchesRole && matchesStatus;
    });

    result.sort((a, b) => {
      switch (sortOrder) {
        case "name_asc": return a.name.localeCompare(b.name);
        case "name_desc": return b.name.localeCompare(a.name);
        default: return 0;
      }
    });

    return result;
  }, [users, searchTerm, roleFilter, statusFilter, sortOrder]);

  const totalPages = Math.ceil(filteredAndSortedUsers.length / itemsPerPage);
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedUsers.slice(startIndex, endIndex);
  }, [filteredAndSortedUsers, currentPage, itemsPerPage]);

  const currentRoleDescription = useMemo(() => {
    return roleDescriptions[selectedRoleInDialog] || roleDescriptions.user;
  }, [selectedRoleInDialog]);

  // --- Event Handlers ---
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
    filterType: "role" | "status" | "sort"
  ) => {
    const value = e.target.value;
    if (filterType === "role") setRoleFilter(value);
    if (filterType === "status") setStatusFilter(value);
    if (filterType === "sort") setSortOrder(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const openRoleDialog = (user: User) => {
    setSelectedUser(user);
    setSelectedRoleInDialog(roleToValue(user.role));
    setIsDialogOpen(true);
    setShowSuccessMessage(false);
  };

  const closeRoleDialog = () => {
    setIsDialogOpen(false);
    setSelectedUser(null);
  };

  const handleRoleSelectInDialog = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRoleInDialog(e.target.value);
  };

  const confirmRoleChange = () => {
    if (!selectedUser) return;

    setUsers((prevUsers) =>
      prevUsers.map((user) =>
        user.id === selectedUser.id
          ? { ...user, role: valueToRole(selectedRoleInDialog) }
          : user
      )
    );

    setShowSuccessMessage(true);
    setTimeout(() => {
      closeRoleDialog();
    }, 2000);
  };

  const renderRoleBadge = (role: Role) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded";
    
    switch (role) {
      case "Manager":
        return (
          <span className={`${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`}>
            Manager
          </span>
        );
      case "Cashier":
        return (
          <span className={`${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`}>
            Cashier
          </span>
        );
      case "Event Organizer":
        return (
          <span className={`${baseClasses} bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200`}>
            Event Organizer
          </span>
        );
      case "Superuser":
        return (
          <span className={`${baseClasses} bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 font-bold`}>
            Superuser
          </span>
        );
      default:
        return <span>Regular User</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300">
      {/* Dark Mode Toggle */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <Navbar userName="Admin User" isSuperUser={true} activeLink="Role Management" />

      <div className="container mx-auto px-4 py-8 ">
        {/* Main Card */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-black dark:text-white">Role Management</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Promote users to managers or superusers
          </p>
        </div>
        <div className="bg-white dark:bg-black rounded-lg shadow-lg transition-colors duration-300 w-3/4 align-middle mx-auto">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-black dark:text-white">User Roles</h2>
          </div>
          <div className="p-6">
            {/* Search Bar */}
            <div className="flex gap-2 mb-6 ">
              <input
                type="text"
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white dark:bg-gray-900 text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="Search by name, email, or ID"
                value={searchTerm}
                onChange={handleSearchChange}
              />
              <button className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-colors">
                Search
              </button>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap gap-2 mb-6">
              <select
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white dark:bg-gray-900 text-black dark:text-white"
                value={roleFilter}
                onChange={(e) => handleFilterChange(e, "role")}
              >
                <option value="">All Roles</option>
                <option value="user">Regular Users</option>
                <option value="cashier">Cashiers</option>
                <option value="manager">Managers</option>
                <option value="event_organizer">Event Organizers</option>
                <option value="superuser">Superusers</option>
              </select>

              <select
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white dark:bg-gray-900 text-black dark:text-white"
                value={statusFilter}
                onChange={(e) => handleFilterChange(e, "status")}
              >
                <option value="">All Verification Status</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
              </select>

              <select
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white dark:bg-gray-900 text-black dark:text-white"
                value={sortOrder}
                onChange={(e) => handleFilterChange(e, "sort")}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name_asc">Name (A-Z)</option>
                <option value="name_desc">Name (Z-A)</option>
              </select>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-black divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedUsers.length > 0 ? (
                    paginatedUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-black dark:bg-white text-white dark:text-black">
                              {user.avatarInitials}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium flex items-center text-black dark:text-white">
                                {user.name}
                                {user.isVerified && (
                                  <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded">
                                    Verified
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-black dark:text-white">
                          {user.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {renderRoleBadge(user.role)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-black dark:text-white">
                          {user.joinedDate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => openRoleDialog(user)}
                            className="px-3 py-1 border border-gray-300 dark:border-gray-700 rounded-md text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-colors"
                          >
                            Change Role
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        No users found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {(currentPage - 1) * itemsPerPage + 1}-
                  {Math.min(currentPage * itemsPerPage, filteredAndSortedUsers.length)}{" "}
                  of {filteredAndSortedUsers.length} users
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 rounded-md ${currentPage === 1 ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed" : "bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-black dark:text-white"}`}
                  >
                    «
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => handlePageChange(i + 1)}
                      className={`px-3 py-1 rounded-md ${currentPage === i + 1 ? "bg-black dark:bg-white text-white dark:text-black" : "bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-black dark:text-white"}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 rounded-md ${currentPage === totalPages ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed" : "bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-black dark:text-white"}`}
                  >
                    »
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {isDialogOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity">
          <div className="bg-white dark:bg-black rounded-lg shadow-xl w-full max-w-md p-6 transition-colors duration-300">
            <h3 className="text-lg font-medium mb-4 text-black dark:text-white">Change User Role</h3>
            <p className="mb-4 text-black dark:text-white">
              You are about to change the role for{" "}
              <strong>{selectedUser.name}</strong> (
              <span>{selectedUser.id}</span>).
            </p>

            <select
              className="w-full px-3 py-2 mb-4 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white dark:bg-gray-900 text-black dark:text-white"
              value={selectedRoleInDialog}
              onChange={handleRoleSelectInDialog}
            >
              <option value="user">Regular User</option>
              <option value="cashier">Cashier</option>
              <option value="manager">Manager</option>
              <option value="event_organizer">Event Organizer</option>
              <option value="superuser">Superuser</option>
            </select>

            <div className="p-4 mb-4 bg-gray-50 dark:bg-gray-800 rounded-md">
              <h4 className="font-medium mb-2 text-black dark:text-white">{currentRoleDescription.title}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {currentRoleDescription.text}
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={closeRoleDialog}
                disabled={showSuccessMessage}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white text-black dark:text-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmRoleChange}
                disabled={showSuccessMessage}
                className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-colors disabled:opacity-50"
              >
                Confirm Role Change
              </button>
            </div>

            {showSuccessMessage && (
              <p className="mt-3 text-sm text-green-600 dark:text-green-400">
                Role updated successfully!
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagementPage;
