import React from "react";
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
    const getTransactionIcon = () => {
        if (transaction.suspicious || (transaction.type === "redemption" && transaction.operatorId === null)) {
            return <HiOutlineMinusCircle className="text-gray-500 h-6 w-6 md:h-8 md:w-8 dark:text-white" />;
        } else if (transaction.type === "redemption" && transaction.operatorId !== null) {
            return <HiOutlineMinusCircle className="text-red-500 h-6 w-6 md:h-8 md:w-8" />;
        } else if (transaction.type === "purchase") {
            return <HiOutlinePlusCircle className="text-green-500 h-6 w-6 md:h-8 md:w-8" />;
        } else if (transaction.type === "adjustment" && transaction.amount > 0) {
            return <HiOutlineArrowUpCircle className="text-green-500 h-6 w-6 md:h-8 md:w-8" />;
        } else if (transaction.type === "adjustment" && transaction.amount < 0) {
            return <HiOutlineArrowDownCircle className="text-red-500 h-6 w-6 md:h-8 md:w-8" />;
        } else if (transaction.type === "transfer" && transaction.amount > 0) {
            return <HiOutlineArrowUpCircle className="text-green-500 h-6 w-6 md:h-8 md:w-8" />;
        } else if (transaction.type === "transfer" && transaction.amount < 0) {
            return <HiOutlineArrowDownCircle className="text-red-500 h-6 w-6 md:h-8 md:w-8" />;
        } else if (transaction.type === "event") {
            return <HiOutlinePlusCircle className="text-green-500 h-6 w-6 md:h-8 md:w-8" />;
        }
        return null;
    };

    const getTransactionTitle = () => {
        if (transaction.type === "purchase") return "Purchased Item";
        if (transaction.type === "adjustment") return "Adjusted by Manager";
        if (transaction.type === "redemption") return "Redeemed Points";
        if (transaction.type === "transfer" && transaction.amount > 0) return "Received Points from Transfer";
        if (transaction.type === "transfer" && transaction.amount < 0) return "Sent Points in Transfer";
        if (transaction.type === "event") return "Attended Event";
        return "";
    };

    const getPointsDisplay = () => {
        if (transaction.suspicious || (transaction.type === "redemption" && transaction.operatorId === null)) {
            return <p className="text-gray-500 text-right dark:text-white">{transaction.amount} points (Pending)</p>;
        } else if (transaction.amount > 0) {
            return <p className="text-green-500 text-right font-medium">+{transaction.amount} points</p>;
        } else if (transaction.amount < 0) {
            return <p className="text-red-500 text-right font-medium">{transaction.amount} points</p>;
        } else {
            return <p className="text-gray-500 text-right">0 points</p>;
        }
    };

    const formatDate = (dateStr: string) => {
        return dateStr.slice(0, 10);
    };

    return (
        <div className="bg-white shadow-md rounded-lg p-3 md:p-6 mb-4 dark:bg-slate-600">
            {/* Mobile Layout (vertical) */}
            <div className="md:hidden">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                        <div className="mr-3">{getTransactionIcon()}</div>
                        <p className="font-medium">{getTransactionTitle()}</p>
                    </div>
                    {getPointsDisplay()}
                </div>
                
                <div className="pl-9"> {/* Offset to align with icon */}
                    <div className="flex flex-col text-sm">
                        <div className="flex items-center space-x-2 text-gray-500">
                            <p>{formatDate(transaction.createdAt)}</p>
                            <p>·</p>
                            <p>ID: {transaction.id}</p>
                        </div>
                        {transaction.remarks && (
                            <p className="text-gray-500 mt-1 break-words">{transaction.remarks}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Desktop Layout (horizontal) */}
            <div className="hidden md:flex md:flex-row">
                {/* Icon */}
                <div className="flex items-center justify-center mr-4">
                    {getTransactionIcon()}
                </div>

                <div className="flex justify-between items-center w-full">
                    {/* Content */}
                    <div className="flex flex-col">
                        <p className="font-medium dark:text-white">{getTransactionTitle()}</p>

                        <div className="flex flex-row gap-2 text-gray-500 dark:text-gray-200">
                            <p>{formatDate(transaction.createdAt)}</p>
                            <p>Transaction ID: {transaction.id}</p>
                        </div>
                        
                        {transaction.remarks && (
                            <p className="text-gray-500">{transaction.remarks}</p>
                        )}
                    </div>

                    {/* Points */}
                    {getPointsDisplay()}
                </div>
            </div>
        </div>
    );
};

export default TransactionEntry;