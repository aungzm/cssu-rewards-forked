import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { fetchWithAuth } from "../utils/authHelper";
import { API_BASE_URL } from "../utils/auth";
import { useUser } from "../context/UserContext";
import { QRCodeSVG } from "qrcode.react";
import DashboardPoints from "../components/Dashboard/DashboardPoints";
import TransactionListEntry from "../components/Dashboard/TransactionListEntry";
import EventListEntry from "../components/Dashboard/EventListEntry";
import PromotionListEntry from "../components/Dashboard/PromotionListEntry";
import RedemptionListEntry from "../components/Dashboard/RedemptionListEntry";
import EventDetailsModal from "../components/event/eventDetailsModal";
import PromotionDetailsModal from "../components/promotion/PromotionDetailsModal";
import { Promotion, EventDetails } from "../types/"
import { useNavigate } from "react-router-dom";

interface UserData {
  name: string;
  role?: string; // added role for modal usage
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



const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  // Data lists
  const [redemptionList, setRedemptionList] = useState<Redemption[]>([]);
  const [transactionList, setTransactionList] = useState<Transaction[]>([]);
  const [eventList, setEventList] = useState<EventDetails[]>([]);
  const [promotionList, setPromotionList] = useState<Promotion[]>([]);

  // Modal state for events and promotions
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [isEventModalOpen, setEventModalOpen] = useState<boolean>(false);
  const [selectedPromotion, setSelectedPromotion] =
    useState<Promotion | null>(null);
  const [isPromotionModalOpen, setPromotionModalOpen] =
    useState<boolean>(false);

  const user = useUser() as UserContextType;

  // Helper to fetch data with auth
  const fetchData = async (url: string) => {
    const response = await fetchWithAuth(`${API_BASE_URL}${url}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status}`);
    }
    const data = await response.json();
    return data;
  };

  // Fetch dashboard data on mount
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch transactions
        const transactions = await fetchData(
          "/users/me/transactions?limit=20"
        );
        setTransactionList(transactions.results.slice(9, 14)); // TODO: update to use limit

        // Fetch events
        const events = await fetchData(
          "/events?started=false&showFull=false&limit=3"
        );
        setEventList(events.results);

        // Fetch promotions
        const promotions = await fetchData("/promotions?limit=10");
        setPromotionList(promotions.results.slice(3, 7));

        // Get user's redemptions
        const redemptions = await fetchData(
          "/users/me/transactions?limit=2&type=redemption"
        );
        setRedemptionList(redemptions.results);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    };

    fetchDashboardData();
  }, []);

  // Repeated Component: list header
  const ListHeader = (props: { heading: string; link: string }) => {
    const { heading, link } = props;
    return (
      <div className="flex flex-row justify-between items-center ">
        <h2 className="text-lg font-normal text-[#002A5C] dark:text-white">{heading}</h2>
        <button
          className="text-blue-500 hover:underline dark:text-blue-400"
          onClick={() => navigate(`/${link}`)}
        >
          View All 
        </button>
      </div>
    );
  };

  return (
    <div>
      <Navbar activeLink="dashboard" />
      <div className="bg-gray-100 dark:bg-gray-900 min-h-screen">
        {/* Responsive container: stacks on mobile */}
        <div className="flex flex-col md:flex-row justify-center w-full px-4 pt-5 mx-auto max-w-6xl">
          {/* Main content column */}
          <div className="flex-1 md:max-w-3xl flex flex-col mr-4 w-full">
            {/* Heading */}
            <div className="mb-4">
              <h1 className="text-2xl font-medium text-[#002A5C] dark:text-white">
                Welcome Back, {user?.userData?.name || "User"}!
              </h1>
              <p className="text-gray-500">Welcome to your dashboard!</p>
            </div>
            {/* Dashboard Points Card */}
            <DashboardPoints />
            {/* Recent Transactions */}
            {transactionList && transactionList.length > 0 && (
              <div className="flex flex-col bg-white shadow-md rounded-lg p-4 mt-4 mr-8 dark:bg-slate-600">
                <ListHeader heading="Recent Transactions" link="transaction-history" />
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
              <div className="flex flex-col bg-white shadow-md rounded-lg p-4 mt-8 mb-8 mr-8 dark:bg-slate-600">
                <ListHeader heading="Upcoming Events" link="events" />
                <div className="mt-4 space-y-2">
                  {eventList.map((event: EventDetails, index) => (
                    <EventListEntry
                      key={index}
                      event={event}
                      onClick={() => {
                        setSelectedEventId(event.id);
                        setEventModalOpen(true);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* Right Sidebar */}
          <div className="w-full md:w-1/4 shrink-0 mt-4 md:mt-0 ">
            {/* Spacer for mobile */}
            <div className="w-full h-20 "></div>
            {/* QR Code Container */}
            <div className="flex flex-col bg-white shadow-md rounded-lg p-4 dark:bg-slate-600">
              <ListHeader heading="Your QR Code" link="profile" />
                <div className="flex flex-col justify-center items-center pt-2 mt-2 border-t border-gray-300">
                <QRCodeSVG value={String(useUser().userData?.id || "")} bgColor="transparent" />
                <p className="text-gray-500 text-sm mt-2 dark:text-white">
                  Show this to transfer points
                </p>
                </div>
            </div>
            {/* Active Promotions */}
            {promotionList && promotionList.length > 0 && (
              <div className="flex flex-col bg-white shadow-md rounded-lg p-4 mt-4 dark:bg-slate-600">
                <ListHeader heading="Promotions" link="promotions"/>
                <div className="mt-4 space-y-2">
                  {promotionList.map((promotion: Promotion, index) => (
                    <PromotionListEntry
                      key={index}
                      promotion={promotion}
                      onClick={() => {
                        setSelectedPromotion(promotion);
                        setPromotionModalOpen(true);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            {/* Previous Redemptions */}
            {redemptionList && redemptionList.length > 0 && (
              <div className="flex flex-col bg-white shadow-md rounded-lg p-4 mt-4 dark:bg-slate-600">
                <ListHeader heading="My Redemptions" link="redeem-points" />
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
      {/* Modals */}
      {isEventModalOpen && (
        <EventDetailsModal
          isOpen={isEventModalOpen}
          onClose={() => setEventModalOpen(false)}
          onEdit={() => console.log("Edit event", selectedEventId)}
          eventId={selectedEventId || undefined}
        />
      )}
      {isPromotionModalOpen && selectedPromotion && (
        <PromotionDetailsModal
          isOpen={isPromotionModalOpen}
          onClose={() => setPromotionModalOpen(false)}
          onEdit={() =>
            console.log("Edit promotion", selectedPromotion?.id)
          }
          promotion={selectedPromotion}
        />
      )}
    </div>
  );
};

export default Dashboard;
