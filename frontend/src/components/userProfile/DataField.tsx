import { Pencil } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { fetchWithAuth } from '../../utils/authHelper';
import { API_BASE_URL } from '../../utils/auth'; 
import PasswordChangeModal from './PasswordChangeModal';
import DatePickerInput from './DatePicker';

interface DataFieldProps {
  fieldName: string;
  fieldContent: string | number;
  isEditable: boolean;
}

const DataField: React.FC<DataFieldProps> = ({
  fieldName,
  fieldContent: initialFieldContent,
  isEditable,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [fieldContent, setFieldContent] = useState(initialFieldContent);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);

  // Add an effect to handle clicks outside the component
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isEditing && 
          fieldRef.current && 
          !fieldRef.current.contains(event.target as Node)) {
        // If we're editing and the click is outside our component
        if (fieldContent !== initialFieldContent) {
          handleSave();
        } else {
          setIsEditing(false);
        }
      }
    }

    // Add the event listener when editing starts
    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    // Clean up the event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing, fieldContent, initialFieldContent]);

  // Add an effect to handle the Escape key globally
  useEffect(() => {
    function handleEscapeKey(event: KeyboardEvent) {
      if (isEditing && event.key === 'Escape') {
        setFieldContent(initialFieldContent);
        setIsEditing(false);
      }
    }

    // Add the event listener when editing starts
    if (isEditing) {
      document.addEventListener('keydown', handleEscapeKey);
    }
    
    // Clean up the event listener
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isEditing, initialFieldContent]);

  const handleClick = () => {
    if (!isEditable) return;
    if (fieldName === 'Password') {
      setIsPasswordModalOpen(true);
    } else {
      setIsEditing(true);
      setFieldContent(initialFieldContent);
      // Focus the input after a short delay to ensure it's rendered
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 10);
    }
  };

  const statusHandler = (status: number, updatedValue: string | number) => {
    setIsEditing(false);
    if (status === 400) {
      if (fieldName === 'Birthday') {
        alert('Birthday must be in YYYY-MM-DD');
      } else if (fieldName === 'Email') {
        alert('Must be a valid UofT email');
      } else {
        alert(`Invalid input for ${fieldName}.`);
      }
      setFieldContent(initialFieldContent);
      return false;
    } else if (status === 200) {
      alert(`${fieldName} successfully updated`);
      setFieldContent(updatedValue);
      return true;
    } else {
      alert(`An unexpected error occurred (Status: ${status})`);
      setFieldContent(initialFieldContent);
      return false;
    }
  };

  const handleSave = () => {
    if (fieldContent === initialFieldContent) {
      setIsEditing(false);
      return;
    }
    const valueToSave = fieldContent;

    fetchWithAuth(`${API_BASE_URL}/users/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ [fieldName.toLowerCase()]: valueToSave }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json().catch(() => null);
          console.error('API Error:', fieldName, errorData);
          statusHandler(res.status, valueToSave);
        } else {
          statusHandler(res.status, valueToSave);
        }
      })
      .catch((error) => {
        console.error('Fetch error:', error);
        alert(`Failed to update ${fieldName}. Please try again.`);
        setFieldContent(initialFieldContent);
        setIsEditing(false);
      });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    console.log('Key pressed:', e.key); // Add this for debugging
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submission
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault(); // Prevent default browser behavior
      setFieldContent(initialFieldContent);
      setIsEditing(false);
    }
  };

  const handleBlur = () => {
    // Add a small delay to allow click events to be processed first
    setTimeout(() => {
      if (isEditing) {
        if (fieldContent !== initialFieldContent) {
          handleSave();
        } else {
          setIsEditing(false);
        }
      }
    }, 100);
  };

  // For Birthday, only convert to a Date if fieldContent is a valid non-empty string.
  const dateValue =
    fieldName === 'Birthday' &&
    typeof fieldContent === 'string' &&
    fieldContent.trim() !== ''
      ? new Date(fieldContent)
      : undefined;

  const baseClasses =
    'rounded-md bg-white dark:bg-gray-700 dark:text-gray-100 row flex flex-row p-2 drop-shadow-lg items-center h-[3rem] w-full';

  return (
    <>
      <div className={baseClasses} ref={fieldRef}>
        <span className="p-2 text-lg font-bold whitespace-nowrap">
          {fieldName}:
        </span>

        {isEditing && fieldName !== 'Password' ? (
          fieldName === 'Birthday' ? (
            // Use the date picker for Birthday field
            <DatePickerInput
              selectedDate={dateValue}
              onDateChange={(date: Date) => {
                setFieldContent(date.toISOString().slice(0, 10));
              }}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
            />
          ) : (
            // Standard text input for other fields
            <input
              ref={inputRef}
              type="text"
              value={fieldContent}
              onChange={(e) => setFieldContent(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              autoFocus
              className="ml-2 flex-1 text-lg bg-transparent border-b-2 border-gray-300 dark:border-gray-500 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
            />
          )
        ) : (
          <span className="ml-2 text-lg truncate overflow-hidden whitespace-nowrap">
            {fieldName === 'Password' ? '********' : fieldContent}
          </span>
        )}

        <button
          type="button"
          className="ml-auto p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleClick}
          aria-label={`Edit ${fieldName}`}
          disabled={!isEditable || (isEditing && fieldName !== 'Password')}
        >
          {isEditable ? (
            <Pencil size={20} />
          ) : (
            <span className="w-[24px] h-[20px] inline-block"></span>
          )}
        </button>
      </div>

      {fieldName === 'Password' && (
        <PasswordChangeModal
          isOpen={isPasswordModalOpen}
          onClose={() => setIsPasswordModalOpen(false)}
        />
      )}
    </>
  );
};

export default DataField;
