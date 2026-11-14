import React from 'react';
import { HeaderFooterConfig } from '../../types/document';

interface HeaderFooterTabPanelProps {
  headerFooterConfig: HeaderFooterConfig;
  onUpdateHeaderFooter: (partial: Partial<HeaderFooterConfig>) => void;
}

export const HeaderFooterTabPanel: React.FC<HeaderFooterTabPanelProps> = ({
  headerFooterConfig,
  onUpdateHeaderFooter,
}) => {
  return (
    <div className="space-y-5">
      {/* Encabezado y Pie de Página */}
      <section className="space-y-3.5 border-b border-[#B2B2B2] pb-4">
        <h3 className="text-xs font-semibold tracking-wider text-black uppercase">
          Encabezado y Pie de Página (8.5pt)
        </h3>

        <div>
          <label
            htmlFor="hf-header-left"
            className="block text-xs font-medium text-black mb-1"
          >
            Encabezado Izquierdo
          </label>
          <input
            id="hf-header-left"
            type="text"
            lang="es-419"
            spellCheck={true}
            value={headerFooterConfig.headerLeft}
            onChange={(e) => onUpdateHeaderFooter({ headerLeft: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-[#E9E3E6] border border-[#736F72] rounded-md text-black focus:outline-none focus:ring-2 focus:ring-[#736F72] focus:border-transparent"
          />
        </div>

        <div>
          <label
            htmlFor="hf-header-right"
            className="block text-xs font-medium text-black mb-1"
          >
            Encabezado Derecho
          </label>
          <input
            id="hf-header-right"
            type="text"
            lang="es-419"
            spellCheck={true}
            value={headerFooterConfig.headerRight}
            onChange={(e) => onUpdateHeaderFooter({ headerRight: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-[#E9E3E6] border border-[#736F72] rounded-md text-black focus:outline-none focus:ring-2 focus:ring-[#736F72] focus:border-transparent"
          />
        </div>

        <div>
          <label
            htmlFor="hf-footer-left"
            className="block text-xs font-medium text-black mb-1"
          >
            Pie de Página Izquierdo
          </label>
          <input
            id="hf-footer-left"
            type="text"
            lang="es-419"
            spellCheck={true}
            value={headerFooterConfig.footerLeft}
            onChange={(e) => onUpdateHeaderFooter({ footerLeft: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-[#E9E3E6] border border-[#736F72] rounded-md text-black focus:outline-none focus:ring-2 focus:ring-[#736F72] focus:border-transparent"
          />
        </div>
      </section>

      {/* Foliatura y Numeración */}
      <section className="space-y-3.5 border-b border-[#B2B2B2] pb-4">
        <h3 className="text-xs font-semibold tracking-wider text-black uppercase">
          Foliatura e Índice
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="hf-page-prefix"
              className="block text-xs font-medium text-black mb-1"
            >
              Prefijo de Numeración
            </label>
            <select
              id="hf-page-prefix"
              value={headerFooterConfig.pageNumberPrefix}
              onChange={(e) =>
                onUpdateHeaderFooter({
                  pageNumberPrefix: e.target.value as HeaderFooterConfig['pageNumberPrefix'],
                })
              }
              className="w-full px-3 py-2 text-sm bg-[#E9E3E6] border border-[#736F72] rounded-md text-black focus:outline-none focus:ring-2 focus:ring-[#736F72]"
            >
              <option value="Folio">Folio (Ej: Folio 01 de 10)</option>
              <option value="Página">Página (Ej: Página 01 de 10)</option>
              <option value="Pág.">Pág. (Ej: Pág. 01 de 10)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="hf-photo-padding"
              className="block text-xs font-medium text-black mb-1"
            >
              Ceros a la Izquierda
            </label>
            <select
              id="hf-photo-padding"
              value={headerFooterConfig.photoNumberPadding}
              onChange={(e) =>
                onUpdateHeaderFooter({
                  photoNumberPadding: Number(e.target.value) || 2,
                })
              }
              className="w-full px-3 py-2 text-sm bg-[#E9E3E6] border border-[#736F72] rounded-md text-black focus:outline-none focus:ring-2 focus:ring-[#736F72] font-mono"
            >
              <option value={1}>1 dígito (1, 2, 3)</option>
              <option value={2}>2 dígitos (01, 02, 03)</option>
              <option value={3}>3 dígitos (001, 002, 003)</option>
            </select>
          </div>
        </div>

        <label className="flex items-start justify-between gap-3 p-3 rounded-lg border border-[#9A8F97] bg-[#C3BABA]/60 cursor-pointer hover:bg-[#C3BABA] transition-colors">
          <div>
            <div className="text-sm font-medium text-black">
              Sumar Carátula al Conteo de Folios
            </div>
            <div className="text-xs text-black mt-0.5">
              La carátula nunca imprime encabezado ni pie, pero suma +1 al folio inicial siguiente.
            </div>
          </div>
          <input
            type="checkbox"
            checked={headerFooterConfig.countCoverInNumbering}
            onChange={(e) =>
              onUpdateHeaderFooter({ countCoverInNumbering: e.target.checked })
            }
            className="mt-1 h-4 w-4 rounded border-[#736F72] accent-[#736F72] focus:ring-[#736F72]"
          />
        </label>

        <div>
          <label
            htmlFor="hf-index-title"
            className="block text-xs font-medium text-black mb-1"
          >
            Título Superior del Índice
          </label>
          <input
            id="hf-index-title"
            type="text"
            lang="es-419"
            spellCheck={true}
            value={headerFooterConfig.indexTitle}
            onChange={(e) => onUpdateHeaderFooter({ indexTitle: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-[#E9E3E6] border border-[#736F72] rounded-md text-black focus:outline-none focus:ring-2 focus:ring-[#736F72] focus:border-transparent"
          />
        </div>

        <div>
          <label
            htmlFor="hf-photo-prefix-template"
            className="block text-xs font-medium text-black mb-1"
          >
            Prefijo Correlativo de Fotografía
          </label>
          <input
            id="hf-photo-prefix-template"
            type="text"
            lang="es-419"
            spellCheck={true}
            value={headerFooterConfig.photoPrefixTemplate}
            onChange={(e) =>
              onUpdateHeaderFooter({ photoPrefixTemplate: e.target.value })
            }
            className="w-full px-3 py-2 text-sm bg-[#E9E3E6] border border-[#736F72] rounded-md text-black focus:outline-none focus:ring-2 focus:ring-[#736F72] focus:border-transparent"
          />
        </div>
      </section>

      {/* Configuración Global de Metadatos EXIF */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold tracking-wider text-black uppercase">
          Metadatos Técnicos EXIF
        </h3>

        <label className="flex items-start justify-between gap-3 p-3 rounded-lg border border-[#9A8F97] bg-[#C3BABA]/60 cursor-pointer hover:bg-[#C3BABA] transition-colors">
          <div>
            <div className="text-sm font-medium text-black">
              Mostrar datos EXIF en todas las páginas
            </div>
            <div className="text-xs text-black mt-0.5">
              Activa el cuadro técnico de 18mm al pie de cada epígrafe (puede anularse individualmente por toma).
            </div>
          </div>
          <input
            type="checkbox"
            checked={headerFooterConfig.globalShowExif}
            onChange={(e) =>
              onUpdateHeaderFooter({ globalShowExif: e.target.checked })
            }
            className="mt-1 h-4 w-4 rounded border-[#736F72] accent-[#736F72] focus:ring-[#736F72]"
          />
        </label>
      </section>
    </div>
  );
};
