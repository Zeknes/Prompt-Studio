import React, { useRef, useCallback, useState } from 'react';
import { ImageAttachment } from '../types';
import { ImageThumbnail } from './ImageThumbnail';
import {
  createImageAttachment,
  formatFileSize,
} from '../utils/imageUtils';

interface AttachmentPickerProps {
  images: ImageAttachment[];
  onImagesChange: (images: ImageAttachment[]) => void;
}

const MAX_IMAGES = 10;

export const AttachmentPicker: React.FC<AttachmentPickerProps> = ({
  images,
  onImagesChange,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const imageFiles = fileArray.filter((f) => f.type.startsWith('image/'));

      if (imageFiles.length === 0) {
        return;
      }

      if (images.length + imageFiles.length > MAX_IMAGES) {
        showToast(
          `Maximum ${MAX_IMAGES} images allowed`,
          'error'
        );
        return;
      }

      setIsProcessing(true);
      const newImages: ImageAttachment[] = [];

      for (const file of imageFiles) {
        try {
          const attachment = await createImageAttachment(file);
          newImages.push(attachment);

          // Show compression stats
          if (attachment.compressedSize < attachment.originalSize) {
            const saved =
              attachment.originalSize - attachment.compressedSize;
            showToast(
              `Compressed: ${formatFileSize(attachment.originalSize)} → ${formatFileSize(attachment.compressedSize)} (saved ${formatFileSize(saved)})`,
              'success'
            );
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Failed to process image';
          showToast(message, 'error');
        }
      }

      if (newImages.length > 0) {
        onImagesChange([...images, ...newImages]);
      }

      setIsProcessing(false);
    },
    [images, onImagesChange]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files);
        e.target.value = ''; // Reset input
      }
    },
    [handleFiles]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      if (e.dataTransfer.files) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageItems = Array.from(items).filter((item) =>
        item.type.startsWith('image/')
      );

      if (imageItems.length === 0) {
        return;
      }

      const files: File[] = [];
      for (const item of imageItems) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }

      if (files.length > 0) {
        handleFiles(files);
      }
    },
    [handleFiles]
  );

  const handleRemove = useCallback(
    (id: string) => {
      onImagesChange(images.filter((img) => img.id !== id));
    },
    [images, onImagesChange]
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent, index: number) => {
      e.dataTransfer.setData('text/plain', index.toString());
      e.dataTransfer.effectAllowed = 'move';
    },
    []
  );

  const handleDragOverThumbnail = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      setDragOverIndex(index);
    },
    []
  );

  const handleDropOnThumbnail = useCallback(
    (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();
      setDragOverIndex(null);

      const dragIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);

      if (isNaN(dragIndex) || dragIndex === dropIndex) {
        return;
      }

      const newImages = [...images];
      const [draggedImage] = newImages.splice(dragIndex, 1);
      newImages.splice(dropIndex, 0, draggedImage);

      onImagesChange(newImages);
    },
    [images, onImagesChange]
  );

  const handleDragEnd = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleClearAll = useCallback(() => {
    onImagesChange([]);
  }, [onImagesChange]);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onPaste={handlePaste}
      className={`
        relative border-2 border-dashed rounded-xl p-4 mb-4
        transition-all duration-200
        ${
          isDragOver
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
            : 'border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-white/5'
        }
        ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
      `}
    >
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Drop Zone Content */}
      <div className="text-center">
        {images.length === 0 ? (
          <>
            <div className="text-4xl mb-2">📷</div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Drag & drop images here, paste from clipboard, or click to select
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
              type="button"
            >
              Select Images
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Max {MAX_IMAGES} images • JPEG, PNG, WebP, GIF • Auto-compressed
            </p>
          </>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Thumbnail Grid */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-white/20">
              {images.map((image, index) => (
                <ImageThumbnail
                  key={image.id}
                  image={image}
                  onRemove={handleRemove}
                  index={index}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOverThumbnail}
                  onDrop={handleDropOnThumbnail}
                  isDragging={false}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-white/10">
              <p className="text-xs text-gray-500">
                {images.length} / {MAX_IMAGES} images
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium transition-colors"
                  type="button"
                >
                  Add More
                </button>
                <button
                  onClick={handleClearAll}
                  className="px-3 py-1.5 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium transition-colors"
                  type="button"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-white/50 dark:bg-black/50 rounded-xl flex items-center justify-center">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Processing...
          </div>
        </div>
      )}
    </div>
  );
};

// Toast helper (inline to avoid dependency on existing toast system)
function showToast(message: string, type: 'success' | 'error') {
  // Dispatch custom event for parent component to handle
  window.dispatchEvent(
    new CustomEvent('image-upload-toast', { detail: { message, type } })
  );
}
