import exifr from 'exifr';
import { PhotoPageItem } from '../types/document';
import {
  buildFormattedExifText,
  createDefaultImageTransform,
  NO_EXIF_DEFAULT_MESSAGE,
} from './documentLogic';

function loadImageDimensions(objectUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth || 1600,
        height: img.naturalHeight || 1200,
      });
    };
    img.onerror = () => {
      resolve({ width: 1600, height: 1200 });
    };
    img.src = objectUrl;
  });
}

export async function processUploadedPhotoFile(file: File): Promise<PhotoPageItem> {
  // Regla 1.3: Utilizar URL.createObjectURL(file) en lugar de cadenas Base64
  const objectUrl = URL.createObjectURL(file);

  let rawExif: Record<string, unknown> | null = null;
  try {
    const parsed = await exifr.parse(file, {
      gps: true,
      exif: true,
      tiff: true,
    });
    if (parsed && typeof parsed === 'object') {
      rawExif = parsed as Record<string, unknown>;
    }
  } catch {
    rawExif = null;
  }

  const dimensions = await loadImageDimensions(objectUrl);
  const { exifText, hasExifData } = rawExif
    ? buildFormattedExifText(rawExif)
    : { exifText: NO_EXIF_DEFAULT_MESSAGE, hasExifData: false };

  const uniqueId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `photo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  return {
    id: uniqueId,
    file,
    objectUrl,
    naturalWidth: dimensions.width,
    naturalHeight: dimensions.height,
    pageTitle: '',
    caption: '',
    exifText,
    hasExifData,
    showExifOverride: null,
    transform: createDefaultImageTransform(),
  };
}

export function revokePhotoObjectUrl(photo: Pick<PhotoPageItem, 'objectUrl'>): void {
  if (photo.objectUrl && photo.objectUrl.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(photo.objectUrl);
    } catch {
      // Ignore revocation errors if already revoked
    }
  }
}
