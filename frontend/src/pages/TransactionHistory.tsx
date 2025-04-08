import {useEffect, useState} from 'react';
import Navbar from '../components/Navbar';
import TransactionPoints from '../components/transactionHistory/TransactionPoints';
import TransactionEntry from '../components/transactionHistory/TransactionEntry';
import { API_BASE_URL } from '../utils/auth';
import { fetchWithAuth } from '../utils/authHelper';


interface Transaction {
    id: number;
    type: string;
    amount: number;
    spent: number;
    createdAt: string;
    remarks: string;
    suspicious: boolean;
    relatedId: number | null;
    createdBy: String | null;
}


const TransactionHistory: React.FC = () => {
    const [transactionHistory, setTransactionHistory] = useState<Transaction[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);


    const fetchTransactionHistory = async (url: string, page: number) => {
        try {
            const response = await fetchWithAuth(url + `?page=${page}&limit=10`, {});
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            setTransactionHistory(data.results);

        } catch (error) {
            console.error('Error fetching transaction history:', error);
        }
    } 

    useEffect(() => {
        fetchTransactionHistory(`${API_BASE_URL}/users/me/transactions`, 1);
    }, []);
        

    return (
    <>
        <Navbar activeLink="dashboard" />
        <div className='bg-gray-100 min-h-screen flex flex-col items-center '>

            <div className="mx-auto flex flex-col justify-center">
                <h1 className="text-3xl font-bold">Transaction History</h1>

                <TransactionPoints transactions={transactionHistory}/>
    
                {/* Filters */}
                <div>

                </div>

                {/* transaction history items */}
                <div className="mt-4">
                    {transactionHistory.map((transaction: Transaction, index: number) => (
                        <TransactionEntry transaction={transaction} key={index} />
                    ))}
                    
                </div>

            </div>

        </div>
    </>
    );
};

export default TransactionHistory;