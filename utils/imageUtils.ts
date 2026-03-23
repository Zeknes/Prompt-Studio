import { ImageAttachment } from '../types';

const MAX_MIN_SIDE = 2000;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const COMPRESSION_QUALITY = 0.92;

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

/**
 * Validates an image file before processing.
 * @throws Error with user-friendly message if validation fails
 */
export function validateImage(file: File): void {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    if (file.type === 'image/svg+xml') {
      throw new Error('SVG files are not supported for security reasons');
    }
    throw new Error('Only JPEG, PNG, WebP, and GIF images are supported');
  }

  // Check file size (before compression)
  if (file.size > 50 * 1024 * 1024) {
    throw new Error('File is too large (max 50MB)');
  }
}

/**
 * Loads an image from a File into an HTMLImageElement.
 */
export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Resizes an image to fit within maxMinSide pixels (keeping aspect ratio).
 */
export function resizeImage(
  img: HTMLImageElement,
  maxMinSide: number
): { canvas: HTMLCanvasElement; width: number; height: number } {
  const minSide = Math.min(img.width, img.height);

  if (minSide <= maxMinSide) {
    // No resize needed
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(img, 0, 0);
    return { canvas, width: img.width, height: img.height };
  }

  const scale = maxMinSide / minSide;
  const newWidth = Math.round(img.width * scale);
  const newHeight = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = newWidth;
  canvas.height = newHeight;
  const ctx = canvas.getContext('2d');
  ctx?.drawImage(img, 0, 0, newWidth, newHeight);

  return { canvas, width: newWidth, height: newHeight };
}

/**
 * Compresses an image file and returns base64 data URL.
 * - Resizes if min side > 2000px
 * - Compresses to 92% quality if size > 5MB after resize
 */
export async function compressImage(file: File): Promise<{
  base64: string;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
}> {
  try {
    const img = await loadImage(file);
    const { canvas, width, height } = resizeImage(img, MAX_MIN_SIDE);

    // First pass: full quality
    let base64 = canvas.toDataURL(file.type, 1.0);
    let quality = 1.0;

    // Check if we need to compress
    const base64Size = Math.round((base64.length * 3) / 4); // Approximate decoded size

    if (base64Size > MAX_FILE_SIZE) {
      // Second pass: compress to 92%
      base64 = canvas.toDataURL(file.type, COMPRESSION_QUALITY);
      quality = COMPRESSION_QUALITY;
    }

    const compressedSize = Math.round((base64.length * 3) / 4);

    return {
      base64,
      width,
      height,
      originalSize: file.size,
      compressedSize,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('canvas')) {
      throw new Error('Failed to process image (out of memory)');
    }
    throw error;
  }
}

/**
 * Converts a File to base64 data URL without compression.
 */
export function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Creates an ImageAttachment from a processed image.
 */
export async function createImageAttachment(
  file: File
): Promise<ImageAttachment> {
  validateImage(file);

  const { base64, width, height, originalSize, compressedSize } =
    await compressImage(file);

  return {
    id: crypto.randomUUID(),
    base64,
    mimeType: file.type,
    originalSize,
    compressedSize,
    width,
    height,
  };
}

/**
 * Builds multi-modal message content for API.
 */
export function buildMessageContent(
  text: string,
  images: ImageAttachment[]
): import('../types').MessageContent {
  if (images.length === 0) {
    return text;
  }

  const content: Array<
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }
  > = [{ type: 'text', text }];

  for (const image of images) {
    content.push({
      type: 'image_url',
      image_url: { url: image.base64 },
    });
  }

  return content;
}

/**
 * Formats file size for display (e.g., "2.5 MB").
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
