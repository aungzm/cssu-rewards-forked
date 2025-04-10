import React, { useState, useEffect, FormEvent } from 'react';
import { API_BASE_URL } from '../../utils/auth';
import { fetchWithAuth } from '../../utils/authHelper';
import { X } from 'lucide-react';

interface Promotion {
  id: number;
  name: string;
  type: 'one-time' | 'automatic';
  startTime: string; // ISO String
  endTime: string; // ISO String or null
  minSpending: number;
  rate: number;
  points: number;
  description: string;
}

interface CreateEditPromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  promotionToEdit?: Promotion;
  onSuccess: (promotion: Promotion) => void;
}

const initialFormData = {
  name: '',
  description: '',
  type: 'one-time' as 'one-time' | 'automatic',
  startTime: '', 
  endTime: '', 
  minSpending: '0',
  rate: '0',
  points: '0',
};

// Helper function to format ISO string (or Date object) for datetime-local input
const formatISOForInput = (isoString: string | null | undefined): string => {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      return '';
    }
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); 
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (e) {
    console.error('Error formatting date for input:', e);
    return ''; 
  }
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

  useEffect(() => {
    if (isEditing && promotionToEdit) {
      setFormData({
        name: promotionToEdit.name,
        description: promotionToEdit.description,
        type: promotionToEdit.type,
        startTime: formatISOForInput(promotionToEdit.startTime),
        endTime: formatISOForInput(promotionToEdit.endTime),
        minSpending: String(promotionToEdit.minSpending),
        rate: String(promotionToEdit.rate),
        points: String(promotionToEdit.points),
      });
    } else {
      setFormData(initialFormData);
    }
    setApiError(null);
  }, [isOpen, promotionToEdit, isEditing]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    if (
      e.target.name === 'description' &&
      e.target.value.length > MAX_DESC_LENGTH
    ) {
      return;
    }
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setApiError(null);

    const minSpendingNum = parseInt(formData.minSpending, 10);
    const rateNum = parseFloat(formData.rate);
    const pointsNum = parseInt(formData.points, 10);

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

    const start = formData.startTime ? new Date(formData.startTime) : null;
    const end = formData.endTime ? new Date(formData.endTime) : null;

    if (!start || isNaN(start.getTime())) {
      setApiError('Please provide a valid Start Time.');
      setIsSubmitting(false);
      return;
    }
    // No need to check end for NaN if it's null
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
      startTime: start.toISOString(),
      endTime: end ? end.toISOString() : null,
      minSpending: minSpendingNum,
      rate: rateNum,
      points: pointsNum,
    };

    const url = isEditing
      ? `${API_BASE_URL}/promotions/${promotionToEdit?.id}`
      : `${API_BASE_URL}/promotions`;
    const method = isEditing ? 'PATCH' : 'POST';

    console.log(`Submitting to ${method} ${url}`, payload);

    try {
      const response = await fetchWithAuth(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorData;
        let errorMessage = `Request failed with status ${response.status} (${response.statusText})`;
        try {
          errorData = await response.json();
          if (errorData?.error && Array.isArray(errorData.error)) {
            errorMessage = errorData.error
              .map((e: { path: string; message: string }) => `${e.path}: ${e.message}`)
              .join('; ');
          } else if (errorData?.message) {
            errorMessage = errorData.message;
          } else if (errorData?.error && typeof errorData.error === 'string') {
            errorMessage = errorData.error;
          }
        } catch {
          // Ignore
        }
        console.error('API Error Response:', errorData || errorMessage);
        throw new Error(errorMessage);
      }

      const resultPromotion: Promotion = await response.json();
      console.log('API Success Response:', resultPromotion);
      onSuccess(resultPromotion);
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
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800 m-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 rounded-full p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-200"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" aria-hidden="true" /> 
        </button>

        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          {isEditing ? 'Edit Promotion' : 'Create New Promotion'}
        </h2>

        {apiError && (
          <div
            className="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700 dark:bg-red-900 dark:border-red-700 dark:text-red-200"
            role="alert"
          >
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{apiError}</span>
          </div>
        )}

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
              type="datetime-local"
              id="startTime"
              name="startTime"
              value={formData.startTime}
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
              End Time
            </label>
            <input
              type="datetime-local"
              id="endTime"
              name="endTime"
              // Bind directly to the formatted string in formData
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
              step="0.01"
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
              Bonus Rate
            </label>
            <input
              type="number"
              id="rate"
              name="rate"
              min="0"
              step="0.01"
              value={formData.rate}
              onChange={handleChange}
              required
              disabled={isSubmitting}
              className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-600 dark:focus:border-blue-600 disabled:opacity-50"
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
              step="1"
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
