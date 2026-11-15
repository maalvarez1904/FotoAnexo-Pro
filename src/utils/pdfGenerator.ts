import { jsPDF } from 'jspdf';
import {
  CoverConfig,
  DocumentPaginationResult,
  HeaderFooterConfig,
  PdfExportCompressionConfig,
  PhotoPageItem,
} from '../types/document';
import {
  formatFolioLabel,
  isExifVisibleForPhoto,
  resolveEffectiveIndexTitle,
} from './documentLogic';
import { renderFramedPhotoToJpegDataUrl } from './pdfCompression';

const PAGE_W = 210;
const MARGIN_LEFT = 20;
const MARGIN_RIGHT = 15;
const MARGIN_TOP = 15;
const PRINT_W = PAGE_W - MARGIN_LEFT - MARGIN_RIGHT; // 175mm
const RIGHT_X = PAGE_W - MARGIN_RIGHT; // 195mm
const PT_TO_MM = 25.4 / 72;

function drawStandardHeaderAndFooter(
  doc: jsPDF,
  headerFooterConfig: HeaderFooterConfig,
  folioNumber: number,
  totalFolios: number
) {
  // 1. Encabezado (.a4-header): y = 15..25mm, border-bottom 0.5pt solid #333333
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(31, 41, 55); // #1f2937

  const headerLeft = headerFooterConfig.headerLeft.trim();
  const headerRight = headerFooterConfig.headerRight.trim();
  if (headerLeft) {
    doc.text(headerLeft, MARGIN_LEFT, MARGIN_TOP + 8.2, {
      maxWidth: 85,
    });
  }
  if (headerRight) {
    doc.text(headerRight, RIGHT_X, MARGIN_TOP + 8.2, {
      align: 'right',
      maxWidth: 85,
    });
  }
  doc.setDrawColor(51, 51, 51); // #333333
  doc.setLineWidth(0.5 * PT_TO_MM);
  doc.line(MARGIN_LEFT, MARGIN_TOP + 10, RIGHT_X, MARGIN_TOP + 10);

  // 5. Pie de página (.a4-footer): y = 270..282mm, border-top 0.5pt solid #333333
  const footerTopY = 270;
  doc.setDrawColor(51, 51, 51); // #333333
  doc.setLineWidth(0.5 * PT_TO_MM);
  doc.line(MARGIN_LEFT, footerTopY, RIGHT_X, footerTopY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(31, 41, 55);
  const footerLeft = headerFooterConfig.footerLeft.trim();
  if (footerLeft) {
    doc.text(footerLeft, MARGIN_LEFT, footerTopY + 5.2, {
      maxWidth: 115,
    });
  }

  const folioLabel = formatFolioLabel(
    headerFooterConfig.pageNumberPrefix,
    folioNumber,
    totalFolios
  );
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text(folioLabel, RIGHT_X, footerTopY + 5.2, { align: 'right' });
}

function drawCoverSheet(doc: jsPDF, coverConfig: CoverConfig) {
  // Marco arquitectónico perimetral fino: 175mm × 267mm, border 0.75pt solid #1f2937, padding 12mm
  doc.setDrawColor(31, 41, 55); // #1f2937
  doc.setLineWidth(0.75 * PT_TO_MM);
  doc.rect(MARGIN_LEFT, MARGIN_TOP, PRINT_W, 267);

  const innerX = MARGIN_LEFT + 12; // 32mm
  const innerRightX = RIGHT_X - 12; // 183mm
  const innerW = PRINT_W - 24; // 151mm
  let cursorY = MARGIN_TOP + 12 + 3; // 30mm

  // Referencia / Expediente
  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128); // #6b7280
  doc.text('EXPEDIENTE / OBRA / REFERENCIA', innerX, cursorY);
  cursorY += 4.5;

  doc.setFont('courier', 'bold');
  doc.setFontSize(10);
  if (coverConfig.referenceCode.trim()) {
    doc.setTextColor(17, 24, 39); // #111827
    const refLines = doc.splitTextToSize(coverConfig.referenceCode.trim(), innerW);
    doc.text(refLines, innerX, cursorY);
    cursorY += Math.max(5, refLines.length * 4.2) + 6;
  } else {
    doc.setTextColor(156, 163, 175); // #9ca3af
    doc.text('—', innerX, cursorY);
    cursorY += 11;
  }

  // Bloque Título Principal: borderTop 1.5pt solid #111827, borderBottom 0.5pt solid #333333, padding 8mm
  doc.setDrawColor(17, 24, 39); // #111827
  doc.setLineWidth(1.5 * PT_TO_MM);
  doc.line(innerX, cursorY, innerRightX, cursorY);
  cursorY += 8 + 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  const titleText =
    coverConfig.mainTitle.trim() || 'ANEXO FOTOGRÁFICO PERICIAL';
  if (coverConfig.mainTitle.trim()) {
    doc.setTextColor(17, 24, 39);
  } else {
    doc.setTextColor(156, 163, 175);
  }
  const titleLines = doc.splitTextToSize(titleText, innerW);
  doc.text(titleLines, innerX, cursorY);
  cursorY += titleLines.length * 8.2;

  if (coverConfig.subtitle.trim() || !coverConfig.mainTitle.trim()) {
    cursorY += 3;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11.5);
    if (coverConfig.subtitle.trim()) {
      doc.setTextColor(55, 65, 81); // #374151
    } else {
      doc.setTextColor(156, 163, 175);
    }
    const subText =
      coverConfig.subtitle.trim() ||
      'Relevamiento técnico e inspección ocular de obra';
    const subLines = doc.splitTextToSize(subText, innerW);
    doc.text(subLines, innerX, cursorY);
    cursorY += subLines.length * 5.2;
  }

  cursorY += 6;
  doc.setDrawColor(51, 51, 51); // #333333
  doc.setLineWidth(0.5 * PT_TO_MM);
  doc.line(innerX, cursorY, innerRightX, cursorY);

  // Bloque central: 3 tarjetas técnicas (gap 5mm) con guarda de alto para no solapar el pie
  const footerStartY = MARGIN_TOP + 267 - 12 - 14; // ~256mm
  const cardsBlockStartY = Math.min(Math.max(cursorY + 10, 134), footerStartY - 82);

  const drawCard = (
    y: number,
    minHeight: number,
    maxBottomY: number,
    fillRgb: [number, number, number],
    label: string,
    value: string,
    fallback: string,
    fontSize: number
  ): number => {
    const lineHeightMm = fontSize * 0.46;
    const rawLines = doc.splitTextToSize(
      value.trim() || fallback,
      innerW - 10
    );
    const maxAllowedHeight = Math.max(minHeight, maxBottomY - y);
    const maxLines = Math.max(1, Math.floor((maxAllowedHeight - 13) / lineHeightMm));
    const textLines = rawLines.slice(0, maxLines);
    const contentH = 4 + 3.5 + textLines.length * lineHeightMm + 4;
    const cardH = Math.min(maxAllowedHeight, Math.max(minHeight, contentH));

    doc.setFillColor(fillRgb[0], fillRgb[1], fillRgb[2]);
    doc.setDrawColor(203, 213, 225); // #cbd5e1
    doc.setLineWidth(0.5 * PT_TO_MM);
    doc.rect(innerX, y, innerW, cardH, 'FD');

    doc.setFont('courier', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105); // #475569
    doc.text(label, innerX + 5, y + 6.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSize);
    if (value.trim()) {
      doc.setTextColor(15, 23, 42); // #0f172a
    } else {
      doc.setTextColor(148, 163, 184); // #94a3b8
    }
    doc.text(textLines, innerX + 5, y + 11.5);

    return y + cardH + 5;
  };

  let cardY = cardsBlockStartY;
  cardY = drawCard(
    cardY,
    18,
    footerStartY - 62,
    [248, 250, 252], // #f8fafc
    'COMITENTE / JUZGADO / DESTINATARIO',
    coverConfig.clientOrCourt,
    'Sin especificar',
    10
  );
  cardY = drawCard(
    cardY,
    18,
    footerStartY - 39,
    [248, 250, 252], // #f8fafc
    'PROFESIONAL INTERVINIENTE / MATRÍCULA',
    coverConfig.professionalInfo,
    'Sin especificar',
    10
  );
  drawCard(
    cardY,
    24,
    footerStartY - 5,
    [255, 255, 255], // #ffffff
    'OBSERVACIONES Y ALCANCE TÉCNICO',
    coverConfig.notes,
    'Sin observaciones adicionales registradas.',
    9.5
  );

  // Bloque inferior: Lugar y Fecha al pie (borderTop 0.75pt solid #1f2937)
  doc.setDrawColor(31, 41, 55); // #1f2937
  doc.setLineWidth(0.75 * PT_TO_MM);
  doc.line(innerX, footerStartY, innerRightX, footerStartY);

  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128); // #6b7280
  doc.text('LUGAR Y FECHA DE EMISIÓN', innerX, footerStartY + 6.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  if (coverConfig.locationAndDate.trim()) {
    doc.setTextColor(17, 24, 39);
    doc.text(coverConfig.locationAndDate.trim(), innerX, footerStartY + 11.5);
  } else {
    doc.setTextColor(156, 163, 175);
    doc.text('—', innerX, footerStartY + 11.5);
  }
}

function drawIndexSheet(
  doc: jsPDF,
  headerFooterConfig: HeaderFooterConfig,
  indexPage: DocumentPaginationResult['indexPages'][number],
  totalFolios: number
) {
  drawStandardHeaderAndFooter(
    doc,
    headerFooterConfig,
    indexPage.folioNumber,
    totalFolios
  );

  const effectiveTitle = resolveEffectiveIndexTitle(
    headerFooterConfig.indexTitle,
    indexPage.isContinuation
  );

  // Barra de título del índice: y = 29..41mm, borderBottom 0.75pt solid #111827
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(17, 24, 39);
  doc.text(effectiveTitle, MARGIN_LEFT, 36.5);

  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(75, 85, 99); // #4b5563
  doc.text(
    `${headerFooterConfig.pageNumberPrefix.toUpperCase()} DESTINO`,
    RIGHT_X,
    36.5,
    { align: 'right' }
  );

  doc.setDrawColor(17, 24, 39);
  doc.setLineWidth(0.75 * PT_TO_MM);
  doc.line(MARGIN_LEFT, 41, RIGHT_X, 41);

  if (indexPage.entries.length === 0) {
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5 * PT_TO_MM);
    doc.setLineDashPattern([1.5, 1.5], 0);
    doc.rect(MARGIN_LEFT, 45, PRINT_W, 18);
    doc.setLineDashPattern([], 0);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'Índice sin registros fotográficos cargados en el lote actual.',
      PAGE_W / 2,
      55,
      { align: 'center' }
    );
    return;
  }

  let rowY = 50;
  for (const entry of indexPage.entries) {
    doc.setFont('courier', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(17, 24, 39);
    doc.text(entry.formattedLabel, MARGIN_LEFT, rowY);

    const folioText = `${headerFooterConfig.pageNumberPrefix} ${String(entry.folioNumber).padStart(2, '0')}`;
    doc.text(folioText, RIGHT_X, rowY, { align: 'right' });

    const leftW = doc.getTextWidth(entry.formattedLabel);
    const rightW = doc.getTextWidth(folioText);
    const lineStart = MARGIN_LEFT + leftW + 3;
    const lineEnd = RIGHT_X - rightW - 3;
    if (lineEnd > lineStart + 4) {
      doc.setDrawColor(107, 114, 128); // #6b7280
      doc.setLineWidth(0.25);
      doc.setLineDashPattern([0.5, 1.2], 0);
      doc.line(lineStart, rowY - 0.5, lineEnd, rowY - 0.5);
      doc.setLineDashPattern([], 0);
    }

    rowY += 7.5;
  }
}

