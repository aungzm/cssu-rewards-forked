// Component for each entry in the Upcoming Promotions list for the Dashboard


function PromotionListEntry(props : { promotion: any }) {
    const { promotion } = props;
    console.log(promotion);
    return (<div className="flex flex-row bg-white border-t border-gray-300 py-2  hover:bg-gray-200 text-sm">

        <div></div>

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
                <p> Gain {promotion.rate * 100} % extra points</p>
            }

            {promotion.points > 0 &&
                <p> + {promotion.points} points</p>
            } 
            
        </div>
        
    </div>)
}

export default PromotionListEntry;