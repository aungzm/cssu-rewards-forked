import React from 'react';
import DashboardPoints from './Dashboard/DashboardPoints';
import TransactionListEntry from './Dashboard/TransactionListEntry';
import EventListEntry from './Dashboard/EventListEntry';


function DashboardTable() {

}



function Dashboard() {
    // get /users/me/transactions /events

    return (
        <div className="dashboard">
        <h1>Welcome Back, Hussain!</h1>
        <p>Here's what's happening with your rewards </p>

        <DashboardPoints />

        <TransactionListEntry />
        <EventListEntry />

        </div>
    );
}

