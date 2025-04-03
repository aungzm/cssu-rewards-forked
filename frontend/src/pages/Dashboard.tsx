import React from 'react';
import Navbar from '../components/Navbar';
import DashboardPoints from '../components/DashboardPoints';
import TransactionListEntry from '../components/TransactionListEntry';
import EventListEntry from '../components/EventListEntry';
import { fetchWithAuth } from '../utils/authHelper';
import { API_BASE_URL } from '../utils/auth';

const Dashboard: React.FC = () => {


    const [transactionList, setTransactionList] = React.useState<any[]>();
    const [eventList, setEventList] = React.useState<any[]>([]);
    
    // Function to make a call to the fetchWithAuth function
    const fetchData = async (url: string)  => {
        const response = await fetchWithAuth(API_BASE_URL + url);

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
                const transactions = await fetchData('/users/me/transactions');
                setTransactionList(transactions.results.slice(0, 3));

                // Fetch events
                const events = await fetchData('/events');
                setEventList(events.results.slice(0, 2));
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

            <div className="container mx-auto mt-10">
                <h1 className="text-3xl font-bold">Welcome Back, Hussain!</h1>
                <p className="mt-4">Welcome to your dashboard!</p>
                
                <DashboardPoints />

                {transactionList && transactionList.length > 0 && (
                    <div className="mt-8">
                        <h2 className="text-2xl font-semibold">Recent Transactions</h2>
                        <button className="mt-2 text-blue-500 hover:underline"> View All </button>
                        <div className="mt-4">
                            {transactionList.map((transaction: any) => (
                                <TransactionListEntry />
                            ))}
                        </div>
                    </div>
                )}

                {eventList && eventList.length > 0 && (
                    <div className="mt-8">
                        <h2 className="text-2xl font-semibold">Upcoming Events</h2>
                        <button className="mt-2 text-blue-500 hover:underline"> View All </button>
                        <div className="mt-4">
                            {eventList.map((event: any) => (
                                <EventListEntry />
                            ))}
                        </div>
                    </div>
                )} 

                        
            </div>
        </div>
    );
};

export default Dashboard;