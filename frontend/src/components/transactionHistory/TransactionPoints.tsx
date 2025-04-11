interface TransactionPointsProps {
    transactions: {
        id: number;
        type: string;
        amount: number;
        suspicious: boolean;
        createdAt: string | null;
        operatorId: number | null;
    }[];
    userPoints: number;
}

const TransactionPoints: React.FC<TransactionPointsProps> = ({
    transactions, userPoints
}) => {
    const points = transactions.reduce((acc, transaction) => {
        if (!((transaction.type === "redemption" && transaction.operatorId === null) || transaction.suspicious)) {
            if (transaction.amount > 0) {
                acc.positive += transaction.amount;
            } else {
                acc.negative += transaction.amount;
            }
        }
        return acc;
    }, { positive: 0, negative: 0});
    
    return (
        <div className="bg-white shadow-md rounded-lg p-4 sm:p-6 my-4 w-full dark:bg-slate-600">
            <h2 className="text-lg sm:text-xl mb-4 text-center sm:text-center text-[#002A5C] dark:text-white" >Points Summary</h2>
           
            <div className="flex flex-col sm:flex-row justify-around items-center w-full px-2 sm:px-10 space-y-4 sm:space-y-0">
                <div className="flex flex-col items-center sm:items-start">
                    <span className="text-xl sm:text-2xl text-green-500">{points.positive}</span>
                    <span className="text-sm sm:text-base text-gray-500 dark:text-gray-300">Positive Points</span>
                </div>
                <div className="flex flex-col items-center sm:items-start">
                    <span className="text-xl sm:text-2xl text-red-500">{points.negative}</span>
                    <span className="text-sm sm:text-base text-gray-500 dark:text-gray-300">Negative Points</span>
                </div>
                <div className="flex flex-col items-center sm:items-start">
                    <span className="text-xl sm:text-2xl text-[#002A5C] dark:text-white">{userPoints}</span>
                    <span className="text-sm sm:text-base text-gray-500 dark:text-gray-300">Current Balance</span>
                </div>
            </div>
        </div>
    )
}

export default TransactionPoints;