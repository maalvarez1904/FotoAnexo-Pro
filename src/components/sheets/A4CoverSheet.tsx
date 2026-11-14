import React from 'react';
import { CoverConfig } from '../../types/document';

interface A4CoverSheetProps {
  coverConfig: CoverConfig;
  isSelected: boolean;
  onSelectCover: () => void;
}

export const A4CoverSheet: React.FC<A4CoverSheetProps> = ({
  coverConfig,
  isSelected,
  onSelectCover,
}) => {
  return (
    <article
      data-testid="a4-cover-sheet"
      onClick={onSelectCover}
      className={`a4-sheet cursor-pointer transition-shadow ${
        isSelected
          ? 'ring-2 ring-slate-900 shadow-xl'
          : 'shadow-md hover:shadow-lg'
      }`}
      aria-label="Hoja de Carátula A4"
    >
      <div className="a4-printable-area">
        {/* Marco arquitectónico perimetral fino (0.75pt) */}
        <div
          style={{
            boxSizing: 'border-box',
            width: '175mm',
            height: '267mm',
            border: '0.75pt solid #1f2937',
            padding: '12mm',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {/* Bloque superior: Identificación documental y Título Principal */}
          <div>
            {/* Referencia / Expediente destacado arriba del título si existe */}
            <div style={{ marginBottom: '6mm' }}>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '7.5pt',
                  color: '#6b7280',
                  marginBottom: '1mm',
                }}
              >
                EXPEDIENTE / OBRA / REFERENCIA
              </div>
              <div
                className="vector-text-block"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10pt',
                  fontWeight: 600,
                  color: coverConfig.referenceCode.trim() ? '#111827' : '#9ca3af',
                  minHeight: '5mm',
                }}
              >
                {coverConfig.referenceCode.trim() || '—'}
              </div>
            </div>

            {/* Título Principal */}
            <div
              style={{
                borderTop: '1.5pt solid #111827',
                borderBottom: '0.5pt solid #333333',
                paddingTop: '8mm',
                paddingBottom: '8mm',
                marginBottom: '8mm',
              }}
            >
              <h1
                className="vector-text-block"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '20pt',
                  fontWeight: 700,
                  lineHeight: 1.2,
                  color: coverConfig.mainTitle.trim() ? '#111827' : '#9ca3af',
                  margin: 0,
                }}
              >
                {coverConfig.mainTitle.trim() || 'ANEXO FOTOGRÁFICO PERICIAL'}
              </h1>

              {(coverConfig.subtitle.trim() || !coverConfig.mainTitle.trim()) && (
                <div
                  className="vector-text-block"
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '11.5pt',
                    fontWeight: 400,
                    lineHeight: 1.4,
                    color: coverConfig.subtitle.trim() ? '#374151' : '#9ca3af',
                    marginTop: '4mm',
                  }}
                >
                  {coverConfig.subtitle.trim() || 'Relevamiento técnico e inspección ocular de obra'}
                </div>
              )}
            </div>
          </div>

          {/* Bloque central: Grilla técnica de datos del expediente */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '5mm',
              margin: 'auto 0',
            }}
          >
            {/* Comitente / Juzgado */}
            <div
              style={{
                border: '0.5pt solid #cbd5e1',
                padding: '4mm 5mm',
                backgroundColor: '#f8fafc',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '7.5pt',
                  color: '#475569',
                  marginBottom: '1.5mm',
                  fontWeight: 600,
                }}
              >
                COMITENTE / JUZGADO / DESTINATARIO
              </div>
              <div
                className="vector-text-block"
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '10pt',
                  lineHeight: 1.35,
                  color: coverConfig.clientOrCourt.trim() ? '#0f172a' : '#94a3b8',
                  minHeight: '6mm',
                }}
              >
                {coverConfig.clientOrCourt.trim() || 'Sin especificar'}
              </div>
            </div>

            {/* Profesional Interviniente */}
            <div
              style={{
                border: '0.5pt solid #cbd5e1',
                padding: '4mm 5mm',
                backgroundColor: '#f8fafc',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '7.5pt',
                  color: '#475569',
                  marginBottom: '1.5mm',
                  fontWeight: 600,
                }}
              >
                PROFESIONAL INTERVINIENTE / MATRÍCULA
              </div>
              <div
                className="vector-text-block"
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '10pt',
                  lineHeight: 1.35,
                  color: coverConfig.professionalInfo.trim() ? '#0f172a' : '#94a3b8',
                  minHeight: '6mm',
                }}
              >
                {coverConfig.professionalInfo.trim() || 'Sin especificar'}
              </div>
            </div>

            {/* Observaciones / Notas técnicas */}
            <div
              style={{
                border: '0.5pt solid #cbd5e1',
                padding: '4mm 5mm',
                backgroundColor: '#ffffff',
                minHeight: '34mm',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '7.5pt',
                  color: '#475569',
                  marginBottom: '1.5mm',
                  fontWeight: 600,
                }}
              >
                OBSERVACIONES Y ALCANCE TÉCNICO
              </div>
              <div
                className="vector-text-block"
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '9.5pt',
                  lineHeight: 1.4,
                  color: coverConfig.notes.trim() ? '#1f2937' : '#94a3b8',
                }}
              >
                {coverConfig.notes.trim() || 'Sin observaciones adicionales registradas.'}
              </div>
            </div>
          </div>

          {/* Bloque inferior: Lugar y Fecha al pie */}
          <div
            style={{
              borderTop: '0.75pt solid #1f2937',
              paddingTop: '4mm',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '7.5pt',
                  color: '#6b7280',
                  marginBottom: '1mm',
                }}
              >
                LUGAR Y FECHA DE EMISIÓN
              </div>
              <div
                className="vector-text-block"
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '9.5pt',
                  fontWeight: 500,
                  color: coverConfig.locationAndDate.trim() ? '#111827' : '#9ca3af',
                }}
              >
                {coverConfig.locationAndDate.trim() || '—'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};
