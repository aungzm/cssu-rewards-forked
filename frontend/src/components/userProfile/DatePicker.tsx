import React from 'react';

interface DatePickerInputProps {
  selectedDate: Date | undefined;
  onDateChange: (date: Date) => void;
  onBlur: () => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
}

const DatePickerInput: React.FC<DatePickerInputProps> = ({
  selectedDate,
  onDateChange,
  onBlur,
  onKeyDown,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  return (
    <input
      type="date"
      value={selectedDate ? selectedDate.toISOString().slice(0, 10) : ''}
      onChange={(e) => {
        const newDate = new Date(e.target.value);
        if (!isNaN(newDate.getTime())) {
          onDateChange(newDate);
        }
      }}
      onBlur={onBlur} 
      onKeyDown={handleKeyDown}
      className="ml-2 flex-1 text-lg bg-transparent border-b-2 border-gray-300 dark:border-gray-500 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
      autoFocus 
    />
  );
};

export default DatePickerInput;