async function drawPhotoSheet(
  doc: jsPDF,
  photo: PhotoPageItem,
  photoLabel: string,
  folioNumber: number,
  totalFolios: number,
  headerFooterConfig: HeaderFooterConfig,
  compressionConfig: PdfExportCompressionConfig
) {
  drawStandardHeaderAndFooter(doc, headerFooterConfig, folioNumber, totalFolios);

  // 2. Título de página (.a4-page-title-bar): y = 29..39mm, sin caja/borde, 11pt semibold #111827
  const fullTitle = photo.pageTitle.trim()
    ? `${photoLabel} — ${photo.pageTitle.trim()}`
    : photoLabel;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text(fullTitle, MARGIN_LEFT, 35.5, { maxWidth: PRINT_W });

  // 3. Marco de fotografía (.a4-photo-frame): y = 43..188mm, 175 x 145 mm, border 0.5pt solid #333333
  const frameY = 43;
  const frameW = 175;
  const frameH = 145;
  const { dataUrl } = await renderFramedPhotoToJpegDataUrl(
    photo,
    compressionConfig.dpi,
    compressionConfig.quality
  );

  // 'NONE' asegura que jsPDF incruste el stream JPEG sin recomprimirlo
  doc.addImage(
    dataUrl,
    'JPEG',
    MARGIN_LEFT,
    frameY,
    frameW,
    frameH,
    undefined,
    'NONE'
  );
  doc.setDrawColor(51, 51, 51); // #333333
  doc.setLineWidth(0.5 * PT_TO_MM);
  doc.rect(MARGIN_LEFT, frameY, frameW, frameH);

  // 4. Bloque de Descripción y EXIF (y = 192..266mm, 175 x 74 mm)
  const boxY = 192;
  const showExif = isExifVisibleForPhoto(
    photo,
    headerFooterConfig.globalShowExif
  );
  const captionH = showExif ? 54 : 74;

  // Caja de Descripción (.a4-caption-box-with-exif / .a4-caption-box-full): border 0.5pt solid #CCCCCC
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(204, 204, 204); // #CCCCCC
  doc.setLineWidth(0.5 * PT_TO_MM);
  doc.rect(MARGIN_LEFT, boxY, PRINT_W, captionH, 'FD');

  doc.setFont('courier', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(75, 85, 99); // #4b5563
  doc.text('DESCRIPCIÓN', MARGIN_LEFT + 3, boxY + 5.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const captionText = photo.caption.trim();
  if (captionText) {
    doc.setTextColor(17, 24, 39);
    const maxCaptionLines = showExif ? 9 : 14;
    const lines = doc
      .splitTextToSize(captionText, PRINT_W - 6)
      .slice(0, maxCaptionLines);
    doc.text(lines, MARGIN_LEFT + 3, boxY + 10.2);
  } else {
    doc.setTextColor(156, 163, 175);
    doc.text('—', MARGIN_LEFT + 3, boxY + 10.2);
  }

  // Cuadro EXIF (.a4-exif-box): height 18mm, marginTop 2mm (y = 248mm), border 0.5pt solid #CCCCCC, bg #F8F9FA
  if (showExif) {
    const exifY = boxY + captionH + 2; // 248mm
    const exifH = 18;
    doc.setFillColor(248, 249, 250); // #F8F9FA
    doc.setDrawColor(204, 204, 204); // #CCCCCC
    doc.setLineWidth(0.5 * PT_TO_MM);
    doc.rect(MARGIN_LEFT, exifY, PRINT_W, exifH, 'FD');

    doc.setFont('courier', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(75, 85, 99);
    doc.text('REGISTRO DE METADATOS EXIF', MARGIN_LEFT + 3, exifY + 4.5);

    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(31, 41, 55);
    const exifText = photo.exifText.trim() || 'Sin datos EXIF disponibles.';
    const exifLines = doc.splitTextToSize(exifText, PRINT_W - 6).slice(0, 3);
    doc.text(exifLines, MARGIN_LEFT + 3, exifY + 9);
  }
}

export interface GenerateCompressedPdfParams {
  coverConfig: CoverConfig;
  headerFooterConfig: HeaderFooterConfig;
  photos: PhotoPageItem[];
  pagination: DocumentPaginationResult;
  compressionConfig: PdfExportCompressionConfig;
}

/**
 * Genera y descarga directamente un archivo PDF A4 con compresión JPEG real
 * respetando exactamente el diseño gráfico editorial de las hojas A4.
 */
export async function generateAndDownloadCompressedPdf({
  coverConfig,
  headerFooterConfig,
  photos,
  pagination,
  compressionConfig,
}: GenerateCompressedPdfParams): Promise<{ fileSizeBytes: number; fileName: string }> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  let hasAddedFirstPage = false;
  const ensureNewPage = () => {
    if (hasAddedFirstPage) {
      doc.addPage('a4', 'portrait');
    } else {
      hasAddedFirstPage = true;
    }
  };

  if (coverConfig.enabled) {
    ensureNewPage();
    drawCoverSheet(doc, coverConfig);
  }

  if (headerFooterConfig.indexEnabled) {
    for (const indexPage of pagination.indexPages) {
      ensureNewPage();
      drawIndexSheet(
        doc,
        headerFooterConfig,
        indexPage,
        pagination.totalFolios
      );
    }
  }

  for (const photo of photos) {
    ensureNewPage();
    const folioNumber = pagination.photoFolios[photo.id] || 1;
    const photoLabel = pagination.photoLabels[photo.id] || 'FOTOGRAFÍA N° 01';
    await drawPhotoSheet(
      doc,
      photo,
      photoLabel,
      folioNumber,
      pagination.totalFolios,
      headerFooterConfig,
      compressionConfig
    );
  }

  // FIX: Evitar generar un PDF de 1 página en blanco cuando no hay hojas activas
  if (!hasAddedFirstPage) {
    throw new Error('No hay hojas activas para exportar al PDF.');
  }

  const baseName =
    (coverConfig.referenceCode || coverConfig.mainTitle || 'FotoAnexo_Pro')
      .trim()
      .replace(/[^\w\d\-]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'FotoAnexo_Pro';
  const fileName = `${baseName}_${compressionConfig.dpi}dpi.pdf`;

  const pdfBlob = doc.output('blob');
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);

  return {
    fileSizeBytes: pdfBlob.size,
    fileName,
  };
}
