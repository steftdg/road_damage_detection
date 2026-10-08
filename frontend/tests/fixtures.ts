import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import type { Analysis, Health, Model } from '../src/types';

/**
 * Synthetic API fixtures for browser testing only.
 * These confidence scores and detections are invented test data. They never
 * enter the real API, its history, or the product's demonstration interface.
 * The uploaded image is the existing project terrain asset.
 */
export const imageBytes = readFileSync(new URL('../public/terrain-cotonou.jpg', import.meta.url));
export const imageId = '11111111111111111111111111111111';
export const videoId = '22222222222222222222222222222222';

export const readyHealth: Health = {
  status: 'ok', inference_ready: true, models_available: 1,
  inference_runtime_available: true, ffmpeg_available: true,
  limits: { image_max_mb: 25, video_max_mb: 250, video_max_seconds: 600, max_queue: 3 },
};

export const models: Model[] = [
  { id: 'final', name: 'YOLOv8n · Final', filename: 'yolov8n_final.pt', architecture: 'YOLOv8n', epochs: 80, image_size: 640, map50: .599, description: 'Fixture du modèle final.', recommended: true, available: true },
  { id: 'baseline', name: 'YOLOv8n · Baseline', filename: 'yolov8n_baseline.pt', architecture: 'YOLOv8n', epochs: 15, image_size: 640, map50: .515, description: 'Fixture du modèle baseline.', recommended: false, available: false },
  { id: 'small', name: 'YOLOv8s', filename: 'yolov8s.pt', architecture: 'YOLOv8s', epochs: 80, image_size: 640, map50: .606, description: 'Fixture du réseau étendu.', recommended: false, available: false },
  { id: 'high-resolution', name: 'YOLOv8n · 960', filename: 'yolov8n_imgsz960.pt', architecture: 'YOLOv8n', epochs: 80, image_size: 960, map50: .606, description: 'Fixture de haute résolution.', recommended: false, available: false },
];

export const imageAnalysis: Analysis = {
  id: imageId, filename: 'fixture-synthetique-cotonou.jpg', media_type: 'image',
  status: 'completed', progress: 100, stage: 'Analyse terminée',
  model_id: 'final', model_name: 'YOLOv8n · Final', confidence: .25,
  created_at: '2026-10-08T08:30:00Z', updated_at: '2026-10-08T08:30:02Z', error: null,
  source_url: `/api/files/${imageId}/source.jpg`, preview_url: `/api/files/${imageId}/preview.jpg`,
  annotated_url: `/api/files/${imageId}/annotated.jpg`, annotated_playable: false,
  metadata: { width: 1920, height: 1080, fps: null, total_frames: null, duration_seconds: null },
  summary: {
    total_detections: 3, counts: { D20: 2, D40: 1 }, average_confidence: .83,
    processed_frames: 1, total_frames: null, elapsed_seconds: 1.8,
    inference_fps: null, sampled: false, frame_stride: 1,
  },
  detections: [
    { id: 'fixture-crack-1', class_id: 0, class_code: 'D20', label: 'Fissure alligator', confidence: .92, bbox: [240, 460, 690, 820], frame_index: null, timestamp_seconds: null },
    { id: 'fixture-pothole-1', class_id: 1, class_code: 'D40', label: 'Nid-de-poule', confidence: .84, bbox: [920, 530, 1360, 840], frame_index: null, timestamp_seconds: null },
    { id: 'fixture-crack-2', class_id: 0, class_code: 'D20', label: 'Fissure alligator', confidence: .73, bbox: [1430, 630, 1820, 960], frame_index: null, timestamp_seconds: null },
  ],
  warnings: [],
};

