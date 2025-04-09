import {useEffect, useState, useCallback, useRef} from 'react';
import Navbar from '../components/Navbar';
import TransactionPoints from '../components/transactionHistory/TransactionPoints';
import TransactionEntry from '../components/transactionHistory/TransactionEntry';
import { API_BASE_URL } from '../utils/auth';
import { fetchWithAuth } from '../utils/authHelper';
import TransactionFilterSort from '../components/transactionHistory/TransactionFilterSort';


interface Transaction {
    id: number;
    type: string;
    amount: number;
    spent: number;
    createdAt: string;
    remarks: string;
    suspicious: boolean;
    relatedId: number | null;
    operatorId: number | null;
}


const TransactionHistory: React.FC = () => {
    const [transactionHistory, setTransactionHistory] = useState<Transaction[]>([]);
    const [allTransacitions, setAllTransactions] = useState<Transaction[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const observerTarget = useRef<HTMLDivElement | null>(null);


    const fetchTransactionHistory = useCallback(
        async (url: string, page: number) => {
            if (loading || !hasMore) return; // Prevent multiple requests

            try {
                // Set it to loading and get the data
                setLoading(true);
                const response = await fetchWithAuth(url + `?page=${page}`, {});
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const data = await response.json();
                setTransactionHistory((prev) =>  page === 1? data.results : [...prev, ...data.results]);
                
                // Set all transactions if this the first call
                if (allTransacitions.length === 0) {
                    setTotalCount(data.count);

                    const responseAll = await fetchWithAuth(url + `?limit=${data.count}`, {}); // Get all the user's transactions
                    if (!responseAll.ok) {
                        throw new Error('Network response was not ok');
                    }
                    const dataAll = await responseAll.json();
                    setAllTransactions(dataAll.results);
                }
                
                setPage((prevPage) => prevPage + 1);
                setHasMore(transactionHistory.length < totalCount);
            

            } catch (error) {
                console.error('Error fetching transaction history:', error);
            
            } finally {
                setLoading(false);
            }
    }, [loading, hasMore, transactionHistory, page]);

    // Effect for Infinite Scroll Observer
   const loadMoreItems = useCallback(() => {
    if (!loading && hasMore) {
        fetchTransactionHistory(`${API_BASE_URL}/users/me/transactions`, page);

    }
  }, [
    loading,
    hasMore,
    page,
    ]);

// Infinite scroll observer 
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && hasMore) {
          loadMoreItems();
        }
      },
      { threshold: 0.8 },
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
        const currentTarget = observerTarget.current;
        if (currentTarget) {
          observer.unobserve(currentTarget);
        }
    };
  }, [loadMoreItems, loading, hasMore]);

    useEffect(() => {
        fetchTransactionHistory(`${API_BASE_URL}/users/me/transactions`, 1);
    }, []);
        

    return (
    <>
        <Navbar activeLink="dashboard" />
        <div className='bg-gray-100 min-h-screen flex flex-col justify-center items-center'>

            <div className=" flex flex-col w-2/3 my-10">
                <h1 className="text-3xl font-bold">Transaction History</h1>

                <TransactionPoints transactions={allTransacitions}/>
    
                {/* Filters */}
                <TransactionFilterSort transactions={allTransacitions} setTransactions={setTransactionHistory} />

                {/* transaction history items */}
                <div className="mt-4">
                    <p> Transaction History</p>
                    {transactionHistory.map((transaction: Transaction, index: number) => (
                        <TransactionEntry transaction={transaction} key={index} />
                    ))}
                    
                </div>

          </div>

            {/* Infinite Scroll Target & Indicators */}
        <div ref={observerTarget} className="h-10 py-4 text-center">
          {loading && (
            <p className="text-gray-500 dark:text-gray-400">Loading more...</p>
          )}
          {!loading && !hasMore && transactionHistory.length > 0 && (
            <p className="text-gray-500 dark:text-gray-400">
              No more transactions.
            </p>
          )}
        </div>
        </div>
    </>
    );
};

export default TransactionHistory;