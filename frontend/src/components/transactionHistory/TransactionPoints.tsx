
interface TransactionPointsProps {
    transactions: {
        id: number;
        type: string;
        amount: number;
        suspicious: boolean;
        createdAt: string | null;
    }[];
}

const TransactionPoints: React.FC<TransactionPointsProps> = ({
    transactions
}) => {

    console.log("Transaction Points: ", transactions);

    const points = transactions.reduce((acc, transaction) => {
        if ((transaction.type === "redemption" && transaction.createdBy !== null) && !transaction.suspicious) {
            if (transaction.amount > 0) {
                acc.positive += transaction.amount;
            } else {
                acc.negative += transaction.amount;
            }
            acc.total += transaction.amount;
        }
        return acc;

    }, { positive: 0, negative: 0, total: 0 });

    console.log("Transaction Points: ", points);


    return (
        <div className="bg-white shadow-md rounded-lg p-6 mb-4">
            <h2 className="text-xl font-semibold mb-4"> Points Summary</h2>
            
            <div className="flex flex-row justify-between items-center">

                <div className="flex flex-col">
                    <span className="text-lg font-bold">Current Balance</span>
                    <span className="text-2xl font-bold">{points.total}</span>
                </div>

                <div className="flex flex-col">
                    <span className="text-lg font-bold">Positive Points</span>
                    <span className="text-2xl font-bold text-green-500">{points.positive}</span>
                </div>

                <div className="flex flex-col">
                    <span className="text-lg font-bold">Negative Points</span>
                    <span className="text-2xl font-bold text-red-500">{points.negative}</span>
                </div>


            </div>

        </div>

    )
}

export default TransactionPoints;