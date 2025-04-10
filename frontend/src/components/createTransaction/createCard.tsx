import React, { useState } from 'react';
import { fetchWithAuth } from '../../utils/authHelper';
import { API_BASE_URL } from '../../utils/auth';

type CreateCardProps = {
    type: string;
    user: {
        id: number;
        points: number;
    }
}

interface RedemptionResponse {
    id: number;
    utorid: string;
    type: string;
    processedBy: string | null;
    amount: number;
    remark: string;
    createdBy: string;
}

const CreateCard: React.FC<CreateCardProps> = ({ type, user }) => {
    const [recipientId, setRecipientId] = useState<number | null>(null);
    const [amount, setAmount] = useState<number | null>(null);
    const [remarks, setRemarks] = useState<string>("");
    const [showQRModal, setShowQRModal] = useState<boolean>(false);
    const [redemptionData, setRedemptionData] = useState<RedemptionResponse | null>(null);

    const handleSubmit = async () => {
        if (type === "transfer" && recipientId !== null && recipientId <= 0) {
            alert("Please enter a valid recipient ID");
            return;
        }

        if (amount !== null && amount <= 0) {
            alert("Please enter a positive amount");
            return;
        }

        if (amount !== null && amount > user.points) {
            alert("You do not have enough points");
            return;
        }

        if (type === "transfer" && recipientId === user.id) {
            alert("You cannot transfer points to yourself");
            return;
        }

        const url = type === "transfer" ? `${API_BASE_URL}/users/${recipientId}/transactions` 
            : `${API_BASE_URL}/users/me/transactions`;

        try {
            const response = await fetchWithAuth(url, {
                method: "POST",
                body: JSON.stringify({
                    amount,
                    remarks,
                    type,
                }),
            });
            
            if (!response.ok) {
                alert("Transaction creation failed");
                throw new Error("Network response was not ok");
            }
            
            const data = await response.json();
            console.log(data);
            
            if (type === "redemption") {
                // Store the redemption data and show QR modal
                setRedemptionData(data);
                setShowQRModal(true);
            } else {
                alert(`Transaction created successfully!`);
                resetForm();
            }
        } catch (error) {
            console.error("Error creating transaction:", error);
            alert("Failed to create transaction. Please try again.");
        }
    };

    const resetForm = () => {
        setRecipientId(null);
        setAmount(null);
        setRemarks("");
    };

    const closeModal = () => {
        setShowQRModal(false);
        resetForm();
    };

    const generateQRCodeUrl = (redemptionId: number) => {
        return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(redemptionId)}`;
    };

    return (
        <>
            <div className='container bg-white shadow-md rounded-lg p-6 w-1/3 flex flex-col'>
                <h1 className='text-2xl font-bold' style={{ color: "#002A5C" }}>Create {type} Transaction</h1>
                {type === "transfer" && (
                    <p className='text-gray-500 mb-4'>
                        Transfer points to another user.
                    </p>
                )}

                {type === "redemption" && (
                    <p className='text-gray-500 mb-4'>
                        Redeem your points.
                    </p>
                )}

                <div className='flex flex-col'>
                    <div className='flex flex-row bg-gray-100 p-4 rounded-md mb-4 border justify-between w-full'>
                        <p className='text-lg'>Available Points: </p>
                        <p className='text-lg font-semibold' style={{ color: "#002A5C" }}>{user.points}</p>
                    </div>

                    {type === "transfer" && (
                        <>
                            <label className='mb-2'>
                                Recipient ID
                            </label>
                            <input 
                                type="number" 
                                id="userId" 
                                value={recipientId || ""}
                                onChange={(e) => setRecipientId(Number(e.target.value))}
                                placeholder='Enter recipient ID'
                                className='border border-gray-300 rounded p-2 mb-4 w-full' 
                            />
                        </>
                    )}

                    <label className='mb-2'>
                        Amount
                    </label>
                    <input
                        type="number"
                        id="amount"
                        value={amount || ""}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        placeholder='Enter amount'
                        className='border border-gray-300 rounded p-2 mb-4 w-full' 
                    />

                    <label className='mb-2'>
                        Notes (Optional)
                    </label>

                    <textarea
                        id="remarks"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        className='border border-gray-300 rounded p-2 mb-4 w-full'
                        rows={1}
                        placeholder='Add any notes here'
                    />
                    
                    <button
                        className='bg-blue-500 hover:bg-blue-700 text-white rounded p-2 w-full'
                        onClick={handleSubmit}
                    >
                        {type === "transfer" && <p>Transfer Points</p>}
                        {type === "redemption" && <p>Redeem Points</p>}
                    </button>
                </div>
            </div>

            {/* QR Code Modal */}
            {showQRModal && redemptionData && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">Redemption QR Code</h3>
                            <button 
                                onClick={closeModal}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="flex flex-col items-center">
                            <img 
                                src={generateQRCodeUrl(redemptionData.id)} 
                                alt="QR Code for Redemption" 
                                className="mb-4 border border-gray-200 rounded"
                            />
                            <div className="text-center mb-4">
                                <p className="font-bold">Redemption ID: {redemptionData.id}</p>
                                <p>Amount: {redemptionData.amount} points</p>
                                {redemptionData.utorid && <p>User: {redemptionData.utorid}</p>}
                            </div>
                            <button 
                                onClick={closeModal}
                                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default CreateCard;