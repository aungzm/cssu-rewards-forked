import React, { useState } from "react";

interface FiltersModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (filters: FilterOption, sortOption: SortOption) => void;
}

export interface FilterOption {
    name: string;
    createdBy: string;
    suspicious: boolean | null;
    type: transactionType;
    relatedId: number | null;
    eventName: string;
    amount: number | null;
    operator: operatorType | null;
    promotionId: number | null;
}
export type SortOption =
  | 'default'
  | 'typeAsc'
  | 'typeDesc'
  | 'dateNewest'
  | 'dateOldest'
  | 'amountHighest'
  | 'amountLowest';


type transactionType = "redemption" | "purchase" | "transfer" | "adjustment" | "event" | "";
type operatorType = "gte" | "lte";


const FiltersModal: React.FC<FiltersModalProps> = ({
    isOpen,
    onClose,
    onSubmit
}) => {

    const [filters, setFilters] = useState<FilterOption>(
        {
            name: "",
            createdBy: "",
            suspicious: null,
            type: "",
            relatedId: null,
            eventName: "",
            amount: null,
            operator: null,
            promotionId: null
        }
    )
    const [sortOption, setSortOption] = useState<SortOption>('default');
    
    const handleSubmit = () => {
        onSubmit(filters, sortOption);
    }

    const handleReset = () => {
        setFilters({
            name: "",
            createdBy: "",
            suspicious: null,
            type: "",
            relatedId: null,
            eventName: "",
            amount: null,
            operator: null,
            promotionId: null
        });
        setSortOption('default');
    }

    return (isOpen ? (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-md z-50 flex justify-center items-center p-6">
            <div className="relative flex flex-col bg-white shadow-md rounded-lg w-3/4 max-w-4xl">

                {/* Modal Header */}
                <div className="flex justify-between items-center bg-blue-700 text-white p-4 w-full ">
                    <p className="text-lg font-bold">Transaction Filters</p>
                    <button
                        className="bg-white text-blue-600 font-bold py-1 px-3 rounded hover:bg-gray-200"
                        onClick={() => onClose()}
                    >
                        Close
                    </button>
                </div>

                {/* Main Modal Content */}
                <div className="flex flex-col justify-center items-center pt-8 gap-2 p-6">

                    {/* Input Text Fields */}
                    <div className="flex flex-col w-full">
                        <label className="text-gray-700 font-semibold">Name / utorid</label>
                        <input id="field1" type="text"
                        value={filters.name}
                        onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                        className="border rounded-md p-2 w-full" />
                    </div>

                    <div className="flex flex-col w-full">
                        <label className="text-gray-700 font-semibold">Created By</label>
                        <input id="field2" type="text"
                        value={filters.createdBy}
                        onChange={(e) => setFilters({ ...filters, createdBy: e.target.value })}
                        className="border rounded-md p-2 w-full" />
                    </div>

                    <div className="flex flex-col w-full">
                        <label className="text-gray-700 font-semibold">Promotion ID</label>
                        <input id="field3" type="text"
                        value={filters.promotionId || ''}
                        onChange={(e) => setFilters({ ...filters, promotionId: Number(e.target.value) })}
                        className="border rounded-md p-2 w-full" />
                    </div>

                    {/* Dropdown */}
                    <div className="flex flex-col w-full">
                        <label htmlFor="dropdown1" className="text-gray-700 font-semibold">Transaction Type</label>
                        <select value={filters.type} onChange={(e) => setFilters({...filters, type: e.target.value as transactionType})} className='border rounded p-2'>
                            <option value="">All</option>
                            <option value="redemption">Redemption</option>
                            <option value="purchase">Purchase</option>
                            <option value="transfer">Transfer</option>
                            <option value="adjustment">Adjustment</option>
                            <option value="event">Event</option>
                        </select>
                    </div>

                    {/* Related ID */}
                    <div className="flex flex-col w-full">
                        {filters.type === "redemption" && (
                            <label className="text-md font-bold">Operator ID</label>
                        )}
                        {filters.type === "adjustment" && (
                            <label className="text-md font-bold">Transaction ID</label>
                        )}
                        {filters.type === "transfer" && (
                            <label className="text-md font-bold">User utorid</label>
                        )}
                        {filters.type === "event" && (
                            <label className="text-md font-bold">Event Name</label>
                        )}
                        {(filters.type === "purchase" || filters.type === "") && (
                            <label className="text-md font-bold">Related ID</label>
                        )}

                        {filters.type === "event" && (
                            <input
                                type="text"
                                value={filters.eventName || ''}
                                onChange={(e) => setFilters({ ...filters, eventName: e.target.value })}
                                className="border rounded p-2 w-full"
                            />
                        )}

                        {filters.type !== "event" && (
                            <input
                                type="number"
                                value={filters.relatedId || ''}
                                onChange={(e) => setFilters({ ...filters, relatedId: Number(e.target.value) })}
                                disabled={filters.type === "purchase" || filters.type === ""}
                                className={`border rounded p-2 w-full ${
                                    filters.type === "purchase" || filters.type === "" ? "bg-gray-200 text-gray-500 cursor-not-allowed" : ""
                                }`}
                            />
                        )}
                    </div>

                    {/* Sus */}
                    <div className="flex flex-col w-full">
                        <label className="text-gray-700 font-semibold">Suspicious</label>
                        <select 
                        value={filters.suspicious === null ? "" : filters.suspicious ? "yes" : "no"}
                        onChange={(e) => {
                            const value = e.target.value;
                            setFilters({ ...filters, suspicious: value === "yes" ? true : value === "no" ? false : null });
                        }}
                        id="dropdown2" className="border rounded-md p-2 w-full">
                            <option value=""> </option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                        </select>
                    </div>

                    {/* Points */}
                    <div className="flex flex-row gap-4 w-full">
                        <div className="flex flex-col w-1/2">
                            <label htmlFor="gridDropdown" className="text-gray-700 font-semibold">Points Operator</label>
                            <select
                            value={filters.operator === null ? "" : filters.operator}
                            onChange={(e) => {
                                const value = e.target.value;
                                setFilters({ ...filters, operator: value === "gte" ? "gte" : value === "lte" ? "lte" : null });
                            }}
                            id="gridDropdown"
                            className="border rounded-md p-2 w-full">
                                <option value="">Select Option</option>
                                <option value="gte">Greater Than</option>
                                <option value="lte">Less Than</option>
                            </select>
                        </div>

                        <div className="flex flex-col w-1/2">
                            <label className="text-gray-700 font-semibold">Amount</label>
                            <input
                            id="gridField1"
                            value={filters.amount || ''}
                            onChange={(e) => setFilters({ ...filters, amount: Number(e.target.value) })}
                            type="text"
                            className="border rounded-md p-2 w-full" />
                        </div>
                    </div>

                    {/* Sort */}
                    <div className="flex flex-col w-full">
                        <label htmlFor="dropdown3" className="text-gray-700 font-semibold">Sort By</label>
                        <select value={sortOption} onChange={(e) => setSortOption(e.target.value as SortOption)} id="dropdown3" className="border rounded-md p-2 w-full">
                            <option value="default">Default</option>
                            <option value="typeAsc">Type Ascending</option>
                            <option value="typeDesc">Type Descending</option>
                            <option value="dateNewest">Date Newest</option>
                            <option value="dateOldest">Date Oldest</option>
                            <option value="amountHighest">Amount Highest</option>
                            <option value="amountLowest">Amount Lowest</option>
                        </select>
                    </div>

                    <div className="flex flex-row gap-4 mt-4">
                        <button
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                            onClick={handleSubmit}>

                            Apply Filters
                        </button>

                        <button
                            className="bg-white hover:bg-gray-700 font-bold py-2 px-4 rounded"
                            onClick={handleReset}
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>
            </div>
        </div>
    ) : "");
}

export default FiltersModal;