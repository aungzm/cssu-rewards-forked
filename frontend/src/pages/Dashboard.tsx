import React from 'react';
import Navbar from '../components/Navbar';

const Dashboard: React.FC = () => {
    return (
        <>
            <Navbar activeLink="dashboard" />
            <div className="container mx-auto mt-10">
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <p className="mt-4">Welcome to the dashboard!</p>
                {/* Add your dashboard content here */}
            </div>
        </>
    );
};

export default Dashboard;