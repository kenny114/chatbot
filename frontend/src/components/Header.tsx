import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Header: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="header">
      <div className="header-content">
        <h1>AI Chatbot Platform</h1>
        <button onClick={handleLogout}>Logout</button>
      </div>
    </div>
  );
};

export default Header;
