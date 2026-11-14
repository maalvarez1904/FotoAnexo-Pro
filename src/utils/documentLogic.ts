import {
  CoverConfig,
  HeaderFooterConfig,
  ImageTransform,
  PhotoPageItem,
  DocumentPaginationResult,
  IndexEntryComputed,
  IndexPageComputed,
} from '../types/document';

export const MAX_INDEX_ROWS_PER_PAGE = 28;
export const PHOTO_FRAME_WIDTH_MM = 175;
export const PHOTO_FRAME_HEIGHT_MM = 145;
export const MM_TO_PX_96DPI = 96 / 25.4; // ~3.7795275591 px per mm
export const NO_EXIF_DEFAULT_MESSAGE = 'Metadatos EXIF no disponibles en el archivo original';

/**
 * Regla 1: Cada vez que la aplicación se carga o recarga, todos los campos de texto,
 * configuraciones y listas de fotografías deben iniciarse completamente vacíos
 * (utilizando únicamente atributos placeholder orientativos en los inputs).
 */
export function createInitialCoverConfig(): CoverConfig {
  return {
    enabled: false,
    mainTitle: '',
    subtitle: '',
    referenceCode: '',
    clientOrCourt: '',
    professionalInfo: '',
    locationAndDate: '',
    notes: '',
  };
}

export function createInitialHeaderFooterConfig(): HeaderFooterConfig {
  return {
    headerLeft: '',
    headerRight: '',
    footerLeft: '',
    pageNumberPrefix: 'Folio',
    countCoverInNumbering: false,
    indexTitle: '',
    indexEnabled: false,
    photoPrefixTemplate: '',
    photoNumberPadding: 2,
    globalShowExif: true,
  };
}

export function createDefaultImageTransform(): ImageTransform {
  return {
    rotation: 0,
    scale: 1.0,
    fitMode: 'contain',
    offsetX: 0,
    offsetY: 0,
  };
}

/**
 * Resuelve si el cuadro EXIF está activo para una página fotográfica.
 */
export function isExifVisibleForPhoto(
  photo: Pick<PhotoPageItem, 'showExifOverride'>,
  globalShowExif: boolean
): boolean {
  if (photo.showExifOverride !== null) {
    return photo.showExifOverride;
  }
  return globalShowExif;
}

/**
 * Formatea el identificador correlativo de una fotografía (ej: "FOTOGRAFÍA N° 01").
 * Si photoPrefixTemplate está vacío en el input, utiliza "FOTOGRAFÍA N°" por defecto en la hoja.
 */
export function formatPhotoIdentifier(
  orderNumber: number,
  photoPrefixTemplate: string,
  photoNumberPadding: number
): string {
  const effectivePrefix = photoPrefixTemplate.trim() || 'FOTOGRAFÍA N°';
  const safePadding = Math.max(1, Math.min(6, Math.floor(photoNumberPadding || 2)));
  const paddedNumber = String(Math.max(1, orderNumber)).padStart(safePadding, '0');
  return `${effectivePrefix} ${paddedNumber}`;
}

/**
 * Resuelve el título efectivo del índice en la hoja A4.
 */
export function resolveEffectiveIndexTitle(
  configuredTitle: string,
  isContinuation: boolean
): string {
  const base = configuredTitle.trim() || 'ÍNDICE DE ANEXO FOTOGRÁFICO';
  return isContinuation ? `${base} (CONTINUACIÓN)` : base;
}

/**
 * Divide un array en bloques de tamaño máximo maxRowsPerPage (28 por defecto).
 */
export function chunkIndexItems<T>(
  items: T[],
  maxRowsPerPage: number = MAX_INDEX_ROWS_PER_PAGE
): T[][] {
  if (items.length === 0) {
    return [[]];
  }
  const safeLimit = Math.max(1, maxRowsPerPage);
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += safeLimit) {
    chunks.push(items.slice(i, i + safeLimit));
  }
  return chunks;
}

/**
 * Calcula en tiempo real la foliatura exacta de Carátula, Índice (con paginación automática > 28 filas)
 * y cada Hoja Fotográfica, garantizando sincronización total entre Índice y Pies de página.
 */
