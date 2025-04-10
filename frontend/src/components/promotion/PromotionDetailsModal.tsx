import { Pencil, X, QrCode } from "lucide-react";
import { useUser } from "../../context/UserContext";
import { Promotion } from "../../types";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

interface PromotionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void; 
  promotion: Promotion | null;
}

// Helper function to format date
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function PromotionDetailsModal({
  isOpen,
  onClose,
  promotion,
  onEdit,
}: PromotionDetailsModalProps) {
  const { userData } = useUser();
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  
  if (!isOpen || !promotion) return null;
  
  const bonusPercentage = Math.round(promotion.rate * 100);
  const tagColorClass =
    promotion.type === 'automatic' ? 'bg-blue-400' : 'bg-yellow-400';
  const typeText = promotion.type === 'automatic' ? 'Automatic' : 'One-Time';
  const isManagerOrHigher = userData?.role === 'MANAGER' || userData?.role === 'SUPERUSER';
  
  // Generate QR code value from promotion data
  const qrCodeValue = {
    id: promotion.id,
    name: promotion.name,
    type: promotion.type,
    rate: promotion.rate,
    points: promotion.points
  };
  
  const openQRModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsQRModalOpen(true);
  };
  
  const closeQRModal = () => {
    setIsQRModalOpen(false);
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 transition-opacity duration-300 ease-in-out"
      onClick={onClose} // Close when clicking backdrop
    >
      {/* Modal Content */}
      <div
        className="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-6 top-4 rounded-full p-1 text-gray-500 transition hover:bg-gray-200 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-100"
          aria-label="Close modal"
        >
          <X size={24} />
        </button>
        
        {/* QR Code Button */}
        <button
          onClick={openQRModal}
          className="absolute left-40 top-6 rounded-full p-1 text-gray-500 transition hover:bg-gray-200 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-100"
          aria-label="Show QR Code"
        >
          <QrCode size={48} />
        </button>
        
        {/* Edit Button */}
        {(isManagerOrHigher) && (
          <button
            onClick={onEdit}
            className="absolute right-6 top-24 mt-2 rounded-full p-1 text-gray-500 transition hover:bg-gray-200 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-100"
            aria-label="Edit promotion"
          >
            <Pencil size={20} />
          </button>
        )}

        {/* Header */}
        <div className="mb-4 border-b border-gray-200 pb-4 dark:border-gray-600">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {promotion.name}
          </h2>
          <span
            className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium text-white ${tagColorClass}`}
          >
            {typeText}
          </span>
        </div>

        {/* Body */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Description
            </h3>
            <p className="mt-1 whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200">
              {promotion.description}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Start Time
              </h3>
              <p className="mt-1 text-gray-800 dark:text-gray-200">
                {formatDate(promotion.startTime)}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                End Time
              </h3>
              <p className="mt-1 text-gray-800 dark:text-gray-200">
                {promotion.endTime ? formatDate(promotion.endTime) : 'Ongoing'}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Minimum Spending
              </h3>
              <p className="mt-1 text-gray-800 dark:text-gray-200">
                {(promotion.minSpending ?? 0) > 0
                  ? `$${(promotion.minSpending ?? 0).toFixed(2)}`
                  : 'None'}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Bonus Rate / Points
              </h3>
              <p className="mt-1 text-gray-800 dark:text-gray-200">
                {bonusPercentage}% / {promotion.points} points
              </p>
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
              className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800"
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
                  Promotion QR Code
                </h2>
              </div>

              {/* QR Code Content */}
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded flex flex-col items-center">
                  <h1 className="text-2xl font-bold text-center text-gray-800">Promotion ID: {qrCodeValue.id}</h1>
                  <h2 className="text-center font-bold mb-2 text-gray-800">{qrCodeValue.name}</h2>
                  <QRCodeSVG value={String(qrCodeValue.id)} size={256} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}