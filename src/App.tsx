/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  FileText,
  FolderOpen,
  HelpCircle,
  Image as ImageIcon,
  LayoutTemplate,
  MapPinOff,
  Printer,
  ShieldCheck,
  Trash2,
  Upload,
  ZoomIn,
} from 'lucide-react';
import {
  ActiveTab,
  CoverConfig,
  HeaderFooterConfig,
  ImageTransform,
  PdfExportCompressionConfig,
  PhotoPageItem,
  ZoomMode,
} from './types/document';
import {
  calculateDocumentPagination,
  createInitialCoverConfig,
  createInitialHeaderFooterConfig,
  MM_TO_PX_96DPI,
  NO_EXIF_DEFAULT_MESSAGE,
  stripGpsFromExifText,
} from './utils/documentLogic';
import {
  processUploadedPhotoFile,
  revokePhotoObjectUrl,
} from './utils/exifLoader';
import {
  exportProjectToJsonFile,
  importProjectFromJsonFile,
} from './utils/projectStorage';
import {
  compressImageToJpegBlob,
  DPI_OPTIONS,
  estimatePdfSizeBytes,
  formatFileSize,
} from './utils/pdfCompression';
import { generateAndDownloadCompressedPdf } from './utils/pdfGenerator';
import { CoverTabPanel } from './components/panel/CoverTabPanel';
import { HeaderFooterTabPanel } from './components/panel/HeaderFooterTabPanel';
import { PhotosTabPanel } from './components/panel/PhotosTabPanel';
import { A4CoverSheet } from './components/sheets/A4CoverSheet';
import { A4IndexSheet } from './components/sheets/A4IndexSheet';
import { A4PhotoSheet } from './components/sheets/A4PhotoSheet';
import { LegalInfoModal } from './components/LegalInfoModal';
import { HelpGuideModal } from './components/HelpGuideModal';

const A4_WIDTH_PX = 210 * MM_TO_PX_96DPI; // ~793.7px
const A4_HEIGHT_PX = 297 * MM_TO_PX_96DPI; // ~1122.5px

