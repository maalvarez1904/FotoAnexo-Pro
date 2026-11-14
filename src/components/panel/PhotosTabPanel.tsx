import React, { useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Crosshair,
  Maximize2,
  Minimize2,
  RotateCcw,
  RotateCw,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  HeaderFooterConfig,
  ImageTransform,
  PhotoPageItem,
} from '../../types/document';
import { isExifVisibleForPhoto } from '../../utils/documentLogic';
import { AutoResizeTextarea } from '../ui/AutoResizeTextarea';

interface PhotosTabPanelProps {
  photos: PhotoPageItem[];
  selectedPhotoId: string | null;
  photoFolios: Record<string, number>;
  photoLabels: Record<string, string>;
  headerFooterConfig: HeaderFooterConfig;
  isUploading: boolean;
  onSelectPhoto: (photoId: string) => void;
  onUploadFiles: (files: FileList | File[]) => void;
  onMovePhoto: (index: number, direction: 'up' | 'down') => void;
  onReorderPhotos: (fromIndex: number, toIndex: number) => void;
  onDeletePhoto: (photoId: string) => void;
  onUpdatePhoto: (photoId: string, partial: Partial<PhotoPageItem>) => void;
  onUpdateTransform: (photoId: string, partial: Partial<ImageTransform>) => void;
}

