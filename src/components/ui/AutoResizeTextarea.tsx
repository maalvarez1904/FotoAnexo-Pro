import React, { useEffect, useRef } from 'react';

interface AutoResizeTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number;
}

/**
 * Textarea que ajusta automáticamente su altura al contenido para mostrar
 * toda la información (ej. EXIF o epígrafes) sin necesidad de redimensionar manualmente.
 */
export const AutoResizeTextarea: React.FC<AutoResizeTextareaProps> = ({
  value,
  minRows = 2,
  className = '',
  style,
  ...rest
}) => {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={minRows}
      value={value}
      style={{ overflow: 'hidden', ...style }}
      className={`resize-none ${className}`}
      {...rest}
    />
  );
};

