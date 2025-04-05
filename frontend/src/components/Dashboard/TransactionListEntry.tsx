// Component for each entry in the Recent Transactions list for the Dashboard
import { HiOutlineArrowUpCircle, HiOutlineArrowDownCircle, HiOutlinePlusCircle, HiOutlineMinusCircle } from "react-icons/hi2";



function TransactionListEntry(props : { transaction: any }) {
    const { transaction } = props;

    const handleClick = () => {
        // TODO Link to Redeem Transaction Popup
    }


    return (
    <div className="flex flex-row bg-white border-t border-gray-300 py-2 hover:bg-gray-200"
    onClick={handleClick}>

        {/* Icon */}
        <div className="flex items-center justify-center mr-4">
            {(() => {
                    if (transaction.suspicious || (transaction.type === "redemption" && transaction.operatorId === null)) {
                        return <HiOutlineMinusCircle className="text-gray-500 h-8 w-8" />;

                    } else if (transaction.type === "redemption" && transaction.operatorId !== null) {
                        return <HiOutlineMinusCircle className="text-red-500 h-8 w-8" />;

                    } else if (transaction.type === "purchase") {
                        return <HiOutlinePlusCircle className="text-green-500 h-8 w-8" />;

                    } else if (transaction.type === "adjustment") {
                        return <HiOutlineArrowUpCircle className="text-green-500 h-8 w-8" />;

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

        {/* Main Entry */}
        <div className="justify-between items-center flex w-full">

            <div className="flex flex-col">
                {/* Print out title based on type*/}
                {transaction.type === "purchase" && <p> Purchased Item </p>}
                {transaction.type === "adjustment" && <p> Adjusted by Manager </p>}
                {transaction.type === "redemption" && <button className="hover:underline"> Redeemed Points </button>}
                {transaction.type === "transfer" &&  transaction.amount > 0 && <p> Received Points from Transfer</p>}
                {transaction.type === "transfer" &&  transaction.amount < 0 && <p> Sent Points in Transfer </p>}
                {transaction.type === "event" && <p> Attended Event </p>}


                <p className="text-gray-500"> {transaction.createdAt.slice(0, 10)} </p> {/* Given a Time "2000-01-01T00:00:00.000Z", extract date */}
            </div>
            
            {/* Show the number of points with the appropriate colouring*/}
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
    </div>);

}

export default TransactionListEntry;