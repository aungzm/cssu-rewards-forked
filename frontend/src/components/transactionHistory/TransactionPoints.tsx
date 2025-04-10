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
        <div className="bg-white shadow-md rounded-lg p-6 my-4 max-w-4xl w-full">
            <h2 className="text-xl mb-4" style={{ color: "#002A5C" }}> Points Summary</h2>
            
            <div className="flex flex-row justify-around items-center w-full px-10">

                <div className="flex flex-col">
                    <span className="text-2xl text-green-500">{points.positive}</span>
                    <span className="text-mg text-gray-500">Positive Points</span>
                </div>

                <div className="flex flex-col">
                    <span className="text-2xl text-red-500">{points.negative}</span>
                    <span className="text-mg text-gray-500">Negative Points</span>
                </div>

                <div className="flex flex-col">
                    <span className="text-2xl" style={{ color: "#002A5C" }}>{userPoints}</span>
                    <span className="text-mg text-gray-500">Current Balance</span>
                </div>

            </div>

        </div>

    )
}

export default TransactionPoints;