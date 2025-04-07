import React, { useState, useEffect } from 'react';
import type { UserData } from '../../types'; 
import { useUser } from '../../context/UserContext'; 
import { fetchWithAuth } from '../../utils/authHelper';
import { API_BASE_URL } from '../../utils/auth';
import { X } from 'lucide-react';

interface ExtendedUserData extends UserData {
  suspicious?: boolean; 
}
interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: ExtendedUserData;
}

const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  user,
}) => {
  const { userData: currentUser } = useUser();
  const [email, setEmail] = useState(user.email);
  const [verified, setVerified] = useState(user.verified);
  const [suspicious, setSuspicious] = useState(user.suspicious || false); 
  const [role, setRole] = useState(user.role);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when user changes
  useEffect(() => {
    setEmail(user.email);
    setVerified(user.verified);
    setSuspicious(user.suspicious || false);
    setRole(user.role);
    setError(null);
  }, [user]);

  const canEditRole = currentUser?.role === 'SUPERUSER'; // Example permission
  const allowedRoles =
    currentUser?.role === 'SUPERUSER'
      ? ['REGULAR', 'CASHIER', 'MANAGER', 'SUPERUSER']
      : currentUser?.role === 'MANAGER'
        ? ['REGULAR', 'CASHIER']
        : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const payload: Partial<UserData & { suspicious?: boolean }> = {};
    if (email !== user.email) payload.email = email;
    if (verified !== user.verified) payload.verified = verified;
    if (suspicious !== (user.suspicious || false))
      payload.suspicious = suspicious;
    if (role !== user.role && canEditRole) payload.role = role; // Only include role if changed and allowed
    if (payload.role && !verified) {
        payload.verified = true; 
        setVerified(true);
    }
    // Set suspicious to false when promoting to cashier (as per API doc)
    if (payload.role === 'CASHIER' && user.role !== 'CASHIER') {
        payload.suspicious = false;
        setSuspicious(false);
    }


    if (Object.keys(payload).length === 0) {
      setError('No changes detected.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Failed to update user: ${response.status}`,
        );
      }

      onSuccess(); // Call success callback (refetches users)
    } catch (err) {
      console.error('Error updating user:', err);
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">Edit User</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} aria-label="Close modal" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Email Input */}
          <div className="mb-4">
            <label htmlFor="edit-email" className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              id="edit-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            />
          </div>

          {/* Verified Checkbox */}
          <div className="mb-4 flex items-center">
            <input
              id="edit-verified"
              type="checkbox"
              checked={verified}
              onChange={(e) => setVerified(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="edit-verified" className="ml-2 block text-sm text-gray-900">Verified</label>
          </div>

          {/* Suspicious Checkbox */}
          <div className="mb-4 flex items-center">
            <input
              id="edit-suspicious"
              type="checkbox"
              checked={suspicious}
              onChange={(e) => setSuspicious(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="edit-suspicious" className="ml-2 block text-sm text-gray-900">Suspicious</label>
          </div>

          {/* Role Select */}
          <div className="mb-6">
             <label htmlFor="edit-role" className="mb-1 block text-sm font-medium text-gray-700">Role</label>
             <select
               id="edit-role"
               value={role}
               onChange={(e) => setRole(e.target.value as UserData['role'])}
               disabled={!canEditRole} // Disable based on permission
               className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${!canEditRole ? 'cursor-not-allowed bg-gray-100' : ''}`}
             >
               {allowedRoles.map((r) => (
                 <option key={r} value={r}>{r}</option>
               ))}
               {/* Show current role even if not changeable */}
               {!allowedRoles.includes(role) && <option value={role}>{role}</option>}
             </select>
             {!canEditRole && <p className="mt-1 text-xs text-gray-500">You don't have permission to change the role.</p>}
          </div>


          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserModal;

