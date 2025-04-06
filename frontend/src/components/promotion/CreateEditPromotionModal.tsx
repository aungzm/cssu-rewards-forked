import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchWithAuth } from '../../utils/authHelper';
import { API_BASE_URL } from '../../utils/auth';
import { X } from 'lucide-react';

interface Promotion {
  id: number;
  name: string;
  type: PromotionType;
  startTime: string; // ISO String
  endTime: string | null; // ISO String or null
  minSpending: number;
  rate: number;
  points: number;
  description: string;
}

type PromotionType = 'oneTime' | 'automatic';

// Had to use because id is not always present in the API response
interface PromotionPayload {
  name?: string;
  description?: string;
  type?: PromotionType;
  startTime?: string;
  endTime?: string;
  minSpending?: number;
  rate?: number;
  points?: number;
}

interface CreateEditPromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  promotionToEdit?: Promotion | null; // null if creating a new promotion
  onSuccess: (updatedPromotion?: Promotion) => void; 
}

// Helper to format ISO string for datetime-local input
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

// Helper to format datetime-local input value to ISO string (UTC)
const formatInputToISO = (inputDateTime: string): string | null => {
  if (!inputDateTime) return null;
  try {
    return new Date(inputDateTime).toISOString();
  } catch (e) {
    console.error('Error formatting input date to ISO:', e);
    return null;
  }
};

