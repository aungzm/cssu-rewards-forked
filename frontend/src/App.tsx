// import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import RoleManagementPage from './pages/RoleManagement';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/management" element={<RoleManagementPage/>}/>
      </Routes>
    </Router>
  );
}

export default App;