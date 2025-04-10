import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { fetchWithAuth } from '../utils/authHelper';
import { API_BASE_URL } from '../utils/auth';
import { useUser } from '../context/UserContext';
import { QRCodeSVG } from 'qrcode.react';
import DashboardPoints from '../components/Dashboard/DashboardPoints';
import TransactionListEntry from '../components/Dashboard/TransactionListEntry';
import EventListEntry from '../components/Dashboard/EventListEntry';
import PromotionListEntry from '../components/Dashboard/PromotionListEntry';
import RedemptionListEntry from '../components/Dashboard/RedemptionListEntry';

interface EventData {
  id: string;
  // Please fill it out with what you need
}

interface UserData {
  name: string;
  // Add other user properties as needed
}

interface UserContextType {
  userData: UserData | null;
}

interface Transaction {
  id: number;
  amount: number;
  date: string;
  description: string;
}

interface Redemption {
  id: number;
  // Define additional properties for redemption if needed
}

interface Promotion {
  id: number;

}

const Dashboard: React.FC = () => {
  // Initialize lists as empty arrays
  const [redemptionList, setRedemptionList] = useState<Redemption[]>([]);
  const [transactionList, setTransactionList] = useState<Transaction[]>([]);
  const [eventList, setEventList] = useState<EventData[]>([]);
  const [promotionList, setPromotionList] = useState<Promotion[]>([]);
  
  const user = useUser() as UserContextType;

  // Function to make a call to the fetchWithAuth function
  const fetchData = async (url: string) => {
    const response = await fetchWithAuth(`${API_BASE_URL}${url}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status}`);
    }
    const data = await response.json();
    return data;
  };

  // Each time the component mounts, fetch the transactions and events
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch transactions
        const transactions = await fetchData(
          '/users/me/transactions?limit=20'
        );
        setTransactionList(transactions.results.slice(9, 14)); // TODO: update this to use limit, not slice

        // Fetch events
        const events = await fetchData(
          '/events?started=false&showFull=false&limit=3'
        );
        setEventList(events.results);

        // Fetch promotions
        const promotions = await fetchData('/promotions?limit=10');
        setPromotionList(promotions.results.slice(3, 7));

        // Get user's redemptions
        const redemptions = await fetchData(
          '/users/me/transactions?limit=2&type=redemption'
        );
        setRedemptionList(redemptions.results);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    };

    fetchDashboardData();
  }, []);
  
  // Repeated Component. Placed here instead of in components to avoid navigation issues
  const ListHeader = (props: { heading: string; link: string }) => {
    const { heading, link } = props;
    return (
      <div className="flex flex-row justify-between items-center">
        <h2 className="text-lg font-normal text-[#002A5C]">{heading}</h2>
        <button className="text-blue-500 hover:underline">{link}</button>
      </div>
    );
  };

  return (
    <div>
      <Navbar activeLink="dashboard" />
      <div className="bg-gray-100 dark:bg-gray-900 min-h-screen">
        <div className="flex flex-row justify-center w-full px-4 pt-5 mx-auto max-w-6xl">
          {/* Main Content Column */}
          <div className="flex-1 max-w-3xl flex flex-col mr-4">
            {/* Heading */}
            <div className="mb-4">
              {' '}
              <h1 className="text-2xl font-medium text-[#002A5C] dark:text-white">
                Welcome Back, {user?.userData?.name || 'User'}!
              </h1>
              <p className="text-gray-500">Welcome to your dashboard!</p>
            </div>
            {/* Dashboard Points Card */}
            <DashboardPoints />
            {/* Recent Transactions */}
            {transactionList && transactionList.length > 0 && (
              <div className="flex flex-col bg-white shadow-md rounded-lg p-4 mt-4 mr-8">
                {' '}
                <ListHeader heading="Recent Transactions" link="View All" />
                <div className="mt-4">
                  {transactionList.map((transaction: Transaction, index) => (
                    <TransactionListEntry
                      transaction={transaction}
                      key={index}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* Upcoming Events */}
            {eventList && eventList.length > 0 && (
              <div className="flex flex-col bg-white shadow-md rounded-lg p-4 mt-8 mb-8 mr-8">
                {' '}
                <ListHeader heading="Upcoming Events" link="View All" />
                <div className="mt-4">
                  {eventList.map((event: EventData, index) => (
                    <EventListEntry key={index} event={event} />
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* Right Sidebar */}
          <div className="w-1/4 shrink-0">
          {/* Spacer for better layout */}
          <div className='w-full h-20'></div>
            {/* QR Code Container */}
            <div className="flex flex-col bg-white shadow-md rounded-lg p-4">
              <ListHeader heading="Your QR Code" link="View" />
              <div className="flex flex-col justify-center items-center pt-2 mt-2 border-t border-gray-300">
                {' '}
                <QRCodeSVG value={'TODO'} /> 
                <p className="text-gray-500 text-sm mt-2">
                  Show this to transfer points
                </p>
              </div>
            </div>
  
            {/* Active Promotions */}
            {promotionList && promotionList.length > 0 && (
              <div className="flex flex-col bg-white shadow-md rounded-lg p-4 mt-4">
                {' '}
                <ListHeader heading="Promotions" link="View All" />
                <div className="mt-4">
                  {promotionList.map((promotion: Promotion, index) => (
                    <PromotionListEntry
                      key={index}
                      promotion={promotion}
                    />
                  ))}
                </div>
              </div>
            )}
  
            {/* Previous Redemptions */}
            {redemptionList && redemptionList.length > 0 && (
              <div className="flex flex-col bg-white shadow-md rounded-lg p-4 mt-4">
                {' '}
                <ListHeader heading="My Redemptions" link="" />
                <div className="mt-4">
                  {redemptionList.map((redemption: Redemption, index) => (
                    <RedemptionListEntry
                      key={index}
                      redemption={redemption}
                    />
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
