import React from 'react';
import { CoverConfig, HeaderFooterConfig } from '../../types/document';
import { AutoResizeTextarea } from '../ui/AutoResizeTextarea';

interface CoverTabPanelProps {
  coverConfig: CoverConfig;
  headerFooterConfig: HeaderFooterConfig;
  onUpdateCover: (partial: Partial<CoverConfig>) => void;
  onUpdateHeaderFooter: (partial: Partial<HeaderFooterConfig>) => void;
}

export const CoverTabPanel: React.FC<CoverTabPanelProps> = ({
  coverConfig,
  headerFooterConfig,
  onUpdateCover,
  onUpdateHeaderFooter,
}) => {
  return (
    <div className="flex-1 flex flex-col gap-4">
      {/* Interruptores estructurales de Carátula e Índice */}
      <section className="space-y-3 border-b border-[#B2B2B2] pb-4">
        <h3 className="text-xs font-semibold tracking-wider text-black uppercase">
          Estructura del Documento A4
        </h3>

        <label className="flex items-start justify-between gap-3 p-3 rounded-lg border border-[#9A8F97] bg-[#C3BABA]/60 cursor-pointer hover:bg-[#C3BABA] transition-colors">
          <div>
            <div className="text-sm font-medium text-black">
              Incluir Carátula Técnica
            </div>
            <div className="text-xs text-black mt-0.5">
              Genera la primera hoja A4 con datos del expediente, comitente y profesional.
            </div>
          </div>
          <input
            type="checkbox"
            checked={coverConfig.enabled}
            onChange={(e) => onUpdateCover({ enabled: e.target.checked })}
            className="mt-1 h-4 w-4 rounded border-[#736F72] accent-[#736F72] focus:ring-[#736F72]"
          />
        </label>

        <label className="flex items-start justify-between gap-3 p-3 rounded-lg border border-[#9A8F97] bg-[#C3BABA]/60 cursor-pointer hover:bg-[#C3BABA] transition-colors">
          <div>
            <div className="text-sm font-medium text-black">
              Incluir Índice Automático
            </div>
            <div className="text-xs text-black mt-0.5">
              Tabla correlativa de fotografías con foliatura automática (máx. 28 filas por hoja).
            </div>
          </div>
          <input
            type="checkbox"
            checked={headerFooterConfig.indexEnabled}
            onChange={(e) => onUpdateHeaderFooter({ indexEnabled: e.target.checked })}
            className="mt-1 h-4 w-4 rounded border-[#736F72] accent-[#736F72] focus:ring-[#736F72]"
          />
        </label>
      </section>

      {/* Campos de texto de Carátula */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold tracking-wider text-black uppercase">
            Datos de Carátula (Solo Texto)
          </h3>
          {!coverConfig.enabled && (
            <span className="text-xs text-black font-medium bg-[#C3BABA] border border-[#736F72] px-2 py-0.5 rounded">
              Carátula desactivada
            </span>
          )}
        </div>

        <div>
          <label
            htmlFor="cover-main-title"
            className="block text-xs font-medium text-black mb-1"
          >
            Título Principal del Informe / Anexo
          </label>
          <input
            id="cover-main-title"
            type="text"
            lang="es-419"
            spellCheck={true}
            value={coverConfig.mainTitle}
            onChange={(e) => onUpdateCover({ mainTitle: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-[#E9E3E6] border border-[#736F72] rounded-md text-black focus:outline-none focus:ring-2 focus:ring-[#736F72] focus:border-transparent"
          />
        </div>

        <div>
          <label
            htmlFor="cover-subtitle"
            className="block text-xs font-medium text-black mb-1"
          >
            Subtítulo / Objeto Técnico
          </label>
          <input
            id="cover-subtitle"
            type="text"
            lang="es-419"
            spellCheck={true}
            value={coverConfig.subtitle}
            onChange={(e) => onUpdateCover({ subtitle: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-[#E9E3E6] border border-[#736F72] rounded-md text-black focus:outline-none focus:ring-2 focus:ring-[#736F72] focus:border-transparent"
          />
        </div>

        <div>
          <label
            htmlFor="cover-reference-code"
            className="block text-xs font-medium text-black mb-1"
          >
            Expediente / Obra / Causa
          </label>
          <input
            id="cover-reference-code"
            type="text"
            lang="es-419"
            spellCheck={true}
            value={coverConfig.referenceCode}
            onChange={(e) => onUpdateCover({ referenceCode: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-[#E9E3E6] border border-[#736F72] rounded-md text-black focus:outline-none focus:ring-2 focus:ring-[#736F72] focus:border-transparent font-mono"
          />
        </div>

        <div>
          <label
            htmlFor="cover-client-court"
            className="block text-xs font-medium text-black mb-1"
          >
            Comitente / Juzgado / Destinatario
          </label>
          <AutoResizeTextarea
            id="cover-client-court"
            minRows={2}
            lang="es-419"
            spellCheck={true}
            value={coverConfig.clientOrCourt}
            onChange={(e) => onUpdateCover({ clientOrCourt: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-[#E9E3E6] border border-[#736F72] rounded-md text-black focus:outline-none focus:ring-2 focus:ring-[#736F72] focus:border-transparent"
          />
        </div>

        <div>
          <label
            htmlFor="cover-professional-info"
            className="block text-xs font-medium text-black mb-1"
          >
            Profesional Interviniente / Matrícula
          </label>
          <AutoResizeTextarea
            id="cover-professional-info"
            minRows={2}
            lang="es-419"
            spellCheck={true}
            value={coverConfig.professionalInfo}
            onChange={(e) => onUpdateCover({ professionalInfo: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-[#E9E3E6] border border-[#736F72] rounded-md text-black focus:outline-none focus:ring-2 focus:ring-[#736F72] focus:border-transparent"
          />
        </div>

        <div>
          <label
            htmlFor="cover-location-date"
            className="block text-xs font-medium text-black mb-1"
          >
            Lugar y Fecha
          </label>
          <input
            id="cover-location-date"
            type="text"
            lang="es-419"
            spellCheck={true}
            value={coverConfig.locationAndDate}
            onChange={(e) => onUpdateCover({ locationAndDate: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-[#E9E3E6] border border-[#736F72] rounded-md text-black focus:outline-none focus:ring-2 focus:ring-[#736F72] focus:border-transparent"
          />
        </div>

        <div>
          <label
            htmlFor="cover-notes"
            className="block text-xs font-medium text-black mb-1"
          >
            Observaciones Técnicas / Alcance
          </label>
          <AutoResizeTextarea
            id="cover-notes"
            minRows={3}
            lang="es-419"
            spellCheck={true}
            value={coverConfig.notes}
            onChange={(e) => onUpdateCover({ notes: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-[#E9E3E6] border border-[#736F72] rounded-md text-black focus:outline-none focus:ring-2 focus:ring-[#736F72] focus:border-transparent"
          />
        </div>
      </section>
    </div>
  );
};
