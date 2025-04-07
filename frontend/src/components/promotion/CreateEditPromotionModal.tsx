import React, { useState, useEffect, FormEvent } from 'react';
import { API_BASE_URL } from '../../utils/auth'; // Assuming auth utils are here
import { fetchWithAuth } from '../../utils/authHelper'; // Assuming auth utils are here


interface Promotion {
  id: number;
  name: string;
  type: 'one-time' | 'automatic';
  startTime: string; // ISO String
  endTime: string | null; // ISO String or null
  minSpending: number;
  rate: number;
  points: number;
  description: string;
}

// Props for the modal
interface CreateEditPromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  promotionToEdit?: Promotion; // If present, we are editing
  onSuccess: (promotion: Promotion) => void; // Callback on successful API call
}

// Initial empty state for the form
const initialFormData = {
  name: '',
  description: '',
  type: 'one-time' as 'one-time' | 'automatic',
  startTime: '',
  endTime: '', // Store as string initially, convert to null if empty on submit
  minSpending: '0', // Store as string for input binding
  rate: '0', // Store as string
  points: '0', // Store as string
};

export default function CreateEditPromotionModal({
  isOpen,
  onClose,
  promotionToEdit,
  onSuccess,
}: CreateEditPromotionModalProps) {
  const [formData, setFormData] = useState(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const MAX_DESC_LENGTH = 300;
  const isEditing = Boolean(promotionToEdit);

  // Effect to populate form when editing
  useEffect(() => {
    if (isEditing && promotionToEdit) {
      setFormData({
        name: promotionToEdit.name,
        description: promotionToEdit.description,
        type: promotionToEdit.type,
        // Format dates for datetime-local input if needed, otherwise ensure ISO string
        startTime: promotionToEdit.startTime, // Assuming it's already ISO
        endTime: promotionToEdit.endTime ?? '', // Use empty string for input if null
        minSpending: String(promotionToEdit.minSpending),
        rate: String(promotionToEdit.rate),
        points: String(promotionToEdit.points),
      });
    } else {
      // Reset form when opening for create or when promotionToEdit changes
      setFormData(initialFormData);
    }
    // Reset error when modal opens or promotion changes
    setApiError(null);
  }, [isOpen, promotionToEdit, isEditing]); // Rerun when these change

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {

    // Prevent exceeding max length for description
    if (e.target.name === 'description' && e.target.value.length > MAX_DESC_LENGTH) {
      return;
    }
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setApiError(null);

    // --- Prepare Payload ---
    // Convert string inputs to numbers, handle potential NaN
    const minSpendingNum = parseInt(formData.minSpending, 10);
    const rateNum = parseFloat(formData.rate);
    const pointsNum = parseInt(formData.points, 10);

    // Basic validation example (add more as needed)
    if (
      isNaN(minSpendingNum) ||
      minSpendingNum < 0 ||
      isNaN(rateNum) ||
      rateNum < 0 ||
      isNaN(pointsNum) ||
      pointsNum < 0
    ) {
      setApiError(
        'Minimum Spending, Rate, and Points must be valid positive numbers.',
      );
      setIsSubmitting(false);
      return;
    }

    // Validate dates (basic example: end time must be after start time if provided)
    const start = new Date(formData.startTime);
    const end = formData.endTime ? new Date(formData.endTime) : null;

    if (!formData.startTime || isNaN(start.getTime())) {
        setApiError('Please provide a valid Start Time.');
        setIsSubmitting(false);
        return;
    }
     if (end && isNaN(end.getTime())) {
        setApiError('End Time is not a valid date.');
        setIsSubmitting(false);
        return;
    }
    if (end && start >= end) {
      setApiError('End Time must be after Start Time.');
      setIsSubmitting(false);
      return;
    }

    const payload = {
      name: formData.name,
      description: formData.description,
      type: formData.type,
      startTime: start.toISOString(), // Ensure ISO format
      endTime: end ? end.toISOString() : null, // Send null if empty/invalid
      minSpending: minSpendingNum,
      rate: rateNum,
      points: pointsNum,
    };

    // --- Determine API Endpoint and Method ---
    const url = isEditing
      ? `${API_BASE_URL}/promotions/${promotionToEdit?.id}`
      : `${API_BASE_URL}/promotions`;
    const method = isEditing ? 'PATCH' : 'POST';

    console.log(`Submitting to ${method} ${url}`, payload); // Debug log

    try {
      const response = await fetchWithAuth(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          // Add cache control if needed, though less critical for POST/PATCH
          // 'Cache-Control': 'no-cache',
        },
        body: JSON.stringify(payload),
      });

      // --- Handle Response ---
      if (!response.ok) {
        let errorData;
        let errorMessage = `Request failed with status ${response.status} (${response.statusText})`; // Default message
        try {
          errorData = await response.json();
          if (errorData?.error && Array.isArray(errorData.error)) {
            errorMessage = errorData.error
              .map((e: {path: string, message: string}) => `${e.path}: ${e.message}`) 
              .join('; '); // Join multiple errors
          } else if (errorData?.message) {
            errorMessage = errorData.message;
          } else if (errorData?.error && typeof errorData.error === 'string') {
             errorMessage = errorData.error;
          }
        } catch {
          // Ignore if response is not JSON or parsing fails
        }
        console.error('API Error Response:', errorData || errorMessage);
        throw new Error(errorMessage);
      }

      const resultPromotion: Promotion = await response.json();
      console.log('API Success Response:', resultPromotion);
      onSuccess(resultPromotion); // Pass the actual result to the parent
      // onClose(); // onSuccess should handle closing via the parent state update
    } catch (error) {
      console.error(`Failed to ${isEditing ? 'update' : 'create'} promotion:`, error);
      setApiError(error instanceof Error ? error.message : 'An unknown error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm"
      onClick={onClose} // Close if clicking outside modal content
    >
      <div
        className="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800 m-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 rounded-full p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-200"
          aria-label="Close modal"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          {isEditing ? 'Edit Promotion' : 'Create New Promotion'}
        </h2>

        {/* API Error Display */}
        {apiError && (
          <div
            className="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700 dark:bg-red-900 dark:border-red-700 dark:text-red-200"
            role="alert"
          >
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{apiError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Promotion Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              disabled={isSubmitting}
              className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-600 dark:focus:border-blue-600 disabled:opacity-50"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              required
              disabled={isSubmitting}
              className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-600 dark:focus:border-blue-600 disabled:opacity-50"
            />
             <p className="mt-1 text-xs text-right text-gray-500 dark:text-gray-400">
              {formData.description.length} / {MAX_DESC_LENGTH} characters
            </p>
          </div>

          {/* Type */}
          <div>
            <label
              htmlFor="type"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Type
            </label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
              disabled={isSubmitting}
              className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-600 dark:focus:border-blue-600 disabled:opacity-50"
            >
              <option value="one-time">One Time</option>
              <option value="automatic">Automatic</option>
            </select>
          </div>

          {/* Start Time */}
          <div>
            <label
              htmlFor="startTime"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Start Time
            </label>
            <input
              type="datetime-local" // Use datetime-local for easier input
              id="startTime"
              name="startTime"
              value={formData.startTime} // Bind directly if value is compatible
              onChange={handleChange}
              required
              disabled={isSubmitting}
              className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-600 dark:focus:border-blue-600 disabled:opacity-50"
            />
          </div>

          {/* End Time */}
          <div>
            <label
              htmlFor="endTime"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              End Time (Optional)
            </label>
            <input
              type="datetime-local"
              id="endTime"
              name="endTime"
              value={formData.endTime}
              onChange={handleChange}
              disabled={isSubmitting}
              className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-600 dark:focus:border-blue-600 disabled:opacity-50"
            />
          </div>

          {/* Min Spending */}
          <div>
            <label
              htmlFor="minSpending"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Minimum Spending ($)
            </label>
            <input
              type="number"
              id="minSpending"
              name="minSpending"
              min="0"
              step="0.01" // Allow cents if applicable, otherwise use step="1"
              value={formData.minSpending}
              onChange={handleChange}
              required
              disabled={isSubmitting}
              className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-600 dark:focus:border-blue-600 disabled:opacity-50"
            />
          </div>

          {/* Rate */}
          <div>
            <label
              htmlFor="rate"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Bonus Rate (e.g., 0.1 for 10%)
            </label>
            <input
              type="number"
              id="rate"
              name="rate"
              min="0"
              step="0.01" // Adjust step as needed
              value={formData.rate}
              onChange={handleChange}
              required
              disabled={isSubmitting}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-600 dark:focus:border-blue-600 disabled:opacity-50"
            />
          </div>

          {/* Points */}
          <div>
            <label
              htmlFor="points"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Bonus Points
            </label>
            <input
              type="number"
              id="points"
              name="points"
              min="0"
              step="1" // Points are usually integers
              value={formData.points}
              onChange={handleChange}
              required
              disabled={isSubmitting}
              className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-600 dark:focus:border-blue-600 disabled:opacity-50"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? isEditing
                  ? 'Saving...'
                  : 'Creating...'
                : isEditing
                  ? 'Save Changes'
                  : 'Create Promotion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
