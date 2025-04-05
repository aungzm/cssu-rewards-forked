

const RedemptionListEntry = (props: {redemption: any}) => {

    const redemption = props.redemption;
    console.log(redemption)

    return (
         <div className="flex flex-col bg-white border-t border-gray-300 py-2  hover:bg-gray-200">
            {redemption.operatorId === null && (
                <div>
                    <p className="text-gray-500"> Pending Redemption</p>
                    <p className="text-gray-500"> {redemption.amount} Points</p>
                </div>
            )}
            
            {redemption.operatorId !== null && (
                <div>
                    <p> Completed Redemption</p>
                    <p className="text-green-500"> {redemption.amount} Points</p>
                </div>
            )}
    
        </div>
    )
}

export default RedemptionListEntry;