import React, { useState, useEffect } from "react";
import { UserType } from "../../pages/CreateTransaction"
import { API_BASE_URL } from "../../utils/auth";
import { fetchWithAuth } from "../../utils/authHelper";

interface TransactionInfoProps {
    user: UserType | null;
    creator: UserType | null;
}

const TransactionInfo: React.FC<TransactionInfoProps> = ({
    user,
    creator
}) => {
    const [type, setType] = useState("");
    const [spent, setSpent] = useState<number | "">("");
    const [amount, setAmount] = useState<number | "">("");
    const [relatedId, setRelatedId] = useState<number | "">("");
    const [remarks, setRemarks] = useState("");
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [toastType, setToastType] = useState<"success" | "error">("success");

    // Handle toast display and auto-hide
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        if (showToast) {
            timer = setTimeout(() => {
                setShowToast(false);
            }, 3000); // Toast will disappear after 3 seconds
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [showToast]);

    const displayToast = (message: string, type: "success" | "error") => {
        setToastMessage(message);
        setToastType(type);
        setShowToast(true);
    };

    const handleSubmit = async () => {
        try {
            if (type === "purchase" && user !== null && spent !== "" && spent > 0) {
                const response = await fetchWithAuth(`${API_BASE_URL}/transactions`, {
                    method: "POST",
                    body: JSON.stringify({
                        utorid: user.utorid,
                        spent,
                        remark: remarks,
                        type,
                    }),
                });

                if (!response.ok) {
                    throw new Error("Network response was not ok");
                } else {
                    displayToast("Transaction created successfully", "success");
                }

            } else if (type === "adjustment" && user !== null && amount !== "" && relatedId !== "") {
                const response = await fetchWithAuth(`${API_BASE_URL}/transactions`, {
                    method: "POST",
                    body: JSON.stringify({
                        utorid: user.utorid,
                        amount,
                        relatedId,
                        remark: remarks,
                        type,
                    }),
                });
                if (!response.ok) {
                    throw new Error("Network response was not ok");
                } else {
                    displayToast("Transaction created successfully", "success");
                }
            }
            else {
                displayToast("Please enter valid transaction information", "error");
            }
        
        } catch (error) {
            console.error("Error creating transaction:", error);
            displayToast("Error creating transaction", "error");
        }
    }

    return (
        <div className="bg-white flex flex-col w-full mt-4 p-3 md:p-4 border border-gray-300 shadow-md rounded-lg relative">
            {/* Toast Notification */}
            {showToast && (
                <div 
                    className={`fixed bottom-4 right-4 px-4 py-2 rounded-md shadow-md transition-opacity duration-300 z-50
                    ${toastType === "success" ? "bg-green-500" : "bg-red-500"} text-white ${showToast ? "opacity-100" : "opacity-0"}`}
                >
                    {toastMessage}
                </div>
            )}

            <h2 className="text-xl md:text-2xl font-bold mb-4" style={{ color: "#002A5C" }}>Transaction Details</h2>
            
            {/* Type - Stacked on mobile */}
            <div className="flex flex-col md:flex-row items-start md:items-center w-full mb-4">
                <div className="w-full md:w-1/2 mb-3 md:mb-0 md:mr-2">
                    <label className="block mb-1 md:mb-0 md:mr-2">Transaction Type</label>
                    <select
                        className="border border-gray-300 rounded-md p-2 w-full"
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                    >
                        <option value="">Select Type</option>
                        <option value="purchase">Purchase</option>

                        {creator && (creator.role === "MANAGER" || creator.role === "SUPERUSER") && (
                            <option value="adjustment">Adjustment</option>
                        )}
                    </select>
                </div>

                {/* Amount */}
                <div className="w-full md:w-1/2">
                    <label className="block mb-1 md:mb-0">Amount</label>
                    <input
                        type="number"
                        className="border border-gray-300 rounded-md p-2 w-full"
                        value={type === "purchase" ? spent : amount}
                        onChange={(e) => {
                            if (type === "purchase") {
                                setSpent(e.target.value === "" ? "" : Number(e.target.value));
                            }
                            else {
                                setAmount(e.target.value === "" ? "" : Number(e.target.value));
                            }
                        }}
                        placeholder="Enter transaction amount"
                    />
                </div>
            </div>

            {/* Related Id */}
            {type === "adjustment" && (
                <div className="mb-4">
                    <label className="block mb-1">Related Transaction ID</label>
                    <input 
                        className="border border-gray-300 rounded-md p-2 w-full"
                        type="number"
                        value={relatedId}
                        onChange={(e) => setRelatedId(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="Enter related transaction ID"
                    />
                </div>
            )}

            {/* Large Text Field */}
            <div className="mb-4">
                <label className="block mb-1">Notes (Optional)</label>
                <textarea
                    id="textField"
                    className="border border-gray-300 rounded-md p-2 w-full"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter details here..."
                    rows={3}
                />
            </div>

            {/* Summary */}
            <div className="bg-gray-100 flex flex-col w-full p-3 md:p-4 mb-4 border border-gray-300 rounded-lg">
                <h2 className="text-lg font-bold mb-3" style={{ color: "#002A5C" }}>Transaction Summary</h2>
                
                <div className="flex flex-row justify-between items-center w-full mb-3">
                    <p className="text-gray-500">User:</p>
                    {user && (
                        <p className="text-gray-500 break-all">{user.utorid}</p>
                    )}

                    {!user && (
                        <p className="text-gray-500">Not selected</p>
                    )}
                </div>

                <div className="flex flex-row justify-between items-center w-full mb-3">
                    <p className="text-gray-500">Transaction Type:</p>
                    <p className="text-gray-500">{type || "Not selected"}</p>
                </div>

                {type === "purchase" && (
                    <div className="flex flex-row justify-between items-center w-full mb-3">
                        <p className="text-gray-500">Dollars Spent:</p>
                        <p className="text-gray-500">{spent || "0"}</p>
                    </div>
                )}

                {type === "adjustment" && (
                    <div className="flex flex-row justify-between items-center w-full mb-3">
                        <p className="text-gray-500">Related ID:</p>
                        <p className="text-gray-500">{relatedId || "Not set"}</p>
                    </div>
                )}

                <div className="flex flex-row justify-between items-center w-full mb-3">
                    <p className="text-gray-500">Total Points:</p>

                    {type === "adjustment" && (
                        <p className="text-gray-500">{amount !== "" ? amount : 0} Points</p>
                    )}

                    {type === "purchase" && (
                        <p className="text-gray-500">{spent !== "" ? (spent) * 4 : 0} Points</p>
                    )}

                    {!type && (
                        <p className="text-gray-500">0 Points</p>
                    )}
                </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center md:justify-end">
                <button
                    className="bg-blue-500 hover:bg-blue-700 text-white rounded p-2 px-4 w-full md:w-auto"
                    onClick={handleSubmit}
                >
                    Create Transaction
                </button>
            </div>
        </div>
    );
};

export default TransactionInfo;