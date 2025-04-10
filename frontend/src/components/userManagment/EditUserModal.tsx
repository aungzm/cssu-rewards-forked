// src/components/userManagment/EditUserModal.tsx
import React, { useState, useEffect } from 'react';
import type { UserData } from '../../types';
import { useUser } from '../../context/UserContext';
import { fetchWithAuth } from '../../utils/authHelper';
import { API_BASE_URL } from '../../utils/auth';
import { X, Loader2 } from 'lucide-react'; // Added Loader2

// Keep ExtendedUserData definition
interface ExtendedUserData extends UserData {
  suspicious?: boolean;
}

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: number; // Accept userId
}

const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  userId, // Use userId
}) => {
  const { userData: currentUser } = useUser();

  // State for the fetched user data
  const [userData, setUserData] = useState<ExtendedUserData | null>(null);
  const [isFetchingUser, setIsFetchingUser] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Form state 
  const [email, setEmail] = useState('');
  const [verified, setVerified] = useState(false);
  const [suspicious, setSuspicious] = useState(false);
  const [role, setRole] = useState<UserData['role']>('REGULAR'); // Default role

  // State for the PATCH request
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Fetch user data when the modal opens
  useEffect(() => {
    if (isOpen && userId) {
      const fetchUserData = async () => {
        setIsFetchingUser(true);
        setFetchError(null);
        setUserData(null); // Clear previous data
        try {
          const response = await fetchWithAuth(`${API_BASE_URL}/users/${userId}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch user data: ${response.status}`);
          }
          const data: ExtendedUserData = await response.json();
          setUserData(data);
          setEmail(data.email);
          setVerified(data.verified);
          setSuspicious(data.suspicious || false);
          setRole(data.role);
        } catch (err) {
          console.error('Error fetching user for modal:', err);
          setFetchError(err instanceof Error ? err.message : 'Could not load user data.');
        } finally {
          setIsFetchingUser(false);
        }
      };
      fetchUserData();
    } else {
      setUserData(null);
      setIsFetchingUser(false);
      setFetchError(null);
      setSaveError(null);
      setEmail(''); 
      setVerified(false); 
    }
  }, [isOpen, userId]); // Depend on isOpen and userId

  const canEditRole = currentUser?.role === 'SUPERUSER' || currentUser?.role === 'MANAGER';
  const allowedRoles =
    currentUser?.role === 'SUPERUSER'
      ? ['REGULAR', 'CASHIER', 'MANAGER', 'SUPERUSER']
      : currentUser?.role === 'MANAGER'
        ? ['REGULAR', 'CASHIER']
        : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) {
      setSaveError("User data not loaded yet.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    const payload: Partial<UserData & { suspicious?: boolean }> = {};
    // Compare with fetched userData
    if (email !== userData.email) payload.email = email;
    if (verified !== userData.verified) payload.verified = verified;
    if (suspicious !== (userData.suspicious || false)) payload.suspicious = suspicious;
    if (role !== userData.role && canEditRole) payload.role = role;
    if (payload.role && !verified && !userData.verified) {
        payload.verified = true;
        setVerified(true); // Update local state to reflect the change
    }
    // Set suspicious to false when promoting to cashier (as per API doc)
    if (payload.role === 'CASHIER' && userData.role !== 'CASHIER') {
        payload.suspicious = false;
    }


    if (Object.keys(payload).length === 0) {
      setSaveError('No changes detected.');
      setIsSaving(false);
      return;
    }

    try {
      // API expects role in lowercase if present
      const apiPayload = { ...payload, role: payload.role ? payload.role.toLowerCase() : null };
      const response = await fetchWithAuth(`${API_BASE_URL}/users/${userId}`, { // Use userId
        method: 'PATCH',
        body: JSON.stringify(apiPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Failed to update user: ${response.status}`,
        );
      }

      onSuccess(); // Call success callback
    } catch (err) {
      console.error('Error updating user:', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between border-b pb-3 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Edit User</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={24} aria-label="Close modal" />
          </button>
        </div>

        {/* Loading State */}
        {isFetchingUser && (
          <div className="flex min-h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
            <p className="ml-2 text-gray-600 dark:text-gray-400">Loading user data...</p>
          </div>
        )}

        {/* Error State */}
        {fetchError && !isFetchingUser && (
           <div className="min-h-[300px] rounded border border-red-300 bg-red-50 p-4 text-center text-red-700 dark:bg-red-900 dark:border-red-700 dark:text-red-200">
             <p>Error loading user data:</p>
             <p className="text-sm">{fetchError}</p>
             <button onClick={onClose} className="mt-4 text-sm text-indigo-600 hover:underline">Close</button>
           </div>
        )}

        {/* Form Content (only show when data is loaded) */}
        {!isFetchingUser && !fetchError && userData && (
          <form onSubmit={handleSubmit}>
            {/* Email Input */}
            <div className="mb-4">
              <label htmlFor="edit-email" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
              <input
                type="email"
                id="edit-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              />
            </div>

            {/* Verified Checkbox */}
            <div className="mb-4 flex items-center">
              <input
                id="edit-verified"
                type="checkbox"
                checked={verified}
                // Allow checking if currently false, disable unchecking if already true
                onChange={(e) => setVerified(e.target.checked)}
                disabled={userData.verified} // Disable if already verified from fetched data
                className={`h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 ${userData.verified ? 'cursor-not-allowed' : ''}`}
              />
              <label htmlFor="edit-verified" className="ml-2 block text-sm text-gray-900 dark:text-gray-200">Verified</label>
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
              <label htmlFor="edit-suspicious" className="ml-2 block text-sm text-gray-900 dark:text-gray-200">Suspicious</label>
            </div>

            {/* Role Select */}
            <div className="mb-6">
              <label htmlFor="edit-role" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
              <select
                id="edit-role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserData['role'])}
                // Disable if user cannot edit roles OR if the fetched user's role is not one they are allowed to change
                disabled={!canEditRole || !allowedRoles.includes(userData.role)}
                className={`p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white ${(!canEditRole || !allowedRoles.includes(userData.role)) ? 'cursor-not-allowed bg-gray-100 dark:bg-gray-600' : ''}`}
              >
                {/* Show roles the current user can assign */}
                {allowedRoles.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
                {/* If the user's current role isn't in the assignable list (e.g., Manager viewing Superuser), show it as selected but disabled */}
                {!allowedRoles.includes(userData.role) && <option value={userData.role}>{userData.role}</option>}
              </select>
              {!canEditRole && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">You don't have permission to change roles.</p>}
              {canEditRole && !allowedRoles.includes(userData.role) && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">You cannot change the role of this user.</p>}
            </div>


            {saveError && <p className="mb-4 text-sm text-red-600">{saveError}</p>}

            {/* Actions */}
            <div className="flex justify-end gap-3 border-t pt-4 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? (
                   <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving... </>
                ) : (
                   'Save Changes'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default EditUserModal;