export const videoAnalysis: Analysis = {
  ...imageAnalysis, id: videoId, filename: 'fixture-synthetique-video.mp4', media_type: 'video',
  created_at: '2026-10-07T08:00:00Z', updated_at: '2026-10-07T08:00:20Z',
  source_url: `/api/files/${videoId}/source.mp4`, preview_url: `/api/files/${videoId}/preview.jpg`,
  annotated_url: `/api/files/${videoId}/annotated.mp4`,
  metadata: { width: 1920, height: 1080, fps: 30, total_frames: 600, duration_seconds: 20 },
  summary: { ...imageAnalysis.summary, total_detections: 2, counts: { D20: 1, D40: 1 }, processed_frames: 100, total_frames: 600, elapsed_seconds: 10, inference_fps: 10, sampled: true, frame_stride: 6 },
  detections: [
    { ...imageAnalysis.detections[0], id: 'fixture-video-crack', frame_index: 60, timestamp_seconds: 2 },
    { ...imageAnalysis.detections[1], id: 'fixture-video-pothole', frame_index: 300, timestamp_seconds: 10 },
  ],
  warnings: ['Fixture : une image sur six est analysée.'],
};

type MockOptions = {
  health?: Health;
  availableModels?: Model[];
  history?: Analysis[];
  offline?: boolean;
  createError?: string;
};

export async function mockApi(page: Page, options: MockOptions = {}) {
  let polls = 0;
  let submitted: Analysis | null = null;
  let multipartBody = '';
  let detailRequests = 0;
  const history = options.history ?? [];

  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (options.offline) { await route.abort('connectionrefused'); return; }
    const json = async (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname === '/api/health') { await json(options.health ?? readyHealth); return; }
    if (url.pathname === '/api/models') { await json({ models: options.availableModels ?? models, default_model_id: 'final' }); return; }
    if (url.pathname === '/api/analyses' && request.method() === 'GET') {
      // Match the actual backend list contract: detections are only in detail.
      const items = submitted?.status === 'completed' ? [submitted, ...history] : history;
      await json({ items: items.map(item => ({ ...item, detections: [] })), total: items.length }); return;
    }
    if (url.pathname === '/api/analyses' && request.method() === 'POST') {
      multipartBody = request.postDataBuffer()?.toString() ?? '';
      if (options.createError) { await json({ detail: { code: 'invalid_media', message: options.createError } }, 422); return; }
      submitted = { ...imageAnalysis, filename: 'fixture-synthetique-route.jpg', status: 'queued', progress: 0, stage: 'En attente', detections: [], confidence: .55 };
      await json(submitted, 202); return;
    }
    if (url.pathname === `/api/analyses/${imageId}`) {
      detailRequests += 1;
      if (!submitted) { await json(imageAnalysis); return; }
      polls += 1;
      submitted = polls === 1
        ? { ...submitted, status: 'processing', progress: 48, stage: 'Détection des dommages' }
        : { ...imageAnalysis, filename: submitted.filename, confidence: submitted.confidence };
      await json(submitted); return;
    }
    if (url.pathname === `/api/analyses/${videoId}`) { detailRequests += 1; await json(videoAnalysis); return; }
    if (url.pathname.startsWith('/api/files/') && /\.(jpg|png)$/.test(url.pathname)) {
      await route.fulfill({ status: 200, contentType: 'image/jpeg', body: imageBytes }); return;
    }
    if (url.pathname.endsWith('/export')) {
      const csv = url.searchParams.get('format') === 'csv';
      await route.fulfill({ status: 200, contentType: csv ? 'text/csv' : 'application/json', body: csv ? 'class_code,confidence\nD20,0.92\n' : JSON.stringify(imageAnalysis) }); return;
    }
    await json({ detail: 'Route de fixture introuvable.' }, 404);
  });

  return { multipart: () => multipartBody, detailRequests: () => detailRequests };
}

export async function uploadImage(page: Page) {
  await page.getByLabel('Choisir une image ou une vidéo').setInputFiles({
    name: 'fixture-synthetique-route.jpg', mimeType: 'image/jpeg', buffer: imageBytes,
  });
}
