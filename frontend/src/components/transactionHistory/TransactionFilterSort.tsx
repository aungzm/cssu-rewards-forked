import React, { useEffect, useState } from 'react';
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

interface TransactionFilterSortProps {
    transactions: Transaction[];
    updateFilters: (filters: FilterOption) => void;
    updateSorts: (sortOption: SortOption) => void;
}

type operatorType = "gte" | "lte";
type transactionType = "redemption" | "purchase" | "transfer" | "adjustment" | "event" | "";

export type SortOption =
  | 'default'
  | 'typeAsc'
  | 'typeDesc'
  | 'dateNewest'
  | 'dateOldest'
  | 'amountHighest'
  | 'amountLowest';

export interface FilterOption {
    type: transactionType;
    relatedId: number | null;
    eventName: string;
    amount: number | null;
    operator: operatorType | null;
}

const TransactionFilterSort: React.FC<TransactionFilterSortProps> = ({
updateFilters,
updateSorts,
}) => {
    const [type, setType] = useState<transactionType>('');
    const [relatedId, setRelatedId] = useState<number | null>(null);
    const [amount, setAmount] = useState<number | null>(null);
    const [operator, setOperator] = useState<operatorType | null>(null);
    const [filtering, setFiltering] = useState(false);
    const [eventName, setEventName] = useState<string>('');
    const [sortOption, setSortOption] = useState<SortOption>('default');
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        if (!filtering) return;
        const filters: FilterOption = {
            type,
            relatedId,
            eventName,
            amount,
            operator
        };
        console.log("Filters: ", filters);
        updateFilters(filters);
        setFiltering(false);
    }, [filtering]);

    const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedSortOption = e.target.value as SortOption;
        setSortOption(selectedSortOption);
        updateSorts(selectedSortOption);
    }

    const resetFilters = async () => {
        setType('');
        setEventName('');
        setRelatedId(null);
        setAmount(null);
        setOperator(null);
        setFiltering(true);
    }

    return (
        <div className='bg-white shadow-md rounded-lg p-4 my-4 w-full dark:bg-slate-600'>
            {/* Mobile toggle button */}
            <div className="md:hidden w-full mb-3">
                <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className="w-full bg-blue-500 text-white rounded py-2 px-4 flex items-center justify-center "
                >
                    {showFilters ? 'Hide Filters' : 'Show Filters'} 
                    <span className="ml-2">{showFilters ? '▲' : '▼'}</span>
                </button>
            </div>

            {/* Filter container - responsive layout */}
            <div className={`${showFilters ? 'block' : 'hidden'} md:flex md:flex-row md:flex-nowrap md:gap-2 md:items- dark:text-white`}>
                {/* Type */}
                <div className='flex flex-col w-full md:w-1/7 mb-3 md:mb-0'>
                    <label className='text-md font-bold mb-1'>Type</label>
                    <select 
                        value={type} 
                        onChange={(e) => setType(e.target.value as transactionType)} 
                        className='border rounded p-2 dark:bg-gray-400 dark: border-none'
                    >
                        <option value="">All</option>
                        <option value="redemption">Redemption</option>
                        <option value="purchase">Purchase</option>
                        <option value="transfer">Transfer</option>
                        <option value="adjustment">Adjustment</option>
                        <option value="event">Event</option>
                    </select>
                </div>

                {/* Related ID */}
                <div className='flex flex-col w-full md:w-1/7 mb-3 md:mb-0'>
                    {type === "redemption" && (
                        <label className='text-md font-bold mb-1'>Operator ID</label>
                    )}
                    {type === "adjustment" && (
                        <label className='text-md font-bold mb-1'>Transaction ID</label>
                    )}
                    {type === "transfer" && (
                        <label className='text-md font-bold mb-1'>User utorid</label>
                    )}
                    {type === "event" && (
                        <label className='text-md font-bold mb-1'>Event Name</label>
                    )}
                    {(type === "purchase" || type === "") && (
                        <label className='text-md font-bold mb-1 '>Related ID</label>
                    )}

                    {type === "event" ? (
                        <input
                            type="text" 
                            value={eventName || ''} 
                            onChange={(e) => setEventName(e.target.value)}
                            className='border rounded p-2 w-full'
                        />
                    ) : (
                        <input
                            type="number" 
                            value={relatedId || ''} 
                            onChange={(e) => setRelatedId(Number(e.target.value))}
                            disabled={type === "purchase" || type === ""}
                            className={`border rounded p-2 w-full  dark:border-none ${
                                type === "purchase" || type === "" ? "bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-200 dark:border-none" : "dark:bg-gray-400"
                            }`}
                        />
                    )}
                </div>

                {/* Amount */}
                <div className='flex flex-col w-full md:w-1/7 mb-3 md:mb-0 '>
                    <label className='text-md font-bold mb-1 '>Amount</label>
                    <input 
                        type="number" 
                        value={amount || ''} 
                        onChange={(e) => setAmount(Number(e.target.value))} 
                        className='border rounded p-2 w-full dark:bg-gray-400 dark:border-none' 
                    />
                </div>

                {/* Operator */}
                <div className='flex flex-col w-full md:w-1/7 mb-3 md:mb-0 '>
                    <label className='text-md font-bold mb-1 '>Operator</label>
                    <select 
                        value={operator || ''} 
                        onChange={(e) => setOperator(e.target.value as operatorType)} 
                        className={`border rounded p-2 w-full dark:bg-gray-300 dark:text-black ${
                            amount === null ? "bg-gray-200 text-gray-500 cursor-not-allowed" : ""
                        }`}
                        disabled={amount === null}
                    >
                        <option value=""></option>
                        <option value="gte">Greater than</option>
                        <option value="lte">Less than</option>
                    </select>
                </div>

                {/* Action buttons */}
                <div className='flex flex-row md:flex-row justify-between gap-2 h-12 items-end mt-5 md:mb-0 md:w-auto'>
                    <button 
                        className='flex-1 md:w-full bg-blue-500 text-white rounded py-2 px-4'
                        onClick={() => setFiltering(true)}
                    >
                        Filter
                    </button>
                    <button
                        className='flex-1 md:w-full bg-gray-500 text-white rounded py-2 px-4'
                        onClick={resetFilters}
                    >
                        Reset
                    </button>
                </div>

                {/* Sort */}
                <div className='w-full md:w-1/7 mt-1 md:mb-0'>
                    <label className='text-md font-bold mb-1 md:hidden'>Sort By</label>
                    <select 
                        value={sortOption}
                        onChange={handleSortChange} 
                        className='border rounded p-2 w-full md:mt-6 dark:bg-gray-400 dark:border-none'
                    >
                        <option value="default">Sort by Default</option>
                        <option value="typeAsc">Type (A-Z)</option>
                        <option value="typeDesc">Type (Z-A)</option>
                        <option value="dateNewest">Date (Newest)</option>
                        <option value="dateOldest">Date (Oldest)</option>
                        <option value="amountHighest">Points (Highest)</option>
                        <option value="amountLowest">Points (Lowest)</option>
                    </select>
                </div>
            </div>
        </div>
    )
}

export default TransactionFilterSort;