const CreateEditPromotionModal: React.FC<CreateEditPromotionModalProps> = ({
  isOpen,
  onClose,
  promotionToEdit,
  onSuccess,
}) => {
  const isEditMode = useMemo(() => !!promotionToEdit, [promotionToEdit]);
  const initialFormData = useMemo(() => {
    return {
      name: promotionToEdit?.name ?? '',
      description: promotionToEdit?.description ?? '',
      type: promotionToEdit?.type ?? 'oneTime',
      startTime: formatISOForInput(promotionToEdit?.startTime),
      endTime: formatISOForInput(promotionToEdit?.endTime),
      minSpending: promotionToEdit?.minSpending ?? 0,
      rate: promotionToEdit?.rate ?? 0,
      points: promotionToEdit?.points ?? 0,
    };
  }, [promotionToEdit]);

  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Reset form when modal opens/closes or promotionToEdit changes
  useEffect(() => {
    if (isOpen) {
      setFormData(initialFormData);
      setErrors({});
      setApiError(null);
      setIsLoading(false);
    }
  }, [isOpen, initialFormData]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;
    let processedValue: string | number = value;
    if (
      type === 'number' &&
      (name === 'minSpending' || name === 'rate' || name === 'points')
    ) {
      processedValue = value === '' ? '' : parseFloat(value);
      if (isNaN(processedValue as number)) {
        processedValue = '';
      }
    }
    setFormData((prev) => ({ ...prev, [name]: processedValue }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};
    const now = new Date();
    const startTimeDate = formData.startTime
      ? new Date(formData.startTime)
      : null;
    const endTimeDate = formData.endTime ? new Date(formData.endTime) : null;

    if (!formData.name.trim()) newErrors.name = 'Name is required.';
    if (!formData.description.trim())
      newErrors.description = 'Description is required.';
    if (!formData.type) newErrors.type = 'Type is required.';

    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required.';
    } else if (!isEditMode && startTimeDate && startTimeDate < now) {
      newErrors.startTime = 'Start time cannot be in the past.';
    }

    if (!formData.endTime) {
      newErrors.endTime = 'End time is required.';
    } else if (startTimeDate && endTimeDate && endTimeDate <= startTimeDate) {
      newErrors.endTime = 'End time must be after start time.';
    }

    if (
        (typeof formData.minSpending === 'string' && formData.minSpending === '') ||
        (typeof formData.minSpending === 'number' && formData.minSpending < 0)
      ) {
        newErrors.minSpending = 'Minimum spending must be a positive number.';
      }
      if (
        (typeof formData.rate === 'string' && formData.rate !== '' && Number(formData.rate) < 0) ||
        (typeof formData.rate === 'number' && formData.rate < 0)
      ) {
        newErrors.rate = 'Rate must be a positive number.';
      }
    if (typeof formData.points === 'number' && (formData.points < 0 || !Number.isInteger(formData.points))) {
        newErrors.points = 'Points must be a positive whole number.';
    }

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
}, [formData, isEditMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!validateForm()) {
      return;
    }

    

    const startTimeISO = formatInputToISO(formData.startTime);
    const endTimeISO = formatInputToISO(formData.endTime);

    if (!startTimeISO || !endTimeISO) {
      setApiError('Invalid date format detected. Please check start/end times.');
      setIsLoading(false);
      return;
    }

    let payload: PromotionPayload = {};
    const method = isEditMode ? 'PATCH' : 'POST';
    const url = isEditMode
      ? `${API_BASE_URL}/promotions/${promotionToEdit?.id}`
      : `${API_BASE_URL}/promotions`;

    if (isEditMode) {
      if (formData.name !== initialFormData.name) payload.name = formData.name;
      if (formData.description !== initialFormData.description)
        payload.description = formData.description;
      if (formData.type !== initialFormData.type) payload.type = formData.type;
      // Compare ISO strings for dates
      if (startTimeISO !== formatInputToISO(initialFormData.startTime))
        payload.startTime = startTimeISO;
      if (endTimeISO !== formatInputToISO(initialFormData.endTime))
        payload.endTime = endTimeISO;

      const minSpendingNum =
      typeof formData.minSpending === 'string' && formData.minSpending === '' ? 0 : Number(formData.minSpending);
      const rateNum = typeof formData.rate === 'string' ? (formData.rate === '' ? 0 : Number(formData.rate)) : formData.rate;
      const pointsNum = typeof formData.points === 'string' ? (formData.points === '' ? 0 : Number(formData.points)) : formData.points;

      if (minSpendingNum !== initialFormData.minSpending)
        payload.minSpending = minSpendingNum;
      if (rateNum !== initialFormData.rate) payload.rate = rateNum;
      if (pointsNum !== initialFormData.points) payload.points = pointsNum;

      if (Object.keys(payload).length === 0) {
        setApiError('No changes detected.');
        setIsLoading(false);
        return;
      }
    } else {
      payload = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        startTime: startTimeISO,
        endTime: endTimeISO,
        minSpending:
        typeof formData.minSpending === 'string' && formData.minSpending === '' ? 0 : Number(formData.minSpending),
        rate: typeof formData.rate === 'string' && formData.rate === '' ? 0 : Number(formData.rate),
        points: typeof formData.points === 'string' && formData.points === '' ? 0 : Number(formData.points),
      };
    }

    try {
      const response = await fetchWithAuth(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const resultData = await response.json();
        alert(
          `Promotion ${isEditMode ? 'updated' : 'created'} successfully!`,
        );
        onSuccess(resultData); // Call success callback with API response data
        onClose();
      } else {
        const errorData = await response.json().catch(() => ({
          message: 'An unknown error occurred.',
        }));
        if (response.status === 400 && errorData?.message) {
          setApiError(`Error: ${errorData.message}`);
        } else if (response.status === 401 || response.status === 403) {
          setApiError('Authorization error. Please check permissions.');
        } else {
          setApiError(
            `Failed to ${
              isEditMode ? 'update' : 'create'
            } promotion. Server responded with status ${response.status}. ${
              errorData.message || ''
            }`,
          );
        }
        console.error('API Error:', errorData);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setApiError('An unexpected network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // --- JSX remains the same ---
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg m-4 relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
          aria-label="Close modal"
          disabled={isLoading}
        >
          <X size={24} />
        </button>

        {/* Modal Title */}
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
          {isEditMode ? 'Edit Promotion' : 'Create New Promotion'}
        </h2>

        {/* API Error Display */}
        {apiError && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
            {apiError}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Promotion Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 ${
                  errors.name
                    ? 'border-red-500 dark:border-red-400'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {errors.name}
                </p>
              )}
            </div>

            {/* Type */}
            <div>
              <label
                htmlFor="type"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Type <span className="text-red-500">*</span>
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 ${
                  errors.type
                    ? 'border-red-500 dark:border-red-400'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                disabled={isLoading}
              >
                <option value="oneTime">One Time</option>
                <option value="automatic">Automatic</option>
              </select>
              {errors.type && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {errors.type}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="mb-4">
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              required
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 ${
                errors.description
                  ? 'border-red-500 dark:border-red-400'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              disabled={isLoading}
            />
            {errors.description && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {errors.description}
              </p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Start Time */}
            <div>
              <label
                htmlFor="startTime"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                id="startTime"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                required
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:[color-scheme:dark] ${
                  errors.startTime
                    ? 'border-red-500 dark:border-red-400'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                disabled={isLoading}
              />
              {errors.startTime && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {errors.startTime}
                </p>
              )}
            </div>

            {/* End Time */}
            <div>
              <label
                htmlFor="endTime"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                End Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                id="endTime"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                required
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:[color-scheme:dark] ${
                  errors.endTime
                    ? 'border-red-500 dark:border-red-400'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                disabled={isLoading}
                min={formData.startTime || undefined}
              />
              {errors.endTime && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {errors.endTime}
                </p>
              )}
            </div>
          </div>

          {/* Numeric Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Min Spending */}
            <div>
              <label
                htmlFor="minSpending"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Min Spending ($)
              </label>
              <input
                type="number"
                id="minSpending"
                name="minSpending"
                value={formData.minSpending}
                onChange={handleChange}
                min="0"
                step="0.01"
                placeholder="e.g., 50.00"
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 ${
                  errors.minSpending
                    ? 'border-red-500 dark:border-red-400'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                disabled={isLoading}
              />
              {errors.minSpending && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {errors.minSpending}
                </p>
              )}
            </div>

            {/* Rate */}
            <div>
              <label
                htmlFor="rate"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Bonus Rate
              </label>
              <input
                type="number"
                id="rate"
                name="rate"
                value={formData.rate}
                onChange={handleChange}
                min="0"
                step="0.01"
                placeholder="e.g., 0.05 for 5%"
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 ${
                  errors.rate
                    ? 'border-red-500 dark:border-red-400'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                disabled={isLoading}
              />
              {errors.rate && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {errors.rate}
                </p>
              )}
            </div>

            {/* Points */}
            <div>
              <label
                htmlFor="points"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Bonus Points
              </label>
              <input
                type="number"
                id="points"
                name="points"
                value={formData.points}
                onChange={handleChange}
                min="0"
                step="1"
                placeholder="e.g., 100"
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 ${
                  errors.points
                    ? 'border-red-500 dark:border-red-400'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                disabled={isLoading}
              />
              {errors.points && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {errors.points}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 border-t border-gray-200 dark:border-gray-700 pt-4">
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
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading
                ? 'Saving...'
                : isEditMode
                  ? 'Save Changes'
                  : 'Create Promotion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEditPromotionModal;
