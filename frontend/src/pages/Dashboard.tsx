import React from 'react';
import Navbar from '../components/Navbar';
import { fetchWithAuth } from '../utils/authHelper';
import { API_BASE_URL } from '../utils/auth';
import {useUser} from "../context/UserContext";

import { QRCodeSVG } from 'qrcode.react';

import DashboardPoints from '../components/Dashboard/DashboardPoints';
import TransactionListEntry from '../components/Dashboard/TransactionListEntry';
import EventListEntry from '../components/Dashboard/EventListEntry';
import PromotionListEntry from '../components/Dashboard/PromotionListEntry';

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

            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            }
        };

        fetchDashboardData();

    }, []);
    

    return (
        <div>
            
            <Navbar activeLink="dashboard" />
            <div className=" bg-gray-100 dark:bg-gray-900 "> {/* This is the main page container  */}

                {/* Heading */}
                <div className='mx-80 pt-10'>
                <h1 className="text-2xl font-medium text-[#002A5C] dark:text-white ">Welcome Back, {user?.userData?.name || "User"}!</h1> {/* Unsure why name is giving error */}
                <p className="text-gray-500">Welcome to your dashboard!</p>
                </div>

                <div className='flex flex-row'>


                    {/* Main Content */}
                    <div className='flex-grow flex-col ml-80 mb-5'>

                        <DashboardPoints />
                        {/* Recent Transactions */}
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

                        {/*Upcoming Events */}
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

                    {/* Right Sidebar */}
                    <div className='w-1/6 mr-40 mb-5' >
                    
                        {/* QR Code Container */}
                        <div className="flex flex-col bg-white shadow-md rounded-lg p-6 max-w-2xl my-4">

                            <div className='flex flex-row justify-between items-center border-b border-gray-300 mb-4 pb-4'> 
                                <h2 className="text-lg font-normal text-[#002A5C]">Your QR Code</h2>
                                <button className=" text-blue-500 hover:underline"> View </button>

                            </div>
                            
                            <div className="flex flex-col justify-center items-center">
                                <QRCodeSVG value={"TODO"} />
                                <p className='text-gray-500 text-sm mt-2'> Show this to transfer points </p>
                            </div>

                        </div>

                        {/* Active Promotions */}
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

                        {/* Popular Redemption s */}
                    </div>


                </div>
                
            </div>
        </div>
    );
};

export default Dashboard;