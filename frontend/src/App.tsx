// src/App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
// import Dashboard from './pages/Dashboard';
// import ProtectedRoute from './components/ProtectedRoute';
import Signup from './pages/Signup';
import { isAuthenticated } from './utils/auth';

function App() {
  return (
    <Router>
      <Routes>
        {/* Login route - redirect to dashboard if already authenticated */}
        <Route 
          path="/login" 
          element={isAuthenticated() ? <Navigate to="/dashboard" replace /> : <Login />} 
        />
        {/* Signup route */}
        <Route
          path="/signup"
          element={isAuthenticated() ? <Navigate to="/dashboard" replace /> : <Signup />}
        />

        {/* Protected routes */}
        {/* <Route 
          path="/dashboard" 
          element={<ProtectedRoute><Dashboard /></ProtectedRoute>} 
        /> */}
        {/* Default route */}
        <Route 
          path="/" 
          element={isAuthenticated() ? <Navigate to="/dashboard" replace /> : <Login />} 
        />
        {/* Catch-all route for 404s */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
