// import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import RoleManagementPage from './pages/RoleManagement';
import UserProfile from './pages/UserProfile';
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/management" element={<RoleManagementPage/>}/>
        <Route path="/users/me" element={<UserProfile/>}/>
      </Routes>
    </Router>
  );
}

export default App;