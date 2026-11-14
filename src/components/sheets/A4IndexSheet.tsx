import React from 'react';
import { HeaderFooterConfig, IndexPageComputed } from '../../types/document';
import { formatFolioLabel, resolveEffectiveIndexTitle } from '../../utils/documentLogic';

interface A4IndexSheetProps {
  indexPage: IndexPageComputed;
  headerFooterConfig: HeaderFooterConfig;
  totalFolios: number;
  isSelected: boolean;
  onSelectIndexConfig: () => void;
  onSelectPhotoFromIndex: (photoId: string) => void;
}

export const A4IndexSheet: React.FC<A4IndexSheetProps> = ({
  indexPage,
  headerFooterConfig,
  totalFolios,
  isSelected,
  onSelectIndexConfig,
  onSelectPhotoFromIndex,
}) => {
  const effectiveTitle = resolveEffectiveIndexTitle(
    headerFooterConfig.indexTitle,
    indexPage.isContinuation
  );
  const folioLabel = formatFolioLabel(
    headerFooterConfig.pageNumberPrefix,
    indexPage.folioNumber,
    totalFolios
  );

  return (
    <article
      data-testid={`a4-index-sheet-${indexPage.pageIndex}`}
      tabIndex={0}
      onClick={onSelectIndexConfig}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelectIndexConfig();
        }
      }}
      className={`a4-sheet cursor-pointer transition-shadow focus:outline-none focus:ring-2 focus:ring-slate-900 ${
        isSelected
          ? 'ring-2 ring-slate-900 shadow-xl'
          : 'shadow-md hover:shadow-lg'
      }`}
      aria-label={`Hoja de Índice A4 (${indexPage.pageIndex + 1})`}
    >
      <div className="a4-printable-area">
        {/* 1. Encabezado estándar (height: 10mm; margin-bottom: 4mm; total 14mm) */}
        <header className="a4-header">
          <div className="truncate max-w-[85mm] vector-text-block">
            {headerFooterConfig.headerLeft.trim()}
          </div>
          <div className="truncate max-w-[85mm] text-right vector-text-block">
            {headerFooterConfig.headerRight.trim()}
          </div>
        </header>

        {/* Cuerpo de Índice: 237mm exactos (267mm - 14mm header - 16mm footer) */}
        <div className="a4-index-body">
          {/* Título superior configurable */}
          <div
            style={{
              height: '12mm',
              marginBottom: '4mm',
              borderBottom: '0.75pt solid #111827',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '11.5pt',
                fontWeight: 700,
                color: '#111827',
                margin: 0,
              }}
            >
              {effectiveTitle}
            </h2>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '8pt',
                color: '#4b5563',
              }}
            >
              {headerFooterConfig.pageNumberPrefix.toUpperCase()} DESTINO
            </span>
          </div>

          {/* Listado de hasta 28 filas por página:
              ÚNICAMENTE identificador correlativo a la izquierda, leader dots al centro y folio a la derecha */}
          {indexPage.entries.length === 0 ? (
            <div
              style={{
                padding: '8mm 4mm',
                border: '0.5pt dashed #cbd5e1',
                fontFamily: 'var(--font-sans)',
                fontSize: '9pt',
                color: '#64748b',
                textAlign: 'center',
              }}
            >
              Índice sin registros fotográficos cargados en el lote actual.
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.8mm',
              }}
            >
              {indexPage.entries.map((entry) => (
                <div
                  key={entry.photoId}
                  role="button"
                  tabIndex={0}
                  aria-label={`Ir a ${entry.formattedLabel} en ${headerFooterConfig.pageNumberPrefix} ${entry.folioNumber}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectPhotoFromIndex(entry.photoId);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      onSelectPhotoFromIndex(entry.photoId);
                    }
                  }}
                  style={{
                    height: '7mm',
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '9.5pt',
                    color: '#111827',
                    padding: '0 1mm',
                  }}
                  className="hover:bg-slate-50 rounded-xs"
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontWeight: 500,
                      flexShrink: 0,
                    }}
                  >
                    {entry.formattedLabel}
                  </span>
                  <span className="index-leader-dots" aria-hidden="true" />
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: 600,
                      fontSize: '9pt',
                      flexShrink: 0,
                    }}
                  >
                    {headerFooterConfig.pageNumberPrefix}{' '}
                    {String(entry.folioNumber).padStart(2, '0')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 5. Pie de página estándar (margin-top: 4mm; height: 12mm; total 16mm) */}
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
            {folioLabel}
          </div>
        </footer>
      </div>
    </article>
  );
};
