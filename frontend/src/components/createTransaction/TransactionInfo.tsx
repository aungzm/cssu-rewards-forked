import React, { useState } from "react";
import { UserType } from "../../pages/CreateTransaction"
import { API_BASE_URL } from "../../utils/auth";
import { fetchWithAuth } from "../../utils/authHelper";

interface TransactionInfoProps {
    user: UserType | null;
    creator: UserType | null;
}

const TransactionInfo: React.FC<TransactionInfoProps> = (
    {user,
    creator
    }
) => {
    const [type, setType] = useState("");
    const [spent, setSpent] = useState<number | "">("");
    const [amount, setAmount] = useState<number | "">("");
    const [relatedId, setRelatedId] = useState<number | "">("");
    const [remarks, setRemarks] = useState("");


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
                    alert("Transaction created successfully");
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
                    alert("Transaction created successfully");
                }
            }
            else {
                console.log
                alert("Please enter valid transaction information");
            }
        
        } catch (error) {
            console.error("Error creating transaction:", error);
            alert("Error creating transaction");
        }
    }

    return (
        <div className="bg-white flex flex-col w-full mt-4 p-4 border border-gray-300 shadow-md rounded-lg">
            <h2 className="text-2xl font-bold mb-4" style={{ color: "#002A5C" }}>Transaction Details</h2>
            
            <div className="flex flex-row items-center w-full mb-4">
                {/* Type */}
                <label className="mr-2">Transaction Type</label>
                <select
                    className="border border-gray-300 rounded-md p-2 mr-4 flex-grow"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                >
                    <option value="">Select Type</option>
                    <option value="purchase">Purchase</option>

                    {creator && (creator.role === "MANAGER" || creator.role === "SUPERUSER") && (
                        <option value="adjustment">Adjustment</option>
                    )}

                </select>

                {/* Amount */}
                <label className="mr-2">Amount</label>
                <input
                    type="number"
                    className="border border-gray-300 rounded-md p-2 flex-grow"
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

            {/* Related Id */}
            {type === "adjustment" && (
                <>
                <label className="mb-2 w-full">Related Transaction ID</label>
                <input className="border border-gray-300 rounded-md p-2 mb-4 w-full"
                    type="number"
                    value={relatedId}
                    onChange={(e) => setRelatedId(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="Enter related transaction ID"
                />
                </>
                
            )}

            {/* Large Text Field */}
            <label className="mb-2 w-full"> Notes (Optional) </label>
            <textarea
                id="textField"
                className="border border-gray-300 rounded-md p-2 w-full mb-4"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter details here..."
                rows={3}
            />

            {/* Summary */}
            <div className="bg-gray-100 flex flex-col items-center w-full p-4 mb-4 border border-gray-300 rounded-lg">
                <h2 className="text-lg font-bold mb-4" style={{ color: "#002A5C" }}>Transaction Summary</h2>
                
                <div className="flex flex-row justify-between items-center w-full mb-4">
                    <p className="text-gray-500"> User: </p>
                    {user && (
                        <p className="text-gray-500">{user.utorid}</p>
                    )}

                    {!user && (
                        <p className="text-gray-500">Not selected</p>
                    )}

                </div>

                <div className="flex flex-row justify-between items-center w-full mb-4">
                    <p className="text-gray-500"> Transaction Type: </p>
                    <p className="text-gray-500">{type}</p>
                </div>

                {type === "purchase" && (
                    <div className="flex flex-row justify-between items-center w-full mb-4">
                        <p className="text-gray-500"> Dollars Spent: </p>
                        <p className="text-gray-500">{spent}</p>
                    </div>
                )}

                {type === "adjustment" && (
                                        
                    <div className="flex flex-row justify-between items-center w-full mb-4">
                        <p className="text-gray-500">Related ID</p>
                        <p className="text-gray-500">{relatedId}</p>
                    </div>
                    
                )}

                <div className="flex flex-row justify-between items-center w-full mb-4">
                    <p className="text-gray-500"> Total Points: </p>

                    {type === "adjustment" && (
                        <p className="text-gray-500">{amount !== ""? amount : 0} Points</p>

                    )}

                    {type === "purchase" && (
                        <p className="text-gray-500">{spent !== ""? (spent) * 4: 0} Points</p>
                    )}
                </div>

            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
                <button
                    className="bg-blue-500 hover:bg-blue-700 text-white rounded p-2"
                    style={{ width: "fit-content" }}
                    onClick={handleSubmit}
                >
                    Create Transaction
                </button>
            </div>
        </div>
    );
};


export default TransactionInfo;