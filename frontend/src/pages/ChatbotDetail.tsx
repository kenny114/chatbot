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
  const [viewingSourceId, setViewingSourceId] = useState<string | null>(null);
  const [sourceChunks, setSourceChunks] = useState<any[]>([]);

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

  // Auto-refresh when there are processing data sources
  useEffect(() => {
    const hasProcessing = dataSources.some(ds => ds.status === 'processing');

    if (hasProcessing) {
      const interval = setInterval(() => {
        fetchData();
      }, 5000); // Poll every 5 seconds

      return () => clearInterval(interval);
    }
  }, [dataSources, id]);

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

  const handleRetrySource = async (sourceId: string) => {
    try {
      const failedSource = dataSources.find(s => s.id === sourceId);
      if (!failedSource || failedSource.type !== 'url') return;

      // Delete the failed source
      await chatbotAPI.deleteDataSource(id!, sourceId);

      // Re-add it to trigger a new crawl
      await chatbotAPI.addUrlSource(id!, failedSource.source_url!);

      // Refresh data
      fetchData();
      alert('Retry started! The crawl will begin shortly.');
    } catch (error) {
      console.error('Failed to retry:', error);
      alert('Failed to retry data source');
    }
  };

  const handleViewContent = async (sourceId: string) => {
    try {
      // Fetch chunks for this data source
      const response = await fetch(`http://localhost:3001/api/chatbots/${id}/sources/${sourceId}/chunks`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch content');

      const data = await response.json();
      setSourceChunks(data.chunks || []);
      setViewingSourceId(sourceId);
    } catch (error) {
      console.error('Failed to fetch content:', error);
      alert('Failed to load content');
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
                      <div>
                        Status: <span className={`status-badge status-${source.status}`}>
                          {source.status}
                        </span>
                        {source.status === 'processing' && (
                          <span style={{ marginLeft: '10px', color: '#666' }}>
                            ⏳ Crawling in progress...
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                        Added: {new Date(source.created_at).toLocaleString()}
                      </div>
                      {source.error_message && (
                        <div style={{ color: '#f44336', marginTop: '5px', padding: '8px', backgroundColor: '#ffebee', borderRadius: '4px' }}>
                          <strong>Error:</strong> {source.error_message}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginLeft: '10px' }}>
                      {source.status === 'completed' && (
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleViewContent(source.id)}
                          style={{ width: 'auto', padding: '8px 16px' }}
                        >
                          👁️ View Content
                        </button>
                      )}
                      {source.status === 'failed' && source.type === 'url' && (
                        <button
                          className="btn"
                          onClick={() => handleRetrySource(source.id)}
                          style={{ width: 'auto', padding: '8px 16px' }}
                        >
                          🔄 Retry
                        </button>
                      )}
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDeleteSource(source.id)}
                        style={{ width: 'auto', padding: '8px 16px' }}
                      >
                        Delete
                      </button>
                    </div>
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

      {viewingSourceId && (
        <div className="modal-overlay" onClick={() => setViewingSourceId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '80vh', overflow: 'auto' }}>
            <h3>Crawled Content</h3>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              {sourceChunks.length} content chunks found
            </p>

            {sourceChunks.length === 0 ? (
              <p>No content available</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {sourceChunks.map((chunk, idx) => (
                  <div
                    key={chunk.id}
                    style={{
                      padding: '15px',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      backgroundColor: '#f9f9f9',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <strong>Chunk {idx + 1}</strong>
                      {chunk.metadata?.source_url && (
                        <a
                          href={chunk.metadata.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: '12px', color: '#1976d2' }}
                        >
                          Source URL ↗
                        </a>
                      )}
                    </div>
                    <p style={{ fontSize: '14px', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>
                      {chunk.content.substring(0, 500)}
                      {chunk.content.length > 500 && '...'}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setViewingSourceId(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatbotDetail;
