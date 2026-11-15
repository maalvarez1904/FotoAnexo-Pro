import exifr from 'exifr';
import { PhotoPageItem } from '../types/document';
import {
  buildFormattedExifText,
  createDefaultImageTransform,
  NO_EXIF_DEFAULT_MESSAGE,
} from './documentLogic';

function loadImageDimensions(
  objectUrl: string,
  fileName: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const cleanup = () => {
      img.onload = null;
      img.onerror = null;
    };
    img.onload = () => {
      cleanup();
      resolve({
        width: img.naturalWidth || 1600,
        height: img.naturalHeight || 1200,
      });
    };
    img.onerror = () => {
      cleanup();
      reject(
        new Error(
          `No se pudo decodificar la imagen "${fileName}". Usa un formato compatible (JPG, PNG, WebP).`
        )
      );
    };
    img.src = objectUrl;
  });
}

export async function processUploadedPhotoFile(file: File): Promise<PhotoPageItem> {
  // Regla 1.3: Utilizar URL.createObjectURL(file) en lugar de cadenas Base64
  const objectUrl = URL.createObjectURL(file);

  try {
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

    const dimensions = await loadImageDimensions(objectUrl, file.name);
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
  } catch (err) {
    // FIX: Revocar ObjectURL si la decodificación falla para evitar fuga de memoria
    URL.revokeObjectURL(objectUrl);
    throw err;
  }
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
