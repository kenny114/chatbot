import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatbotAPI } from '../services/api';
import { Chatbot } from '../types';
import CreateChatbotModal from '../components/CreateChatbotModal';

const Dashboard: React.FC = () => {
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const navigate = useNavigate();

  const fetchChatbots = async () => {
    try {
      const response = await chatbotAPI.getChatbots();
      setChatbots(response.chatbots);
    } catch (error) {
      console.error('Failed to fetch chatbots:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChatbots();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this chatbot?')) {
      return;
    }

    try {
      await chatbotAPI.deleteChatbot(id);
      setChatbots(chatbots.filter(bot => bot.id !== id));
    } catch (error) {
      console.error('Failed to delete chatbot:', error);
      alert('Failed to delete chatbot');
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    fetchChatbots();
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'ready':
        return 'status-ready';
      case 'processing':
        return 'status-processing';
      case 'failed':
        return 'status-failed';
      default:
        return '';
    }
  };

  if (isLoading) {
    return <div className="loading">Loading chatbots...</div>;
  }

  return (
    <div className="container">
      <div className="dashboard">
        <div className="dashboard-header">
          <h2>My Chatbots</h2>
          <button className="btn" onClick={() => setShowCreateModal(true)}>
            Create New Chatbot
          </button>
        </div>

        {chatbots.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
            <h3>No chatbots yet</h3>
            <p>Create your first chatbot to get started!</p>
          </div>
        ) : (
          <div className="chatbots-grid">
            {chatbots.map((chatbot) => (
              <div key={chatbot.id} className="chatbot-card">
                <span className={`status-badge ${getStatusClass(chatbot.status)}`}>
                  {chatbot.status.toUpperCase()}
                </span>
                <h3>{chatbot.name}</h3>
                <p>{chatbot.description || 'No description'}</p>
                <div className="card-actions">
                  <button
                    className="btn"
                    onClick={() => navigate(`/chatbot/${chatbot.id}`)}
                  >
                    View Details
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDelete(chatbot.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateChatbotModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
};

export default Dashboard;