export function calculateDocumentPagination(
  photos: Pick<PhotoPageItem, 'id'>[],
  coverConfig: Pick<CoverConfig, 'enabled'>,
  headerFooterConfig: Pick<
    HeaderFooterConfig,
    'countCoverInNumbering' | 'indexEnabled' | 'photoPrefixTemplate' | 'photoNumberPadding'
  >
): DocumentPaginationResult {
  let currentFolio = 0;
  let totalPhysicalSheets = 0;

  let coverFolio: number | null = null;
  if (coverConfig.enabled) {
    totalPhysicalSheets += 1;
    if (headerFooterConfig.countCoverInNumbering) {
      currentFolio += 1;
      coverFolio = currentFolio;
    }
  }

  // Pre-calcular cuántas páginas de índice habrá si indexEnabled está activo
  const rawChunks = headerFooterConfig.indexEnabled
    ? chunkIndexItems(photos, MAX_INDEX_ROWS_PER_PAGE)
    : [];

  const indexPageFolios: number[] = [];
  for (let i = 0; i < rawChunks.length; i++) {
    totalPhysicalSheets += 1;
    currentFolio += 1;
    indexPageFolios.push(currentFolio);
  }

  const photoFolios: Record<string, number> = {};
  const photoLabels: Record<string, string> = {};
  const allEntries: IndexEntryComputed[] = [];

  photos.forEach((photo, idx) => {
    totalPhysicalSheets += 1;
    currentFolio += 1;
    const orderIndex = idx + 1;
    const formattedLabel = formatPhotoIdentifier(
      orderIndex,
      headerFooterConfig.photoPrefixTemplate,
      headerFooterConfig.photoNumberPadding
    );
    photoFolios[photo.id] = currentFolio;
    photoLabels[photo.id] = formattedLabel;
    allEntries.push({
      photoId: photo.id,
      orderIndex,
      formattedLabel,
      folioNumber: currentFolio,
    });
  });

  const indexPages: IndexPageComputed[] = [];
  if (headerFooterConfig.indexEnabled) {
    const entryChunks = chunkIndexItems(allEntries, MAX_INDEX_ROWS_PER_PAGE);
    entryChunks.forEach((entries, pageIndex) => {
      indexPages.push({
        pageIndex,
        isContinuation: pageIndex > 0,
        folioNumber: indexPageFolios[pageIndex],
        entries,
      });
    });
  }

  return {
    coverFolio,
    indexPages,
    photoFolios,
    photoLabels,
    totalFolios: currentFolio,
    totalPhysicalSheets,
  };
}

/**
 * Formatea el texto de foliatura del pie de página derecho (ej: "Folio 01 de 05" o "Página 1 de 5").
 */
export function formatFolioLabel(
  prefix: HeaderFooterConfig['pageNumberPrefix'],
  folioNumber: number,
  totalFolios: number
): string {
  const pad = totalFolios >= 10 ? 2 : 2;
  const fStr = String(folioNumber).padStart(pad, '0');
  const tStr = String(Math.max(folioNumber, totalFolios)).padStart(pad, '0');
  return `${prefix} ${fStr} de ${tStr}`;
}

/**
 * Motor matemático de encuadre no destructivo dentro del contenedor fijo de 175mm x 145mm.
 * Resuelve el problema de CSS donde rotar 90° o 270° con object-fit: contain recorta o deforma la escala.
 * Devuelve el ancho y alto base (en mm) del elemento antes de rotar para que, una vez rotado
 * (0°, 90°, 180°, 270°) y con scale === 1:
 * - En 'contain': la fotografía completa (incluyendo sus 4 esquinas) quepa exactamente en 175mm x 145mm.
 * - En 'cover': cubra el 100% del área de 175mm x 145mm sin dejar bandas vacías.
 */
export interface ComputedImageGeometry {
  baseWidthMm: number;
  baseHeightMm: number;
  visualWidthMm: number;
  visualHeightMm: number;
  isOrthogonal: boolean;
  normalizedRotation: number;
  offsetXMm: number;
  offsetYMm: number;
}

