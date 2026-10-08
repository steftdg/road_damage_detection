export type Model = {
  id: string;
  name: string;
  filename: string;
  architecture: string;
  epochs: number;
  image_size: number;
  map50: number;
  description: string;
  recommended: boolean;
  available: boolean;
};
export type Health = {
  status: string;
  inference_ready: boolean;
  models_available: number;
  inference_runtime_available: boolean;
  ffmpeg_available: boolean;
  limits: {
    image_max_mb: number;
    video_max_mb: number;
    video_max_seconds: number;
    max_queue: number;
  };
};
export type Detection = {
  id: string;
  class_id: number;
  class_code: "D20" | "D40";
  label: string;
  confidence: number;
  bbox: [number, number, number, number];
  frame_index: number | null;
  timestamp_seconds: number | null;
};
export type Analysis = {
  id: string;
  filename: string;
  media_type: "image" | "video";
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  progress: number;
  stage: string;
  model_id: string;
  model_name: string;
  confidence: number;
  created_at: string;
  updated_at: string;
  error: string | null;
  source_url: string;
  preview_url: string | null;
  annotated_url: string | null;
  annotated_playable: boolean;
  metadata: {
    width: number;
    height: number;
    fps: number | null;
    total_frames: number | null;
    duration_seconds: number | null;
  };
  summary: {
    total_detections: number;
    counts: { D20: number; D40: number };
    average_confidence: number | null;
    processed_frames: number;
    total_frames: number | null;
    elapsed_seconds: number;
    inference_fps: number | null;
    sampled: boolean;
    frame_stride: number;
  };
  detections: Detection[];
  warnings: string[];
};
export type Page = "analysis" | "history" | "models" | "guide";
