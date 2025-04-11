import React, {useState} from "react";
import Navbar from "../components/Navbar";
import UserInfo from "../components/createTransaction/UserInfo";
import TransactionInfo from "../components/createTransaction/TransactionInfo";
import { useUser } from "../context/UserContext";

export interface UserType {
    id: number;
    utorid: string;
    points: number;
    role: string;
}

const CreateTransaction: React.FC = () => {

    const [user, setUser] = useState<UserType | null>(null);
    const creator = useUser().userData as UserType;

    return (
        <>
        <Navbar activeLink="dashboard"/>

        <div className="bg-gray-100 min-h-screen flex flex-col items-center dark:bg-gray-900">

            <div className="flex flex-col w-2/3 my-10 ">

                <div className="justify-left flex flex-col items-start">
                    <h2 className="text-2xl font-bold text-[#002A5C] dark:text-gray-300">Create Transaction</h2>
                    <p className="text-gray-500 dark:text-gray-300">Please select a transaction type from the navbar.</p>
                </div>

                {/* User Info */}
                <UserInfo setUser={setUser} />
                

                {/* Transaction Details */}
                <TransactionInfo user={user} creator={creator} />

                

            </div>
                

        </div>
        </>
    )

}

export default CreateTransaction;