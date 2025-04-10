import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute"; 
import Signup from "./pages/Signup";
import { isAuthenticated } from "./utils/auth";
import UserProfile from './pages/UserProfile';
import TransactionHistory from "./pages/TransactionHistory";
import CreateTransfer from "./pages/CreateTransfer";
import CreateRedemption from "./pages/CreateRedemption";
import TransactionManager from "./pages/TransactionManager";
import CreateTransaction from "./pages/CreateTransaction";
import ProcessRedemption from "./pages/ProcessRedemption";
function App() {
  return (
    <Router>
      {/* UserProvider is now inside ProtectedRoute */}
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={isAuthenticated() ? <Navigate to="/dashboard" replace /> : <Login />}
        />
        <Route
          path="/signup"
          element={isAuthenticated() ? <Navigate to="/dashboard" replace /> : <Signup />} 
        />
        {/* Checks auth and has userProvider */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          {/* Available to all users */}
          <Route path="/transaction-history" element={<TransactionHistory />} />
          <Route path="/create-redemption" element={<CreateRedemption />} />
          <Route path="/create-transfer" element={<CreateTransfer />} />
          {/* Available to cashiers and above */}
          <Route path="/create-transaction" element={<CreateTransaction />} />
          <Route path="/process-redemption" element={<ProcessRedemption />} />
          <Route path="/transactions" element={<TransactionManager />} />
          <Route path="/profile" element={<UserProfile/>}/>
          {/* Add other protected routes here */}
          {/* e.g., <Route path="/profile" element={<ProfilePage />} /> */}
        </Route>

        {/* Default route */}
        <Route
          path="/"
          element={isAuthenticated() ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
        />

        {/* Catch-all route that are not explicitly declard */}
        <Route
          path="*"
          element={isAuthenticated() ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
        />
        
      </Routes>
    </Router>
  );
}

export default App;
