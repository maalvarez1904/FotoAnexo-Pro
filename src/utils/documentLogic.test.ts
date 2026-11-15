import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialCoverConfig,
  createInitialHeaderFooterConfig,
  createDefaultImageTransform,
  calculateDocumentPagination,
  computeImageFrameGeometry,
  buildFormattedExifText,
  formatPhotoIdentifier,
  stripGpsFromExifText,
  NO_EXIF_DEFAULT_MESSAGE,
  PHOTO_FRAME_WIDTH_MM,
  PHOTO_FRAME_HEIGHT_MM,
} from './documentLogic';

test('Regla 1: initial states start with all text fields completely empty', () => {
  const cover = createInitialCoverConfig();
  assert.equal(cover.enabled, false);
  assert.equal(cover.mainTitle, '');
  assert.equal(cover.subtitle, '');
  assert.equal(cover.referenceCode, '');
  assert.equal(cover.clientOrCourt, '');
  assert.equal(cover.professionalInfo, '');
  assert.equal(cover.locationAndDate, '');
  assert.equal(cover.notes, '');

  const hf = createInitialHeaderFooterConfig();
  assert.equal(hf.headerLeft, '');
  assert.equal(hf.headerRight, '');
  assert.equal(hf.footerLeft, '');
  assert.equal(hf.indexTitle, '');
  assert.equal(hf.photoPrefixTemplate, '');
});

test('formatPhotoIdentifier pads correlative numbers and uses default template when empty', () => {
  assert.equal(formatPhotoIdentifier(1, '', 2), 'FOTOGRAFÍA N° 01');
  assert.equal(formatPhotoIdentifier(12, 'TOMA', 3), 'TOMA 012');
});

test('calculateDocumentPagination chunks index > 28 rows and shifts folios accurately', () => {
  const photos = Array.from({ length: 30 }, (_, i) => ({ id: `p-${i + 1}` }));
  const result = calculateDocumentPagination(
    photos,
    { enabled: true },
    {
      countCoverInNumbering: true,
      indexEnabled: true,
      photoPrefixTemplate: 'FOTOGRAFÍA N°',
      photoNumberPadding: 2,
    }
  );

  // Cover = folio 1
  assert.equal(result.coverFolio, 1);
  // 30 photos -> 2 index pages (28 rows on first, 2 rows on second) -> folios 2 and 3
  assert.equal(result.indexPages.length, 2);
  assert.equal(result.indexPages[0].folioNumber, 2);
  assert.equal(result.indexPages[0].isContinuation, false);
  assert.equal(result.indexPages[0].entries.length, 28);
  assert.equal(result.indexPages[1].folioNumber, 3);
  assert.equal(result.indexPages[1].isContinuation, true);
  assert.equal(result.indexPages[1].entries.length, 2);

  // First photo starts at folio 4, 30th photo at folio 33
  assert.equal(result.photoFolios['p-1'], 4);
  assert.equal(result.photoFolios['p-30'], 33);
  assert.equal(result.totalFolios, 33);
});

test('computeImageFrameGeometry handles 90deg and 270deg orthogonal contain/cover accurately', () => {
  // 4000x3000 landscape photo rotated 90 degrees inside 175mm x 145mm frame
  const contain90 = computeImageFrameGeometry(4000, 3000, {
    ...createDefaultImageTransform(),
    rotation: 90,
    fitMode: 'contain',
    scale: 1.0,
  });

  assert.equal(contain90.isOrthogonal, true);
  // Visual height must equal 145mm and visual width must be <= 175mm (108.75mm)
  assert.ok(Math.abs(contain90.visualHeightMm - PHOTO_FRAME_HEIGHT_MM) < 1e-6);
  assert.ok(contain90.visualWidthMm <= PHOTO_FRAME_WIDTH_MM);
  assert.ok(Math.abs(contain90.visualWidthMm - 108.75) < 1e-4);

  // Cover at 90 degrees must cover at least 175mm x 145mm
  const cover90 = computeImageFrameGeometry(4000, 3000, {
    ...createDefaultImageTransform(),
    rotation: 90,
    fitMode: 'cover',
    scale: 1.0,
  });
  assert.ok(Math.abs(cover90.visualWidthMm - PHOTO_FRAME_WIDTH_MM) < 1e-6);
  assert.ok(cover90.visualHeightMm >= PHOTO_FRAME_HEIGHT_MM);
});

test('buildFormattedExifText formats date, camera, optics and GPS or falls back cleanly', () => {
  const emptyRes = buildFormattedExifText(null);
  assert.equal(emptyRes.hasExifData, false);
  assert.equal(emptyRes.exifText, NO_EXIF_DEFAULT_MESSAGE);

  const sample = buildFormattedExifText({
    DateTimeOriginal: '2026:03:15 10:25:40',
    Make: 'Canon',
    Model: 'Canon EOS R5',
    FocalLength: 24,
    FNumber: 4.0,
    ExposureTime: 0.004, // 1/250s
    ISO: 100,
    latitude: -31.420083,
    longitude: -64.188776,
  });

  assert.equal(sample.hasExifData, true);
  assert.ok(sample.exifText.includes('15/03/2026 10:25:40'));
  assert.ok(sample.exifText.includes('Canon EOS R5'));
  assert.ok(sample.exifText.includes('24mm'));
  assert.ok(sample.exifText.includes('f/4'));
  assert.ok(sample.exifText.includes('1/250s'));
  assert.ok(sample.exifText.includes('ISO 100'));
  assert.ok(sample.exifText.includes('-31.420083 (S), -64.188776 (O)'));
});

