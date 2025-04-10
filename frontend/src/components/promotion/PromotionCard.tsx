import React, { useState } from 'react';
import { Pencil, Trash2, QrCode, X } from 'lucide-react'; // Added QrCode and X icons
import { useUser } from '../../context/UserContext';
import { QRCodeSVG } from 'qrcode.react'; // Added QRCodeSVG import

interface PromotionCardProps {
  id: number;
  name: string;
  type: 'automatic' | 'one-time';
  startTime: string;
  endTime?: string;
  minSpending: number;
  rate: number;
  points: number;
  description: string;
  onEdit: () => void;
  onClick: () => void; 
  onDelete: () => void; // Optional delete function
}

export default function PromotionsCard({
  id,
  name,
  type,
  startTime,
  endTime,
  minSpending,
  rate,
  points,
  description,
  onEdit,
  onClick, // Use this prop for card click
  onDelete, // Delete function
}: PromotionCardProps) {
  // Add state for QR modal
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  
  // Format date to display "Month Day, Year"
  const formatDate = (dateString: string): string => {
    const date: Date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const currentUserRole = useUser().userData?.role;
  const bonusPercentage = Math.round(rate * 100);
  const tagColorClass =
    type === 'automatic' ? 'bg-blue-400' : 'bg-yellow-400';

  // Generate QR code value from promotion data
  const qrCodeValue = {
    id,
    name,
    type,
    rate,
    points
  };

  // Prevent button clicks from triggering card click
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Stops click from bubbling up to the card
    onEdit();
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevents the card click event from firing
    onDelete();
  };
  
  // QR code button handlers
  const handleQRClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevents the card click event from firing
    setIsQRModalOpen(true);
  };
  
  const closeQRModal = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsQRModalOpen(false);
  };

  return (
    <>
      {/* Card container triggers the onClick view details */}
      <div
        onClick={onClick}
        className="flex relative z-0 cursor-pointer flex-col overflow-hidden rounded-lg bg-white shadow-md transition-shadow duration-200 hover:shadow-lg dark:bg-gray-800 aspect-square"
      >
        {/* Header */}
        <div className="relative h-28 flex-shrink-0 bg-slate-600 p-4 dark:bg-slate-500">
          {/* Edit button container handles edit click only for manager+ */}
          {(currentUserRole === "MANAGER" || currentUserRole === "SUPERUSER") && (
            <div
              className="absolute right-2 top-2 z-10 cursor-pointer rounded-md bg-white p-2 hover:bg-gray-100 dark:bg-gray-200 dark:hover:bg-gray-300"
              onClick={handleEditClick} 
              title="Edit Promotion"
              aria-label="Edit Promotion"
            >
              <Pencil className="text-gray-600 dark:text-gray-800" size={16} />
            </div>
          )}

          {/* Min Spending Tag */}
          {minSpending > 0 && (
            <div className="absolute top-2 left-2 rounded-md bg-white px-2 py-1 text-xs font-medium text-gray-800 dark:bg-gray-600 dark:text-white">
              min: ${minSpending.toFixed(2)}
            </div>
          )}
          {/* Type Tag */}
          <div
            className={`absolute bottom-2 left-2 rounded-md px-3 py-1 text-sm font-medium text-white ${tagColorClass}`}
          >
            {type === 'automatic' ? 'Automatic' : 'One time'}
          </div>

          {/* Delete Button */}
          {(currentUserRole === "MANAGER" || currentUserRole === "SUPERUSER") && (
            <div
              className="absolute right-2 bottom-2 z-10 cursor-pointer rounded-md bg-white p-2 hover:bg-gray-100 dark:bg-gray-200 dark:hover:bg-gray-300"
              onClick={handleDeleteClick} 
              title="Delete Promotion"
              aria-label="Delete Promotion"
            >
              <Trash2 className="text-gray-600 dark:text-gray-800" size={16} />
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-grow flex-col bg-white p-4 dark:bg-gray-700">
          <div className="flex-grow">
            {/* Title */}
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              {name}
            </h2>
            {/* Description */}
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {description.length > 30
                ? description.substring(0, 30) + '...'
                : description}
            </p>
            {/* Date Info */}
            <div className="mt-3 text-xs">
              <div className="flex items-center text-gray-600 dark:text-gray-300">
                <span className="font-medium">Starting:</span>
                <span className="ml-1">{formatDate(startTime)}</span>
              </div>
              {endTime && (
                <div className="flex items-center text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Ending:</span>
                  <span className="ml-1">{formatDate(endTime)}</span>
                </div>
              )}
            </div>
          </div>
          {/* QR Code Button */}
          <div
            className="absolute right-2 middle-2 z-10 cursor-pointer rounded-md bg-gray-300 p-2 hover:bg-gray-100 dark:bg-gray-200 dark:hover:bg-gray-300"
            onClick={handleQRClick} 
            title="Show QR Code"
            aria-label="Show QR Code"
          >
            <QrCode className="text-gray-600 dark:text-gray-800" size={32} />
          </div>
          {/* Footer Info */}
          <div className="flex items-end justify-between pt-3">
            <div className="font-bold text-blue-600 dark:text-blue-300">
              {bonusPercentage}% Bonus
            </div>
            <div className="text-blue-600 dark:text-blue-300">
              {points} points
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {isQRModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 transition-opacity duration-300 ease-in-out"
          onClick={closeQRModal}
        >
          <div
            className="relative w-full max-w-md mx-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={closeQRModal}
              className="absolute right-6 top-4 rounded-full p-1 text-gray-500 transition hover:bg-gray-200 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-100"
              aria-label="Close QR modal"
            >
              <X size={24} />
            </button>

            {/* Header */}
            <div className="mb-6 border-b border-gray-200 pb-4 dark:border-gray-600">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {name} - QR Code
              </h2>
            </div>

            {/* QR Code Content */}
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded">
                <h1 className="text-2xl font-bold text-center text-gray-800">Promotion ID: {qrCodeValue.id}</h1>
                <h2 className="text-center font-bold mb-2 text-gray-800">{qrCodeValue.name}</h2>
                <QRCodeSVG value={String(qrCodeValue.id)} size={256} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}