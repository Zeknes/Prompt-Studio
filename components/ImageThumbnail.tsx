import React from 'react';
import { ImageAttachment } from '../types';
import { formatFileSize } from '../utils/imageUtils';

interface ImageThumbnailProps {
  image: ImageAttachment;
  onRemove: (id: string) => void;
  onDragStart?: (e: React.DragEvent, index: number) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, index: number) => void;
  index?: number;
  isDragging?: boolean;
}

export const ImageThumbnail: React.FC<ImageThumbnailProps> = ({
  image,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  index,
  isDragging,
}) => {
  const compressionRatio = Math.round(
    ((image.originalSize - image.compressedSize) / image.originalSize) * 100
  );

  return (
    <div
      draggable={!!onDragStart}
      onDragStart={(e) => onDragStart?.(e, index!)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop?.(e, index!)}
      className={`
        relative flex-shrink-0 group
        w-24 h-24 md:w-32 md:h-32
        rounded-lg overflow-hidden
        border-2 transition-all duration-200
        ${
          isDragging
            ? 'border-blue-500 opacity-50 scale-105'
            : 'border-gray-200 dark:border-white/10 hover:border-blue-400'
        }
        bg-gray-100 dark:bg-white/5
        cursor-move
      `}
    >
      {/* Preview Image */}
      <img
        src={image.base64}
        alt="Uploaded"
        className="w-full h-full object-cover"
        draggable={false}
      />

      {/* Remove Button */}
      <button
        onClick={() => onRemove(image.id)}
        className="
          absolute top-1 right-1
          w-6 h-6 md:w-7 md:h-7
          rounded-full
          bg-black/60 hover:bg-red-500
          text-white
          flex items-center justify-center
          opacity-0 group-hover:opacity-100
          transition-all duration-200
          active:scale-90
        "
        title="Remove image"
        type="button"
      >
        <svg
          className="w-3 h-3 md:w-4 md:h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      {/* Compression Stats Badge */}
      {compressionRatio > 0 && (
        <div
          className="
            absolute bottom-1 left-1
            px-1.5 py-0.5
            bg-black/60
            rounded text-[8px] md:text-[10px]
            text-white font-mono
            whitespace-nowrap
          "
          title={`Original: ${formatFileSize(image.originalSize)} → Compressed: ${formatFileSize(image.compressedSize)}`}
        >
          -{compressionRatio}%
        </div>
      )}

      {/* Dimensions Badge */}
      <div
        className="
          absolute bottom-1 right-1
          px-1.5 py-0.5
          bg-black/60
          rounded text-[8px] md:text-[10px]
          text-white font-mono
          whitespace-nowrap
        "
      >
        {image.width}×{image.height}
      </div>
    </div>
  );
};
