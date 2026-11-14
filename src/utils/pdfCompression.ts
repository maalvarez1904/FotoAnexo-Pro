import {
  PdfExportCompressionConfig,
  PhotoPageItem,
} from '../types/document';
import {
  computeImageFrameGeometry,
  PHOTO_FRAME_HEIGHT_MM,
  PHOTO_FRAME_WIDTH_MM,
} from './documentLogic';

export interface DpiOption {
  value: number;
  label: string;
}

export const DPI_OPTIONS: DpiOption[] = [
  { value: 72, label: '72 DPI (Pantalla / Liviano)' },
  { value: 100, label: '100 DPI (Borrador)' },
  { value: 150, label: '150 DPI (Estándar)' },
  { value: 200, label: '200 DPI (Alta)' },
  { value: 300, label: '300 DPI (Imprenta)' },
];

const MM_PER_INCH = 25.4;

// Overhead cuando se exporta vía window.print() (embebido de fuentes + Skia)
const PRINT_PDF_BASE_OVERHEAD_BYTES = 380 * 1024;
const PRINT_PDF_PER_SHEET_OVERHEAD_BYTES = 35 * 1024;

// Overhead real cuando se genera PDF directo con compresión JPEG (jsPDF + fuentes estándar PDF)
const DIRECT_PDF_BASE_OVERHEAD_BYTES = 6 * 1024;
const DIRECT_PDF_PER_SHEET_OVERHEAD_BYTES = 3 * 1024;

/**
 * Calcula las dimensiones en píxeles objetivo para una foto según el DPI
 * seleccionado y su tamaño físico impreso dentro del marco de 175×145 mm.
 * Nunca supera la resolución natural de la imagen original.
 */
export function computeTargetPixelDimensions(
  photo: Pick<PhotoPageItem, 'naturalWidth' | 'naturalHeight' | 'transform'>,
  dpi: number
): { width: number; height: number } {
  const safeDpi = Math.max(36, Math.min(600, dpi || 200));
  const safeNatW = Math.max(1, photo.naturalWidth || 1);
  const safeNatH = Math.max(1, photo.naturalHeight || 1);

  const geometry = computeImageFrameGeometry(
    safeNatW,
    safeNatH,
    photo.transform
  );
  const scale = Math.max(1.0, Math.min(3.0, photo.transform.scale || 1.0));

  const printedWidthMm = geometry.baseWidthMm * scale;
  const printedHeightMm = geometry.baseHeightMm * scale;

  const targetW = Math.round((printedWidthMm / MM_PER_INCH) * safeDpi);
  const targetH = Math.round((printedHeightMm / MM_PER_INCH) * safeDpi);

  return {
    width: Math.max(1, Math.min(safeNatW, targetW)),
    height: Math.max(1, Math.min(safeNatH, targetH)),
  };
}

// FIX: Liberar explícitamente el backing bitmap de Canvas intermedios para evitar agotamiento de memoria en lotes grandes
function releaseCanvas(canvas: HTMLCanvasElement): void {
  canvas.width = 0;
  canvas.height = 0;
}

/**
 * Redimensiona progresivamente por pasos de 0.5x para evitar aliasing,
 * moiré y pérdida de nitidez típica del downscaling en un solo paso de Canvas 2D.
 */
function downsampleProgressive(
  img: HTMLImageElement,
  targetWidth: number,
  targetHeight: number
): HTMLCanvasElement {
  let currentWidth = img.naturalWidth || targetWidth;
  let currentHeight = img.naturalHeight || targetHeight;

  let currentCanvas = document.createElement('canvas');
  currentCanvas.width = currentWidth;
  currentCanvas.height = currentHeight;

  const initialCtx = currentCanvas.getContext('2d');
  if (!initialCtx) {
    releaseCanvas(currentCanvas);
    throw new Error('No se pudo inicializar el contexto 2D para compresión JPEG.');
  }

  initialCtx.fillStyle = '#ffffff';
  initialCtx.fillRect(0, 0, currentWidth, currentHeight);
  initialCtx.drawImage(img, 0, 0, currentWidth, currentHeight);

  while (
    currentWidth * 0.5 > targetWidth &&
    currentHeight * 0.5 > targetHeight
  ) {
    const nextWidth = Math.max(targetWidth, Math.round(currentWidth * 0.5));
    const nextHeight = Math.max(targetHeight, Math.round(currentHeight * 0.5));

    const stepCanvas = document.createElement('canvas');
    stepCanvas.width = nextWidth;
    stepCanvas.height = nextHeight;

    const stepCtx = stepCanvas.getContext('2d');
    if (!stepCtx) {
      releaseCanvas(stepCanvas);
      break;
    }

    stepCtx.imageSmoothingEnabled = true;
    stepCtx.imageSmoothingQuality = 'high';
    stepCtx.drawImage(currentCanvas, 0, 0, nextWidth, nextHeight);

    releaseCanvas(currentCanvas);
    currentCanvas = stepCanvas;
    currentWidth = nextWidth;
    currentHeight = nextHeight;
  }

  if (currentWidth !== targetWidth || currentHeight !== targetHeight) {
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = targetWidth;
    finalCanvas.height = targetHeight;

    const finalCtx = finalCanvas.getContext('2d');
    if (!finalCtx) {
      releaseCanvas(finalCanvas);
      releaseCanvas(currentCanvas);
      throw new Error('No se pudo inicializar el contexto 2D final para compresión JPEG.');
    }

    finalCtx.fillStyle = '#ffffff';
    finalCtx.fillRect(0, 0, targetWidth, targetHeight);
    finalCtx.imageSmoothingEnabled = true;
    finalCtx.imageSmoothingQuality = 'high';
    finalCtx.drawImage(currentCanvas, 0, 0, targetWidth, targetHeight);

    releaseCanvas(currentCanvas);
    return finalCanvas;
  }

  return currentCanvas;
}

function loadImageElement(objectUrl: string, fileName: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error(`No se pudo cargar la imagen ${fileName}`));
    img.src = objectUrl;
  });
}

/**
 * Re-codifica una fotografía a JPEG mediante Canvas con downsampling progresivo
 * de alta calidad a la resolución (DPI) y calidad especificadas.
 */
export async function compressImageToJpegBlob(
  photo: PhotoPageItem,
  dpi: number,
  quality: number
): Promise<{ blob: Blob; url: string; width: number; height: number }> {
  const safeQuality = Math.max(0.1, Math.min(1.0, quality));
  const { width, height } = computeTargetPixelDimensions(photo, dpi);
  const img = await loadImageElement(photo.objectUrl, photo.file.name);
  const finalCanvas = downsampleProgressive(img, width, height);

  try {
    const blob = await new Promise<Blob>((resolve, reject) => {
      finalCanvas.toBlob(
        (result) => {
          if (result) {
            resolve(result);
          } else {
            reject(new Error('No se pudo generar el Blob JPEG comprimido.'));
          }
        },
        'image/jpeg',
        safeQuality
      );
    });

    return {
      blob,
      url: URL.createObjectURL(blob),
      width,
      height,
    };
  } finally {
    releaseCanvas(finalCanvas);
  }
}

/**
 * Renderiza el marco exacto de 175×145 mm (con rotación, escala, encuadre y pan)
 * a un DataURL JPEG al DPI y calidad seleccionados para incrustar 1:1 en el PDF.
 */
