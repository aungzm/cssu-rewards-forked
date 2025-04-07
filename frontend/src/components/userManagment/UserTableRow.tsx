import React from 'react';
import { User } from 'lucide-react';
import { UserData } from '../../types/';
import RoleBadge from './RoleBadge';

interface UserTableRowProps {
  user: ExtendedUserData;
  onViewInfo: (user: UserData) => void;
  onEditUser: (user: UserData) => void;
}

interface ExtendedUserData extends UserData {
  activated?: boolean; 
}

const UserTableRow: React.FC<UserTableRowProps> = ({
  user,
  onViewInfo,
  onEditUser,
}) => {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <tr className="hover:bg-gray-50">
      {/* User Cell */}
      <td className="whitespace-nowrap px-6 py-4">
        <div className="flex items-center">
          <div className="mr-4 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
            {user.avatarUrl ? (
              <img
                className="h-10 w-10 rounded-full"
                src={user.avatarUrl}
                alt={user.name}
              />
            ) : (
              <User size={24} className="text-indigo-600" /> // Adjusted icon style
            )}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">{user.name}</div>
            <div className="text-xs text-gray-500">{user.email || 'No email'}</div>
            {/* Verified Badge */}
            <span
              className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${
                user.verified
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {user.verified ? 'Verified' : 'Unverified'}
            </span>
            {/* Optional: Activated Badge */}
            {user.activated !== undefined && (
               <span
                 className={`ml-1 mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${
                   user.activated
                     ? 'bg-blue-100 text-blue-800'
                     : 'bg-gray-100 text-gray-800'
                 }`}
               >
                 {user.activated ? 'Active' : 'Inactive'}
               </span>
             )}
          </div>
        </div>
      </td>
      {/* Utorid / ID Cell */}
      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
        <div>{user.utorid}</div>
        <div className="text-xs text-gray-400">ID: {user.id}</div>
      </td>
      {/* Role Cell */}
      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
        <RoleBadge role={user.role} />
      </td>
      {/* Joined Cell */}
      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
        {formatDate(user.createdAt)}
      </td>
      {/* Actions Cell */}
      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
        <button
          onClick={() => onViewInfo(user)}
          className="mr-3 text-indigo-600 hover:text-indigo-900"
          aria-label={`View info for ${user.name}`}
        >
          View
        </button>
        <button
          onClick={() => onEditUser(user)}
          className="text-blue-600 hover:text-blue-900" // Consistent color scheme
          aria-label={`Edit user ${user.name}`}
        >
          Edit
        </button>
      </td>
    </tr>
  );
};

export default UserTableRow;
