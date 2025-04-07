import React, { useState, useEffect, useCallback } from 'react';
import { fetchWithAuth } from '../../utils/authHelper';
import { API_BASE_URL } from '../../utils/auth';
import { X, Check, Circle } from 'lucide-react';

interface PasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ValidationStatus {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
}

const ValidationItem: React.FC<{ label: string; isValid: boolean }> = ({ label, isValid }) => (
  <li className={`flex items-center text-sm ${isValid ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
    {isValid ? (
      <Check size={16} className="mr-1" />
    ) : (
      <Circle size={16} className="mr-1" />
    )}
    {label}
  </li>
);

const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({ isOpen, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  // Validate newPassword for all criteria except matching.
  const validatePassword = useCallback((password: string) => {
    const length = password.length >= 8 && password.length <= 20;
    const uppercase = /[A-Z]/.test(password);
    const lowercase = /[a-z]/.test(password);
    const number = /[0-9]/.test(password);
    const special = /[^A-Za-z0-9]/.test(password); // any non-alphanumeric character
    setValidationStatus({ length, uppercase, lowercase, number, special });
  }, []);

  useEffect(() => {
    if (newPassword) {
      validatePassword(newPassword);
    } else {
      setValidationStatus({
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        special: false,
      });
    }
  }, [newPassword, validatePassword]);

  // Compute overall validations:
  const allOtherValid = 
    validationStatus.length &&
    validationStatus.uppercase &&
    validationStatus.lowercase &&
    validationStatus.number &&
    validationStatus.special;
  // Only check password match if confirmPassword is not blank.
  const passwordMatch = confirmPassword !== '' && newPassword === confirmPassword;
  // Overall validity: all validations pass and the confirm matches.
  const isPasswordValid = allOtherValid && passwordMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // prevent default form submission behavior
    setError(null); // clear any previous error

    if (!currentPassword) {
      setError('Please enter your current password.');
      return;
    }
    if (!allOtherValid) {
      setError('New password does not meet all requirements.');
      return;
    }
    if (!passwordMatch) {
      setError('New passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/users/me/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ old: currentPassword, new: newPassword }),
      });

      if (response.ok) {
        alert('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        onClose(); // close modal on success
      } else {
        const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred.' }));
        if (response.status === 400 && errorData?.message) {
          setError(`Error: ${errorData.message}`);
        } else if (response.status === 401 || response.status === 403) {
          setError('Authentication error. Please log in again.');
        } else {
          setError(`Failed to update password. Server responded with status ${response.status}.`);
        }
        console.error('Password update failed:', errorData);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form state when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md m-4 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
          aria-label="Close modal"
          disabled={isLoading}
        >
          <X size={24} />
        </button>

        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
          Change Password
        </h2>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label
              htmlFor="currentPassword"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Current Password
            </label>
            <input
              type="password"
              id="currentPassword"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              disabled={isLoading}
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="newPassword"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              New Password
            </label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              disabled={isLoading}
            />
            {/* Validation Checklist for New Password */}
            <ul className="mt-2 space-y-1">
              <ValidationItem label="8-20 characters" isValid={validationStatus.length} />
              <ValidationItem label="At least one uppercase letter" isValid={validationStatus.uppercase} />
              <ValidationItem label="At least one lowercase letter" isValid={validationStatus.lowercase} />
              <ValidationItem label="At least one number" isValid={validationStatus.number} />
              <ValidationItem label="At least one special character (!@#$%^&*...)" isValid={validationStatus.special} />
              <ValidationItem 
                label="Passwords match" 
                isValid={confirmPassword === '' ? false : passwordMatch} 
              />
            </ul>
          </div>

          <div className="mb-6">
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              disabled={isLoading}
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-gray-600 dark:text-gray-100 dark:hover:bg-gray-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !isPasswordValid}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordChangeModal;