export function computeImageFrameGeometry(
  naturalWidth: number,
  naturalHeight: number,
  transform: ImageTransform,
  containerWidthMm: number = PHOTO_FRAME_WIDTH_MM,
  containerHeightMm: number = PHOTO_FRAME_HEIGHT_MM
): ComputedImageGeometry {
  const safeNatW = naturalWidth > 0 ? naturalWidth : 4;
  const safeNatH = naturalHeight > 0 ? naturalHeight : 3;
  const imageAspect = safeNatW / safeNatH;

  // Normalizar rotación a [0, 360)
  const normalizedRotation = ((transform.rotation % 360) + 360) % 360;
  // Determinar si la rotación es ortogonal (90° o 270°, o cuando el múltiplo de 90 más cercano es impar)
  const quarterTurns = Math.round(normalizedRotation / 90) % 4;
  const isOrthogonal = quarterTurns % 2 !== 0;

  // Si está rotada 90° o 270°, el ancho no rotado de la imagen ocupará el eje vertical del contenedor
  // y el alto no rotado ocupará el eje horizontal del contenedor.
  const targetUnrotatedWidthMm = isOrthogonal ? containerHeightMm : containerWidthMm;
  const targetUnrotatedHeightMm = isOrthogonal ? containerWidthMm : containerHeightMm;
  const targetAspect = targetUnrotatedWidthMm / targetUnrotatedHeightMm;

  let baseWidthMm: number;
  let baseHeightMm: number;

  if (transform.fitMode === 'contain') {
    if (imageAspect >= targetAspect) {
      baseWidthMm = targetUnrotatedWidthMm;
      baseHeightMm = targetUnrotatedWidthMm / imageAspect;
    } else {
      baseHeightMm = targetUnrotatedHeightMm;
      baseWidthMm = targetUnrotatedHeightMm * imageAspect;
    }
  } else {
    // 'cover'
    if (imageAspect >= targetAspect) {
      baseHeightMm = targetUnrotatedHeightMm;
      baseWidthMm = targetUnrotatedHeightMm * imageAspect;
    } else {
      baseWidthMm = targetUnrotatedWidthMm;
      baseHeightMm = targetUnrotatedWidthMm / imageAspect;
    }
  }

  const safeScale = Math.max(0.5, Math.min(3.0, transform.scale || 1.0));
  const visualWidthMm = (isOrthogonal ? baseHeightMm : baseWidthMm) * safeScale;
  const visualHeightMm = (isOrthogonal ? baseWidthMm : baseHeightMm) * safeScale;

  // Convertir offsetX / offsetY en px (96 DPI) a mm reales para independencia de resolución en @media print
  const offsetXMm = (transform.offsetX || 0) / MM_TO_PX_96DPI;
  const offsetYMm = (transform.offsetY || 0) / MM_TO_PX_96DPI;

  return {
    baseWidthMm,
    baseHeightMm,
    visualWidthMm,
    visualHeightMm,
    isOrthogonal,
    normalizedRotation,
    offsetXMm,
    offsetYMm,
  };
}

/**
 * Formatea fecha EXIF a DD/MM/AAAA HH:mm:ss
 */
export function formatExifDate(dateVal: unknown): string | null {
  if (!dateVal) return null;

  if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
    const dd = String(dateVal.getDate()).padStart(2, '0');
    const mm = String(dateVal.getMonth() + 1).padStart(2, '0');
    const yyyy = dateVal.getFullYear();
    const hh = String(dateVal.getHours()).padStart(2, '0');
    const min = String(dateVal.getMinutes()).padStart(2, '0');
    const ss = String(dateVal.getSeconds()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
  }

  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    // Formato típico EXIF: "2025:08:14 16:32:09" o ISO
    const exifMatch = trimmed.match(/^(\d{4})[:\-](\d{2})[:\-](\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
    if (exifMatch) {
      const [, yyyy, mm, dd, hh, min, ss] = exifMatch;
      return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
    }
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return formatExifDate(parsed);
    }
  }

  return null;
}

/**
 * Formatea el tiempo de exposición como fracción (ej. 1/250s) o segundos (ej. 0.5s / 2s).
 */
export function formatExposureTime(exposureTime: unknown): string | null {
  if (typeof exposureTime !== 'number' || !isFinite(exposureTime) || exposureTime <= 0) {
    return null;
  }
  if (exposureTime >= 1) {
    return `${Number(exposureTime.toFixed(2))}s`;
  }
  const denominator = Math.round(1 / exposureTime);
  if (denominator > 1) {
    return `1/${denominator}s`;
  }
  return `${exposureTime.toFixed(3)}s`;
}

/**
 * Formatea coordenadas GPS con 6 decimales y hemisferio.
 */
