import React from 'react';
import { Navigate, Outlet } from 'react-router-dom'; // Import Outlet
import { isAuthenticated } from '../utils/auth';
import { UserProvider } from '../context/UserContext'; // Import UserProvider

const ProtectedRoute: React.FC = () => {
  // Check Authentication
  if (!isAuthenticated()) {
    // If not authenticated, redirect to login
    return <Navigate to="/login" replace />;
  }

  // If authenticated, wrap the content (Outlet) with UserProvider
  return (
    <UserProvider>
      {/* Outlet will render the matched nested route (e.g., Dashboard) */}
      <Outlet />
    </UserProvider>
  );
};

export default ProtectedRoute;
