import { ChevronDown, Download } from "lucide-react";
import { useState } from "react";
import { api } from "../api";
import { duration, number, percent } from "../format";
import type { Analysis } from "../types";

export default function ResultsPanel({
  analysis,
  selected,
  onSelect,
}: {
  analysis: Analysis | null;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const [filter, setFilter] = useState("all");
  const [limit, setLimit] = useState(30);
  if (!analysis || analysis.status !== "completed") return null;
  const detections = analysis.detections.filter(
    (d) => filter === "all" || d.class_code === filter,
  );
  return (
    <section className="results-panel" aria-label="Résultats de l’analyse">
      <div className="results-heading">
        <div>
          <h2>
            {analysis.summary.total_detections === 0
              ? "Aucun dommage détecté"
              : `${number(analysis.summary.total_detections)} détection${analysis.summary.total_detections > 1 ? "s" : ""}`}
          </h2>
          <p>
            {analysis.media_type === "video"
              ? `Sur ${number(analysis.summary.processed_frames)} images analysées · les mêmes dommages peuvent apparaître plusieurs fois.`
              : `Analyse terminée en ${duration(analysis.summary.elapsed_seconds)} · ${analysis.model_name}`}
          </p>
        </div>
        <div className="export-links">
          <a href={api.exportUrl(analysis.id, "csv")} download>
            <Download size={14} /> CSV
          </a>
          <a href={api.exportUrl(analysis.id, "json")} download>
            JSON
          </a>
        </div>
      </div>
      <div className="result-summary">
        <span>
          <i className="crack-dot" /> Fissures alligator{" "}
          <strong>{number(analysis.summary.counts.D20)}</strong>
        </span>
        <span>
          <i className="pothole-dot" /> Nids-de-poule{" "}
          <strong>{number(analysis.summary.counts.D40)}</strong>
        </span>
        <span>
          Confiance moyenne{" "}
          <strong>
            {analysis.summary.average_confidence != null
              ? percent(analysis.summary.average_confidence)
              : "—"}
          </strong>
        </span>
        {analysis.summary.inference_fps != null && (
          <span>
            Inférence{" "}
            <strong>{analysis.summary.inference_fps.toFixed(1)} im/s</strong>
          </span>
        )}
      </div>
      {analysis.summary.total_detections === 0 ? (
        <p className="empty-result">
          Cela ne garantit pas une chaussée sans dommage. Essayez un autre
          cadrage ou un seuil de confiance plus bas.
        </p>
      ) : (
        <>
          <div className="detection-filters">
            <button
              onClick={() => {
                setFilter("all");
                setLimit(30);
              }}
              aria-pressed={filter === "all"}
              className={filter === "all" ? "active" : ""}
            >
              Toutes les zones
            </button>
            <button
              onClick={() => {
                setFilter("D20");
                setLimit(30);
              }}
              aria-pressed={filter === "D20"}
              className={filter === "D20" ? "active" : ""}
            >
              Fissures
            </button>
            <button
              onClick={() => {
                setFilter("D40");
                setLimit(30);
              }}
              aria-pressed={filter === "D40"}
              className={filter === "D40" ? "active" : ""}
            >
              Nids-de-poule
            </button>
          </div>
          <div className="detection-list">
            {detections.slice(0, limit).map((d, index) => (
              <button
                key={d.id}
                className={`detection-row ${selected === String(d.id) ? "active" : ""}`}
                onClick={() => onSelect(String(d.id))}
                aria-pressed={selected === String(d.id)}
              >
                <span className="zone-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <i
                  className={
                    d.class_code === "D20" ? "crack-dot" : "pothole-dot"
                  }
                />
                <strong>
                  {d.class_code === "D20"
                    ? "Fissure alligator"
                    : "Nid-de-poule"}
                </strong>
                <span>
                  {d.timestamp_seconds != null
                    ? duration(d.timestamp_seconds)
                    : d.class_code}
                </span>
                <span className="confidence-bar">
                  <i style={{ width: `${d.confidence * 100}%` }} />
                </span>
                <span className="confidence-number">
                  {percent(d.confidence)}
                </span>
              </button>
            ))}
          </div>
          {detections.length > limit && (
            <button
              className="show-more"
              onClick={() => setLimit((l) => l + 30)}
            >
              Afficher 30 zones supplémentaires <ChevronDown size={14} />
            </button>
          )}
        </>
      )}
      {analysis.warnings.map((w) => (
        <p key={w} className="result-warning">
          {w}
        </p>
      ))}
      <p className="results-footnote">
        La confiance indique la certitude du modèle, pas la gravité du dommage.
        Vérifiez les zones visuellement.
      </p>
    </section>
  );
}
