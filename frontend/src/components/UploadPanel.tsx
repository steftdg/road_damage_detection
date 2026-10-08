import { useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  FileImage,
  FileVideo,
  ImagePlus,
  LoaderCircle,
  SlidersHorizontal,
  Upload,
  X,
} from "lucide-react";
import type { Analysis, Health, Model } from "../types";
import { fileSize, percent } from "../format";
import ModelSelect from "./ModelSelect";

type Props = {
  file: File | null;
  models: Model[];
  modelId: string;
  confidence: number;
  health: Health | null;
  busy: boolean;
  analysis: Analysis | null;
  onFile: (file: File | null) => void;
  onModel: (id: string) => void;
  onConfidence: (value: number) => void;
  onAnalyze: () => void;
  onExample: () => void;
  onModels: () => void;
  onCancel: () => void;
};

export default function UploadPanel(props: Props) {
  const {
    file,
    models,
    modelId,
    confidence,
    health,
    busy,
    analysis,
    onFile,
    onModel,
    onConfidence,
    onAnalyze,
    onExample,
    onModels,
    onCancel,
  } = props;
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [settings, setSettings] = useState(false);
  const currentModel = models.find((m) => m.id === modelId);
  const working =
    analysis?.status === "queued" || analysis?.status === "processing";
  const ready =
    !!health?.inference_runtime_available && !!currentModel?.available;
  const limits = health?.limits;

  return (
    <aside className="upload-panel" aria-label="Configurer une analyse">
      <div className="panel-heading">
        <h3>Paramètres de l’analyse</h3>
      </div>
      <input
        ref={input}
        type="file"
        tabIndex={-1}
        className="sr-only"
        accept=".jpg,.jpeg,.png,.webp,.mp4,.mov,.avi,.mkv,.webm"
        disabled={busy || !!working}
        onChange={(e) => {
          const next = e.target.files?.[0];
          if (next) onFile(next);
          e.target.value = "";
        }}
        aria-label="Choisir une image ou une vidéo"
      />
      {file ? (
        <div className="selected-file">
          {file.type.startsWith("video") ? (
            <FileVideo size={22} />
          ) : (
            <FileImage size={22} />
          )}
          <div>
            <strong title={file.name}>{file.name}</strong>
            <span>{fileSize(file.size)} · prêt à analyser</span>
          </div>
          <button
            className="icon-button"
            aria-label="Retirer le fichier de la sélection"
            disabled={busy || !!working}
            onClick={() => onFile(null)}
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div
          className={`dropzone ${dragging ? "dragging" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            if (!busy && !working) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!busy && !working && e.dataTransfer.files[0])
              onFile(e.dataTransfer.files[0]);
          }}
        >
          <span className="upload-symbol">
            <Upload size={26} strokeWidth={1.5} />
          </span>
          <strong>Importer un fichier</strong>
          <p>Glissez une image ou une vidéo ici</p>
          <button
            className="button button-secondary"
            onClick={() => input.current?.click()}
            disabled={busy || !!working}
          >
            <ImagePlus size={16} /> Parcourir les fichiers
          </button>
          <span className="format-hint">
            JPG, PNG, WebP · MP4, MOV, AVI, MKV, WebM
            <br />
            Image ≤ {limits?.image_max_mb ?? 25} Mo · vidéo ≤{" "}
            {limits?.video_max_mb ?? 250} Mo
          </span>
        </div>
      )}
      <button
        className="example-link"
        onClick={onExample}
        disabled={busy || !!working}
      >
        <span></span> Essayer avec l’image d’exemple <ArrowRight size={13} />
      </button>
      <ModelSelect
        models={models}
        value={modelId}
        onChange={onModel}
        disabled={busy || !!working}
      />
      <div className={`availability ${ready ? "ready" : ""}`}>
        <span />
        {ready ? "Disponible" : "Analyse indisponible"}
      </div>
      <button
        className="settings-toggle"
        aria-expanded={settings}
        aria-controls="analysis-settings"
        onClick={() => setSettings((s) => !s)}
      >
        <SlidersHorizontal size={15} /> Affiner l’analyse{" "}
        <ChevronDown size={15} className={settings ? "rotated" : ""} />
      </button>
      {settings && (
        <div className="advanced-settings" id="analysis-settings">
          <label htmlFor="confidence">
            Seuil de confiance <output>{percent(confidence)}</output>
          </label>
          <input
            id="confidence"
            type="range"
            min="0.05"
            max="0.95"
            step="0.05"
            value={confidence}
            disabled={busy || !!working}
            onChange={(e) => onConfidence(Number(e.target.value))}
          />
          <div className="range-labels">
            <span>Plus de détections</span>
            <span>Plus sélectif</span>
          </div>
          <p>
            Un seuil bas retient davantage de zones, avec plus de faux positifs
            possibles.
          </p>
        </div>
      )}
      {working ? (
        <div className="job-progress" role="status">
          <div>
            <strong>{analysis.stage}</strong>
            <span>{Math.round(analysis.progress)} %</span>
          </div>
          <progress value={analysis.progress} max={100} />
          <button className="text-link" onClick={onCancel}>
            Interrompre l’analyse
          </button>
        </div>
      ) : (
        <>
          <button
            className="button button-primary analyze-button"
            disabled={!file || !ready || busy}
            onClick={onAnalyze}
          >
            {busy ? (
              <LoaderCircle size={18} className="spinner" />
            ) : (
              <ScanIcon />
            )}{" "}
            {busy ? "Envoi du fichier…" : "Lancer l’analyse"}{" "}
            {!busy && <ArrowRight size={16} />}
          </button>
          {!ready ? (
            <div className="model-notice">
              <span className="notice-dot" />
              <p>
                {health
                  ? currentModel?.available
                    ? "Installez le moteur d’inférence pour lancer le modèle."
                    : "Cette version du modèle n’est pas encore installée."
                  : "Connectez le service pour lancer une analyse."}{" "}
                <button onClick={onModels}>
                  Configurer les modèles <ArrowRight size={12} />
                </button>
              </p>
            </div>
          ) : (
            <p className="local-note">
              <Check size={13} /> Prêt à lancer l’analyse
            </p>
          )}
        </>
      )}
    </aside>
  );
}

function ScanIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M3 12h18" />
    </svg>
  );
}
