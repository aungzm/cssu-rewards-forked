import React from 'react';
import type { UserData } from '../../types/';

interface RoleBadgeProps {
  role: UserData['role'];
}

const RoleBadge: React.FC<RoleBadgeProps> = ({ role }) => {
  const getRoleClasses = () => {
    switch (role) {
      case 'REGULAR':
        return 'bg-blue-100 text-blue-800';
      case 'CASHIER':
        return 'bg-yellow-100 text-yellow-800';
      case 'MANAGER':
        return 'bg-green-100 text-green-800';
      case 'SUPERUSER':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${getRoleClasses()}`}
    >
      {role}
    </span>
  );
};

export default RoleBadge;
