import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../../utils/authHelper';
import { API_BASE_URL } from '../../utils/auth';
import { CreateUserResponse } from '../../types'; // Adjust the import path as necessary
import { X } from 'lucide-react';

interface AddUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (responseData: CreateUserResponse) => void; // Callback after successful creation
}

const AddUserModal: React.FC<AddUserModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
}) => {
    const [utorid, setUtorid] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<{
        utorid?: string;
        email?: string;
    }>({});

    // Reset form when modal opens or closes
    useEffect(() => {
        if (isOpen) {
            setUtorid('');
            setName('');
            setEmail('');
            setError(null);
            setValidationErrors({});
            setIsLoading(false);
        }
    }, [isOpen]);

    const validateForm = (): boolean => {
        const errors: { utorid?: string; email?: string } = {};
        let isValid = true;

        // Basic UTORid validation (adjust regex if needed)
        if (!/^[a-zA-Z0-9]{1,8}$/.test(utorid)) {
            errors.utorid = 'UTORid must be 1-8 alphanumeric characters.';
            isValid = false;
        }

        // Basic UofT email validation
        if (!/^[a-zA-Z0-9._%+-]+@mail\.utoronto\.ca$/.test(email)) {
            errors.email = 'Please enter a valid @mail.utoronto.ca email address.';
            isValid = false;
        }

        setValidationErrors(errors);
        return isValid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/users`, {
                method: 'POST',
                body: JSON.stringify({
                    utorid,
                    name,
                    email,
                }),
            });

            if (!response.ok) {
                // Try to parse error message from backend
                let errorData;
                try {
                    errorData = await response.json();
                } catch {
                    // Ignore if response is not JSON
                }
                throw new Error(
                    errorData?.message || `Failed to add user: ${response.status}`,
                );
            }

            const data = await response.json();
            onSuccess(data); // Call the success callback with the reset token
        } catch (err) {
            console.error('Error adding user:', err);
            setError(err instanceof Error ? err.message : 'Failed to add user');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-800">Create User</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                        aria-label="Close modal"
                    >
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* UTORid Input */}
                    <div className="mb-4">
                        <label
                            htmlFor="add-utorid"
                            className="mb-1 block text-sm font-medium text-gray-700"
                        >
                            Utorid
                        </label>
                        <input
                            type="text"
                            id="add-utorid"
                            value={utorid}
                            onChange={(e) => setUtorid(e.target.value)}
                            placeholder="Enter utorid"
                            maxLength={8}
                            className={`p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${validationErrors.utorid ? 'border-red-500' : ''
                                }`}
                            required
                        />
                        {validationErrors.utorid && (
                            <p className="mt-1 text-xs text-red-600">
                                {validationErrors.utorid}
                            </p>
                        )}
                    </div>

                    {/* Name Input */}
                    <div className="mb-4">
                        <label
                            htmlFor="add-name"
                            className="mb-1 block text-sm font-medium text-gray-700"
                        >
                            Name
                        </label>
                        <input
                            type="text"
                            id="add-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter name"
                            className="p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            required
                        />
                    </div>

                    {/* Email Input */}
                    <div className="mb-6">
                        <label
                            htmlFor="add-email"
                            className="mb-1 block text-sm font-medium text-gray-700"
                        >
                            Email
                        </label>
                        <input
                            type="email"
                            id="add-email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter email address"
                            className={`p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${validationErrors.email ? 'border-red-500' : ''
                                }`}
                            required
                        />
                        {validationErrors.email && (
                            <p className="mt-1 text-xs text-red-600">
                                {validationErrors.email}
                            </p>
                        )}
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
                            {isLoading ? 'Creating...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddUserModal;