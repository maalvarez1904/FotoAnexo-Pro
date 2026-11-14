import {
  CoverConfig,
  HeaderFooterConfig,
  ImageTransform,
  PhotoPageItem,
} from '../types/document';
import {
  createDefaultImageTransform,
  createInitialCoverConfig,
  createInitialHeaderFooterConfig,
  NO_EXIF_DEFAULT_MESSAGE,
} from './documentLogic';

export interface SerializedPhotoItem {
  id: string;
  fileName: string;
  fileType: string;
  lastModified: number;
  dataUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  pageTitle: string;
  caption: string;
  exifText: string;
  hasExifData: boolean;
  showExifOverride: boolean | null;
  transform: ImageTransform;
}

export interface SerializedProjectFile {
  format: 'anexofoto-a4-project';
  version: 1;
  savedAt: string;
  coverConfig: CoverConfig;
  headerFooterConfig: HeaderFooterConfig;
  photos: SerializedPhotoItem[];
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('No se pudo codificar el archivo de imagen.'));
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo de imagen.'));
    reader.readAsDataURL(file);
  });
}

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
]);

function dataUrlToFile(
  dataUrl: string,
  fileName: string,
  mimeType: string,
  lastModified: number
): File {
  const parts = dataUrl.split(',');
  const header = parts[0] || '';
  const base64 = parts[1] || '';
  const detectedMimeMatch = header.match(/data:([^;]+);base64/);
  const effectiveMime = (
    detectedMimeMatch ? detectedMimeMatch[1] : mimeType || 'image/png'
  ).toLowerCase();

  if (!ALLOWED_IMAGE_MIME_TYPES.has(effectiveMime)) {
    throw new Error(
      `Formato de imagen no permitido (${effectiveMime}). Solo se aceptan imágenes raster estándar.`
    );
  }

  if (!base64) {
    throw new Error(
      `Datos de imagen vacíos o malformados para "${fileName || 'fotografía'}".`
    );
  }

  let binaryStr: string;
  try {
    binaryStr = atob(base64);
  } catch {
    throw new Error(
      `La imagen "${fileName || 'fotografía'}" contiene Base64 corrupto o inválido.`
    );
  }
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  return new File([bytes], fileName || 'fotografia.png', {
    type: effectiveMime,
    lastModified: lastModified || Date.now(),
  });
}

/**
 * Construye el objeto JSON serializable de forma pura a partir de los datos ya codificados.
 */
export function buildProjectPayload(
  coverConfig: CoverConfig,
  headerFooterConfig: HeaderFooterConfig,
  serializedPhotos: SerializedPhotoItem[],
  savedAt: string = new Date().toISOString()
): SerializedProjectFile {
  return {
    format: 'anexofoto-a4-project',
    version: 1,
    savedAt,
    coverConfig: { ...coverConfig },
    headerFooterConfig: { ...headerFooterConfig },
    photos: serializedPhotos.map((p) => ({
      ...p,
      transform: { ...p.transform },
    })),
  };
}

/**
 * Valida y normaliza un texto JSON de proyecto para asegurar que todos los tipos sean estrictos.
 */
export function parseAndValidateProjectJson(jsonText: string): SerializedProjectFile {
  let raw: unknown;
  try {
    raw = JSON.parse(jsonText);
  } catch {
    throw new Error('El archivo seleccionado no contiene un formato JSON válido.');
  }

  if (!raw || typeof raw !== 'object') {
    throw new Error('Estructura de proyecto JSON inválida.');
  }

  const obj = raw as Record<string, unknown>;
  if (obj.format !== 'anexofoto-a4-project' && !obj.coverConfig && !obj.headerFooterConfig) {
    throw new Error('El archivo JSON no corresponde a un proyecto de FotoAnexo Pro.');
  }

  const rawCover = (obj.coverConfig || {}) as Partial<CoverConfig>;
  const defaultCover = createInitialCoverConfig();
  const coverConfig: CoverConfig = {
    enabled: Boolean(rawCover.enabled ?? defaultCover.enabled),
    mainTitle: typeof rawCover.mainTitle === 'string' ? rawCover.mainTitle : '',
    subtitle: typeof rawCover.subtitle === 'string' ? rawCover.subtitle : '',
    referenceCode: typeof rawCover.referenceCode === 'string' ? rawCover.referenceCode : '',
    clientOrCourt: typeof rawCover.clientOrCourt === 'string' ? rawCover.clientOrCourt : '',
    professionalInfo:
      typeof rawCover.professionalInfo === 'string' ? rawCover.professionalInfo : '',
    locationAndDate:
      typeof rawCover.locationAndDate === 'string' ? rawCover.locationAndDate : '',
    notes: typeof rawCover.notes === 'string' ? rawCover.notes : '',
  };

  const rawHf = (obj.headerFooterConfig || {}) as Partial<HeaderFooterConfig>;
  const defaultHf = createInitialHeaderFooterConfig();
  const validPrefix =
    rawHf.pageNumberPrefix === 'Folio' ||
    rawHf.pageNumberPrefix === 'Página' ||
    rawHf.pageNumberPrefix === 'Pág.'
      ? rawHf.pageNumberPrefix
      : defaultHf.pageNumberPrefix;

  const headerFooterConfig: HeaderFooterConfig = {
    headerLeft: typeof rawHf.headerLeft === 'string' ? rawHf.headerLeft : '',
    headerRight: typeof rawHf.headerRight === 'string' ? rawHf.headerRight : '',
    footerLeft: typeof rawHf.footerLeft === 'string' ? rawHf.footerLeft : '',
    pageNumberPrefix: validPrefix,
    countCoverInNumbering: Boolean(
      rawHf.countCoverInNumbering ?? defaultHf.countCoverInNumbering
    ),
    indexTitle: typeof rawHf.indexTitle === 'string' ? rawHf.indexTitle : '',
    indexEnabled: Boolean(rawHf.indexEnabled ?? defaultHf.indexEnabled),
    photoPrefixTemplate:
      typeof rawHf.photoPrefixTemplate === 'string' ? rawHf.photoPrefixTemplate : '',
    photoNumberPadding:
      typeof rawHf.photoNumberPadding === 'number' && isFinite(rawHf.photoNumberPadding)
        ? Math.max(1, Math.min(6, Math.round(rawHf.photoNumberPadding)))
        : 2,
    globalShowExif:
      typeof rawHf.globalShowExif === 'boolean'
        ? rawHf.globalShowExif
        : defaultHf.globalShowExif,
  };

  const rawPhotos = Array.isArray(obj.photos) ? obj.photos : [];
  const defaultTransform = createDefaultImageTransform();

  const photos: SerializedPhotoItem[] = rawPhotos.map((item, idx) => {
    const p = (item || {}) as Partial<SerializedPhotoItem>;
    const t = (p.transform || {}) as Partial<ImageTransform>;
    return {
      id: typeof p.id === 'string' && p.id ? p.id : `restored-photo-${idx + 1}`,
      fileName: typeof p.fileName === 'string' && p.fileName ? p.fileName : `foto_${idx + 1}.png`,
      fileType: typeof p.fileType === 'string' && p.fileType ? p.fileType : 'image/png',
      lastModified: typeof p.lastModified === 'number' ? p.lastModified : Date.now(),
      dataUrl: typeof p.dataUrl === 'string' ? p.dataUrl : '',
      naturalWidth:
        typeof p.naturalWidth === 'number' &&
        Number.isFinite(p.naturalWidth) &&
        p.naturalWidth > 0
          ? p.naturalWidth
          : 1600,
      naturalHeight:
        typeof p.naturalHeight === 'number' &&
        Number.isFinite(p.naturalHeight) &&
        p.naturalHeight > 0
          ? p.naturalHeight
          : 1200,
      pageTitle: typeof p.pageTitle === 'string' ? p.pageTitle : '',
      caption: typeof p.caption === 'string' ? p.caption : '',
      exifText: typeof p.exifText === 'string' ? p.exifText : NO_EXIF_DEFAULT_MESSAGE,
      hasExifData: Boolean(p.hasExifData),
      showExifOverride:
        typeof p.showExifOverride === 'boolean' ? p.showExifOverride : null,
      transform: {
        rotation: typeof t.rotation === 'number' && isFinite(t.rotation) ? t.rotation : 0,
        scale:
          typeof t.scale === 'number' && isFinite(t.scale)
            ? Math.max(0.5, Math.min(3.0, t.scale))
            : defaultTransform.scale,
        fitMode: t.fitMode === 'cover' ? 'cover' : 'contain',
        offsetX: typeof t.offsetX === 'number' && isFinite(t.offsetX) ? t.offsetX : 0,
        offsetY: typeof t.offsetY === 'number' && isFinite(t.offsetY) ? t.offsetY : 0,
      },
    };
  });

  return {
    format: 'anexofoto-a4-project',
    version: 1,
    savedAt: typeof obj.savedAt === 'string' ? obj.savedAt : new Date().toISOString(),
    coverConfig,
    headerFooterConfig,
    photos,
  };
}

/**
 * Serializa todo el estado del proyecto actual (incluyendo las fotografías como DataURL dentro del archivo JSON)
 * y descarga el archivo .json en el navegador.
 */
export async function exportProjectToJsonFile(
  coverConfig: CoverConfig,
  headerFooterConfig: HeaderFooterConfig,
  photos: PhotoPageItem[]
): Promise<void> {
  const serializedPhotos: SerializedPhotoItem[] = [];
  for (const photo of photos) {
    const dataUrl = await fileToDataUrl(photo.file);
    serializedPhotos.push({
      id: photo.id,
      fileName: photo.file.name,
      fileType: photo.file.type || 'image/jpeg',
      lastModified: photo.file.lastModified || Date.now(),
      dataUrl,
      naturalWidth: photo.naturalWidth,
      naturalHeight: photo.naturalHeight,
      pageTitle: photo.pageTitle,
      caption: photo.caption,
      exifText: photo.exifText,
      hasExifData: photo.hasExifData,
      showExifOverride: photo.showExifOverride,
      transform: { ...photo.transform },
    });
  }

  const payload = buildProjectPayload(coverConfig, headerFooterConfig, serializedPhotos);
  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const downloadUrl = URL.createObjectURL(blob);

  const rawRef =
    coverConfig.referenceCode.trim() ||
    coverConfig.mainTitle.trim() ||
    'anexo_fotografico_a4';
  const safeSlug = rawRef
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);

  const fileName = `${safeSlug || 'anexo_fotografico_a4'}.json`;

  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  setTimeout(() => {
    URL.revokeObjectURL(downloadUrl);
  }, 1000);
}

/**
 * Importa un archivo .json de proyecto y reconstruye los objetos File + URL.createObjectURL(file)
 * para mantener la gestión eficiente de memoria RAM en el navegador.
 */
export async function importProjectFromJsonFile(file: File): Promise<{
  coverConfig: CoverConfig;
  headerFooterConfig: HeaderFooterConfig;
  photos: PhotoPageItem[];
}> {
  const text = await file.text();
  const validated = parseAndValidateProjectJson(text);

  const restoredPhotos: PhotoPageItem[] = validated.photos.map((sp) => {
    const restoredFile = sp.dataUrl
      ? dataUrlToFile(sp.dataUrl, sp.fileName, sp.fileType, sp.lastModified)
      : new File([], sp.fileName, { type: sp.fileType });
    const objectUrl = URL.createObjectURL(restoredFile);

    return {
      id: sp.id,
      file: restoredFile,
      objectUrl,
      naturalWidth: sp.naturalWidth,
      naturalHeight: sp.naturalHeight,
      pageTitle: sp.pageTitle,
      caption: sp.caption,
      exifText: sp.exifText,
      hasExifData: sp.hasExifData,
      showExifOverride: sp.showExifOverride,
      transform: { ...sp.transform },
    };
  });

  return {
    coverConfig: validated.coverConfig,
    headerFooterConfig: validated.headerFooterConfig,
    photos: restoredPhotos,
  };
}
