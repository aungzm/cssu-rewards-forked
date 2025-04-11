import React, { useEffect } from "react";
import Navbar from "../components/Navbar";
import CreateCard from "../components/createTransaction/createCard";
import { useUser } from "../context/UserContext";
import { fetchWithAuth } from "../utils/authHelper";
import { API_BASE_URL } from "../utils/auth";
import RecentTransactionEntry from "../components/createTransaction/recentTransactionEntry";

interface Transfer {
    id: number;
    type: string;
    amount: number;
    createdAt: string;
    operatorId: number;
}

const CreateTransfer: React.FC = () => {

    const [transfers, setTransfers] = React.useState<Transfer[]>([]);
    const user = useUser();


    useEffect(() => {

        const fetchTransfers = async () => {
        
            try {
                const response = await fetchWithAuth(`${API_BASE_URL}/users/me/transactions?type=transfer`)
                if (!response.ok) {
                    throw new Error("Network response was not ok");
                }

                const data = await response.json();
                console.log(data);
                setTransfers(data.results);


            } catch (error) {
                console.error("Error fetching transfers:", error);
            }
        };

        fetchTransfers();

    }, []);
    
    return (
        <>
        <Navbar activeLink="dashboard"/>

        <div className="bg-gray-100 min-h-screen flex flex-col justify-center items-center dark:bg-gray-900 dark:text-gray-300">

        <CreateCard type="transfer" user={{id: user?.userData?.id || 0,  points: user?.userData?.points || 0}} />

        <div className="flex flex-col items-center w-full mt-4">
            <h2 className="text-xl font-bold mb-4">Recent Transfers</h2>
            <div className="w-full max-w-md">
                {transfers.slice(0, 3).map((transfer: Transfer) => (
                    <RecentTransactionEntry key={transfer.id} transaction={transfer} />
                ))}
            </div>
        </div>
        
        </div>

        
        </>
        
    )

}

export default CreateTransfer;