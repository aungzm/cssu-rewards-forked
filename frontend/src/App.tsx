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
import PromotionsPage from "./pages/Promotions";
import { isAuthenticated } from "./utils/auth";
import UserProfile from './pages/UserProfile';
import EventsPage from "./pages/Events"
import UserManagment from './pages/UserManagment';
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
          <Route path="/profile" element={<UserProfile/>}/>
          <Route path="/user-management" element={<UserManagment/>}/>
          {/* e.g., <Route path="/profile" element={<ProfilePage />} /> */}
          <Route path="/promotions" element={<PromotionsPage />} />
          <Route path="/events" element={<EventsPage />} />
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
