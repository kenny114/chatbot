import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { chatbotAPI, webhookAPI } from '../services/api';
import { Chatbot, DataSource, ChatMessage } from '../types';
import AddDataSourceModal from '../components/AddDataSourceModal';
import ChatWidget from '../components/ChatWidget';

const ChatbotDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddSourceModal, setShowAddSourceModal] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const fetchData = async () => {
    if (!id) return;

    try {
      const [chatbotResponse, sourcesResponse] = await Promise.all([
        chatbotAPI.getChatbot(id),
        chatbotAPI.getDataSources(id),
      ]);
      setChatbot(chatbotResponse.chatbot);
      setDataSources(sourcesResponse.dataSources);
    } catch (error) {
      console.error('Failed to fetch chatbot data:', error);
      alert('Failed to load chatbot');
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleAddSourceSuccess = () => {
    setShowAddSourceModal(false);
    fetchData();
  };

  const handleDeleteSource = async (sourceId: string) => {
    if (!window.confirm('Are you sure you want to delete this data source?')) {
      return;
    }

    try {
      await chatbotAPI.deleteDataSource(id!, sourceId);
      setDataSources(dataSources.filter(source => source.id !== sourceId));
      alert('Data source deleted successfully');
    } catch (error) {
      console.error('Failed to delete data source:', error);
      alert('Failed to delete data source');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const generateEmbedCode = () => {
    return `<script src="http://localhost:5173/widget.js" data-chatbot-id="${id}"></script>`;
  };

  if (isLoading) {
    return <div className="loading">Loading chatbot...</div>;
  }

  if (!chatbot) {
    return <div className="loading">Chatbot not found</div>;
  }

  return (
    <div className="container">
      <div className="chatbot-detail">
        <button
          className="btn btn-secondary"
          onClick={() => navigate('/dashboard')}
          style={{ marginBottom: '20px', width: 'auto' }}
        >
          ← Back to Dashboard
        </button>

        <h2>{chatbot.name}</h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>{chatbot.description}</p>

        <span className={`status-badge status-${chatbot.status}`}>
          {chatbot.status.toUpperCase()}
        </span>

        <div className="detail-section">
          <h3>Chatbot Instructions</h3>
          <p>{chatbot.instructions || 'No custom instructions'}</p>
        </div>

        <div className="detail-section">
          <h3>Webhook URL</h3>
          <div className="webhook-url">
            {chatbot.webhook_url}
            <button
              className="btn"
              onClick={() => copyToClipboard(chatbot.webhook_url)}
              style={{ marginTop: '10px', width: 'auto' }}
            >
              Copy URL
            </button>
          </div>
        </div>

        <div className="detail-section">
          <h3>Embed Code</h3>
          <div className="webhook-url">
            {generateEmbedCode()}
            <button
              className="btn"
              onClick={() => copyToClipboard(generateEmbedCode())}
              style={{ marginTop: '10px', width: 'auto' }}
            >
              Copy Embed Code
            </button>
          </div>
        </div>

        <div className="detail-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Data Sources ({dataSources.length})</h3>
            <button className="btn" onClick={() => setShowAddSourceModal(true)}>
              Add Data Source
            </button>
          </div>

          {dataSources.length === 0 ? (
            <p style={{ color: '#666' }}>No data sources added yet</p>
          ) : (
            <ul className="data-sources-list">
              {dataSources.map((source) => (
                <li key={source.id} className="data-source-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <strong>Type: {source.type.toUpperCase()}</strong>
                      {source.type === 'url' && <div>URL: {source.source_url}</div>}
                      <div>Status: <span className={`status-badge status-${source.status}`}>
                        {source.status}
                      </span></div>
                      {source.error_message && (
                        <div style={{ color: '#f44336', marginTop: '5px' }}>
                          Error: {source.error_message}
                        </div>
                      )}
                    </div>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDeleteSource(source.id)}
                      style={{ marginLeft: '10px', width: 'auto', padding: '8px 16px' }}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {chatbot.status === 'ready' && (
          <div className="detail-section">
            <button className="btn" onClick={() => setShowChat(!showChat)}>
              {showChat ? 'Hide Test Chat' : 'Test Chatbot'}
            </button>
          </div>
        )}
      </div>

      {showAddSourceModal && (
        <AddDataSourceModal
          chatbotId={id!}
          onClose={() => setShowAddSourceModal(false)}
          onSuccess={handleAddSourceSuccess}
        />
      )}

      {showChat && <ChatWidget chatbotId={id!} chatbotName={chatbot.name} />}
    </div>
  );
};

export default ChatbotDetail;
