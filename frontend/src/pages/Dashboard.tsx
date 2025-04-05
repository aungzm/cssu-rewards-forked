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
import RedemptionListEntry from '../components/Dashboard/RedemptionListEntry';

const Dashboard: React.FC = () => {


    const [transactionList, setTransactionList] = React.useState<any[]>();
    const [eventList, setEventList] = React.useState<any[]>([]);
    const [promotionList, setPromotionList] = React.useState<any[]>([]);
    const [redemptionList, setRedemptionList] = React.useState<any []>([]);
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
                setTransactionList(transactions.results.slice(9, 14));  // TODO update this to use limit not slice
                
                // Fetch events
                const events = await fetchData('/events?started=false&showFull=false&limit=3');
                setEventList(events.results);

                // Fetch promotions
                const promotions = await fetchData('/promotions?limit=10');
                setPromotionList(promotions.results.slice(3, 7));
                
                // Get user's redemptions
                const redemptions = await fetchData('/users/me/transactions?limit=2&type=redemption');
                setRedemptionList(redemptions.results);

            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            }
        };

        fetchDashboardData();

    }, []);
    
    // Repeated Component. Placed here instead of in components to avoid dealing with navigation issues
    const ListHeader = (props: {heading: string, link: string}) => {

        const {heading, link} = props;
        return( 
    
        <div className='flex flex-row justify-between items-center'> 
            <h2 className="text-lg font-normal text-[#002A5C]">{heading}</h2>
            <button className="text-blue-500 hover:underline">{link} </button>
        </div>
        )
    
    }

    return (
        <div>
            
            <Navbar activeLink="dashboard" />
            <div className=" bg-gray-100 dark:bg-gray-900 "> {/* This is the main page container  */}

                {/* Heading */}
                <div className='pt-5 justify-center items-left text-center flex flex-col max-w-2xl'>
                <h1 className="text-2xl font-medium text-[#002A5C] dark:text-white ">Welcome Back, {user?.userData?.name || "User"}!</h1> {/* Unsure why name is giving error */}
                <p className="text-gray-500">Welcome to your dashboard!</p>
                </div>

                <div className='flex flex-row justify-center w-full'>


                    {/* Main Content */}
                    <div className='flex-1 max-w-3xl flex-col'>

                        <DashboardPoints />
                        {/* Recent Transactions */}
                        {transactionList && transactionList.length > 0 && (
                            <div className="flex flex-col bg-white shadow-md rounded-lg p-4 max-w-2xl">
                                <ListHeader heading='Recent Transactions' link='View All' />
                                
                                <div className="mt-4">
                                    {transactionList.map((transaction: any, index: number) => (
                                        <TransactionListEntry transaction={transaction} key={index}/>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/*Upcoming Events */}
                        {eventList && eventList.length > 0 && (
                            <div className="flex flex-col bg-white mt-4 shadow-md rounded-lg p-4 max-w-2xl">
                                <ListHeader heading='Upcoming Events' link='View All' />


                                <div className="mt-4">
                                    {eventList.map((event: any, index: number) => (
                                        <EventListEntry key={index} event={event}/>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div> 

                    {/* Right Sidebar */}
                    <div className='mr-[1%] w-1/5 shrink-0' >
                    
                        {/* QR Code Container */}
                        <div className="flex flex-col bg-white shadow-md rounded-lg p-4 max-w-2xl my-4">

                            <ListHeader heading='Your QR Code' link='View' />

                            
                            <div className="flex flex-col justify-center items-center pt-2 border-t border-gray-300">
                                <QRCodeSVG value={"TODO"} />
                                <p className='text-gray-500 text-sm mt-2'> Show this to transfer points </p>
                            </div>

                        </div>

                        {/* Active Promotions */}
                        {promotionList && promotionList.length > 0 && (
                            <div className="flex flex-col bg-white shadow-md rounded-lg p-4 max-w-2xl my-4"> 
                                <ListHeader heading='Promotions' link='View All' />

                                <div className="mt-4">
                                    {promotionList.map((promotion: any, index: number) => (
                                        <PromotionListEntry key={index} promotion={promotion}/>
                                    ))}
                                </div>
                        </div>)}

                        {/* Previous Redemptions */}
                        {redemptionList && redemptionList.length > 0 && (
                            <div className="flex flex-col bg-white shadow-md rounded-lg p-4 max-w-2xl my-4"> 
                                <ListHeader heading='My Redemptions' link='' />

                                <div className="mt-4">
                                    {redemptionList.map((redemption: any, index: number) => (
                                        <RedemptionListEntry key={index} redemption={redemption}/>
                                    ))}
                                </div>
                            </div>
                        )}


                    </div>


                </div>
                
            </div>
        </div>
    );
};

export default Dashboard;