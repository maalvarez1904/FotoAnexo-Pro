import React, { useEffect, useRef, useState } from 'react';
import {
  HeaderFooterConfig,
  ImageTransform,
  PhotoPageItem,
} from '../../types/document';
import {
  computeImageFrameGeometry,
  formatFolioLabel,
  isExifVisibleForPhoto,
} from '../../utils/documentLogic';

interface A4PhotoSheetProps {
  photo: PhotoPageItem;
  photoLabel: string;       // Ej: "FOTOGRAFÍA N° 01"
  folioNumber: number;
  totalFolios: number;
  headerFooterConfig: HeaderFooterConfig;
  previewScale: number;     // Escala de visualización en pantalla para compensar el drag (pan)
  isSelected: boolean;
  imageSrcOverride?: string;
  onSelectPhoto: (photoId: string) => void;
  onUpdateTransform: (photoId: string, partial: Partial<ImageTransform>) => void;
}

export const A4PhotoSheet: React.FC<A4PhotoSheetProps> = ({
  photo,
  photoLabel,
  folioNumber,
  totalFolios,
  headerFooterConfig,
  previewScale,
  isSelected,
  imageSrcOverride,
  onSelectPhoto,
  onUpdateTransform,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    initialOffsetX: number;
    initialOffsetY: number;
  } | null>(null);
  const activeDragCleanupRef = useRef<(() => void) | null>(null);

  // FIX: Limpiar listeners globales de arrastre si el componente se desmonta antes de mouseup
  useEffect(() => {
    return () => {
      activeDragCleanupRef.current?.();
      activeDragCleanupRef.current = null;
    };
  }, []);

  const showExif = isExifVisibleForPhoto(photo, headerFooterConfig.globalShowExif);
  const geometry = computeImageFrameGeometry(
    photo.naturalWidth,
    photo.naturalHeight,
    photo.transform
  );

  const folioText = formatFolioLabel(
    headerFooterConfig.pageNumberPrefix,
    folioNumber,
    totalFolios
  );

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    onSelectPhoto(photo.id);
    setIsDragging(true);

    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      initialOffsetX: photo.transform.offsetX,
      initialOffsetY: photo.transform.offsetY,
    };

    const handleWindowMouseMove = (moveEvent: MouseEvent) => {
      if (!dragStartRef.current) return;
      const safeScale = previewScale > 0 ? previewScale : 1;
      const deltaX = (moveEvent.clientX - dragStartRef.current.clientX) / safeScale;
      const deltaY = (moveEvent.clientY - dragStartRef.current.clientY) / safeScale;

      onUpdateTransform(photo.id, {
        offsetX: Math.round(dragStartRef.current.initialOffsetX + deltaX),
        offsetY: Math.round(dragStartRef.current.initialOffsetY + deltaY),
      });
    };

    const cleanupListeners = () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
      if (activeDragCleanupRef.current === cleanupListeners) {
        activeDragCleanupRef.current = null;
      }
    };

    const handleWindowMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      cleanupListeners();
    };

    activeDragCleanupRef.current?.();
    activeDragCleanupRef.current = cleanupListeners;
    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
  };

  const fullTitleText = photo.pageTitle.trim()
    ? `${photoLabel} — ${photo.pageTitle.trim()}`
    : photoLabel;

  return (
    <article
      data-testid={`a4-photo-sheet-${photo.id}`}
      tabIndex={0}
      onClick={() => onSelectPhoto(photo.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelectPhoto(photo.id);
        }
      }}
      className={`a4-sheet cursor-pointer transition-shadow focus:outline-none focus:ring-2 focus:ring-slate-900 ${
        isSelected
          ? 'ring-2 ring-slate-900 shadow-xl'
          : 'shadow-md hover:shadow-lg'
      }`}
      aria-label={`Hoja Fotográfica ${photoLabel}`}
    >
      {/* Área útil imprimible resultante: 175mm x 267mm exactos */}
      <div className="a4-printable-area">
        {/* 1. Encabezado (Header): height: 10mm; margin-bottom: 4mm; (Total: 14mm) */}
        <header className="a4-header">
          <div className="truncate max-w-[85mm] vector-text-block">
            {headerFooterConfig.headerLeft.trim()}
          </div>
          <div className="truncate max-w-[85mm] text-right vector-text-block">
            {headerFooterConfig.headerRight.trim()}
          </div>
        </header>

        {/* 2. Título de la página: height: 10mm; margin-bottom: 4mm; (Total: 14mm) */}
        <div className="a4-page-title-bar">
          <div className="truncate w-full vector-text-block" title={fullTitleText}>
            <span>{photoLabel}</span>
            {photo.pageTitle.trim() && (
              <span style={{ fontWeight: 500 }}> — {photo.pageTitle.trim()}</span>
            )}
          </div>
        </div>

        {/* 3. Contenedor fijo de la fotografía: width: 175mm; height: 145mm; margin-bottom: 4mm; (Total: 149mm) */}
        <div
          data-testid={`photo-frame-${photo.id}`}
          onMouseDown={handleMouseDown}
          className={`a4-photo-frame ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          title="Arrastre con el ratón para ajustar el encuadre (Pan) dentro del marco de 175mm × 145mm"
        >
          <img
            src={imageSrcOverride || photo.objectUrl}
            alt={fullTitleText}
            draggable={false}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: `${geometry.baseWidthMm.toFixed(4)}mm`,
              height: `${geometry.baseHeightMm.toFixed(4)}mm`,
              maxWidth: 'none',
              maxHeight: 'none',
              transform: `translate(calc(-50% + ${geometry.offsetXMm.toFixed(3)}mm), calc(-50% + ${geometry.offsetYMm.toFixed(3)}mm)) rotate(${photo.transform.rotation}deg) scale(${photo.transform.scale})`,
              transformOrigin: 'center center',
              display: 'block',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* 4. Bloque de Epígrafe y Datos EXIF: height: 74mm; (Total: 74mm) */}
        <div className="a4-caption-exif-block">
          {/* Caja de Epígrafe: 54mm (con EXIF) o 74mm (sin EXIF) */}
          <div
            className={
              showExif ? 'a4-caption-box-with-exif' : 'a4-caption-box-full'
            }
          >
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '7pt',
                fontWeight: 600,
                color: '#4b5563',
                marginBottom: '1.2mm',
                letterSpacing: '0.04em',
              }}
            >
              DESCRIPCIÓN
            </div>
            <div
              className="vector-text-block"
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '9.5pt',
                lineHeight: 1.38,
                color: photo.caption.trim() ? '#111827' : '#9ca3af',
              }}
            >
              {photo.caption.trim() || 'Sin observaciones descriptivas registradas para esta toma.'}
            </div>
          </div>

          {/* Cuadro EXIF: height: 18mm (solo si está activado para esta página) */}
          {showExif && (
            <div className="a4-exif-box" data-testid={`exif-box-${photo.id}`}>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '6.5pt',
                  fontWeight: 600,
                  color: '#4b5563',
                  marginBottom: '0.6mm',
                  letterSpacing: '0.04em',
                }}
              >
                REGISTRO DE METADATOS EXIF
              </div>
              <div
                className="vector-text-block"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '7.5pt',
                  lineHeight: 1.3,
                  color: '#1f2937',
                }}
              >
                {photo.exifText.trim() || 'Metadatos EXIF no disponibles en el archivo original'}
              </div>
            </div>
          )}
        </div>

        {/* 5. Pie de página (Footer): margin-top: 4mm; height: 12mm; (Total: 16mm) */}
        <footer className="a4-footer">
          <div className="truncate max-w-[115mm] vector-text-block">
            {headerFooterConfig.footerLeft.trim()}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontVariantNumeric: 'tabular-nums',
              fontWeight: 500,
            }}
            className="shrink-0 text-right"
          >
            {folioText}
          </div>
        </footer>
      </div>
    </article>
  );
};
