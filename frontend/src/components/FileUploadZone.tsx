import React, { useState, useCallback } from 'react';
import { Upload, X, FileText, File, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { cn } from '@/lib/utils';

interface FileWithPreview extends File {
  preview?: string;
}

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  acceptedFileTypes?: string[];
  multiple?: boolean;
  disabled?: boolean;
}

const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFilesSelected,
  maxFiles = 10,
  maxSizeMB = 10,
  acceptedFileTypes = ['.pdf', '.docx', '.txt', '.csv'],
  multiple = true,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const [error, setError] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  // Get file type icon
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (extension === 'pdf') return <FileText className="h-5 w-5 text-error-500" />;
    if (extension === 'docx' || extension === 'doc') return <FileText className="h-5 w-5 text-info-500" />;
    if (extension === 'txt') return <FileText className="h-5 w-5 text-gray-500" />;
    if (extension === 'csv') return <File className="h-5 w-5 text-accent-500" />;
    return <File className="h-5 w-5 text-gray-500" />;
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // Validate file
  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSizeBytes) {
      return `File size exceeds ${maxSizeMB}MB limit`;
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedFileTypes.includes(fileExtension)) {
      return `File type not supported. Accepted: ${acceptedFileTypes.join(', ')}`;
    }

    return null;
  };

  // Handle file selection
  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      setError('');
      const fileArray = Array.from(files);

      // Check max files limit
      if (selectedFiles.length + fileArray.length > maxFiles) {
        setError(`Maximum ${maxFiles} files allowed`);
        return;
      }

      // Validate each file
      const validFiles: FileWithPreview[] = [];
      for (const file of fileArray) {
        const validationError = validateFile(file);
        if (validationError) {
          setError(validationError);
          return;
        }
        validFiles.push(file);
      }

      const newFiles = [...selectedFiles, ...validFiles];
      setSelectedFiles(newFiles);
      onFilesSelected(newFiles);
    },
    [selectedFiles, maxFiles, onFilesSelected]
  );

  // Handle drag events
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    handleFiles(files);
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  // Remove file from list
  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    onFilesSelected(newFiles);
    setError('');
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-8 transition-all duration-200',
          isDragging
            ? 'border-primary bg-primary/5 scale-[1.02]'
            : 'border-border hover:border-primary/50',
          disabled && 'opacity-50 cursor-not-allowed',
          !disabled && 'cursor-pointer'
        )}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          multiple={multiple}
          accept={acceptedFileTypes.join(',')}
          onChange={handleFileInputChange}
          disabled={disabled}
        />

        <label
          htmlFor="file-upload"
          className={cn(
            'flex flex-col items-center justify-center space-y-4',
            !disabled && 'cursor-pointer'
          )}
        >
          <div
            className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center transition-colors',
              isDragging ? 'bg-primary/20' : 'bg-muted'
            )}
          >
            <Upload
              className={cn(
                'h-8 w-8 transition-colors',
                isDragging ? 'text-primary' : 'text-muted-foreground'
              )}
            />
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {isDragging ? 'Drop files here' : 'Click to upload or drag and drop'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {acceptedFileTypes.join(', ').toUpperCase()} (Max {maxSizeMB}MB)
            </p>
          </div>

          {!disabled && (
            <Button type="button" variant="secondary" size="sm">
              Browse Files
            </Button>
          )}
        </label>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-error-50 dark:bg-error-950 border border-error-200 dark:border-error-800 rounded-lg">
          <AlertCircle className="h-4 w-4 text-error-600 dark:text-error-400 flex-shrink-0" />
          <p className="text-sm text-error-700 dark:text-error-300">{error}</p>
        </div>
      )}

      {/* File List */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            Selected Files ({selectedFiles.length}/{maxFiles})
          </p>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
              >
                {getFileIcon(file.name)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                  disabled={disabled}
                  className="flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Progress (for future use) */}
      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Uploading...</span>
            <span className="font-medium text-foreground">{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}
    </div>
  );
};

export default FileUploadZone;
