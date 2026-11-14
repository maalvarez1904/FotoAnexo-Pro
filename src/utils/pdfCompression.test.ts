import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeTargetPixelDimensions,
  estimatePdfSizeBytes,
  formatFileSize,
} from './pdfCompression';
import { PhotoPageItem } from '../types/document';

function makeMockPhoto(
  overrides: Partial<PhotoPageItem> = {}
): PhotoPageItem {
  return {
    id: 'p1',
    file: { name: 'foto.jpg', size: 3_000_000 } as File,
    objectUrl: 'blob:mock',
    naturalWidth: 4000,
    naturalHeight: 3000,
    pageTitle: '',
    caption: '',
    exifText: '',
    hasExifData: false,
    showExifOverride: null,
    transform: {
      rotation: 0,
      scale: 1,
      fitMode: 'contain',
      offsetX: 0,
      offsetY: 0,
    },
    ...overrides,
  };
}

test('computeTargetPixelDimensions scales 175x145mm frame at 150 DPI without upscaling', () => {
  const photo = makeMockPhoto();
  const dims150 = computeTargetPixelDimensions(photo, 150);
  // 175mm / 25.4 * 150 = 1033px; 4:3 aspect -> ~775px height
  assert.equal(dims150.width, 1033);
  assert.equal(dims150.height, 775);

  // Small original image should never be upscaled
  const smallPhoto = makeMockPhoto({ naturalWidth: 640, naturalHeight: 480 });
  const dimsSmall = computeTargetPixelDimensions(smallPhoto, 300);
  assert.equal(dimsSmall.width, 640);
  assert.equal(dimsSmall.height, 480);
});

test('estimatePdfSizeBytes reflects raw size when disabled and compressed/measured size when enabled', () => {
  const photos = [makeMockPhoto()];

  const disabled = estimatePdfSizeBytes(photos, 2, {
    enabled: false,
    dpi: 150,
    quality: 0.75,
  });
  assert.equal(disabled.isMeasured, false);
  assert.ok(disabled.estimatedBytes > 3_000_000);

  const enabledAnalytical = estimatePdfSizeBytes(photos, 2, {
    enabled: true,
    dpi: 150,
    quality: 0.75,
  });
  assert.equal(enabledAnalytical.isMeasured, false);
  assert.ok(enabledAnalytical.estimatedBytes < 500_000);
  assert.ok(enabledAnalytical.estimatedBytes < disabled.estimatedBytes);

  const enabledMeasured = estimatePdfSizeBytes(
    photos,
    2,
    { enabled: true, dpi: 150, quality: 0.75 },
    180_000
  );
  assert.equal(enabledMeasured.isMeasured, true);
  // Direct jsPDF overhead (6KB + 2*3KB = 12KB) + measured bytes * 1.02
  assert.equal(enabledMeasured.estimatedBytes, 12 * 1024 + Math.round(180_000 * 1.02));
});

test('formatFileSize formats bytes into KB and MB cleanly', () => {
  assert.equal(formatFileSize(0), '0 KB');
  assert.equal(formatFileSize(420 * 1024), '420 KB');
  assert.equal(formatFileSize(2.5 * 1024 * 1024), '2.50 MB');
});

