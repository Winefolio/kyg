import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Upload, X, Video, Music, Image, AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface MediaUploadProps {
  value?: string;
  onChange: (result: UploadResult) => void;
  accept: 'image' | 'video' | 'audio' | 'all';
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  entityId: string; // slide ID, wine ID, or package ID for file organization
  entityType?: 'slide' | 'wine' | 'package'; // Type of entity for proper categorization
}

interface UploadResult {
  publicId: string;
  accessUrl: string;
  mediaType: 'image' | 'video' | 'audio';
  fileName: string;
  fileSize: number;
}

export function MediaUpload({ 
  value, 
  onChange, 
  accept,
  label = "Upload Media", 
  placeholder = "No file selected",
  className = "",
  disabled = false,
  entityId,
  entityType = 'slide'
}: MediaUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get accepted file types based on accept prop
  const getAcceptString = () => {
    switch (accept) {
      case 'image':
        return 'image/jpeg,image/jpg,image/png,image/webp,image/gif,image/bmp,image/tiff,image/svg+xml,image/avif,image/heic,image/heif';
      case 'video':
        return 'video/mp4,video/webm,video/quicktime';
      case 'audio':
        return 'audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/m4a,audio/x-m4a,audio/aac,audio/ogg,audio/webm';
      case 'all':
        return 'image/jpeg,image/jpg,image/png,image/webp,image/gif,image/bmp,image/tiff,image/svg+xml,image/avif,image/heic,image/heif,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/m4a,audio/x-m4a,audio/aac,audio/ogg,audio/webm';
      default:
        return '';
    }
  };

  // Get file size limit based on type
  const getFileSizeLimit = (fileType: string) => {
    if (fileType.startsWith('image/')) return 10 * 1024 * 1024; // 10MB
    if (fileType.startsWith('audio/')) return 50 * 1024 * 1024; // 50MB
    if (fileType.startsWith('video/')) return 200 * 1024 * 1024; // 200MB
    return 10 * 1024 * 1024; // default 10MB
  };

  // Format file size for display
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get icon for media type
  const getMediaIcon = (mediaType?: string) => {
    if (!mediaType && value) {
      // Try to determine from URL or file extension
      if (value.includes('video') || value.match(/\.(mp4|webm|mov)$/i)) {
        return <Video className="w-8 h-8" />;
      }
      if (value.includes('audio') || value.match(/\.(mp3|wav|m4a)$/i)) {
        return <Music className="w-8 h-8" />;
      }
      return <Image className="w-8 h-8" />;
    }
    
    switch (mediaType) {
      case 'video':
        return <Video className="w-8 h-8" />;
      case 'audio':
        return <Music className="w-8 h-8" />;
      case 'image':
        return <Image className="w-8 h-8" />;
      default:
        return <Upload className="w-8 h-8" />;
    }
  };

  const validateFile = (file: File): string | null => {
    const sizeLimit = getFileSizeLimit(file.type);
    
    if (file.size > sizeLimit) {
      return `File too large. Maximum size: ${formatFileSize(sizeLimit)}`;
    }

    const acceptedTypes = getAcceptString().split(',');
    
    // Direct MIME type check
    if (acceptedTypes.includes(file.type)) {
      return null;
    }
    
    // Fallback: Check by file extension
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.split('.').pop();
    
    // Map common audio extensions to their MIME types
    const audioExtensionMap: Record<string, string[]> = {
      'm4a': ['audio/m4a', 'audio/x-m4a', 'audio/mp4'],
      'mp3': ['audio/mpeg', 'audio/mp3'],
      'wav': ['audio/wav', 'audio/x-wav'],
      'aac': ['audio/aac'],
      'ogg': ['audio/ogg'],
      'webm': ['audio/webm']
    };
    
    // Check if file extension matches any accepted audio format
    if (accept === 'audio' || accept === 'all') {
      const validMimeTypes = audioExtensionMap[fileExtension || ''];
      if (validMimeTypes && validMimeTypes.some(mime => acceptedTypes.includes(mime))) {
        console.log(`File validated by extension: ${fileName} (${file.type} -> ${validMimeTypes.join(', ')})`);
        return null;
      }
    }
    
    // If M4A file specifically, provide helpful message
    if (fileExtension === 'm4a') {
      return `M4A file detected. Your browser reports this as "${file.type}". Please try a different browser or convert to MP3 format.`;
    }
    
    return `File type "${file.type}" not supported. Accepted audio formats: MP3, M4A, WAV, AAC, OGG, WebM`;
  };

  const uploadWithRetry = async (formData: FormData, maxRetries = 3): Promise<Response> => {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await apiRequest('POST', '/api/upload', formData);
        
        // If successful or client error (4xx), return immediately
        if (response.ok || (response.status >= 400 && response.status < 500)) {
          return response;
        }
        
        // For server errors (5xx), throw to trigger retry
        throw new Error(`Server error: ${response.status}`);
      } catch (error) {
        lastError = error as Error;
        console.log(`Upload attempt ${attempt} failed:`, error);
        
        // Don't retry on the last attempt
        if (attempt < maxRetries) {
          // Exponential backoff: wait 1s, 2s, 4s...
          const delay = Math.pow(2, attempt - 1) * 1000;
          setError(`Upload failed, retrying in ${delay / 1000} seconds... (Attempt ${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error('Upload failed after all retry attempts');
  };

  const handleFileSelect = async (file: File) => {
    setError(null);
    
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Create FormData for upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityId', entityId);
      formData.append('entityType', entityType);

      // Simulate progress (since fetch doesn't provide upload progress)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await uploadWithRetry(formData);
      const result = await response.json() as UploadResult;

      clearInterval(progressInterval);
      setUploadProgress(100);

      setUploadedFile(result);
      onChange(result);
      
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);
    } catch (error) {
      console.error('Upload error:', error);
      let errorMessage = 'Upload failed';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        // Check for specific Supabase configuration error
        if (error.message.includes('Media upload is not available')) {
          errorMessage = 'Media upload requires Supabase Storage configuration. Please contact your administrator.';
        }
      }
      
      setError(errorMessage);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragOut = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const removeFile = async () => {
    if (value) {
      try {
        await apiRequest('DELETE', '/api/upload/media', { fileUrl: value });
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    }
    
    onChange('');
    setUploadedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={className}>
      <Label className="text-white/80 mb-2 block">{label}</Label>
      
      <Card className={`bg-white/5 border-white/10 p-4 transition-all duration-200 ${
        dragActive ? 'border-purple-400 bg-purple-400/10 scale-[1.02]' : ''
      }`}>
        {value && !isUploading ? (
          <div className="relative">
            {/* Media Preview */}
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-center space-x-3">
                <div className="text-purple-400">
                  {getMediaIcon(uploadedFile?.mediaType)}
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">
                    {uploadedFile?.fileName || 'Uploaded file'}
                  </p>
                  {uploadedFile?.fileSize && (
                    <p className="text-white/60 text-xs">
                      {formatFileSize(uploadedFile.fileSize)}
                    </p>
                  )}
                </div>
                <div className="text-green-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
            </div>
            
            <Button
              type="button"
              size="icon"
              variant="destructive"
              className="absolute -top-2 -right-2 h-8 w-8 rounded-full shadow-lg"
              onClick={removeFile}
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
              dragActive 
                ? 'border-purple-400 bg-purple-400/5' 
                : 'border-white/20 hover:border-white/30'
            }`}
            onDragEnter={handleDragIn}
            onDragLeave={handleDragOut}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="text-white/40 mb-4">
              {getMediaIcon()}
            </div>
            
            {isUploading ? (
              <div className="space-y-3">
                <p className="text-white/80">Uploading...</p>
                <Progress value={uploadProgress} className="w-full h-2" />
                <p className="text-white/60 text-sm">{uploadProgress}%</p>
              </div>
            ) : (
              <>
                <p className="text-white/60 mb-4">
                  Drag and drop {accept === 'all' ? 'a file' : `${accept === 'image' ? 'an' : 'a'} ${accept}`} here, or click to select
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled}
                  className="border-white/20 text-white hover:bg-white/10 transition-colors"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Select {accept === 'all' ? 'File' : accept.charAt(0).toUpperCase() + accept.slice(1)}
                </Button>
              </>
            )}
          </div>
        )}
        
        {error && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept={getAcceptString()}
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
        />
      </Card>
    </div>
  );
}