export function formatGpsCoordinates(lat: unknown, lon: unknown): string | null {
  if (typeof lat !== 'number' || typeof lon !== 'number' || !isFinite(lat) || !isFinite(lon)) {
    return null;
  }
  const latHem = lat >= 0 ? 'N' : 'S';
  const lonHem = lon >= 0 ? 'E' : 'O';
  return `${lat.toFixed(6)} (${latHem}), ${lon.toFixed(6)} (${lonHem})`;
}

/**
 * Construye una cadena limpia en dos líneas compactas (tipografía monoespaciada 7.5pt/8pt)
 * a partir del objeto devuelto por exifr.parse().
 */
export function buildFormattedExifText(rawExif: Record<string, unknown> | null | undefined): {
  exifText: string;
  hasExifData: boolean;
} {
  if (!rawExif || typeof rawExif !== 'object') {
    return {
      exifText: NO_EXIF_DEFAULT_MESSAGE,
      hasExifData: false,
    };
  }

  // 1. Fecha y hora original
  const dateStr = formatExifDate(
    rawExif.DateTimeOriginal ?? rawExif.CreateDate ?? rawExif.ModifyDate
  );

  // 2. Equipo / Cámara (Make + Model)
  const make = typeof rawExif.Make === 'string' ? rawExif.Make.trim() : '';
  const model = typeof rawExif.Model === 'string' ? rawExif.Model.trim() : '';
  let cameraStr = '';
  if (make && model) {
    cameraStr = model.toLowerCase().startsWith(make.toLowerCase()) ? model : `${make} ${model}`;
  } else {
    cameraStr = make || model;
  }

  // 3. Óptica y exposición
  const opticsParts: string[] = [];
  if (typeof rawExif.FocalLength === 'number' && isFinite(rawExif.FocalLength)) {
    opticsParts.push(`${Number(rawExif.FocalLength.toFixed(1))}mm`);
  }
  if (typeof rawExif.FNumber === 'number' && isFinite(rawExif.FNumber)) {
    opticsParts.push(`f/${Number(rawExif.FNumber.toFixed(1))}`);
  }
  const expStr = formatExposureTime(rawExif.ExposureTime);
  if (expStr) {
    opticsParts.push(expStr);
  }
  const isoVal = rawExif.ISO ?? rawExif.ISOSpeedRatings;
  const isoNum = Array.isArray(isoVal) ? isoVal[0] : isoVal;
  if (typeof isoNum === 'number' && isFinite(isoNum)) {
    opticsParts.push(`ISO ${isoNum}`);
  }
  const opticsStr = opticsParts.join(' · ');

  // 4. Coordenadas GPS
  const gpsStr = formatGpsCoordinates(rawExif.latitude, rawExif.longitude);

  const hasAny = Boolean(dateStr || cameraStr || opticsStr || gpsStr);
  if (!hasAny) {
    return {
      exifText: NO_EXIF_DEFAULT_MESSAGE,
      hasExifData: false,
    };
  }

  const line1Parts: string[] = [];
  if (dateStr) line1Parts.push(`FECHA: ${dateStr}`);
  if (cameraStr) line1Parts.push(`EQUIPO: ${cameraStr}`);

  const line2Parts: string[] = [];
  if (opticsStr) line2Parts.push(`ÓPTICA/EXP: ${opticsStr}`);
  if (gpsStr) line2Parts.push(`GPS: ${gpsStr}`);

  const lines: string[] = [];
  if (line1Parts.length > 0) lines.push(line1Parts.join('  |  '));
  if (line2Parts.length > 0) lines.push(line2Parts.join('  |  '));

  return {
    exifText: lines.join('\n'),
    hasExifData: true,
  };
}

/**
 * Elimina coordenadas GPS del texto EXIF formateado para cumplir con el principio
 * de minimización y anonimización de datos de geolocalización.
 */
export function stripGpsFromExifText(exifText: string): string {
  if (!exifText || exifText === NO_EXIF_DEFAULT_MESSAGE) {
    return exifText;
  }

  const cleanedLines = exifText
    .split('\n')
    .map((line) =>
      line
        .split('  |  ')
        .filter((part) => !part.trim().toUpperCase().startsWith('GPS:'))
        .join('  |  ')
        .trim()
    )
    .filter((line) => line.length > 0);

  return cleanedLines.length > 0 ? cleanedLines.join('\n') : NO_EXIF_DEFAULT_MESSAGE;
}
