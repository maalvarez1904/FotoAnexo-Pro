import React, { useEffect } from 'react';
import { BookOpen, CheckCircle2, FileDown, Image, Keyboard, Shield, X } from 'lucide-react';

interface HelpGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpGuideModal: React.FC<HelpGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-[#736F72]/60 backdrop-blur-xs p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-modal-title"
        className="w-full max-w-2xl max-h-[88vh] bg-[#E9E3E6] rounded-lg border border-[#736F72] shadow-2xl flex flex-col overflow-hidden text-black"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 border-b border-[#B2B2B2] flex items-center justify-between bg-[#C3BABA]">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-black" />
            <h2
              id="help-modal-title"
              className="text-sm font-bold text-black"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Ayuda — Guía Rápida de FotoAnexo Pro
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar guía rápida"
            className="p-1 rounded text-black hover:bg-[#9A8F97] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5 text-xs leading-relaxed text-black">
          {/* Flujo de trabajo en 4 pasos */}
          <section className="space-y-2.5">
            <h3 className="font-bold text-black uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-black" />
              <span>Flujo de Trabajo en 4 Pasos</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 rounded-md border border-[#9A8F97] bg-[#C3BABA]/60 space-y-1">
                <div className="font-semibold text-black">1. Cargar fotografías</div>
                <p className="text-black">
                  Arrastra imágenes (JPG, PNG, WebP) directamente sobre el área de
                  previsualización o súbelas desde la pestaña <strong>Fotos</strong>.
                  Los metadatos EXIF se leen automáticamente.
                </p>
              </div>
              <div className="p-3 rounded-md border border-[#9A8F97] bg-[#C3BABA]/60 space-y-1">
                <div className="font-semibold text-black">2. Carátula y Páginas Maestras</div>
                <p className="text-black">
                  En <strong>Carátula</strong> completa expediente, título, comitente
                  y profesional. En <strong>Encab./Pie</strong> configura encabezados,
                  índice automático y numeración de folios.
                </p>
              </div>
              <div className="p-3 rounded-md border border-[#9A8F97] bg-[#C3BABA]/60 space-y-1">
                <div className="font-semibold text-black">3. Encuadre y Descripción</div>
                <p className="text-black">
                  Haz clic sobre cualquier hoja fotográfica para editar su título,
                  descripción y EXIF. Puedes rotar, escalar (<em>contain / cover</em>)
                  y arrastrar la foto dentro del marco de <strong>175×145 mm</strong>.
                </p>
              </div>
              <div className="p-3 rounded-md border border-[#9A8F97] bg-[#C3BABA]/60 space-y-1">
                <div className="font-semibold text-black">4. Exportar PDF o Guardar JSON</div>
                <p className="text-black">
                  Usa el bloque inferior izquierdo para exportar a PDF o guardar
                  todo tu proyecto en un archivo <code>.json</code> portable para
                  continuar editando más tarde.
                </p>
              </div>
            </div>
          </section>

          {/* Compresión JPEG y Exportación */}
          <section className="space-y-1.5 border-t border-[#B2B2B2] pt-4">
            <h3 className="font-bold text-black uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <FileDown className="w-3.5 h-3.5 text-black" />
              <span>Exportación PDF y Compresión JPEG</span>
            </h3>
            <ul className="list-disc pl-4 space-y-1 text-black">
              <li>
                <strong>Sin compresión JPEG:</strong> abre el cuadro de impresión del
                navegador (<em>Guardar como PDF</em>) usando las imágenes originales.
              </li>
              <li>
                <strong>Con compresión JPEG activada:</strong> genera y descarga
                directamente un archivo <code>.pdf</code> A4 optimizado con texto
                vectorial, ajustando las fotografías a la resolución (<strong>DPI</strong>)
                y <strong>Calidad</strong> elegidas, mostrando el peso estimado en
                tiempo real.
              </li>
              <li>
                <strong>Recomendación:</strong> <code>150–200 DPI</code> con{' '}
                <code>80–85%</code> de calidad ofrece excelente nitidez para
                informes digitales con archivos muy livianos.
              </li>
            </ul>
          </section>

          {/* Privacidad */}
          <section className="space-y-1.5 border-t border-[#B2B2B2] pt-4">
            <h3 className="font-bold text-black uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-black" />
              <span>Privacidad y Control de Metadatos</span>
            </h3>
            <ul className="list-disc pl-4 space-y-1 text-black">
              <li>
                Todo el procesamiento ocurre <strong>100% en tu navegador</strong>;
                ninguna fotografía ni texto sale de tu equipo.
              </li>
              <li>
                <strong>Anonimizar GPS:</strong> elimina con un clic las
                coordenadas geográficas del bloque EXIF de todas las fotos cargadas.
              </li>
              <li>
                <strong>Limpiar sesión:</strong> vacía todas las fotos y campos de la
                memoria local al finalizar tu trabajo.
              </li>
            </ul>
          </section>

          {/* Atajos y Navegación */}
          <section className="space-y-1.5 border-t border-[#B2B2B2] pt-4">
            <h3 className="font-bold text-black uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5 text-black" />
              <span>Consejos de Navegación</span>
            </h3>
            <div className="flex flex-wrap gap-2 text-[11px] text-black">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#C3BABA] border border-[#9A8F97]">
                <Image className="w-3 h-3" /> Arrastra dentro del marco para encuadrar
              </span>
              <span className="px-2 py-1 rounded bg-[#C3BABA] border border-[#9A8F97]">
                Haz clic en una fila del Índice para saltar a esa fotografía
              </span>
              <span className="px-2 py-1 rounded bg-[#C3BABA] border border-[#9A8F97]">
                <code>Esc</code> cierra ventanas de ayuda y privacidad
              </span>
            </div>
          </section>
        </div>

        <div className="px-5 py-3 border-t border-[#B2B2B2] bg-[#C3BABA] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-black bg-[#9A8F97] border border-[#736F72] rounded-md hover:bg-[#736F72] transition-colors cursor-pointer"
          >
            Cerrar guía
          </button>
        </div>
      </div>
    </div>
  );
};

