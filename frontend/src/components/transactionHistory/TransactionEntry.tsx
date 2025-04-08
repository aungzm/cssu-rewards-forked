
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
    };
}


const TransactionEntry: React.FC<TransactionEntryProps> = ({
    transaction
}) => {

    console.log("Transaction Entry: ", transaction);
    
    return (<>
    </>)
}

export default TransactionEntry;