export default function App() {
  // Regla 1.1: Sin persistencia entre sesiones (prohibido localStorage, sessionStorage, IndexedDB, cookies).
  // Todos los campos de texto, configuraciones y listas se inician completamente vacíos.
  const [coverConfig, setCoverConfig] = useState<CoverConfig>(() =>
    createInitialCoverConfig()
  );
  const [headerFooterConfig, setHeaderFooterConfig] =
    useState<HeaderFooterConfig>(() => createInitialHeaderFooterConfig());
  const [photos, setPhotos] = useState<PhotoPageItem[]>([]);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('photos');
  const [zoomMode, setZoomMode] = useState<ZoomMode>(0.75);
  const [fitScale, setFitScale] = useState<number>(0.82);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSavingJson, setIsSavingJson] = useState<boolean>(false);
  const [jsonStatusMessage, setJsonStatusMessage] = useState<string | null>(null);
  const [isPreviewDragOver, setIsPreviewDragOver] = useState<boolean>(false);
  const [compressionConfig, setCompressionConfig] =
    useState<PdfExportCompressionConfig>({
      enabled: false,
      dpi: 200,
      quality: 0.85,
    });
  const [compressedPhotoMap, setCompressedPhotoMap] = useState<
    Record<string, { url: string; size: number }>
  >({});
  const [isCalculatingCompression, setIsCalculatingCompression] =
    useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState<boolean>(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState<boolean>(false);

  const previewViewportRef = useRef<HTMLDivElement | null>(null);
  const emptyStateFileInputRef = useRef<HTMLInputElement | null>(null);
  const projectJsonInputRef = useRef<HTMLInputElement | null>(null);
  const photosRef = useRef<PhotoPageItem[]>(photos);
  photosRef.current = photos;
  const compressedPhotoMapRef = useRef<
    Record<string, { url: string; size: number }>
  >(compressedPhotoMap);
  compressedPhotoMapRef.current = compressedPhotoMap;
  // FIX: Contador de generación de sesión y cargas activas para evitar carreras de estado
  const sessionGenerationRef = useRef<number>(0);
  const pendingLoadsRef = useRef<number>(0);
  const statusTimerRef = useRef<number | null>(null);

  const beginLoad = () => {
    pendingLoadsRef.current += 1;
    setIsUploading(true);
  };

  const endLoad = () => {
    pendingLoadsRef.current = Math.max(0, pendingLoadsRef.current - 1);
    if (pendingLoadsRef.current === 0) {
      setIsUploading(false);
    }
  };

  const showStatusMessage = (msg: string | null, durationMs = 3500) => {
    if (statusTimerRef.current !== null) {
      window.clearTimeout(statusTimerRef.current);
      statusTimerRef.current = null;
    }
    setJsonStatusMessage(msg);
    if (msg && durationMs > 0) {
      statusTimerRef.current = window.setTimeout(() => {
        setJsonStatusMessage(null);
        statusTimerRef.current = null;
      }, durationMs);
    }
  };

  const scrollToSheetTestId = (testId: string) => {
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-testid="${testId}"]`);
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  };

  // Revocar todas las ObjectURLs y timers al desmontar la aplicación
  useEffect(() => {
    return () => {
      if (statusTimerRef.current !== null) {
        window.clearTimeout(statusTimerRef.current);
      }
      photosRef.current.forEach((p) => revokePhotoObjectUrl(p));
      Object.values(compressedPhotoMapRef.current).forEach((entry) =>
        URL.revokeObjectURL(entry.url)
      );
    };
  }, []);

  // FIX: Clave estable para no re-comprimir imágenes al editar textos, rotar o arrastrar (pan)
  const compressionInputsKey = useMemo(
    () =>
      photos
        .map(
          (p) =>
            `${p.id}:${p.objectUrl}:${p.naturalWidth}x${p.naturalHeight}:${Math.max(
              1,
              Math.min(3, p.transform.scale || 1)
            )}`
        )
        .join('|'),
    [photos]
  );

  // Calcular versiones comprimidas JPEG en segundo plano cuando está activa la compresión
  useEffect(() => {
    if (!compressionConfig.enabled || photosRef.current.length === 0) {
      setIsCalculatingCompression(false);
      setCompressedPhotoMap((prev) => {
        Object.values(prev).forEach((entry) => URL.revokeObjectURL(entry.url));
        return Object.keys(prev).length === 0 ? prev : {};
      });
      return;
    }

    let cancelled = false;
    setIsCalculatingCompression(true);
    const snapshotPhotos = photosRef.current;

    const timer = window.setTimeout(async () => {
      const nextMap: Record<string, { url: string; size: number }> = {};
      try {
        for (const photo of snapshotPhotos) {
          if (cancelled) break;
          const result = await compressImageToJpegBlob(
            photo,
            compressionConfig.dpi,
            compressionConfig.quality
          );
          if (cancelled) {
            URL.revokeObjectURL(result.url);
            break;
          }
          nextMap[photo.id] = { url: result.url, size: result.blob.size };
        }

        if (cancelled) {
          Object.values(nextMap).forEach((entry) =>
            URL.revokeObjectURL(entry.url)
          );
          return;
        }

        setCompressedPhotoMap((prev) => {
          Object.values(prev).forEach((entry) =>
            URL.revokeObjectURL(entry.url)
          );
          return nextMap;
        });
      } catch {
        Object.values(nextMap).forEach((entry) =>
          URL.revokeObjectURL(entry.url)
        );
      } finally {
        if (!cancelled) {
          setIsCalculatingCompression(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    compressionConfig.enabled,
    compressionConfig.dpi,
    compressionConfig.quality,
    compressionInputsKey,
  ]);

  // Calcular escala automática para el modo "Ajustar al ancho"
  useEffect(() => {
    const updateFitScale = () => {
      if (!previewViewportRef.current) return;
      const availableWidth = previewViewportRef.current.clientWidth - 96;
      if (availableWidth > 200) {
        const computed = Math.min(0.95, Math.max(0.4, availableWidth / A4_WIDTH_PX));
        setFitScale(Number(computed.toFixed(3)));
      }
    };

    updateFitScale();
    window.addEventListener('resize', updateFitScale);
    return () => window.removeEventListener('resize', updateFitScale);
  }, []);

  const effectiveScale = zoomMode === 'fit' ? fitScale : zoomMode;

  // Motor de foliatura y paginación en tiempo real
  const pagination = useMemo(
    () => calculateDocumentPagination(photos, coverConfig, headerFooterConfig),
    [photos, coverConfig, headerFooterConfig]
  );

  const handleUpdateCover = (partial: Partial<CoverConfig>) => {
    setCoverConfig((prev) => ({ ...prev, ...partial }));
  };

  const handleUpdateHeaderFooter = (partial: Partial<HeaderFooterConfig>) => {
    setHeaderFooterConfig((prev) => ({ ...prev, ...partial }));
  };

  const handleUploadFiles = async (fileList: FileList | File[]) => {
    const filesArray = Array.from(fileList).filter((f) =>
      f.type.startsWith('image/') || /\.(jpe?g|png|webp|tiff?|bmp|heic)$/i.test(f.name)
    );
    if (filesArray.length === 0) return;

    const uploadGeneration = sessionGenerationRef.current;
    beginLoad();
    try {
      const processedItems: PhotoPageItem[] = [];
      for (const file of filesArray) {
        if (sessionGenerationRef.current !== uploadGeneration) {
          break;
        }
        const item = await processUploadedPhotoFile(file);
        processedItems.push(item);
      }

      // FIX: Si la sesión fue limpiada o reemplazada durante la carga, revocar y descartar
      if (sessionGenerationRef.current !== uploadGeneration) {
        processedItems.forEach((item) => revokePhotoObjectUrl(item));
        return;
      }

      setPhotos((prev) => [...prev, ...processedItems]);

      if (processedItems.length > 0) {
        const targetId = processedItems[0].id;
        setSelectedPhotoId((prevSelected) => prevSelected ?? targetId);
        setActiveTab('photos');
        scrollToSheetTestId(`a4-photo-sheet-${targetId}`);
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Error al procesar las fotografías seleccionadas.';
      showStatusMessage(msg, 4500);
    } finally {
      endLoad();
    }
  };

  const handleMovePhoto = (index: number, direction: 'up' | 'down') => {
    setPhotos((prev) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(index, 1);
      copy.splice(targetIndex, 0, moved);
      return copy;
    });
  };

  const handleReorderPhotos = (fromIndex: number, toIndex: number) => {
    setPhotos((prev) => {
      if (
        fromIndex < 0 ||
        fromIndex >= prev.length ||
        toIndex < 0 ||
        toIndex >= prev.length ||
        fromIndex === toIndex
      ) {
        return prev;
      }
      const copy = [...prev];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      return copy;
    });
  };

  // FIX: Evitar efectos secundarios (revocar ObjectURL y setSelectedPhotoId) dentro del updater de setPhotos
  const handleDeletePhoto = (photoId: string) => {
    const target = photosRef.current.find((p) => p.id === photoId);
    if (target) {
      revokePhotoObjectUrl(target);
    }
    const remaining = photosRef.current.filter((p) => p.id !== photoId);
    setPhotos(remaining);
    if (selectedPhotoId === photoId) {
      setSelectedPhotoId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleUpdatePhoto = (
    photoId: string,
    partial: Partial<PhotoPageItem>
  ) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, ...partial } : p))
    );
  };

  const handleUpdateTransform = (
    photoId: string,
    partial: Partial<ImageTransform>
  ) => {
    setPhotos((prev) =>
      prev.map((p) =>
        p.id === photoId
          ? { ...p, transform: { ...p.transform, ...partial } }
          : p
      )
    );
  };

  const measuredCompressedBytes = useMemo(() => {
    if (!compressionConfig.enabled || photos.length === 0) return null;
    let total = 0;
    for (const photo of photos) {
      const entry = compressedPhotoMap[photo.id];
      if (!entry) return null;
      total += entry.size;
    }
    return total;
  }, [compressionConfig.enabled, photos, compressedPhotoMap]);

  const pdfSizeEstimate = useMemo(
    () =>
      estimatePdfSizeBytes(
        photos,
        pagination.totalPhysicalSheets,
        compressionConfig,
        measuredCompressedBytes
      ),
    [
      photos,
      pagination.totalPhysicalSheets,
      compressionConfig,
      measuredCompressedBytes,
    ]
  );

  const handleExportPdf = async () => {
    if (!hasAnyRenderedSheet) {
      showStatusMessage(
        'Agrega al menos una fotografía o habilita carátula/índice antes de exportar.',
        4000
      );
      return;
    }

    if (compressionConfig.enabled) {
      setIsExportingPdf(true);
      showStatusMessage(null);
      try {
        const { fileSizeBytes, fileName } =
          await generateAndDownloadCompressedPdf({
            coverConfig,
            headerFooterConfig,
            photos,
            pagination,
            compressionConfig,
          });
        showStatusMessage(
          `PDF generado: ${fileName} (${formatFileSize(fileSizeBytes)})`,
          5000
        );
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Error al generar el PDF comprimido.';
        showStatusMessage(msg, 5000);
      } finally {
        setIsExportingPdf(false);
      }
      return;
    }

    window.print();
  };

  const handleSaveProjectJson = async () => {
    setIsSavingJson(true);
    showStatusMessage(null);
    try {
      await exportProjectToJsonFile(coverConfig, headerFooterConfig, photos);
      showStatusMessage('Proyecto guardado en formato JSON.');
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Error al exportar el proyecto JSON.';
      showStatusMessage(msg, 5000);
    } finally {
      setIsSavingJson(false);
    }
  };

  const handleLoadProjectJson = async (file: File) => {
    const loadGeneration = ++sessionGenerationRef.current;
    beginLoad();
    showStatusMessage(null);
    try {
      const restored = await importProjectFromJsonFile(file);
      if (sessionGenerationRef.current !== loadGeneration) {
        restored.photos.forEach((p) => revokePhotoObjectUrl(p));
        return;
      }
      photosRef.current.forEach((p) => revokePhotoObjectUrl(p));
      setCoverConfig(restored.coverConfig);
      setHeaderFooterConfig(restored.headerFooterConfig);
      setPhotos(restored.photos);
      setSelectedPhotoId(
        restored.photos.length > 0 ? restored.photos[0].id : null
      );
      showStatusMessage('Proyecto JSON cargado correctamente.');
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Error al cargar el archivo JSON.';
      showStatusMessage(msg, 5000);
    } finally {
      endLoad();
    }
  };

  const handleAnonymizeGps = () => {
    setPhotos((prev) =>
      prev.map((p) => {
        const cleaned = stripGpsFromExifText(p.exifText);
        return {
          ...p,
          exifText: cleaned,
          hasExifData: cleaned !== NO_EXIF_DEFAULT_MESSAGE,
        };
      })
    );
    showStatusMessage('Coordenadas GPS eliminadas de los metadatos EXIF.');
  };

  const handleClearSession = () => {
    if (
      photos.length > 0 &&
      !window.confirm(
        '¿Deseas limpiar toda la sesión actual? Se eliminarán las fotografías y los datos cargados en memoria.'
      )
    ) {
      return;
    }
    sessionGenerationRef.current += 1;
    photosRef.current.forEach((p) => revokePhotoObjectUrl(p));
    Object.values(compressedPhotoMapRef.current).forEach((entry) =>
      URL.revokeObjectURL(entry.url)
    );
    setCompressedPhotoMap({});
    setPhotos([]);
    setSelectedPhotoId(null);
    setCoverConfig(createInitialCoverConfig());
    setHeaderFooterConfig(createInitialHeaderFooterConfig());
    showStatusMessage('Sesión limpiada. Memoria liberada.');
  };

  const hasAnyRenderedSheet =
    coverConfig.enabled || headerFooterConfig.indexEnabled || photos.length > 0;

  return (
    <div className="app-shell flex h-screen w-screen overflow-hidden bg-[#B2B2B2] text-black">
      {/* COLUMNA IZQUIERDA: Panel de Control Técnico (ancho adaptativo 470px, scroll independiente, no-print) */}
      <aside
        aria-label="Panel de control editorial"
        className="no-print w-[470px] max-w-[48vw] shrink-0 h-full bg-[#E9E3E6] border-r border-[#736F72] flex flex-col z-20 text-black"
      >
        {/* Cabecera del panel */}
        <div className="px-4 py-3 border-b border-[#B2B2B2] bg-[#E9E3E6] space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <h1
              className="text-xl font-bold tracking-tight text-black whitespace-nowrap truncate"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              FotoAnexo Pro
            </h1>

            <button
              type="button"
              onClick={() => setIsHelpModalOpen(true)}
              aria-label="Abrir guía rápida de ayuda"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-black bg-[#C3BABA] border border-[#736F72] rounded-md hover:bg-[#9A8F97] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Ayuda</span>
            </button>
          </div>

          <div
            aria-label="Resumen del documento"
            className="rounded-md bg-[#C3BABA]/70 border border-[#9A8F97] px-2.5 py-2 grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-1 text-[11px] leading-snug text-black"
          >
            <span className="text-black font-medium whitespace-nowrap">
              Profesional y matrícula:
            </span>
            <span
              className="text-black font-medium truncate"
              title={coverConfig.professionalInfo.trim() || undefined}
            >
              {coverConfig.professionalInfo.trim() || '—'}
            </span>

            <span className="text-black font-medium whitespace-nowrap">
              Comitente / Juzgado / Dest.:
            </span>
            <span
              className="text-black font-medium truncate"
              title={coverConfig.clientOrCourt.trim() || undefined}
            >
              {coverConfig.clientOrCourt.trim() || '—'}
            </span>

            <span className="text-black font-medium whitespace-nowrap">
              Lugar y fecha:
            </span>
            <span
              className="text-black font-medium truncate"
              title={coverConfig.locationAndDate.trim() || undefined}
            >
              {coverConfig.locationAndDate.trim() || '—'}
            </span>

            <span className="text-black font-medium whitespace-nowrap">
              Cantidad de folios:
            </span>
            <span className="text-black font-semibold font-mono tabular-nums">
              {pagination.totalFolios} {pagination.totalFolios === 1 ? 'folio' : 'folios'}
            </span>
          </div>
        </div>

        {/* Pestañas de navegación del panel izquierdo */}
        <div
          role="tablist"
          aria-label="Secciones de configuración del documento"
          className="grid grid-cols-3 gap-1 p-1.5 bg-[#C3BABA] border-b border-[#736F72]"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'cover'}
            onClick={() => {
              setActiveTab('cover');
              scrollToSheetTestId('a4-cover-sheet');
            }}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 text-black ${
              activeTab === 'cover'
                ? 'bg-[#E9E3E6] border border-[#736F72] shadow-xs font-semibold'
                : 'hover:bg-[#9A8F97]/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Carátula</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'headerFooter'}
            onClick={() => {
              setActiveTab('headerFooter');
              scrollToSheetTestId('a4-index-sheet-0');
            }}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 text-black ${
              activeTab === 'headerFooter'
                ? 'bg-[#E9E3E6] border border-[#736F72] shadow-xs font-semibold'
                : 'hover:bg-[#9A8F97]/60'
            }`}
          >
            <LayoutTemplate className="w-3.5 h-3.5" />
            <span>Encabezado</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'photos'}
            onClick={() => setActiveTab('photos')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 text-black ${
              activeTab === 'photos'
                ? 'bg-[#E9E3E6] border border-[#736F72] shadow-xs font-semibold'
                : 'hover:bg-[#9A8F97]/60'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Fotografías ({photos.length})</span>
          </button>
        </div>

        {/* Contenido adaptativo del panel activo */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3.5 flex flex-col">
          {activeTab === 'cover' && (
            <CoverTabPanel
              coverConfig={coverConfig}
              headerFooterConfig={headerFooterConfig}
              onUpdateCover={handleUpdateCover}
              onUpdateHeaderFooter={handleUpdateHeaderFooter}
            />
          )}

          {activeTab === 'headerFooter' && (
            <HeaderFooterTabPanel
              headerFooterConfig={headerFooterConfig}
              onUpdateHeaderFooter={handleUpdateHeaderFooter}
            />
          )}

          {activeTab === 'photos' && (
            <PhotosTabPanel
              photos={photos}
              selectedPhotoId={selectedPhotoId}
              photoFolios={pagination.photoFolios}
              photoLabels={pagination.photoLabels}
              headerFooterConfig={headerFooterConfig}
              isUploading={isUploading}
              onSelectPhoto={(id) => {
                setSelectedPhotoId(id);
                setActiveTab('photos');
                scrollToSheetTestId(`a4-photo-sheet-${id}`);
              }}
              onUploadFiles={handleUploadFiles}
              onMovePhoto={handleMovePhoto}
              onReorderPhotos={handleReorderPhotos}
              onDeletePhoto={handleDeletePhoto}
              onUpdatePhoto={handleUpdatePhoto}
              onUpdateTransform={handleUpdateTransform}
            />
          )}
        </div>

        {/* Controles para Guardar y Cargar Trabajo en formato JSON */}
        <div className="px-4 py-2.5 border-t border-[#736F72] bg-[#C3BABA] space-y-2 text-black">
          <input
            ref={projectJsonInputRef}
            type="file"
            accept=".json,application/json"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleLoadProjectJson(e.target.files[0]);
                e.target.value = '';
              }
            }}
            className="hidden"
            aria-label="Seleccionar archivo de proyecto JSON"
          />

          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-black uppercase tracking-wider whitespace-nowrap">
              Proyecto (.JSON)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={isSavingJson}
                onClick={handleSaveProjectJson}
                aria-label="Guardar trabajo en formato JSON"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-black bg-[#E9E3E6] border border-[#736F72] rounded-md hover:bg-[#9A8F97] disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-black" />
                <span>{isSavingJson ? 'Guardando...' : 'Guardar JSON'}</span>
              </button>

              <button
                type="button"
                disabled={isUploading}
                onClick={() => projectJsonInputRef.current?.click()}
                aria-label="Cargar trabajo desde archivo JSON"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-black bg-[#E9E3E6] border border-[#736F72] rounded-md hover:bg-[#9A8F97] disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <FolderOpen className="w-3.5 h-3.5 text-black" />
                <span>Cargar JSON</span>
              </button>
            </div>
          </div>

          {jsonStatusMessage && (
            <div
              role="status"
              className="text-[11px] font-medium text-black bg-[#E9E3E6] border border-[#736F72] rounded px-2.5 py-1 truncate"
            >
              {jsonStatusMessage}
            </div>
          )}

          {/* Bloque inferior izquierdo: Compresión JPEG y Exportación PDF */}
          <div className="pt-2 border-t border-[#9A8F97] space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="jpeg-compression-toggle"
                className="flex items-center gap-2 text-xs font-medium text-black cursor-pointer select-none"
              >
                <input
                  id="jpeg-compression-toggle"
                  type="checkbox"
                  checked={compressionConfig.enabled}
                  onChange={(e) =>
                    setCompressionConfig((prev) => ({
                      ...prev,
                      enabled: e.target.checked,
                    }))
                  }
                  className="h-3.5 w-3.5 rounded border-[#736F72] accent-[#736F72] focus:ring-[#736F72] cursor-pointer"
                />
                <span>Aplicar compresión JPEG</span>
              </label>

              <span className="text-[11px] font-mono text-black tabular-nums whitespace-nowrap">
                Peso est.:{' '}
                <strong className="text-black">
                  ~{formatFileSize(pdfSizeEstimate.estimatedBytes)}
                </strong>
                {isCalculatingCompression ? ' …' : ''}
              </span>
            </div>

            {compressionConfig.enabled && (
              <div className="grid grid-cols-2 gap-2.5 p-2 rounded-md bg-[#E9E3E6] border border-[#736F72]">
                <div className="space-y-1">
                  <label
                    htmlFor="jpeg-dpi-select"
                    className="block text-[11px] font-medium text-black"
                  >
                    Resolución (DPI)
                  </label>
                  <select
                    id="jpeg-dpi-select"
                    value={compressionConfig.dpi}
                    onChange={(e) =>
                      setCompressionConfig((prev) => ({
                        ...prev,
                        dpi: Number(e.target.value),
                      }))
                    }
                    className="w-full px-2 py-1 text-xs text-black bg-[#E9E3E6] border border-[#736F72] rounded focus:outline-none focus:ring-1 focus:ring-[#736F72]"
                  >
                    {DPI_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <label
                      htmlFor="jpeg-quality-range"
                      className="font-medium text-black"
                    >
                      Calidad JPEG
                    </label>
                    <span className="font-mono font-semibold text-black tabular-nums">
                      {Math.round(compressionConfig.quality * 100)}%
                    </span>
                  </div>
                  <input
                    id="jpeg-quality-range"
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={Math.round(compressionConfig.quality * 100)}
                    onChange={(e) =>
                      setCompressionConfig((prev) => ({
                        ...prev,
                        quality: Number(e.target.value) / 100,
                      }))
                    }
                    className="w-full accent-[#736F72] cursor-pointer"
                  />
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={isExportingPdf}
              onClick={handleExportPdf}
              aria-label="Exportar / Guardar PDF"
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-black bg-[#9A8F97] border border-[#736F72] rounded-md hover:bg-[#736F72] disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>
                {isExportingPdf
                  ? 'Preparando imágenes JPEG...'
                  : 'Exportar / Guardar PDF'}
              </span>
            </button>
          </div>

          <div className="pt-1.5 border-t border-[#9A8F97] flex items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={photos.length === 0}
                onClick={handleAnonymizeGps}
                title="Elimina coordenadas GPS de los metadatos EXIF de todas las fotos cargadas"
                className="inline-flex items-center gap-1 text-black hover:underline disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                <MapPinOff className="w-3 h-3" />
                <span>Anonimizar GPS</span>
              </button>
              <span className="text-black" aria-hidden="true">·</span>
              <button
                type="button"
                onClick={handleClearSession}
                title="Borra todas las fotos y datos en memoria"
                className="inline-flex items-center gap-1 text-black hover:underline transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Limpiar sesión</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsLegalModalOpen(true)}
              className="inline-flex items-center gap-1 text-black hover:underline underline-offset-2 transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-3 h-3" />
              <span>Privacidad y Licencias</span>
            </button>
          </div>

          <div className="pt-1 border-t border-[#9A8F97] flex items-center justify-between text-[11px] text-black font-mono">
            <span>A4 210×297mm · Útil 175×267mm</span>
            <span>Marco Foto 175×145mm</span>
          </div>
        </div>
      </aside>

      {/* COLUMNA DERECHA: Área de Previsualización WYSIWYG (fondo #B2B2B2, scroll vertical, print-area) */}
      <main
        ref={previewViewportRef}
        onDragOver={(e) => {
          e.preventDefault();
          setIsPreviewDragOver(true);
        }}
        onDragLeave={() => setIsPreviewDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsPreviewDragOver(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleUploadFiles(e.dataTransfer.files);
          }
        }}
        className="print-area flex-1 h-full bg-[#B2B2B2] overflow-y-auto relative flex flex-col items-center"
      >
        {/* Barra superior flotante (no-print) con control de zoom de visualización */}
        <div className="no-print sticky top-3 z-30 mt-3 mb-2 px-3 py-1.5 bg-[#E9E3E6]/95 backdrop-blur border border-[#736F72] rounded-lg shadow-sm flex items-center gap-3 text-black">
          <div className="flex items-center gap-1.5 text-xs font-medium text-black pr-2 border-r border-[#9A8F97]">
            <ZoomIn className="w-3.5 h-3.5 text-black" />
            <span>Escala de Vista:</span>
          </div>

          <div className="flex items-center gap-1">
            {(
              [
                { value: 0.5, label: '50%' },
                { value: 0.75, label: '75%' },
                { value: 1.0, label: '100%' },
                { value: 1.25, label: '125%' },
                { value: 1.5, label: '150%' },
                { value: 2.0, label: '200%' },
                { value: 'fit', label: 'Ajustar al ancho' },
              ] as const
            ).map((option) => (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => setZoomMode(option.value)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 text-black ${
                  zoomMode === option.value
                    ? 'bg-[#9A8F97] border border-[#736F72] font-semibold'
                    : 'hover:bg-[#C3BABA]'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <span className="text-xs font-mono text-black pl-2 border-l border-[#9A8F97] tabular-nums">
            {Math.round(effectiveScale * 100)}%
          </span>
        </div>

        {/* Estado vacío claro cuando aún no se han cargado fotografías */}
        {photos.length === 0 && (
          <div className="no-print w-full max-w-xl mx-auto px-6 pt-6 pb-4">
            <div
              className={`p-6 rounded-xl border-2 border-dashed bg-[#E9E3E6] transition-colors text-center shadow-xs text-black ${
                isPreviewDragOver
                  ? 'border-[#736F72] bg-[#C3BABA]'
                  : 'border-[#736F72]'
              }`}
            >
              <input
                ref={emptyStateFileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleUploadFiles(e.target.files);
                    e.target.value = '';
                  }
                }}
                className="hidden"
                aria-label="Cargar fotografías desde estado vacío"
              />
              <div className="w-10 h-10 rounded-lg bg-[#C3BABA] border border-[#736F72] flex items-center justify-center mx-auto mb-3">
                <Upload className="w-5 h-5 text-black" />
              </div>
              <h2
                className="text-base font-semibold text-black mb-1"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Lienzo A4 Listo — Sin Fotografías Cargadas
              </h2>
              <p className="text-xs text-black max-w-md mx-auto mb-4 leading-relaxed">
                Arrastre y suelte su lote de fotografías de alta resolución directamente sobre esta área de previsualización o seleccione los archivos para generar las hojas A4 con lectura automática de metadatos EXIF.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => emptyStateFileInputRef.current?.click()}
                  className="px-4 py-2 text-xs font-semibold text-black bg-[#9A8F97] border border-[#736F72] rounded-md hover:bg-[#736F72] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Cargar Lote de Fotografías
                </button>
                <button
                  type="button"
                  onClick={() => projectJsonInputRef.current?.click()}
                  className="px-3.5 py-2 text-xs font-medium text-black bg-[#C3BABA] border border-[#736F72] rounded-md hover:bg-[#9A8F97] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Cargar Proyecto (.json)
                </button>
                {!coverConfig.enabled && (
                  <button
                    type="button"
                    onClick={() => {
                      handleUpdateCover({ enabled: true });
                      setActiveTab('cover');
                    }}
                    className="px-3.5 py-2 text-xs font-medium text-black bg-[#C3BABA] border border-[#736F72] rounded-md hover:bg-[#9A8F97] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Activar Carátula A4
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Contenedor de hojas A4 apiladas */}
        {hasAnyRenderedSheet && (
          <div className="print-canvas-wrapper w-full flex flex-col items-center py-6 px-4 gap-8">
            {/* 1. Hoja de Carátula (si está activa) */}
            {coverConfig.enabled && (
              <div
                className="print-zoom-container flex justify-center"
                style={{
                  width: `${Math.round(A4_WIDTH_PX * effectiveScale)}px`,
                  height: `${Math.round(A4_HEIGHT_PX * effectiveScale)}px`,
                }}
              >
                <div
                  className="print-zoom-container origin-top"
                  style={{
                    transform: `scale(${effectiveScale})`,
                  }}
                >
                  <A4CoverSheet
                    coverConfig={coverConfig}
                    isSelected={activeTab === 'cover'}
                    onSelectCover={() => setActiveTab('cover')}
                  />
                </div>
              </div>
            )}

            {/* 2. Hojas de Índice Automático (hasta 28 filas por hoja, con continuación automática) */}
            {headerFooterConfig.indexEnabled &&
              pagination.indexPages.map((idxPage) => (
                <div
                  key={`index-page-${idxPage.pageIndex}`}
                  className="print-zoom-container flex justify-center"
                  style={{
                    width: `${Math.round(A4_WIDTH_PX * effectiveScale)}px`,
                    height: `${Math.round(A4_HEIGHT_PX * effectiveScale)}px`,
                  }}
                >
                  <div
                    className="print-zoom-container origin-top"
                    style={{
                      transform: `scale(${effectiveScale})`,
                    }}
                  >
                    <A4IndexSheet
                      indexPage={idxPage}
                      headerFooterConfig={headerFooterConfig}
                      totalFolios={pagination.totalFolios}
                      isSelected={activeTab === 'headerFooter'}
                      onSelectIndexConfig={() => setActiveTab('headerFooter')}
                      onSelectPhotoFromIndex={(photoId) => {
                        setSelectedPhotoId(photoId);
                        setActiveTab('photos');
                      }}
                    />
                  </div>
                </div>
              ))}

            {/* 3. Hojas Fotográficas A4 */}
            {photos.map((photo) => {
              const folioNumber = pagination.photoFolios[photo.id] || 1;
              const photoLabel =
                pagination.photoLabels[photo.id] || 'FOTOGRAFÍA N° 01';
              const isSelected =
                activeTab === 'photos' && selectedPhotoId === photo.id;

              return (
                <div
                  key={photo.id}
                  className="print-zoom-container flex justify-center"
                  style={{
                    width: `${Math.round(A4_WIDTH_PX * effectiveScale)}px`,
                    height: `${Math.round(A4_HEIGHT_PX * effectiveScale)}px`,
                  }}
                >
                  <div
                    className="print-zoom-container origin-top"
                    style={{
                      transform: `scale(${effectiveScale})`,
                    }}
                  >
                    <A4PhotoSheet
                      photo={photo}
                      photoLabel={photoLabel}
                      folioNumber={folioNumber}
                      totalFolios={pagination.totalFolios}
                      headerFooterConfig={headerFooterConfig}
                      previewScale={effectiveScale}
                      isSelected={isSelected}
                      imageSrcOverride={
                        compressionConfig.enabled
                          ? compressedPhotoMap[photo.id]?.url
                          : undefined
                      }
                      onSelectPhoto={(id) => {
                        setSelectedPhotoId(id);
                        setActiveTab('photos');
                      }}
                      onUpdateTransform={handleUpdateTransform}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <LegalInfoModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
      />

      <HelpGuideModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />
    </div>
  );
}
