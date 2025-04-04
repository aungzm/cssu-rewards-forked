import React from 'react';
import Navbar from '../components/Navbar';
import DashboardPoints from '../components/DashboardPoints';
import TransactionListEntry from '../components/TransactionListEntry';
import EventListEntry from '../components/EventListEntry';
import { fetchWithAuth } from '../utils/authHelper';
import { API_BASE_URL } from '../utils/auth';
import PromotionListEntry from '../components/PromotionListEntry';
import {useUser} from "../context/UserContext";


const Dashboard: React.FC = () => {


    const [transactionList, setTransactionList] = React.useState<any[]>();
    const [eventList, setEventList] = React.useState<any[]>([]);
    const [promotionList, setPromotionList] = React.useState<any[]>([]);
    // const [user, setUser] = React.useState<any>(null);
    const user = useUser();
    
    // Function to make a call to the fetchWithAuth function
    const fetchData = async (url: string)  => {
        const response = await fetchWithAuth(`${API_BASE_URL}${url}`,
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.status}`);
        }
        const data = await response.json();
        return data;
    }


    // Each time the component mounts, we will fetch the transactions and events
    React.useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Fetch transactions
                const transactions = await fetchData('/users/me/transactions?limit=20');
                setTransactionList(transactions.results.slice(9, 14));  // TODO update this to be first 4
                // console.log(transactions.results.slice(9, 14));

                // Fetch events
                const events = await fetchData('/events?started=false&showFull=false');
                setEventList(events.results.slice(0, 3));
                // console.log(events.results.slice(0, 2));

                // Fetch promotions
                const promotions = await fetchData('/promotions');
                setPromotionList(promotions.results.slice(0, 3));

                // const user = useUser();
                // setUser(user);
                

            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            }
        };

        fetchDashboardData();

    }, []);
    

    // const response3 = await fetchWithAuth(`${API_BASE_URL}/promotions`);
    // if (!response3.ok) {
    //     throw new Error(`Failed to fetch promotions: ${response3.status}`);
    // }
    // const promotions = await response3.json();
    // console.log(promotions);

    return (
        <div>
            
            <Navbar activeLink="dashboard" />
            <div className="flex flex-row bg-gray-100 dark:bg-gray-900"> {/* This is the main page container  */}
                <div className='flex-grow flex-col mx-80 my-10'>

                    <h1 className="text-2xl font-medium text-[#002A5C] dark:text-white ">Welcome Back, {user?.userData?.name || "User"}!</h1> {/* Unsure why name is giving error */}
                    <p className="text-gray-500">Welcome to your dashboard!</p>
                    
                    <DashboardPoints />

                    {transactionList && transactionList.length > 0 && (
                        <div className="flex flex-col mt-8 bg-white shadow-md rounded-lg p-6 max-w-2xl">
                            <div className='flex flex-row justify-between items-center'> 
                                <h2 className="text-lg font-normal text-[#002A5C]">Recent Transactions</h2>
                                <button className="mt-2  text-blue-500 hover:underline"> View All </button>
                            </div>
                            
                            <div className="mt-4">
                                {transactionList.map((transaction: any, index: number) => (
                                    <TransactionListEntry transaction={transaction} key={index}/>
                                ))}
                            </div>
                        </div>
                    )}

                    {eventList && eventList.length > 0 && (
                        <div className="flex flex-col mt-8 bg-white shadow-md rounded-lg p-6 max-w-2xl">
                            <div className='flex flex-row justify-between items-center'> 
                                <h2 className="text-lg font-normal text-[#002A5C]">Upcoming Events</h2>
                                <button className="mt-2  text-blue-500 hover:underline"> View All </button>
                            </div>

                            <div className="mt-4">
                                {eventList.map((event: any, index: number) => (
                                    <EventListEntry key={index} event={event}/>
                                ))}
                            </div>
                        </div>
                    )}

                    

                </div> 
                <div className='w-1/6' >
                 
                    <div> <p> QR Code </p></div>

                    {promotionList && promotionList.length > 0 && (
                        <div className="mt-8"> 
                            <h2 className="text-2xl font-semibold">Promotions</h2>
                            <button className="mt-2 text-blue-500 hover:underline"> View All </button>
                            <div className="mt-4">
                                {promotionList.map((promotion: any, index: number) => (
                                    <PromotionListEntry key={index} promotion={promotion}/>
                                ))}
                            </div>
                    </div>)}
                </div> 
            </div>
        </div>
    );
};

export default Dashboard;