export interface CoverConfig {
  enabled: boolean;
  mainTitle: string;
  subtitle: string;
  referenceCode: string;     // Ej: Expediente / Obra / Causa
  clientOrCourt: string;     // Ej: Comitente / Juzgado
  professionalInfo: string;  // Ej: Profesional interviniente / Matrícula
  locationAndDate: string;
  notes: string;
}

export interface HeaderFooterConfig {
  headerLeft: string;
  headerRight: string;
  footerLeft: string;
  pageNumberPrefix: 'Folio' | 'Página' | 'Pág.';
  countCoverInNumbering: boolean;
  indexTitle: string;
  indexEnabled: boolean;
  photoPrefixTemplate: string; // Ej: "FOTOGRAFÍA N°"
  photoNumberPadding: number;  // Ej: 2 para "01", "02"
  globalShowExif: boolean;
}

export interface ImageTransform {
  rotation: number;          // Grados: 0, 90, 180, 270 (o ajuste fino)
  scale: number;             // Factor de escala: 0.5 a 3.0 (default 1.0)
  fitMode: 'contain' | 'cover';
  offsetX: number;           // Desplazamiento horizontal en px dentro del marco
  offsetY: number;           // Desplazamiento vertical en px dentro del marco
}

export interface PhotoPageItem {
  id: string;
  file: File;
  objectUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  pageTitle: string;         // Título editable de la página
  caption: string;           // Epígrafe técnico multilínea
  exifText: string;          // Texto formateado de metadatos EXIF (editable)
  hasExifData: boolean;
  showExifOverride: boolean | null; // null = hereda globalShowExif
  transform: ImageTransform;
}

export interface IndexEntryComputed {
  photoId: string;
  orderIndex: number;        // 1-based index (1, 2, 3...)
  formattedLabel: string;    // Ej: "FOTOGRAFÍA N° 01"
  folioNumber: number;       // Folio en el que se ubica esta fotografía
}

export interface IndexPageComputed {
  pageIndex: number;         // 0-based index among index pages
  isContinuation: boolean;
  folioNumber: number;
  entries: IndexEntryComputed[];
}

export interface DocumentPaginationResult {
  coverFolio: number | null;
  indexPages: IndexPageComputed[];
  photoFolios: Record<string, number>; // photoId -> folioNumber
  photoLabels: Record<string, string>; // photoId -> "FOTOGRAFÍA N° 01"
  totalFolios: number;
  totalPhysicalSheets: number;
}

export type ActiveTab = 'cover' | 'headerFooter' | 'photos';
export type ZoomMode = 0.5 | 0.75 | 1.0 | 1.25 | 1.5 | 2.0 | 'fit';

export interface PdfExportCompressionConfig {
  enabled: boolean;
  dpi: number;
  quality: number; // 0.1 a 1.0
}
