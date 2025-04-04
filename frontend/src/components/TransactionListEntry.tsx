

function TransactionListEntry(props : { transaction: any }) {
    const { transaction } = props;    

    // type = PURCHASE ADJUSTMENT REDEMPTION TRANSFER EVENT
    //createdAt
    //amount
    //relatedId

    return (<div>
        <div></div>

        {transaction.type === "purchase" && <p> Purchased Item </p>}
        {transaction.type === "adjustment" && <p> Adjusted by Manager </p>}
        {transaction.type === "redemption" && <p> Redeemed Item </p>}
        {transaction.type === "transfer" &&  transaction.amount > 0 && <p> Received Points </p>}
        {transaction.type === "transfer" &&  transaction.amount < 0 && <p> Sent Points </p>}
        {transaction.type === "event" && <p> Attended Event </p>}


        <p> {transaction.createdAt.slice(0, 10)} </p>
        {transaction.suspicious && <p> Pending Transaction for {transaction.amount}</p>}
        {!transaction.suspicious && transaction.amount > 0 && <p> Gained  {transaction.amount} </p>}
        {!transaction.suspicious && transaction.amount < 0 && <p>  Lost {transaction.amount} </p>}

        <p> {transaction.relatedId} </p>
    </div>);

}

export default TransactionListEntry;