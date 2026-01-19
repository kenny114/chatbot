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
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { AlertCircle, Globe, FileText, Type } from 'lucide-react';
import FileUploadZone from './FileUploadZone';

interface AddDataSourceModalProps {
  open: boolean;
  chatbotId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const AddDataSourceModal: React.FC<AddDataSourceModalProps> = ({
  open,
  chatbotId,
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'url' | 'text' | 'file'>('url');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (activeTab === 'url') {
        await chatbotAPI.addUrlSource(chatbotId, url);
      } else if (activeTab === 'text') {
        await chatbotAPI.addTextSource(chatbotId, text);
      } else if (activeTab === 'file') {
        // TODO: Implement file upload API
        // For now, show a placeholder message
        setError('File upload feature is coming soon. Backend API needs to be implemented.');
        setIsLoading(false);
        return;
      }

      // Clear form and close
      setUrl('');
      setText('');
      setSelectedFiles([]);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add data source');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setUrl('');
      setText('');
      setSelectedFiles([]);
      setError('');
      setActiveTab('url');
      onClose();
    }
  };

  const isFormValid = () => {
    if (activeTab === 'url') return url.trim().length > 0;
    if (activeTab === 'text') return text.trim().length >= 10;
    if (activeTab === 'file') return selectedFiles.length > 0;
    return false;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Data Source</DialogTitle>
          <DialogDescription>
            Add content to train your chatbot. Choose from a website URL, manual text input, or file upload.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="py-4">
            {error && (
              <div className="flex items-start gap-2 p-3 mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="url" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <span className="hidden sm:inline">Website</span>
                </TabsTrigger>
                <TabsTrigger value="text" className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  <span className="hidden sm:inline">Text</span>
                </TabsTrigger>
                <TabsTrigger value="file" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">File</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="url" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="url">
                    Website URL <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="url"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    The crawler will extract content from this URL and related pages
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="text" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="text">
                    Text Content <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Enter company information, FAQs, product details..."
                    rows={10}
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 10 characters, maximum 100,000 characters
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="file" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>
                    Upload Files <span className="text-red-500">*</span>
                  </Label>
                  <FileUploadZone
                    onFilesSelected={setSelectedFiles}
                    maxFiles={5}
                    maxSizeMB={10}
                    acceptedFileTypes={['.pdf', '.docx', '.txt', '.csv']}
                    multiple={true}
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Supported formats: PDF, DOCX, TXT, CSV (Max 10MB per file)
                  </p>
                </div>
              </TabsContent>
            </Tabs>
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
            <Button type="submit" disabled={isLoading || !isFormValid()}>
              {isLoading ? 'Adding...' : 'Add Source'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddDataSourceModal;
