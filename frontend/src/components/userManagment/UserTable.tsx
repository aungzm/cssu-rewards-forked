import { RefObject } from 'react';
import { UserData } from '../../types/';
import UserTableRow from './UserTableRow';
import { Loader2 } from 'lucide-react'; // Import loader

interface UserTableProps {
  users: UserData[];
  isLoading: boolean; // Indicates loading more items
  error: string | null;
  onViewInfo: (user: UserData) => void;
  onEditUser: (user: UserData) => void;
  // Add ref for intersection observer
  loaderRef?: RefObject<HTMLDivElement | null>;
  hasMore: boolean; // Indicates if there are more items to load
}

const UserTable: React.FC<UserTableProps> = ({
  users,
  isLoading,
  error,
  onViewInfo,
  onEditUser,
  loaderRef, // Receive the ref
  hasMore, // Receive hasMore status
}) => {
  if (!users || users.length === 0) {
    return <div className="p-4 text-center text-gray-500">No users found matching criteria.</div>;
  }

  return (
    <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              User
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              Utorid / ID
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              Role
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              Joined
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500" // Adjusted alignment
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {users.map((user) => (
            <UserTableRow
              key={user.id}
              user={user}
              onViewInfo={onViewInfo}
              onEditUser={onEditUser}
            />
          ))}
          {/* Empty row or div to attach the ref for intersection observer */}
          {/* This is where the loader will be placed when loading more items */}
          {hasMore && (
            <tr>
              {/* Use a div inside td to avoid React hydration errors with refs on tr */}
              <td colSpan={5} className="p-4 text-center">
                <div ref={loaderRef}>
                  {isLoading && ( // Show loader only when loading more
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-600 inline-block" />
                  )}
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {/* Display error specific to loading more */}
      {error && !isLoading && (
        <div className="p-4 text-center text-red-600">
          Error loading more users: {error}
        </div>
      )}
    </div>
  );
};

export default UserTable;
