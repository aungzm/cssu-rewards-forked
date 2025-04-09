import React from "react";
import { User } from "lucide-react";
import type { UserData } from "../../types";
import RoleBadge from "./RoleBadge"; 


type FetchedUser = Partial<UserData> &
  Pick<UserData, "id" | "name" | "verified"> & {
    utorid?: string;
    email?: string;
    avatarUrl?: string;
    activated?: boolean;
    avatar?: string;
  };

interface UserTableRowProps {
  user: FetchedUser; // Use the partial user type
  onViewInfo: (user: FetchedUser) => void;
  onEditUser: (user: FetchedUser) => void;
  currentUserRole: "CASHIER" | "MANAGER" | "SUPERUSER" | "REGULAR";
  showFullDetails: boolean; // Flag passed from UserTable
}

const UserTableRow: React.FC<UserTableRowProps> = ({
  user,
  onViewInfo,
  onEditUser,
  currentUserRole, 
  showFullDetails, 
}) => {
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Invalid Date";
    }
  };

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
      {/* User Cell */}
      <td className="whitespace-nowrap px-6 py-4">
        <div className="flex items-center">
          <div className="mr-4 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300">
            {user.avatar ? (
              <img
              className="h-10 w-10 rounded-full object-cover"
              src={`data:image/png;base64,${user.avatar}`}
              alt={user.name ?? "User avatar"}
              />
            ) : (
              <User size={24} />
            )}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {user.name ?? "N/A"}
            </div>
            {/* Show email only if available */}
            {user.email && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {user.email}
              </div>
            )}
          </div>
        </div>
      </td>

      {/* Utorid / ID Cell */}
      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
        <div>{user.utorid ?? "N/A"}</div>
        <div className="text-xs text-gray-400 dark:text-gray-500">
          ID: {user.id}
        </div>
      </td>

      {/* Role Cell - Conditionally Rendered */}
      {showFullDetails && (
        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
          {/* Check if role exists *** */}
          {user.role ? (
            <RoleBadge role={user.role} />
          ) : (
            <span className="text-xs text-gray-400">N/A</span>
          )}
        </td>
      )}

      {/* Joined Cell - Conditionally Rendered */}
      {showFullDetails && (
        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
          {/* *** MODIFICATION: Check if createdAt exists *** */}
          {formatDate(user.createdAt)}
        </td>
      )}

      {/* Status Cell (Verified/Activated) */}
      <td className="whitespace-nowrap px-6 py-4">
        <div className="flex flex-col items-start space-y-1">
          {/* Verified Badge */}
          <span
            className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${
              user.verified
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
            }`}
          >
            {user.verified ? "Verified" : "Unverified"}
          </span>
          {/* Activated Badge - Only show if data available */}
          {showFullDetails && user.activated !== undefined && (
            <span
              className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${
                user.activated
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  : "bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200"
              }`}
            >
              {user.activated ? "Active" : "Inactive"}
            </span>
          )}
        </div>
      </td>

      {/* Actions Cell */}
      <td className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium">
        <button
          onClick={() => onViewInfo(user)}
          className="mr-3 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200"
          aria-label={`View info for ${user.name ?? user.utorid}`}
        >
          View
        </button>
        {/* Conditionally render Edit button *** */}
        {currentUserRole !== "CASHIER" && (
          <button
            onClick={() => onEditUser(user)}
            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-200"
            aria-label={`Edit user ${user.name ?? user.utorid}`}
          >
            Edit
          </button>
        )}
      </td>
    </tr>
  );
};

export default UserTableRow;
