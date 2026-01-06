import React, { useState } from 'react';
import { chatbotAPI } from '../services/api';

interface CreateChatbotModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateChatbotModal: React.FC<CreateChatbotModalProps> = ({ onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await chatbotAPI.createChatbot(name, description, instructions);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create chatbot');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Create New Chatbot</h3>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Chatbot Name *</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Customer Support Bot"
            />
          </div>
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Helps customers with common questions"
              rows={3}
            />
          </div>
          <div className="form-group">
            <label htmlFor="instructions">Custom Instructions</label>
            <textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Be friendly and professional. Always greet customers warmly..."
              rows={4}
            />
            <small style={{ color: '#666', fontSize: '12px' }}>
              Optional: Give specific instructions on how the chatbot should behave
            </small>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Chatbot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateChatbotModal;
