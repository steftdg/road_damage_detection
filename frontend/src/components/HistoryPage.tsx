import {
  ArrowDownToLine,
  ArrowUpRight,
  Clock3,
  Image,
  Search,
  Video,
} from "lucide-react";
import { useState } from "react";
import { api } from "../api";
import { date, number, statusLabels } from "../format";
import { modelPresentation } from "../modelPresentation";
import type { Analysis } from "../types";

export default function HistoryPage({
  history,
  total,
  onOpen,
  onNew,
  onLoadMore,
  loading,
}: {
  history: Analysis[];
  total: number;
  onOpen: (analysis: Analysis) => void;
  onNew: () => void;
  onLoadMore: () => void;
  loading: boolean;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const items = history.filter(
    (a) =>
      a.filename
        .toLocaleLowerCase("fr")
        .includes(query.toLocaleLowerCase("fr")) &&
      (filter === "all" || a.media_type === filter),
  );
  return (
    <>
      <div className="page-intro history-intro">
        <div>
          <h2>Analyses enregistrées</h2>
          <p>Consultez vos résultats et rouvrez une analyse.</p>
        </div>
        <button className="button button-primary" onClick={onNew}>
          Nouvelle analyse <ArrowUpRight size={16} />
        </button>
      </div>
      <div className="history-controls">
        <label className="search-input">
          <Search size={17} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un fichier…"
            aria-label="Rechercher dans l’historique"
          />
        </label>
        <div className="segmented">
          <button
            className={filter === "all" ? "selected" : ""}
            onClick={() => setFilter("all")}
            aria-pressed={filter === "all"}
          >
            Tout
          </button>
          <button
            className={filter === "image" ? "selected" : ""}
            onClick={() => setFilter("image")}
            aria-pressed={filter === "image"}
          >
            Images
          </button>
          <button
            className={filter === "video" ? "selected" : ""}
            onClick={() => setFilter("video")}
            aria-pressed={filter === "video"}
          >
            Vidéos
          </button>
        </div>
        <span className="history-count">
          {number(total)} analyse{total > 1 ? "s" : ""}
        </span>
      </div>
      {history.length === 0 ? (
        <div className="history-empty">
          <Clock3 size={42} strokeWidth={1} />
          <h2>Aucune analyse enregistrée</h2>
          <p>
            Les analyses apparaîtront dans cet espace, avec leurs fichiers,
            leurs résultats et leurs paramètres.
          </p>
          <button className="button button-secondary" onClick={onNew}>
            Analyser un premier fichier <ArrowUpRight size={16} />
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="history-empty">
          <Search size={32} />
          <h2>Aucun fichier trouvé</h2>
          <p>Essayez un autre nom ou choisissez un autre type de média.</p>
          <button
            className="text-link"
            onClick={() => {
              setQuery("");
              setFilter("all");
            }}
          >
            Réinitialiser la recherche
          </button>
        </div>
      ) : (
        <div className="history-table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th>Fichier</th>
                <th>Modèle</th>
                <th>Détections</th>
                <th>État</th>
                <th>Date</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id}>
                  <td>
                    <button className="history-file" onClick={() => onOpen(a)}>
                      {a.preview_url ? (
                        <img src={a.preview_url} alt="" loading="lazy" />
                      ) : (
                        <span className="file-thumbnail">
                          {a.media_type === "image" ? (
                            <Image size={20} />
                          ) : (
                            <Video size={20} />
                          )}
                        </span>
                      )}
                      <span>
                        <strong>{a.filename}</strong>
                        <small>
                          {a.media_type === "image" ? "Image" : "Vidéo"}
                        </small>
                      </span>
                    </button>
                  </td>
                  <td>{modelPresentation(a.model_id).name}</td>
                  <td>
                    {a.status === "completed"
                      ? number(a.summary.total_detections)
                      : "—"}
                  </td>
                  <td>
                    <span className={`status-chip ${a.status}`}>
                      <i />
                      {statusLabels[a.status]}
                    </span>
                  </td>
                  <td className="date-cell">{date(a.created_at)}</td>
                  <td>
                    {a.status === "completed" && (
                      <a
                        className="icon-button"
                        aria-label={`Exporter ${a.filename} en CSV`}
                        href={api.exportUrl(a.id, "csv")}
                        download
                      >
                        <ArrowDownToLine size={17} />
                      </a>
                    )}
                    <button
                      className="icon-button"
                      aria-label={`Ouvrir ${a.filename}`}
                      onClick={() => onOpen(a)}
                    >
                      <ArrowUpRight size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {history.length < total && (
        <button
          className="button button-secondary load-more"
          onClick={onLoadMore}
          disabled={loading}
        >
          {loading ? "Chargement…" : "Charger les analyses précédentes"}
        </button>
      )}
    </>
  );
}
