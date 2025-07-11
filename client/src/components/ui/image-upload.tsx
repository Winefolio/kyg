// client/src/components/ui/image-upload.tsx

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Upload, X, Image, Search } from 'lucide-react';
import { UnsplashSelector } from './unsplash-selector';
import { getImageUrl } from '@/lib/media-utils';

interface ImageUploadProps {
  value?: string;
  onChange: (imageUrl: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function ImageUpload({ 
  value, 
  onChange, 
  label = "Upload Image", 
  placeholder = "No image selected",
  className = "",
  disabled = false
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showUnsplash, setShowUnsplash] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = document.createElement('img');
      
      img.onload = () => {
        if (!ctx) {
          // Fallback: return original file as data URL
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
          return;
        }
        
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (file: File) => {
    // Support all major image formats including HEIC, AVIF, WebP, etc.
    const supportedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
      'image/bmp', 'image/tiff', 'image/svg+xml', 'image/avif', 'image/heic', 'image/heif'
    ];
    
    if (!supportedTypes.includes(file.type)) {
      console.error('Unsupported file type:', file.type);
      return;
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      console.error('File too large. Maximum size is 10MB.');
      return;
    }

    setIsUploading(true);
    try {
      // Upload to Supabase storage if available, otherwise use local compression
      if (window.location.hostname !== 'localhost') {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'image');
        formData.append('entityType', 'slide');
        formData.append('entityId', 'temp-' + Date.now());
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (response.ok) {
          const result = await response.json();
          onChange(result.accessUrl);
        } else {
          throw new Error('Upload failed');
        }
      } else {
        // Local development: use compression for better performance
        const compressedDataUrl = await compressImage(file);
        onChange(compressedDataUrl);
      }
      setIsUploading(false);
    } catch (error) {
      console.error('Error uploading image:', error);
      // Fallback to local compression if upload fails
      try {
        const compressedDataUrl = await compressImage(file);
        onChange(compressedDataUrl);
      } catch (compressionError) {
        console.error('Compression also failed:', compressionError);
      }
      setIsUploading(false);
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

  const removeImage = () => {
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={className}>
      <Label className="text-white/80 mb-2 block">{label}</Label>
      
      <Card className={`bg-white/5 border-white/10 p-4 transition-colors ${
        dragActive ? 'border-purple-400 bg-purple-400/10' : ''
      }`}>
        {value ? (
          <div className="relative">
            <img 
              src={getImageUrl({ imageUrl: value })} 
              alt="Preview" 
              className="w-full h-48 object-cover rounded-lg"
              onError={(e) => {
                // Fallback to original value if media utils don't work
                const img = e.target as HTMLImageElement;
                if (img.src !== value) {
                  console.warn('Image failed to load, trying original URL:', value);
                  img.src = value;
                }
              }}
            />
            <Button
              type="button"
              size="icon"
              variant="destructive"
              className="absolute top-2 right-2 h-8 w-8"
              onClick={removeImage}
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div
            className={`border-2 border-dashed border-white/20 rounded-lg p-8 text-center transition-colors ${
              dragActive ? 'border-purple-400 bg-purple-400/5' : 'hover:border-white/30'
            }`}
            onDragEnter={handleDragIn}
            onDragLeave={handleDragOut}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Image className="h-12 w-12 text-white/40 mx-auto mb-4" />
            <p className="text-white/60 mb-4">
              {isUploading ? 'Uploading...' : 'Drag and drop an image here, or click to select'}
            </p>
            <p className="text-xs text-white/40 mb-4">
              Supports: JPEG, PNG, WebP, GIF, AVIF, HEIC, SVG, BMP, TIFF (up to 10MB)
            </p>
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isUploading}
                className="border-white/20 text-white hover:bg-white/10"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? 'Uploading...' : 'Upload File'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowUnsplash(true)}
                disabled={disabled || isUploading}
                className="border-white/20 text-white hover:bg-white/10"
              >
                <Search className="h-4 w-4 mr-2" />
                Browse Photos
              </Button>
            </div>
          </div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/bmp,image/tiff,image/svg+xml,image/avif,image/heic,image/heif"
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
        />
      </Card>
      
      <UnsplashSelector
        isOpen={showUnsplash}
        onSelect={onChange}
        onClose={() => setShowUnsplash(false)}
      />
    </div>
  );
}