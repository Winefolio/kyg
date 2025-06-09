import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Upload, X, Video, Music, Image, AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface MediaUploadProps {
  value?: string;
  onChange: (mediaUrl: string) => void;
  accept: 'image' | 'video' | 'audio' | 'all';
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  entityId: string; // slide ID, wine ID, or package ID for file organization
}

interface UploadResult {
  url: string;
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
  entityId
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
        return 'image/jpeg,image/png,image/webp';
      case 'video':
        return 'video/mp4,video/webm,video/quicktime';
      case 'audio':
        return 'audio/mpeg,audio/wav,audio/mp4,audio/m4a';
      case 'all':
        return 'image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/wav,audio/mp4,audio/m4a';
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
    if (!acceptedTypes.includes(file.type)) {
      return `File type not supported. Accepted types: ${acceptedTypes.join(', ')}`;
    }

    return null;
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

      // Simulate progress (since fetch doesn't provide upload progress)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await apiRequest('POST', '/api/upload/media', formData);
      const result = await response.json() as UploadResult;

      clearInterval(progressInterval);
      setUploadProgress(100);

      setUploadedFile(result);
      onChange(result.url);
      
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