import React, { useEffect } from 'react';
import { ShieldCheck, X } from 'lucide-react';

interface LegalInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// TODO: [LEGAL] Validar cláusulas de privacidad y términos de uso con asesoría jurídica según jurisdicción aplicable (Ley 25.326 / GDPR).
export const LegalInfoModal: React.FC<LegalInfoModalProps> = ({
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
        aria-labelledby="legal-modal-title"
        className="w-full max-w-lg max-h-[85vh] bg-[#E9E3E6] rounded-lg border border-[#736F72] shadow-2xl flex flex-col overflow-hidden text-black"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 border-b border-[#B2B2B2] flex items-center justify-between bg-[#C3BABA]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-black" />
            <h2
              id="legal-modal-title"
              className="text-sm font-bold text-black"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Privacidad, Términos de Uso y Licencias
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar aviso legal"
            className="p-1 rounded text-black hover:bg-[#9A8F97] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 text-xs leading-relaxed text-black">
          <section className="space-y-1.5">
            <h3 className="font-semibold text-black uppercase tracking-wider text-[11px]">
              1. Privacidad y Procesamiento 100% Local
            </h3>
            <p>
              FotoAnexo Pro procesa todas las fotografías, metadatos EXIF/GPS y
              textos del expediente exclusivamente en la memoria local de su
              navegador. No se envían archivos a servidores externos, no se
              utilizan cookies de rastreo ni analítica de terceros y no se
              persiste información entre sesiones (`localStorage`,
              `sessionStorage` e `IndexedDB` permanecen sin uso).
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-semibold text-black uppercase tracking-wider text-[11px]">
              2. Responsabilidad sobre Datos Personales y Geolocalización
            </h3>
            <p>
              Las fotografías digitales pueden contener coordenadas GPS y datos
              del dispositivo en su cabecera EXIF. El usuario o profesional
              interviniente es responsable de verificar si corresponde
              anonimizar la geolocalización (mediante el botón{' '}
              <strong>Anonimizar GPS</strong> o desactivando el bloque EXIF)
              antes de distribuir el PDF o el proyecto JSON.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-semibold text-black uppercase tracking-wider text-[11px]">
              3. Atribuciones y Licencias Open Source
            </h3>
            <ul className="list-disc pl-4 space-y-1 text-black">
              <li>
                <strong>React &amp; React DOM</strong> — Licencia MIT
              </li>
              <li>
                <strong>jsPDF</strong> — Licencia MIT
              </li>
              <li>
                <strong>exifr</strong> — Licencia MIT
              </li>
              <li>
                <strong>Lucide React</strong> — Licencia ISC
              </li>
              <li>
                <strong>Tailwind CSS</strong> — Licencia MIT
              </li>
              <li>
                <strong>
                  Tipografías locales (IBM Plex Mono, Plus Jakarta Sans, Public
                  Sans)
                </strong>{' '}
                — SIL Open Font License 1.1 (OFL-1.1)
              </li>
            </ul>
          </section>
        </div>

        <div className="px-5 py-3 border-t border-[#B2B2B2] bg-[#C3BABA] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-black bg-[#9A8F97] border border-[#736F72] rounded-md hover:bg-[#736F72] transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

