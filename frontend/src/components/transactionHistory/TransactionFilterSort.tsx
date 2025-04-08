import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../../utils/authHelper';
import { API_BASE_URL } from '../../utils/auth';


interface TransactionFilterSortProps {
    transactions: {
        id: number;
        type: string;
        amount: number;
        suspicious: boolean;
        createdAt: string | null;
        operatorId: number | null;
    }[];
    setTransactions: Function;
}

type operatorType = "gte" | "lte";

const TransactionFilterSort: React.FC<TransactionFilterSortProps> = ({
transactions, setTransactions}) => {

    
    const [type, setType] = useState<string>('');
    const [relatedId, setRelatedId] = useState<number | null>(null);
    const [amount, setAmount] = useState<number | null>(null);
    const [operator, setOperator] = useState<operatorType | null>(null);
    
    const fetchData = async (url: string) => {
        const response = await fetchWithAuth(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.status}`);
        }
        const data = await response.json();
        return data;
    }


    // Whenever the filters get updated, fetch the data
    const handleFilter = async () => {
        let url = `${API_BASE_URL}/users/me/transactions?`;

        if (type !== "") {
            url += `type=${type}&`;
        }
        if (relatedId !== null) {
            url += `relatedId=${relatedId}&`;
        }
        if (amount !== null && operator !== null) {
            url += `amount=${amount}&operator=${operator}&`;
        }

        const data = await fetchData(url);
        setTransactions(data.results);
        console.log(data);
    }

    const resetFilters = () => {
        setType('');
        setRelatedId(null);
        setAmount(null);
        setOperator(null);
        handleFilter();
    }

    return (
        <div className='bg-white shadow-md rounded-lg p-6 my-4  w-full flex flex-row gap-2'>

            <div className='flex flex-col w-1/6'>
                <label className='text-md font-bold'>Type</label>
                <select value={type} onChange={(e) => setType(e.target.value)} className='border rounded p-2'>
                    <option value="">All</option>
                    <option value="redemption">Redemption</option>
                    <option value="purchase">Purchase</option>
                    <option value="transfer">Transfer</option>
                    <option value="adjustment">Adjustment</option>
                </select>

            </div>

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
                    <label className='text-md font-bold'>Event ID</label>
                )}

                {(type === "purchase" || type === "") && (
                    <label className='text-md font-bold'>Related ID</label>
                )}

                <input
                    type="number" value={relatedId || ''} 
                    onChange={(e) => setRelatedId(Number(e.target.value))}
                    disabled={type === "purchase" || type === ""}
                    className={`border rounded p-2 ${
                        type === "purchase" || type === "" ? "bg-gray-200 text-gray-500 cursor-not-allowed" : ""
                    }`}
                />
             
  
            </div>

            <div className='flex flex-col w-1/6'>
                <label className='text-md font-bold'>Amount</label>
                <input type="number" value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} className='border rounded p-2' />

            </div>

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
                className='bg-blue-500 text-white rounded py-2 px-4 mt-6'
                onClick={handleFilter}>
                    Filter
            </button>

            <button
                className='bg-gray-500 text-white rounded py-2 px-4 mt-6'
                onClick={resetFilters}>
                    Reset
            </button>

        </div>
    )
}

export default TransactionFilterSort;