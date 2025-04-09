import React, { use, useEffect, useMemo, useState } from 'react';
import { fetchWithAuth } from '../../utils/authHelper';
import { API_BASE_URL } from '../../utils/auth';


interface TransactionFilterSortProps {
    transactions: {
        id: number;
        type: string;
        amount: number;
        suspicious: boolean;
        createdAt: string;
        operatorId: number | null;
    }[];
    setTransactions: Function;
}

type operatorType = "gte" | "lte";

type SortOption =
  | 'default'
  | 'typeAsc'
  | 'typeDesc'
  | 'dateNewest'
  | 'dateOldest'
  | 'amountHighest'
  | 'amountLowest';

  
const TransactionFilterSort: React.FC<TransactionFilterSortProps> = ({
transactions, setTransactions}) => {

    
    const [type, setType] = useState<string>('');
    const [relatedId, setRelatedId] = useState<number | null>(null);
    const [amount, setAmount] = useState<number | null>(null);
    const [operator, setOperator] = useState<operatorType | null>(null);
    const [filtering, setFiltering] = useState(false);  // State for when filter or reset button is clicked
    const [eventName, setEventName] = useState<string>(''); // State for the event name
    const [sortOption, setSortOption] = useState<SortOption>('default'); // State for the sort option
    
    const fetchData = async (url: string) => {
        try {
            const response = await fetchWithAuth(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch data: ${response.status}`);
            }
            const data = await response.json();
            return data;

        } catch (error) {
            console.error('Error fetching data:', error);
            return null;
        }
        
    }

    // Whenever the filters get updated, fetch the data
    const handleFilter = async () => {

        let url = `${API_BASE_URL}/users/me/transactions?`;

        if (type !== "") {
            url += `type=${type}&`;
        }

        if (eventName !== "") {
            const eventId = await getEventId();
            url += `eventId=${eventId}&`;

        } else if (relatedId !== null) {

            console.log("Related ID: ", relatedId);
            url += `relatedId=${relatedId}&`;
        }
        if (amount !== null && operator !== null) {
            
            url += `amount=${amount}&operator=${operator}`;
        }

        const data = await fetchData(url);
        setTransactions(data.results);
    }

    // When filtering is set to true, call the handleFilter function
    useEffect(() => {
        if (filtering) {    // Done to prevent infinite loop
            handleFilter();
        }
        setFiltering(false);
    }, [filtering]);

    // Handler for the reset Filters button
    const resetFilters = async () => {
        setType('');
        setEventName('');
        setRelatedId(null);
        setAmount(null);
        setOperator(null);
        setFiltering(true);
    }

    // Function to get the event ID from the event name
    const getEventId = async () => {
        
        const response = await fetchData(`${API_BASE_URL}/events?name=${eventName}`);
        if (response && response.results.length > 0) {
            
            return response.results[0].id;
        }

        return -1;
    }

    // Function to sort the transactions based on the selected option
    const sortTransaction = useMemo(() => {
        console.log("Sorting transactions", sortOption);
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
        setTransactions(sortedTransactions);
    }, [transactions, sortOption]);

    return (
        <div className='bg-white shadow-md rounded-lg p-6 my-4 w-full flex flex-row gap-2'>

            {/* Type */}
            <div className='flex flex-col w-1/6'>
                <label className='text-md font-bold'>Type</label>
                <select value={type} onChange={(e) => setType(e.target.value)} className='border rounded p-2'>
                    <option value="">All</option>
                    <option value="redemption">Redemption</option>
                    <option value="purchase">Purchase</option>
                    <option value="transfer">Transfer</option>
                    <option value="adjustment">Adjustment</option>
                    <option value="event">Event</option>
                </select>

            </div>

            {/* related id */}
            <div className='flex flex-col w-1/6'>
                {type === "redemption" && (
                    <label className='text-md font-bold'>Operator ID</label>
                )}
                {type === "adjustment" && (
                    <label className='text-md font-bold'>Transaction ID</label>
                )}

                {type === "transfer" && (
                    <label className='text-md font-bold'>User utorid</label>
                )}

                {type === "event" && (
                    <label className='text-md font-bold'>Event Name</label>
                )}

                {(type === "purchase" || type === "") && (
                    <label className='text-md font-bold'>Related ID</label>
                )}

                {type === "event" && (
                    <input
                    type="text" value={eventName || ''} 
                    onChange={(e) => setEventName((e.target.value))}
                    className={`border rounded p-2`}
                />
                )}

                {type !== "event" && (
                    <input
                    type="number" value={relatedId || ''} 
                    onChange={(e) => setRelatedId(Number(e.target.value))}
                    disabled={type === "purchase" || type === ""}
                    className={`border rounded p-2 ${
                        type === "purchase" || type === "" ? "bg-gray-200 text-gray-500 cursor-not-allowed" : ""
                    }`}
                />)}
             
  
            </div>

            {/* Amount */}
            <div className='flex flex-col w-1/6'>
                <label className='text-md font-bold'>Amount</label>
                <input type="number" value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} className='border rounded p-2' />

            </div>

            {/* Operator */}
            <div className='flex flex-col w-1/6'>
                <label className='text-md font-bold'>Operator</label>
                <select value={operator || ''} 
                    onChange={(e) => setOperator(e.target.value as operatorType)} 
                    className={`border rounded p-2 ${
                    amount === null ? "bg-gray-200 text-gray-500 cursor-not-allowed" : ""}`}
                    disabled={amount === null}>

                        <option value=""></option>
                        <option value="gte">Greater than</option>
                        <option value="lte">Less than</option>
                </select>
            </div>

            <button 
                className='bg-blue-500 text-white rounded py-2 px-2 mt-6'
                onClick={() => setFiltering(true)}>
                    Filter
            </button>

            <button
                className='bg-gray-500 text-white rounded py-2 px-2 mt-6'
                onClick={resetFilters}>
                    Reset
            </button>

            {/* Sort */}
            <select value={sortOption}
             onChange={(e) => setSortOption(e.target.value as SortOption)} 
             className='border rounded p-2 mt-6 w-1/6'>
                
                <option value="default">Sort by Default</option>
                <option value="nameAsc">Name (A-Z)</option>
                <option value="nameDesc">Name (Z-A)</option>
                <option value="dateNewest">Creation Date (Newest)</option>
                <option value="dateOldest">Creation Date (Oldest)</option>
                <option value="amountHighest">Points (Highest)</option>
                <option value="amountLowest">Points (Lowest)</option>

            </select>
        </div>
    )
}

export default TransactionFilterSort;