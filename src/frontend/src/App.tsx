import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthContextProvider } from './contexts/AuthContext';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import PropertyAssessment from './pages/PropertyAssessment';
import Login from './pages/Login';
import Register from './pages/Register';
import { initFlowbite } from 'flowbite';

// Configure API base URL for production deployment
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://5puux7rpx0.execute-api.us-east-2.amazonaws.com/dev';

// Set global API configuration
(window as any).SEAWATER_API_BASE = API_BASE_URL;

function App() {
  useEffect(() => {
    initFlowbite();
  }, []);

  return (
    <AuthContextProvider>
      <div className="App">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/property/:address" element={<PropertyAssessment />} />
          <Route path="/assessment" element={<PropertyAssessment />} />
        </Routes>
      </div>
    </AuthContextProvider>
  );
}

export default App;