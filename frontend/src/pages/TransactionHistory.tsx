import {useEffect, useState, useCallback, useRef, useMemo} from 'react';
import Navbar from '../components/Navbar';
import TransactionPoints from '../components/transactionHistory/TransactionPoints';
import TransactionEntry from '../components/transactionHistory/TransactionEntry';
import { API_BASE_URL } from '../utils/auth';
import { fetchWithAuth } from '../utils/authHelper';
import TransactionFilterSort, {
  FilterOption,
  SortOption } 
  from '../components/transactionHistory/TransactionFilterSort';
import { useUser } from '../context/UserContext';


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
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const observerTarget = useRef<HTMLDivElement | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState<FilterOption>({
      type: '',
      relatedId: null,
      amount: null,
      operator: null,
      eventName: '',
  });
  	const [sortOption, setSortOption] = useState<SortOption>('default');
	const [reset, setReset] = useState(false);
	const user = useUser();

  	// Function to get the event ID from the event name
	  const getEventId = async (eventName: string) => {
        
		const response = await fetchWithAuth(`${API_BASE_URL}/events?name=${eventName}`);
		if (!response.ok) {
			throw new Error('Network response was not ok');
		}
		const data = await response.json();
		if (data && data.results.length > 0) {
			
		  return data.results[0].id;
		}
  
		return -1;
	}
  
	  // Function to handle applying filters by adding them to the url
	  const handleFilter = async (url: string, currentFilters: FilterOption) => {
  
		  const { type, relatedId, amount, operator, eventName } = currentFilters;
  
		  if (type !== "") {
			  url += `type=${type}&`;
		  }
  
		  if (eventName !== "") {
			  const eventId = await getEventId(eventName);
			  url += `eventId=${eventId}&`;
		  } else if (relatedId !== null) {
			  url += `relatedId=${relatedId}&`;
		  }
		  if (amount !== null && operator !== null) {
			  url += `amount=${amount}&operator=${operator}&`;
		  }
		  return url;
	  }
	// Function to handle sorting
	const handleSort = (transactions : Transaction[]) => {
		
		const sortedTransactions = [...transactions];
        sortedTransactions.sort((a, b) => {
            switch (sortOption) {
                case 'typeAsc':
                    return a.type.localeCompare(b.type);
                case 'typeDesc':
                    return b.type.localeCompare(a.type);
                case 'dateNewest':
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                case 'dateOldest':
                    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                case 'amountHighest':
                    return b.amount - a.amount;
                case 'amountLowest':
                    return a.amount - b.amount;
                default:
                    return 0;
            }
        });
		return sortedTransactions;
	}

