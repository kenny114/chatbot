import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { chatbotAPI } from '../services/api';
import { Chatbot } from '../types';
import CreateChatbotModal from '../components/CreateChatbotModal';
import { DashboardLoadingSkeleton } from '../components/LoadingState';
import { UpgradeBanner } from '../components/UpgradeBanner';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

const Dashboard: React.FC = () => {
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
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

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    setIsDeleting(true);
    try {
      await chatbotAPI.deleteChatbot(deleteConfirm.id);
      setChatbots(chatbots.filter((bot) => bot.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete chatbot:', error);
      alert('Failed to delete chatbot');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    fetchChatbots();
  };


  if (isLoading) {
    return (
      <div className="container-responsive py-8">
        <DashboardLoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      {/* Upgrade Banner for Free Users */}
      <UpgradeBanner variant="compact" />

      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-foreground">
        <h1 className="text-2xl font-bold">Chatbots</h1>
        <Button onClick={() => setShowCreateModal(true)} variant="outline" size="sm" className="border border-foreground hover:bg-foreground hover:text-background">
          <Plus className="h-4 w-4 mr-2" />
          Create
        </Button>
      </div>

      {/* Chatbots List */}
      {chatbots.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-6 text-sm">No chatbots yet</p>
          <Button onClick={() => setShowCreateModal(true)} variant="outline" size="sm" className="border border-foreground hover:bg-foreground hover:text-background">
            Create chatbot
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {chatbots.map((chatbot) => (
            <div key={chatbot.id} className="border border-foreground p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold mb-1">{chatbot.name}</h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {chatbot.description || 'No description'}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    onClick={() => navigate(`/chatbot/${chatbot.id}`)}
                    variant="outline"
                    size="sm"
                    className="border border-foreground hover:bg-foreground hover:text-background"
                  >
                    View
                  </Button>
                  <Button
                    onClick={() => setDeleteConfirm({ id: chatbot.id, name: chatbot.name })}
                    variant="outline"
                    size="sm"
                    className="border border-foreground hover:bg-foreground hover:text-background"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Chatbot Modal */}
      <CreateChatbotModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Chatbot</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirm?.name}"? This action cannot be
              undone and will remove all associated data sources and conversations.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              disabled={isDeleting}
              size="sm"
              className="border border-foreground hover:bg-foreground hover:text-background"
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={isDeleting}
              size="sm"
              className="border border-foreground hover:bg-foreground hover:text-background"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
