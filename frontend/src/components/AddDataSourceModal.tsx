import React, { useState } from 'react';
import { chatbotAPI } from '../services/api';

interface AddDataSourceModalProps {
  chatbotId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const AddDataSourceModal: React.FC<AddDataSourceModalProps> = ({
  chatbotId,
  onClose,
  onSuccess,
}) => {
  const [sourceType, setSourceType] = useState<'url' | 'text'>('url');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (sourceType === 'url') {
        await chatbotAPI.addUrlSource(chatbotId, url);
      } else {
        await chatbotAPI.addTextSource(chatbotId, text);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add data source');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Add Data Source</h3>
        {error && <div className="error">{error}</div>}

        <div className="form-group">
          <label>Source Type</label>
          <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
            <button
              type="button"
              className={`btn ${sourceType === 'url' ? '' : 'btn-secondary'}`}
              onClick={() => setSourceType('url')}
            >
              Website URL
            </button>
            <button
              type="button"
              className={`btn ${sourceType === 'text' ? '' : 'btn-secondary'}`}
              onClick={() => setSourceType('text')}
            >
              Manual Text
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {sourceType === 'url' ? (
            <div className="form-group">
              <label htmlFor="url">Website URL *</label>
              <input
                type="url"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                placeholder="https://example.com"
              />
              <small style={{ color: '#666', fontSize: '12px' }}>
                The crawler will extract content from this URL and related pages
              </small>
            </div>
          ) : (
            <div className="form-group">
              <label htmlFor="text">Text Content *</label>
              <textarea
                id="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                required
                placeholder="Enter company information, FAQs, product details..."
                rows={10}
              />
              <small style={{ color: '#666', fontSize: '12px' }}>
                Minimum 10 characters, maximum 100,000 characters
              </small>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn" disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Add Source'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDataSourceModal;
