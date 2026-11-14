# FotoAnexo Pro

Aplicación web **100% local en el navegador** para generar anexos fotográficos técnicos y periciales en formato **A4 (210 × 297 mm)** listos para imprimir o exportar a PDF.

## Características principales

- **Privacidad total:** Todo el procesamiento de imágenes, lectura EXIF/GPS y generación de PDF se ejecuta localmente en la memoria del navegador, sin subir archivos a servidores externos.
- **Carátula técnica e Índice automático:** Carátula configurable con expediente, comitente/juzgado, profesional y matrícula, lugar/fecha y resumen dinámico en pantalla; índice paginado automáticamente (hasta 28 filas por hoja) con foliatura correlativa.
- **Hojas fotográficas A4 estandarizadas:** Marco fijo de `175 × 145 mm` con rotación, zoom (`50%` a `300%`), desplazamiento (*pan*), modo `Contain` / `Cover` y epígrafe técnico autoajustable.
- **Metadatos EXIF y anonimización GPS:** Lectura automática de fecha, cámara, óptica y coordenadas GPS, con botón de un clic para **Anonimizar GPS** en todo el lote.
- **Exportación PDF optimizada y respaldo `.json`:** Exportación directa a PDF con compresión JPEG configurable (DPI y calidad) y estimación de peso en tiempo real, o impresión nativa del navegador, además de guardado y carga de proyectos en `.json`.
- **Corrector ortográfico (`es-419`):** Activado en los campos de ingreso de texto.

## Requisitos y ejecución local

- **Node.js** 20 o superior
- **npm** 10 o superior

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo (http://localhost:3000)
npm run dev
```

## Scripts disponibles

- `npm run dev`: inicia el servidor de desarrollo Vite en el puerto `3000`.
- `npm run lint`: ejecuta la verificación de tipos con TypeScript (`tsc --noEmit`).
- `npm test`: ejecuta las pruebas unitarias (`tsx --test src/utils/*.test.ts`).
- `npm run build`: genera la compilación de producción en `dist/`.
- `npm run preview`: previsualiza localmente la build de `dist/`.

## Despliegue en GitHub Pages o hosting estático

El proyecto está configurado con `base: './'` en `vite.config.ts`, por lo que puede alojarse tanto en la raíz de un dominio como en una subcarpeta de GitHub Pages:

1. Sube este repositorio a GitHub.
2. En **Settings → Pages**, selecciona **GitHub Actions** como fuente de despliegue.
3. Ejecuta manualmente el workflow **Deploy to GitHub Pages** desde la pestaña **Actions**.

También se incluye un workflow de integración continua (`.github/workflows/ci.yml`) que valida `lint`, `test` y `build` en cada `push` o `pull_request` hacia `main`.

## Licencia

Distribuido bajo licencia [MIT](LICENSE).
