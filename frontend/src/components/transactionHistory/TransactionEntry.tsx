import { HiOutlineArrowUpCircle, HiOutlineArrowDownCircle, HiOutlinePlusCircle, HiOutlineMinusCircle } from "react-icons/hi2";


interface TransactionEntryProps {
    transaction: {
        id: number;
        type: string;
        amount: number;
        spent: number;
        createdAt: string;
        remarks: string;
        suspicious: boolean;
        relatedId: number | null;
        operatorId: number | null;
    };
}


const TransactionEntry: React.FC<TransactionEntryProps> = ({
    transaction
}) => {

    
    return (
        <div className="bg-white shadow-md rounded-lg p-6 mb-4 flex flex-row">

            {/* Icon */}
            <div className="flex items-center justify-center mr-4">
                {(() => {
                    if (transaction.suspicious || (transaction.type === "redemption" && transaction.operatorId === null)) {
                        return <HiOutlineMinusCircle className="text-gray-500 h-8 w-8" />;

                    } else if (transaction.type === "redemption" && transaction.operatorId !== null) {
                        return <HiOutlineMinusCircle className="text-red-500 h-8 w-8" />;

                    } else if (transaction.type === "purchase") {
                        return <HiOutlinePlusCircle className="text-green-500 h-8 w-8" />;

                    } else if (transaction.type === "adjustment" && transaction.amount > 0) {
                        return <HiOutlineArrowUpCircle className="text-green-500 h-8 w-8" />;

                    } else if (transaction.type === "adjustment" && transaction.amount < 0) {
                        return <HiOutlineArrowDownCircle className="text-red-500 h-8 w-8" />;
                    
                    } else if (transaction.type === "transfer" && transaction.amount > 0) {
                        return <HiOutlineArrowUpCircle className="text-green-500 h-8 w-8" />;

                    }
                    else if (transaction.type === "transfer" && transaction.amount < 0) {
                        return <HiOutlineArrowDownCircle className="text-red-500 h-8 w-8" />;
                    }
                    else if (transaction.type === "event") {
                        return <HiOutlinePlusCircle className="text-green-500 h-8 w-8" />;
                    }
            })()}
            </div>

            <div className="justify-between items-center flex w-full">

                {/* Content */}
            <div className="flex flex-col">
                {/* Print out title based on type*/}
                {transaction.type === "purchase" && <p> Purchased Item </p>}
                {transaction.type === "adjustment" && <p> Adjusted by Manager </p>}
                {transaction.type === "redemption" && <p> Redeemed Points </p>}
                {/* {transaction.type === "redemption" && <button className="hover:underline" onClick={handleRedemptionClick}> Redeemed Points </button>} */}
                {transaction.type === "transfer" &&  transaction.amount > 0 && <p> Received Points from Transfer</p>}
                {transaction.type === "transfer" &&  transaction.amount < 0 && <p> Sent Points in Transfer </p>}
                {transaction.type === "event" && <p> Attended Event </p>}


                <div className="flex flex-row gap-2">
                    <p className="text-gray-500"> {transaction.createdAt.slice(0, 10)} </p>
                    <p className="text-gray-500"> Transaction ID: {transaction.id} </p>

                </div>
                {transaction.remarks && <p className="text-gray-500"> {transaction.remarks} </p>}

            </div>

            {/* Points */}
            {(() => {
                if (transaction.suspicious || (transaction.type === "redemption" && transaction.operatorId === null)) {
                    return <p className="text-gray-500">{transaction.amount} points (Pending)</p>;
                } else if (transaction.amount > 0) {
                    return <p className="text-green-500">+{transaction.amount} points</p>;
                } else if (transaction.amount < 0) {
                    return <p className="text-red-500">{transaction.amount} points</p>;
                } else {
                    return <p className="text-gray-500">{transaction.amount} 0</p>
                }
            })()}


            </div>
            

        </div>

    )
}

export default TransactionEntry;