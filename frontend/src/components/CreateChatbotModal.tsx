import React, { useState } from 'react';
import { chatbotAPI } from '../services/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { AlertCircle } from 'lucide-react';

interface CreateChatbotModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateChatbotModal: React.FC<CreateChatbotModalProps> = ({ open, onClose, onSuccess }) => {
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
      setName('');
      setDescription('');
      setInstructions('');
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create chatbot');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setName('');
      setDescription('');
      setInstructions('');
      setError('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create New Chatbot</DialogTitle>
          <DialogDescription>
            Set up a new AI chatbot for your business. Give it a name, description, and custom instructions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {error && (
              <div className="flex items-start gap-2 p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">
                Chatbot Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Customer Support Bot"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Helps customers with common questions"
                rows={3}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">Custom Instructions</Label>
              <Textarea
                id="instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Be friendly and professional. Always greet customers warmly..."
                rows={4}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Optional: Give specific instructions on how the chatbot should behave
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Chatbot'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateChatbotModal;
