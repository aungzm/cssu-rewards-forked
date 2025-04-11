import { useState } from "react";
import RedemptionCodeModal from "./RedemptionCodeModal";


const RedemptionListEntry = (props: {redemption: any}) => {

    const redemption = props.redemption;

    // Modal for the QR Code for Redemptions
    const [isRedemptionModalOpen, setIsRedemptionModalOpen] = useState(false);
    const [modalRedemption, setModalRedemption] = useState<any>(null);

    // Function to handle the clicking on the transaction
    const handleRedemptionClick = () => {
        setIsRedemptionModalOpen(true);
        setModalRedemption(redemption);
    }
    
    // Function to handle the closing of the modal
    const handleRedemptionClose = () => {
        setIsRedemptionModalOpen(false);
        setModalRedemption(null);
    }

    return (
         <div className="flex flex-row bg-white border-t border-gray-300 py-2 hover:bg-gray-200 justify-between items-center dark:bg-slate-600">

            {/* Modal for the QR Code for Redemptions */}
            <div>
                <RedemptionCodeModal isOpen={isRedemptionModalOpen} 
                onClose={handleRedemptionClose}
                redemption={modalRedemption}/>
            </div>

            {/* Redemption Content */}
            <div className="flex flex-col">
                {redemption.operatorId === null && (
                    <div>
                        <p className="text-gray-500 dark:text-white"> Pending Redemption</p>
                        <p className="text-gray-500 dark:text-white"> {redemption.amount} Points</p>
                    </div>
                )}
                
                {redemption.operatorId !== null && (
                    <div>
                        <p> Completed Redemption</p>
                        <p className="text-green-500 dark:text-white"> {redemption.amount} Points</p>
                    </div>
                )}
            </div>
        
            <button className="bg-[#0063C6] text-white text-sm border border-[#0063C6] rounded-sm px-2 py-2 mx-2 hover:bg-blue-500 text-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600"
            onClick={handleRedemptionClick}> View </button>        

        </div>
    )
}

export default RedemptionListEntry;