export async function renderFramedPhotoToJpegDataUrl(
  photo: PhotoPageItem,
  dpi: number,
  quality: number
): Promise<{ dataUrl: string; widthPx: number; heightPx: number }> {
  const safeDpi = Math.max(36, Math.min(600, dpi || 200));
  const safeQuality = Math.max(0.1, Math.min(1.0, quality));
  const img = await loadImageElement(photo.objectUrl, photo.file.name);

  // Dimensiones del marco físico de 175×145 mm en píxeles al DPI elegido
  const frameWidthPx = Math.max(
    1,
    Math.round((PHOTO_FRAME_WIDTH_MM / MM_PER_INCH) * safeDpi)
  );
  const frameHeightPx = Math.max(
    1,
    Math.round((PHOTO_FRAME_HEIGHT_MM / MM_PER_INCH) * safeDpi)
  );

  // Pre-reducir progresivamente la imagen fuente al tamaño objetivo para evitar aliasing
  const { width: targetSrcW, height: targetSrcH } = computeTargetPixelDimensions(
    photo,
    safeDpi
  );
  const sourceCanvas = downsampleProgressive(img, targetSrcW, targetSrcH);
  const frameCanvas = document.createElement('canvas');

  try {
    frameCanvas.width = frameWidthPx;
    frameCanvas.height = frameHeightPx;
    const ctx = frameCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('No se pudo inicializar el contexto 2D para el marco PDF.');
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, frameWidthPx, frameHeightPx);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const geometry = computeImageFrameGeometry(
      photo.naturalWidth,
      photo.naturalHeight,
      photo.transform
    );
    const pxPerMm = safeDpi / MM_PER_INCH;
    const drawW = geometry.baseWidthMm * pxPerMm;
    const drawH = geometry.baseHeightMm * pxPerMm;
    const offsetXPx = geometry.offsetXMm * pxPerMm;
    const offsetYPx = geometry.offsetYMm * pxPerMm;
    const scale = Math.max(0.5, Math.min(3.0, photo.transform.scale || 1.0));
    const rad = ((photo.transform.rotation || 0) * Math.PI) / 180;

    ctx.save();
    ctx.translate(frameWidthPx / 2 + offsetXPx, frameHeightPx / 2 + offsetYPx);
    ctx.rotate(rad);
    ctx.scale(scale, scale);
    ctx.drawImage(sourceCanvas, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    const dataUrl = frameCanvas.toDataURL('image/jpeg', safeQuality);
    return {
      dataUrl,
      widthPx: frameWidthPx,
      heightPx: frameHeightPx,
    };
  } finally {
    releaseCanvas(sourceCanvas);
    releaseCanvas(frameCanvas);
  }
}

/**
 * Estima el peso total del PDF resultante en bytes.
 * - Con compresión JPEG activa: usa exportación directa jsPDF (los bytes JPEG se incrustan 1:1 sin re-codificación).
 * - Sin compresión activa: usa exportación vía window.print() del navegador.
 */
export function estimatePdfSizeBytes(
  photos: PhotoPageItem[],
  totalPhysicalSheets: number,
  compression: PdfExportCompressionConfig,
  measuredCompressedBytes?: number | null
): { estimatedBytes: number; isMeasured: boolean } {
  const sheetCount = Math.max(0, totalPhysicalSheets);

  if (!compression.enabled) {
    const printOverhead =
      sheetCount > 0
        ? PRINT_PDF_BASE_OVERHEAD_BYTES +
          sheetCount * PRINT_PDF_PER_SHEET_OVERHEAD_BYTES
        : 0;
    const rawImagesBytes = photos.reduce(
      (acc, photo) => acc + (photo.file?.size || 0),
      0
    );
    return {
      estimatedBytes: printOverhead + Math.round(rawImagesBytes * 1.15),
      isMeasured: false,
    };
  }

  const directOverhead =
    sheetCount > 0
      ? DIRECT_PDF_BASE_OVERHEAD_BYTES +
        sheetCount * DIRECT_PDF_PER_SHEET_OVERHEAD_BYTES
      : 0;

  if (
    typeof measuredCompressedBytes === 'number' &&
    Number.isFinite(measuredCompressedBytes)
  ) {
    return {
      estimatedBytes: directOverhead + Math.round(measuredCompressedBytes * 1.02),
      isMeasured: true,
    };
  }

  const safeQuality = Math.max(0.1, Math.min(1.0, compression.quality));
  const estimatedBytesPerPixel = 0.04 + 0.36 * Math.pow(safeQuality, 1.6);

  const estimatedImagesBytes = photos.reduce((acc, photo) => {
    const { width, height } = computeTargetPixelDimensions(
      photo,
      compression.dpi
    );
    return acc + Math.round(width * height * estimatedBytesPerPixel);
  }, 0);

  return {
    estimatedBytes: directOverhead + estimatedImagesBytes,
    isMeasured: false,
  };
}

/**
 * Formatea un tamaño en bytes a una cadena legible (KB / MB).
 */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 KB';
  }
  if (bytes < 1024 * 1024) {
    const kb = Math.max(1, Math.round(bytes / 1024));
    return `${kb} KB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(mb >= 10 ? 1 : 2)} MB`;
}
