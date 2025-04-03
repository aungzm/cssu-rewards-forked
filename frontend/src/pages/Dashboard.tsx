import React from 'react';
import Navbar from '../components/Navbar';
import DashboardPoints from '../components/DashboardPoints';
import TransactionListEntry from '../components/TransactionListEntry';
import EventListEntry from '../components/EventListEntry';
import { fetchWithAuth } from '../utils/authHelper';
import { API_BASE_URL } from '../utils/auth';

const Dashboard: React.FC = async () => {

    //     get /users/me/transactions /events
    const response = await fetchWithAuth(`${API_BASE_URL}/users/me/transactions`);
    if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.status}`);
    }

    const transactions = await response.json();
    console.log(transactions);

    const response2 = await fetchWithAuth(`${API_BASE_URL}/events`, {
        method: 'GET',
        body: JSON.stringify({limit: 3}),
    });

    if (!response2.ok) {
        throw new Error(`Failed to fetch events: ${response2.status}`);
    }
    const events = await response2.json();
    console.log(events);

    const response3 = await fetchWithAuth(`${API_BASE_URL}/promotions`);
    if (!response3.ok) {
        throw new Error(`Failed to fetch promotions: ${response3.status}`);
    }
    const promotions = await response3.json();
    console.log(promotions);

    return (
        <>
            <Navbar activeLink="dashboard" />
            <div className="container mx-auto mt-10">
                <h1 className="text-3xl font-bold">Welcome Back, Hussain!</h1>
                <p className="mt-4">Welcome to your dashboard!</p>
                
                <DashboardPoints />

                {transactions && transactions.length > 0 && (
                    <div className="mt-8">
                        <h2 className="text-2xl font-semibold">Recent Transactions</h2>
                        <button className="mt-2 text-blue-500 hover:underline"> View All </button>
                        <div className="mt-4">
                            {transactions.map((transaction: any) => (
                                <TransactionListEntry />
                            ))}
                        </div>
                    </div>
                )}

                {events && events.length > 0 && (
                    <div className="mt-8">
                        <h2 className="text-2xl font-semibold">Upcoming Events</h2>
                        <button className="mt-2 text-blue-500 hover:underline"> View All </button>
                        <div className="mt-4">
                            {events.map((event: any) => (
                                <EventListEntry />
                            ))}
                        </div>
                    </div>
                )}

                        
            </div>
        </>
    );
};

export default Dashboard;