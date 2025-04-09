import React, { RefObject } from "react";
import type { UserData } from "../../types";
import UserTableRow from "./UserTableRow";
import { Loader2 } from "lucide-react";

type FetchedUser = Partial<UserData> &
  Pick<UserData, "id" | "name" | "verified"> & {
    utorid?: string;
    email?: string;
    avatarUrl?: string;
    avatar?: string;
  };

interface UserTableProps {
  users: (Pick<UserData, "id" | "name" | "verified"> & { utorid?: string })[];
  isLoading: boolean;
  error: string | null;
  onViewInfo: (user: FetchedUser) => void; 
  onEditUser: (user: FetchedUser) => void; 
  loaderRef?: RefObject<HTMLDivElement | null>;
  hasMore: boolean;
  currentUserRole: "CASHIER" | "MANAGER" | "SUPERUSER" | "REGULAR"; // Add REGULAR for completeness
}

const UserTable: React.FC<UserTableProps> = ({
  users,
  isLoading,
  error,
  onViewInfo,
  onEditUser,
  loaderRef,
  hasMore,
  currentUserRole, 
}) => {
  if (!users || users.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        No users found matching criteria.
      </div>
    );
  }

  // Determine if columns specific to Manager+ should be shown
  const showFullDetails = ["MANAGER", "SUPERUSER"].includes(currentUserRole);

  return (
    <div className="overflow-x-auto max-h-[70vh] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-1">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300"
            >
              User
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300"
            >
              Utorid / ID
            </th>
            {/* Conditionally show Role column header */}
            {showFullDetails && (
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300"
              >
                Role
              </th>
            )}
            {/* Conditionally show Joined column header */}
            {showFullDetails && (
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300"
              >
                Joined
              </th>
            )}
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300"
            >
              Status
            </th>
            <th
              scope="col"
              className="relative px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300"
            >
              <span className="sr-only">Actions</span>
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white dark:bg-gray-800 dark:divide-gray-700">
          {users.map((user) => (
            <UserTableRow
              key={user.id}
              user={user}
              onViewInfo={onViewInfo}
              onEditUser={onEditUser}
              currentUserRole={currentUserRole}
              showFullDetails={showFullDetails} 
            />
          ))}
          {hasMore && (
            <tr>
              {/* Adjust colspan based on visible columns */}
              <td colSpan={showFullDetails ? 6 : 4} className="p-4 text-center">
                <div ref={loaderRef}>
                  {isLoading && (
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-600 dark:text-indigo-400 inline-block" />
                  )}
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {error && !isLoading && (
        <div className="p-4 text-center text-red-600 dark:text-red-400">
          Error loading more users: {error}
        </div>
      )}
    </div>
  );
};

export default UserTable;
