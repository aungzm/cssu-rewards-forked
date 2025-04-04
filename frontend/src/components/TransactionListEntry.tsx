

function TransactionListEntry(props : { transaction: any }) {
    const { transaction } = props;

    const handleClick = () => {
        console.log("Clicked",transaction.type);
    }
    // console.log(transaction);

    // type = PURCHASE ADJUSTMENT REDEMPTION TRANSFER EVENT
    //createdAt
    //amount
    //relatedId


    return (<div className="flex flex-row bg-white border-t border-gray-300 py-2 justify-between items-center"
    onClick={handleClick}>
        {/* <div></div>  */}

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
        
    </div>);

}

export default TransactionListEntry;