import {
  buildProjectPayload,
  importProjectFromJsonFile,
  parseAndValidateProjectJson,
} from './projectStorage';

test('JSON project serialization and validation preserves cover, header/footer and photo state', () => {
  const cover = {
    ...createInitialCoverConfig(),
    enabled: true,
    mainTitle: 'INFORME PERICIAL',
    referenceCode: 'EXP-2026-99',
  };
  const hf = {
    ...createInitialHeaderFooterConfig(),
    headerLeft: 'PERICIA ARQUITECTÓNICA',
    pageNumberPrefix: 'Página' as const,
    indexEnabled: true,
  };
  const payload = buildProjectPayload(
    cover,
    hf,
    [
      {
        id: 'photo-1',
        fileName: 'toma1.jpg',
        fileType: 'image/jpeg',
        lastModified: 1700000000000,
        dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        naturalWidth: 1600,
        naturalHeight: 1200,
        pageTitle: 'Muro medianero',
        caption: 'Fisura horizontal',
        exifText: 'FECHA: 13/11/2026 10:00:00',
        hasExifData: true,
        showExifOverride: false,
        transform: {
          rotation: 90,
          scale: 1.25,
          fitMode: 'cover',
          offsetX: 15,
          offsetY: -10,
        },
      },
    ],
    '2026-11-13T14:20:00.000Z'
  );

  const jsonStr = JSON.stringify(payload);
  const parsed = parseAndValidateProjectJson(jsonStr);

  assert.equal(parsed.format, 'anexofoto-a4-project');
  assert.equal(parsed.coverConfig.enabled, true);
  assert.equal(parsed.coverConfig.mainTitle, 'INFORME PERICIAL');
  assert.equal(parsed.headerFooterConfig.pageNumberPrefix, 'Página');
  assert.equal(parsed.photos.length, 1);
  assert.equal(parsed.photos[0].pageTitle, 'Muro medianero');
  assert.equal(parsed.photos[0].transform.rotation, 90);
  assert.equal(parsed.photos[0].transform.scale, 1.25);
  assert.equal(parsed.photos[0].transform.fitMode, 'cover');
});

test('stripGpsFromExifText removes GPS coordinates while preserving camera and date metadata', () => {
  const input =
    'FECHA: 13/11/2026 10:00:00  |  EQUIPO: Nikon Z6\nÓPTICA/EXP: 24mm · f/8 · ISO 200  |  GPS: -31.420083 (S), -64.188776 (O)';
  const stripped = stripGpsFromExifText(input);
  assert.ok(!stripped.includes('GPS:'));
  assert.ok(stripped.includes('FECHA: 13/11/2026 10:00:00'));
  assert.ok(stripped.includes('ÓPTICA/EXP: 24mm · f/8 · ISO 200'));

  const onlyGps = 'GPS: -31.420083 (S), -64.188776 (O)';
  assert.equal(stripGpsFromExifText(onlyGps), NO_EXIF_DEFAULT_MESSAGE);
});

test('parseAndValidateProjectJson sanitizes non-finite or non-positive photo dimensions', () => {
  const malformedPayload = JSON.stringify({
    format: 'anexofoto-a4-project',
    version: 1,
    photos: [
      {
        id: 'p-bad',
        fileName: 'test.jpg',
        naturalWidth: -100,
        naturalHeight: null,
        dataUrl: 'data:image/jpeg;base64,/9j/4AAQ',
      },
    ],
  });

  const parsed = parseAndValidateProjectJson(malformedPayload);
  assert.equal(parsed.photos[0].naturalWidth, 1600);
  assert.equal(parsed.photos[0].naturalHeight, 1200);
});

test('importProjectFromJsonFile revokes created ObjectURLs if a later photo fails validation', async () => {
  const createdUrls: string[] = [];
  const revokedUrls: string[] = [];
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;

  URL.createObjectURL = () => {
    const url = `blob:mock-${createdUrls.length + 1}`;
    createdUrls.push(url);
    return url;
  };
  URL.revokeObjectURL = (url: string) => {
    revokedUrls.push(url);
  };

  try {
    const payload = buildProjectPayload(
      createInitialCoverConfig(),
      createInitialHeaderFooterConfig(),
      [
        {
          id: 'ok-1',
          fileName: 'ok.png',
          fileType: 'image/png',
          lastModified: 1700000000000,
          dataUrl:
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          naturalWidth: 100,
          naturalHeight: 100,
          pageTitle: '',
          caption: '',
          exifText: NO_EXIF_DEFAULT_MESSAGE,
          hasExifData: false,
          showExifOverride: null,
          transform: {
            rotation: 0,
            scale: 1,
            fitMode: 'contain',
            offsetX: 0,
            offsetY: 0,
          },
        },
        {
          id: 'bad-2',
          fileName: 'bad.svg',
          fileType: 'image/svg+xml',
          lastModified: 1700000000000,
          dataUrl: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
          naturalWidth: 100,
          naturalHeight: 100,
          pageTitle: '',
          caption: '',
          exifText: NO_EXIF_DEFAULT_MESSAGE,
          hasExifData: false,
          showExifOverride: null,
          transform: {
            rotation: 0,
            scale: 1,
            fitMode: 'contain',
            offsetX: 0,
            offsetY: 0,
          },
        },
      ]
    );

    const file = new File([JSON.stringify(payload)], 'broken.json', {
      type: 'application/json',
    });

    await assert.rejects(() => importProjectFromJsonFile(file));
    assert.deepEqual(createdUrls, ['blob:mock-1']);
    assert.deepEqual(revokedUrls, ['blob:mock-1']);
  } finally {
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  }
});

