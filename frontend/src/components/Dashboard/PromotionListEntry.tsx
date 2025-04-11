import { FaRegStar, FaStar } from "react-icons/fa6";
import { Promotion } from "../../types/";

interface PromotionListEntryProps {
  promotion: Promotion; // Replace "any" with a more specific type if possible
  onClick?: () => void;
}

function PromotionListEntry({ promotion, onClick }: PromotionListEntryProps) {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer flex flex-row bg-white border-t border-gray-300 py-2 hover:bg-gray-200 text-sm dark:bg-slate-600"
    >
      {promotion.type === "automatic" && (
        <FaStar className="text-yellow-500 h-8 w-8 mr-4" />
      )}
      {promotion.type === "one-time" && (
        <FaRegStar className="text-yellow-500 h-8 w-8 mr-4" />
      )}
      <div className="flex flex-col dark:text-white">
        <p>{promotion.name}</p>
        {promotion.type === "automatic" && (
          <p className="text-gray-500 dark:text-white">
            Active until {promotion.endTime.slice(0, 10)}
          </p>
        )}
        {promotion.type === "one-time" && (
          <p className="text-gray-500 dark:text-white">
            Available until {promotion.endTime.slice(0, 10)}
          </p>
        )}
        {promotion.rate > 0 && (
          <p className="text-green-500">
            Gain {promotion.rate * 100}% extra points
          </p>
        )}
        {promotion.points > 0 && (
          <p className="text-green-600">+ {promotion.points} points</p>
        )}
      </div>
    </div>
  );
}

export default PromotionListEntry;