export const PhotosTabPanel: React.FC<PhotosTabPanelProps> = ({
  photos,
  selectedPhotoId,
  photoFolios,
  photoLabels,
  headerFooterConfig,
  isUploading,
  onSelectPhoto,
  onUploadFiles,
  onMovePhoto,
  onReorderPhotos,
  onDeletePhoto,
  onUpdatePhoto,
  onUpdateTransform,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOverDropzone, setIsDragOverDropzone] = useState(false);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  const selectedPhoto = photos.find((p) => p.id === selectedPhotoId) || null;
  const selectedPhotoLabel = selectedPhoto
    ? photoLabels[selectedPhoto.id] || 'FOTOGRAFÍA'
    : '';
  const selectedPhotoExifVisible = selectedPhoto
    ? isExifVisibleForPhoto(selectedPhoto, headerFooterConfig.globalShowExif)
    : false;

  const handleDropzoneDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverDropzone(true);
  };

  const handleDropzoneDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverDropzone(false);
  };

  const handleDropzoneDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverDropzone(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUploadFiles(e.dataTransfer.files);
    }
  };

  const handleRotateBy = (deltaDegrees: number) => {
    if (!selectedPhoto) return;
    const nextRotation = (((selectedPhoto.transform.rotation + deltaDegrees) % 360) + 360) % 360;
    onUpdateTransform(selectedPhoto.id, { rotation: nextRotation });
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3.5">
      {/* Zona de carga múltiple (Drag & Drop + Botón Seleccionar Archivos) */}
      <section className="shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold tracking-wider text-black uppercase">
            Carga de Lote Fotográfico
          </h3>
          <span className="text-xs font-mono text-black tabular-nums">
            {photos.length} {photos.length === 1 ? 'hoja' : 'hojas'}
          </span>
        </div>

        <div
          onDragOver={handleDropzoneDragOver}
          onDragLeave={handleDropzoneDragLeave}
          onDrop={handleDropzoneDrop}
          className={`border-2 border-dashed rounded-lg transition-colors ${
            photos.length > 0 ? 'px-3 py-2 flex items-center justify-between gap-3' : 'p-4 text-center'
          } ${
            isDragOverDropzone
              ? 'border-[#736F72] bg-[#C3BABA]'
              : 'border-[#736F72] bg-[#C3BABA]/50 hover:bg-[#C3BABA]/80'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                onUploadFiles(e.target.files);
                e.target.value = '';
              }
            }}
            className="hidden"
            aria-label="Seleccionar archivos de fotografías"
          />
          {photos.length > 0 ? (
            <>
              <div className="flex items-center gap-2 min-w-0 text-xs text-black">
                <Upload className="w-4 h-4 text-black shrink-0" />
                <span className="truncate">Arrastre o agregue más imágenes</span>
              </div>
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 text-xs font-semibold text-black bg-[#9A8F97] border border-[#736F72] rounded-md hover:bg-[#736F72] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isUploading ? 'Procesando...' : 'Agregar fotos'}
              </button>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5 text-black mx-auto mb-1.5" />
              <p className="text-xs text-black mb-2.5">
                Arrastre imágenes aquí o cargue un lote desde su equipo (JPG, PNG, WEBP, TIFF).
              </p>
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-1.5 text-xs font-semibold text-black bg-[#9A8F97] border border-[#736F72] rounded-md hover:bg-[#736F72] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isUploading ? 'Procesando EXIF...' : 'Seleccionar archivos'}
              </button>
            </>
          )}
        </div>
      </section>

      {/* Lista ordenable de páginas cargadas — prioriza ocupar todo el espacio disponible */}
      {photos.length > 0 && (
        <section className="flex-1 min-h-[140px] flex flex-col gap-2 border-b border-[#B2B2B2] pb-3">
          <h3 className="text-xs font-semibold tracking-wider text-black uppercase shrink-0">
            Secuencia de Hojas A4 (Reordenable)
          </h3>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-0.5">
            {photos.map((item, idx) => {
              const isSelected = item.id === selectedPhotoId;
              const label = photoLabels[item.id] || `Foto ${idx + 1}`;
              const folio = photoFolios[item.id] || idx + 1;

              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => setDraggedItemIndex(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (draggedItemIndex !== null && draggedItemIndex !== idx) {
                      onReorderPhotos(draggedItemIndex, idx);
                    }
                    setDraggedItemIndex(null);
                  }}
                  onClick={() => onSelectPhoto(item.id)}
                  className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-md border text-left cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-[#736F72] bg-[#9A8F97] text-black'
                      : 'border-[#B2B2B2] bg-[#E9E3E6] text-black hover:bg-[#C3BABA]'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-black">
                      <span className="font-semibold">{label}</span>
                      <span aria-hidden="true" className="text-black">
                        ·
                      </span>
                      <span className="text-black">
                        {headerFooterConfig.pageNumberPrefix} {String(folio).padStart(2, '0')}
                      </span>
                    </div>
                    <div className="text-xs truncate mt-0.5 text-black">
                      {item.pageTitle.trim() || item.file.name}
                    </div>
                  </div>

                  {/* Controles de orden y eliminación */}
                  <div
                    className="flex items-center gap-0.5 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => onMovePhoto(idx, 'up')}
                      aria-label={`Subir ${label}`}
                      className="p-1 rounded disabled:opacity-30 cursor-pointer hover:bg-[#736F72]/30 text-black"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === photos.length - 1}
                      onClick={() => onMovePhoto(idx, 'down')}
                      aria-label={`Bajar ${label}`}
                      className="p-1 rounded disabled:opacity-30 cursor-pointer hover:bg-[#736F72]/30 text-black"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeletePhoto(item.id)}
                      aria-label={`Eliminar ${label}`}
                      className="p-1 rounded cursor-pointer hover:bg-[#736F72]/40 text-black"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Panel de edición de la página actualmente seleccionada */}
      {selectedPhoto ? (
        <section className="shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold tracking-wider text-black uppercase">
              Edición de {selectedPhotoLabel}
            </h3>
            <span className="text-xs font-mono text-black tabular-nums">
              {selectedPhoto.naturalWidth}×{selectedPhoto.naturalHeight}px
            </span>
          </div>

          {/* Título personalizado de la página */}
          <div>
            <label
              htmlFor="photo-page-title"
              className="block text-xs font-medium text-black mb-1"
            >
              Título de la Página ({selectedPhotoLabel})
            </label>
            <input
              id="photo-page-title"
              type="text"
              lang="es-419"
              spellCheck={true}
              value={selectedPhoto.pageTitle}
              onChange={(e) =>
                onUpdatePhoto(selectedPhoto.id, { pageTitle: e.target.value })
              }
              className="w-full px-3 py-1.5 text-sm bg-[#E9E3E6] border border-[#736F72] rounded-md text-black focus:outline-none focus:ring-2 focus:ring-[#736F72] focus:border-transparent"
            />
          </div>

          {/* Epígrafe técnico multilínea autoajustable */}
          <div>
            <label
              htmlFor="photo-caption"
              className="block text-xs font-medium text-black mb-1"
            >
              Epígrafe Técnico Descriptivo
            </label>
            <AutoResizeTextarea
              id="photo-caption"
              minRows={3}
              lang="es-419"
              spellCheck={true}
              value={selectedPhoto.caption}
              onChange={(e) =>
                onUpdatePhoto(selectedPhoto.id, { caption: e.target.value })
              }
              className="w-full px-3 py-1.5 text-sm bg-[#E9E3E6] border border-[#736F72] rounded-md text-black focus:outline-none focus:ring-2 focus:ring-[#736F72] focus:border-transparent"
            />
          </div>

          {/* Motor de Transformación de Imagen (175mm x 145mm) */}
          <div className="p-3 rounded-lg border border-[#9A8F97] bg-[#C3BABA]/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-black">
                Encuadre en Marco Fijo (175 × 145 mm)
              </span>
              <span className="text-xs font-mono text-black tabular-nums">
                {selectedPhoto.transform.rotation}° · {Math.round(selectedPhoto.transform.scale * 100)}%
              </span>
            </div>

            {/* Modo de ajuste: Contain vs Cover */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#B2B2B2] rounded-md">
              <button
                type="button"
                onClick={() =>
                  onUpdateTransform(selectedPhoto.id, { fitMode: 'contain' })
                }
                className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  selectedPhoto.transform.fitMode === 'contain'
                    ? 'bg-[#E9E3E6] text-black shadow-xs'
                    : 'text-black hover:bg-[#C3BABA]'
                }`}
              >
                <Minimize2 className="w-3.5 h-3.5" />
                Encajar (Contain)
              </button>
              <button
                type="button"
                onClick={() =>
                  onUpdateTransform(selectedPhoto.id, { fitMode: 'cover' })
                }
                className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  selectedPhoto.transform.fitMode === 'cover'
                    ? 'bg-[#E9E3E6] text-black shadow-xs'
                    : 'text-black hover:bg-[#C3BABA]'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                Llenar marco (Cover)
              </button>
            </div>

            {/* Rotación rápida -90° / +90° y Centrar */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleRotateBy(-90)}
                className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-black bg-[#E9E3E6] border border-[#736F72] rounded-md hover:bg-[#9A8F97] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Rotar -90°
              </button>
              <button
                type="button"
                onClick={() => handleRotateBy(90)}
                className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-black bg-[#E9E3E6] border border-[#736F72] rounded-md hover:bg-[#9A8F97] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <RotateCw className="w-3.5 h-3.5" />
                Rotar +90°
              </button>
              <button
                type="button"
                onClick={() =>
                  onUpdateTransform(selectedPhoto.id, { offsetX: 0, offsetY: 0 })
                }
                className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-black bg-[#E9E3E6] border border-[#736F72] rounded-md hover:bg-[#9A8F97] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Crosshair className="w-3.5 h-3.5" />
                Centrar imagen
              </button>
            </div>

            {/* Control deslizante y numérico de Escala / Zoom (50% a 300%) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="photo-scale-slider"
                  className="text-xs font-medium text-black"
                >
                  Escala / Zoom (50% a 300%)
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={50}
                    max={300}
                    step={5}
                    aria-label="Porcentaje de escala"
                    value={Math.round(selectedPhoto.transform.scale * 100)}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (!isNaN(val)) {
                        const clamped = Math.max(0.5, Math.min(3.0, val / 100));
                        onUpdateTransform(selectedPhoto.id, { scale: clamped });
                      }
                    }}
                    className="w-16 px-2 py-0.5 text-xs font-mono text-right bg-[#E9E3E6] border border-[#736F72] rounded text-black"
                  />
                  <span className="text-xs font-mono text-black">%</span>
                  <button
                    type="button"
                    onClick={() => onUpdateTransform(selectedPhoto.id, { scale: 1.0 })}
                    className="px-2 py-0.5 text-xs font-medium text-black bg-[#E9E3E6] border border-[#736F72] rounded hover:bg-[#9A8F97] cursor-pointer whitespace-nowrap shrink-0"
                  >
                    100%
                  </button>
                </div>
              </div>
              <input
                id="photo-scale-slider"
                type="range"
                min={0.5}
                max={3.0}
                step={0.05}
                value={selectedPhoto.transform.scale}
                onChange={(e) =>
                  onUpdateTransform(selectedPhoto.id, {
                    scale: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-[#736F72] cursor-pointer"
              />
              <div className="flex items-center justify-between text-[11px] font-mono text-black tabular-nums">
                <span>Desplazamiento (Pan): X={selectedPhoto.transform.offsetX}px, Y={selectedPhoto.transform.offsetY}px</span>
                <span>Arrastre en hoja</span>
              </div>
            </div>
          </div>

          {/* Control individual y texto editable de Metadatos EXIF */}
          <div className="space-y-2 border-t border-[#B2B2B2] pt-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="photo-exif-override"
                className="text-xs font-medium text-black"
              >
                Cuadro EXIF en esta Hoja
              </label>
              <select
                id="photo-exif-override"
                value={
                  selectedPhoto.showExifOverride === null
                    ? 'inherit'
                    : selectedPhoto.showExifOverride
                    ? 'show'
                    : 'hide'
                }
                onChange={(e) => {
                  const val = e.target.value;
                  onUpdatePhoto(selectedPhoto.id, {
                    showExifOverride:
                      val === 'inherit' ? null : val === 'show',
                  });
                }}
                className="px-2.5 py-1 text-xs bg-[#E9E3E6] border border-[#736F72] rounded-md text-black focus:outline-none focus:ring-2 focus:ring-[#736F72]"
              >
                <option value="inherit">
                  Heredar global ({headerFooterConfig.globalShowExif ? 'Visible' : 'Oculto'})
                </option>
                <option value="show">Mostrar siempre en esta hoja</option>
                <option value="hide">Ocultar en esta hoja (Epígrafe 74mm)</option>
              </select>
            </div>

            {selectedPhotoExifVisible && (
              <div>
                <label
                  htmlFor="photo-exif-text"
                  className="block text-xs font-medium text-black mb-1"
                >
                  Texto de Metadatos EXIF (Editable)
                </label>
                <AutoResizeTextarea
                  id="photo-exif-text"
                  minRows={2}
                  lang="es-419"
                  spellCheck={true}
                  value={selectedPhoto.exifText}
                  onChange={(e) =>
                    onUpdatePhoto(selectedPhoto.id, { exifText: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-xs font-mono bg-[#E9E3E6] border border-[#736F72] rounded-md text-black focus:outline-none focus:ring-2 focus:ring-[#736F72] focus:border-transparent"
                />
              </div>
            )}
          </div>
        </section>
      ) : (
        <div className="p-4 rounded-lg border border-[#9A8F97] bg-[#C3BABA]/60 text-xs text-black text-center">
          Cargue una o más fotografías para habilitar el motor de encuadre milimétrico, epígrafes y metadatos EXIF.
        </div>
      )}
    </div>
  );
};
