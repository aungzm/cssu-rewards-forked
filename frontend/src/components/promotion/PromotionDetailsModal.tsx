import { Pencil, X } from "lucide-react";
import { useUser } from "../../context/UserContext";

interface PromotionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void; 
  promotion: Promotion | null;
}

interface Promotion {
  id: number;
    name: string;
    description: string;
    type: 'automatic' | 'one-time';
    rate: number;
    points: number;
    minSpending: number;
    startTime: string;
    endTime: string | null;
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
  if (!isOpen || !promotion) return null;
  const bonusPercentage = Math.round(promotion.rate * 100);
  const tagColorClass =
    promotion.type === 'automatic' ? 'bg-blue-400' : 'bg-yellow-400';
  const typeText = promotion.type === 'automatic' ? 'Automatic' : 'One-Time';
  const isManagerOrHigher = userData?.role === 'MANAGER' || userData?.role === 'SUPERUSER';

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
          < X size={24} />
        </button>
        {/* Edit Button */}
        {(isManagerOrHigher) && (<button
          onClick={onEdit}
          className="absolute right-6 top-24 mt-2 rounded-full p-1 text-gray-500 transition hover:bg-gray-200 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-100"
          aria-label="Close modal"
        >
          < Pencil size={20} />
        </button>)}

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
                {promotion.minSpending > 0
                  ? `$${promotion.minSpending.toFixed(2)}`
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
      </div>
    </div>
  );
}
