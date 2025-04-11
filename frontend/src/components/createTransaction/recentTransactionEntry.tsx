import React from "react";

interface RecentTransactionEntryProps {
    transaction:{
        id: number;
        type: string;
        amount: number;
        operatorId: number;
        createdAt: string;
    }
    
}


const RecentTransactionEntry: React.FC<RecentTransactionEntryProps> = 
(transactionEntry) => {

    const transaction = transactionEntry.transaction;
    
    return (
        <div className="flex flex-row py-2 justify-between items-center">
        
            <div className="flex flex-col">
                {transaction.type === "transfer" && transaction.amount > 0 &&(
                    <p>Received Transfer</p>
                    
                )}

                {transaction.type === "transfer" && transaction.amount < 0 &&(
                    <p>Sent Transfer</p>
                    
                )}

                {transaction.type === "redemption" && (
                    <p>Redeemed Points</p>
                )}

                <p className="text-gray-500 dark:text-gray-300">
                    {transaction.createdAt.slice(0, 10)}
                </p>

            </div>

            {transaction.type === "transfer" && transaction.amount > 0 &&(
                    <p className="text-green-500">{transaction.amount} Points</p>
                    
            )}

            {transaction.type === "transfer" && transaction.amount < 0 &&(
                <p className="text-red-500">{transaction.amount} Points</p>
                
            )}

            {transaction.type === "redemption" && transaction.operatorId === null && (
                <p className="text-gray-500 dark:text-gray-300"> (Pending) {transaction.amount} Points </p>
            )}

            {transaction.type === "redemption" && transaction.operatorId !== null && (
                <p className="text-red-500"> {transaction.amount} Points </p>
            )}

        </div>
    )
}

export default RecentTransactionEntry;