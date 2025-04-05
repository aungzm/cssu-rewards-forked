// Component for each entry in the Upcoming Promotions list for the Dashboard
import { FaRegStar, FaStar } from "react-icons/fa6";


function PromotionListEntry(props : { promotion: any }) {
    const { promotion } = props;
    return (<div className="flex flex-row bg-white border-t border-gray-300 py-2  hover:bg-gray-200 text-sm">

        {/* Icon */}
        {promotion.type === "automatic" && <FaStar className="text-yellow-500 h-8 w-8 mr-4 " />}
        {promotion.type === "one-time" && <FaRegStar className="text-yellow-500 h-8 w-8 mr-4" />}

        <div className="flex flex-col ">
            <p> {promotion.name}</p>
            {/* {promotion.type === "automatic" && <p> Automatic Promotion </p>}
            {promotion.type === "one-time" && <p> One-Time Promotion </p>} */}

            {promotion.type === "automatic" &&
                <p className="text-gray-500"> Active until {promotion.endTime.slice(0, 10)}</p>
            }
            {promotion.type === "one-time" &&
                <p className="text-gray-500"> Available until {promotion.endTime.slice(0, 10)}</p>
            }

            {promotion.rate > 0 && 
                <p className="text-green-500"> Gain {promotion.rate * 100} % extra points</p>
            }

            {promotion.points > 0 &&
                <p className="text-green-600"> + {promotion.points} points</p>
            } 
            
        </div>
        
    </div>)
}

export default PromotionListEntry;