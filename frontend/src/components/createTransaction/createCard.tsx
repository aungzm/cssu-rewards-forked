import React, {useState} from 'react';
import { fetchWithAuth } from '../../utils/authHelper';
import { API_BASE_URL } from '../../utils/auth';


type CreateCardProps = {

    type: string;
    user: {
        id: number;
        points: number;
    }
}



const CreateCard: React.FC<CreateCardProps> = (
    { type, user }
) => {

    const [recipientId, setRecipientId] = useState<number | null>(null);
    const [amount, setAmount] = useState<number | null >(null);
    const [remarks, setRemarks] = useState<string>("");

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

        const response = await fetchWithAuth(url, {
            method: "POST",
            body: JSON.stringify({
                amount,
                remarks,
                type,
            }),
        }).then((res) => {
            if (!res.ok) {
                throw new Error("Network response was not ok");
            }
            return res.json();
        }
        ).then((data) => {
            console.log(data);
            alert(`Transaction created successfully!`);
            setRecipientId(0);
            setAmount(0);
            setRemarks("");
        });
    }

    return (
        <>
        <div className=' container bg-white shadow-md rounded-lg p-6 w-1/3 flex flex-col'>

            <h1 className='text-2xl font-bold mb-4'>Create {type} Transaction </h1>
            {type === "transfer" && (
                <p>
                    Transfer points to another user.
                </p>
            )}

            {type === "redeem" && (
                <p>
                    Redeem your points.
                </p>
            )}

            <div className='flex flex-col items-center'>

                <div className='bg-gray-300 p-4 rounded-md mb-4 border'>

                    <p className='text-lg'>Available Points: </p>
                    <p className='text-lg font-semibold'>{user.points}</p>

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
                        className='border border-gray-300 rounded p-2 mb-4 w-full' />
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
                className='border border-gray-300 rounded p-2 mb-4 w-full' />

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
                onClick={handleSubmit}>

                    Create {type} Transaction
                </button>
            </div>

        </div>
        </>
    )

}

export default CreateCard;