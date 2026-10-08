import { useEffect, useRef, useState } from "react";
import {
  Download,
  Focus,
  Image as ImageIcon,
  Minus,
  Plus,
  ScanLine,
  Video,
} from "lucide-react";
import type { Analysis, Detection } from "../types";
import { percent } from "../format";

type Props = {
  file: File | null;
  fileUrl: string | null;
  analysis: Analysis | null;
  selected: string | null;
  onSelect: (id: string) => void;
};

export default function MediaViewer({
  file,
  fileUrl,
  analysis,
  selected,
  onSelect,
}: Props) {
  const [annotated, setAnnotated] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [dimensions, setDimensions] = useState({ width: 1280, height: 720 });
  const [mediaError, setMediaError] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(390);
  const viewportRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isVideo =
    analysis?.media_type === "video" ||
    (!analysis && !!file && /\.(mp4|mov|avi|mkv|webm)$/i.test(file.name));
  const working =
    analysis?.status === "processing" || analysis?.status === "queued";
  const completed = analysis?.status === "completed";
  const showAnnotations = annotated && completed;
  const hasMedia = !!file || !!analysis;
  const source = analysis?.source_url ?? fileUrl ?? "/terrain-cotonou.jpg";
  const videoSource =
    completed && annotated && analysis.annotated_playable
      ? (analysis.annotated_url ?? source)
      : source;
  const isUnplayableAnnotation =
    isVideo && completed && annotated && !analysis.annotated_playable;
  const detections =
    completed && !isVideo && annotated ? analysis.detections : [];

  useEffect(() => {
    setZoom(1);
    setMediaError(false);
    setAnnotated(true);
  }, [source]);
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver((entries) =>
      setViewportHeight(entries[0].contentRect.height),
    );
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (isVideo && selected && analysis) {
      const target = analysis.detections.find((d) => String(d.id) === selected);
      if (target?.timestamp_seconds != null && videoRef.current)
        videoRef.current.currentTime = target.timestamp_seconds;
    }
  }, [selected, isVideo, analysis]);
  const mark = (d: Detection) => {
    const width = analysis?.metadata.width || dimensions.width;
    const height = analysis?.metadata.height || dimensions.height;
    return {
      left: `${(d.bbox[0] / width) * 100}%`,
      top: `${(d.bbox[1] / height) * 100}%`,
      width: `${((d.bbox[2] - d.bbox[0]) / width) * 100}%`,
      height: `${((d.bbox[3] - d.bbox[1]) / height) * 100}%`,
    };
  };

  return (
    <section className="viewer" aria-label="Visionneuse du média">
      <div className="viewer-toolbar">
        <div className="segmented" aria-label="Affichage des détections">
          <button
            className={!showAnnotations ? "selected" : ""}
            onClick={() => setAnnotated(false)}
            aria-pressed={!showAnnotations}
          >
            <ImageIcon size={14} /> Original
          </button>
          <button
            className={showAnnotations ? "selected" : ""}
            onClick={() => setAnnotated(true)}
            disabled={!completed}
            aria-pressed={!!showAnnotations}
          >
            <ScanLine size={14} /> Détections{" "}
            {completed && <span>{analysis.summary.total_detections}</span>}
          </button>
        </div>
        <div className="zoom-controls">
          <button
            className="icon-button"
            aria-label="Réduire le zoom"
            disabled={isVideo || zoom <= 1 || !hasMedia}
            onClick={() => setZoom((z) => Math.max(1, z - 0.25))}
          >
            <Minus size={15} />
          </button>
          <span>{Math.round(zoom * 100)} %</span>
          <button
            className="icon-button"
            aria-label="Agrandir l’image"
            disabled={isVideo || zoom >= 3 || !hasMedia}
            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
          >
            <Plus size={15} />
          </button>
          <button
            className="icon-button reset-zoom"
            aria-label="Réinitialiser le zoom"
            disabled={isVideo || !hasMedia}
            onClick={() => setZoom(1)}
          >
            <Focus size={16} />
          </button>
        </div>
      </div>
      <div
        ref={viewportRef}
        className={`media-viewport ${!hasMedia ? "sample-viewport" : ""}`}
      >
        {!hasMedia ? (
          <>
            <img
              className="terrain-image"
              src="/terrain-cotonou.jpg"
              alt="Chaussée filmée à Cotonou, extraite des données de terrain du projet"
            />
            <div className="sample-shade" />
            <div className="sample-label">
              <span className="live-dot" /> Image d’exemple
            </div>
            <div className="sample-message">
              <span>Aperçu du fichier</span>
              <p>Votre image ou votre vidéo s’affichera ici.</p>
            </div>
            <div className="viewfinder-corner top-left" />
            <div className="viewfinder-corner top-right" />
            <div className="viewfinder-corner bottom-left" />
            <div className="viewfinder-corner bottom-right" />
          </>
        ) : isVideo ? (
          <>
            <video
              key={videoSource}
              ref={videoRef}
              className="result-video"
              src={videoSource}
              controls
              playsInline
              preload="metadata"
              poster={analysis?.preview_url ?? undefined}
              onError={() => setMediaError(true)}
            />
            {mediaError && (
              <div className="media-fallback">
                <Video size={28} />
                <p>Ce format ne se lit pas dans le navigateur.</p>
                <span>
                  Le serveur peut toujours analyser le fichier. Téléchargez
                  ensuite le résultat.
                </span>
              </div>
            )}
          </>
        ) : (
          <div
            className="image-scroll"
            style={{
              overflow: zoom > 1 ? "auto" : "hidden",
              alignItems: zoom > 1 ? "flex-start" : "center",
            }}
          >
            <div
              className="image-canvas"
              style={{
                aspectRatio: `${dimensions.width} / ${dimensions.height}`,
                width: `${zoom * 100}%`,
                maxWidth:
                  zoom === 1
                    ? `min(100%, ${(viewportHeight * dimensions.width) / dimensions.height}px)`
                    : "none",
              }}
            >
              <img
                src={source}
                alt={
                  analysis
                    ? `Image originale : ${analysis.filename}`
                    : `Aperçu de ${file?.name}`
                }
                onLoad={(e) => {
                  const image = e.currentTarget;
                  setDimensions({
                    width: image.naturalWidth,
                    height: image.naturalHeight,
                  });
                }}
                onError={() => setMediaError(true)}
              />
              {detections.map((d) => (
                <button
                  key={d.id}
                  className={`detection-box ${d.class_code === "D40" ? "pothole" : "crack"} ${selected === String(d.id) ? "highlighted" : ""}`}
                  style={mark(d)}
                  onClick={() => onSelect(String(d.id))}
                  aria-label={`${d.label}, confiance ${percent(d.confidence)}`}
                >
                  <span>
                    {d.class_code} · {percent(d.confidence)}
                  </span>
                </button>
              ))}
            </div>
            {mediaError && (
              <div className="media-fallback">
                <ImageIcon size={28} />
                <p>L’aperçu de cette image est indisponible.</p>
                <span>Essayez une image JPEG, PNG ou WebP valide.</span>
              </div>
            )}
          </div>
        )}
        {working && (
          <div className="scan-overlay" aria-hidden="true">
            <div className="scan-beam" />
            <span>
              <ScanLine size={16} /> Analyse en cours
            </span>
          </div>
        )}
      </div>
      <div className="viewer-caption">
        <span>
          <span className="caption-dot" />
          {hasMedia
            ? (analysis?.filename ?? file?.name)
            : "Image d’exemple · non analysée"}
        </span>
        {completed && analysis.annotated_url ? (
          <a className="text-link" href={analysis.annotated_url} download>
            <Download size={14} /> Média annoté
          </a>
        ) : (
          <span className="caption-type">{isVideo ? "VIDÉO" : "IMAGE"}</span>
        )}
      </div>
      {isUnplayableAnnotation && (
        <p className="viewer-note">
          Le codec du résultat ne se lit pas ici. La vidéo originale reste
          affichée ; le média annoté est disponible en téléchargement.
        </p>
      )}
    </section>
  );
}