const fetchTransactionHistory = useCallback(
    async (url: string, currentPage: number, currentFilters: FilterOption, resetHistory = false) => {
        console.log("Fetching page: ", currentPage);
        if (loading || loadingMore) return; // Prevent multiple requests

        if (currentPage === 1) {
            setLoading(true);
        } else {
            setLoadingMore(true);
        }
        if (currentPage === 1) setError(null);

        try {
            // Set it to loading and get the data
            const reqUrl = await handleFilter(url, currentFilters);
            const response = await fetchWithAuth(reqUrl + `page=${currentPage}`, {});
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();

            let updatedAllTransactions = [...allTransacitions];

            // Fetch all transactions only on the first page
            if (currentPage === 1) {
                setTotalCount(data.count);

				
                const responseAll = await fetchWithAuth(reqUrl + `limit=${data.count}`, {}); // Get all the user's transactions
                if (!responseAll.ok) {
                    throw new Error('Network response was not ok');
                }
                const dataAll = await responseAll.json();
                updatedAllTransactions = dataAll.results;
                setAllTransactions(dataAll.results); // Update state
            }

            // Apply filters to updatedAllTransactions
            const filteredTransactions = [...updatedAllTransactions, ...data.results].filter((transaction) => {
                let matches = true;
                if (currentFilters.type && transaction.type !== currentFilters.type) matches = false;
                if (currentFilters.relatedId !== null && transaction.relatedId !== currentFilters.relatedId) matches = false;
                if (currentFilters.amount !== null && currentFilters.operator) {
                    if (currentFilters.operator === "gte" && transaction.amount < currentFilters.amount) matches = false;
                    if (currentFilters.operator === "lte" && transaction.amount > currentFilters.amount) matches = false;
                }
                if (currentFilters.eventName && transaction.remarks !== currentFilters.eventName) matches = false;
                return matches;
            });

            // Apply sorting and pagination
            const sortedTransactions = sortOption === "default" 
                ? filteredTransactions 
                : handleSort(filteredTransactions);
            const startIndex = (currentPage - 1) * 10;
            const endIndex = startIndex + 10;
            const paginatedTransactions = sortedTransactions.slice(startIndex, endIndex);

            // Reset or append transaction history
            if (resetHistory) {

                setTransactionHistory(paginatedTransactions); // Reset the list
            } else {
                setTransactionHistory((prev) => [...prev, ...paginatedTransactions]); // Append to the list
            }
        } catch (error) {
            console.error('Error fetching transaction history:', error);
            setError(error instanceof Error ? error.message : 'An unknown error occurred');
            if (currentPage === 1) {
                setTransactionHistory([]);
                setTotalCount(0);
            }
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    },
    [loading, loadingMore, handleSort, sortOption, allTransacitions]
);

const hasMore = useMemo(() => {
    return !error && transactionHistory.length < totalCount;
}, [transactionHistory.length, totalCount, error]);

const loadMoreItems = useCallback(() => {
    if (!loading && hasMore && !loadingMore && !error) {
        const nextPage = page + 1; // Calculate the next page
        setPage(nextPage); // Update the page state
        fetchTransactionHistory(`${API_BASE_URL}/users/me/transactions?`, nextPage, filters);
    }
}, [loading, loadingMore, hasMore, page, error, fetchTransactionHistory, filters]);

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
}, [loadMoreItems, loadingMore]);

useEffect(() => {
    setPage(1); // Reset the page to 1 when filters or sorts change

    // Check if filters are set to their default values
    const isDefaultFilters = Object.values(filters).every((value) => value === null || value === "");

    if (isDefaultFilters) {
		// Clear the transaction history before fetching new data
		setTransactionHistory([]);
		setReset(true);
		
    } else {
        // Otherwise, fetch transactions with the applied filters
        fetchTransactionHistory(`${API_BASE_URL}/users/me/transactions?`, 1, filters, true); // Reset history
    }
}, [filters, sortOption]);

useEffect(()=> {
	if (reset) {
		// If filters are default, fetch all transactions without applying filters
        fetchTransactionHistory(`${API_BASE_URL}/users/me/transactions?`, 1, {
			type: '',
			relatedId: null,
			amount: null,
			operator: null,
			eventName: '',
		}, true); // Reset history
		setReset(false);

	}


}, [reset]);

    return (
    <>
        <Navbar activeLink="dashboard" />
        <div className='bg-gray-100 min-h-screen flex flex-col justify-center items-center dark:bg-gray-900'>

            <div className=" flex flex-col w-2/3 my-10">
                <h1 className="text-3xl font-bold text-[#002A5C] dark: text-blue-500">Transaction History</h1>

                <TransactionPoints transactions={allTransacitions} userPoints={user.userData?.points || 0}/>
    
                {/* Filters */}
                <TransactionFilterSort transactions={allTransacitions}
                updateFilters={setFilters}
                updateSorts={setSortOption}/>

                {/* transaction history items */}
                <div className="mt-4">
                    {transactionHistory.map((transaction: Transaction, index: number) => (
                        <TransactionEntry transaction={transaction} key={index} />
                    ))}
                    
                </div>

          </div>

            {/* Infinite Scroll Target & Indicators */}
        <div ref={observerTarget} className="h-10 py-4 text-center ">
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