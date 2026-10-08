import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpen,
  CircleHelp,
  Clock3,
  Layers3,
  LoaderCircle,
  RefreshCw,
  ScanLine,
  UserRound,
  X,
} from "lucide-react";
import { api } from "./api";
import type { Analysis, Health, Model, Page } from "./types";
import MediaViewer from "./components/MediaViewer";
import UploadPanel from "./components/UploadPanel";
import ResultsPanel from "./components/ResultsPanel";
import HistoryPage from "./components/HistoryPage";
import ModelsPage from "./components/ModelsPage";
import GuidePage from "./components/GuidePage";

const fallbackModels: Model[] = [
  {
    id: "final",
    name: "YOLOv8n · Final",
    filename: "yolov8n_final.pt",
    architecture: "YOLOv8n",
    epochs: 80,
    image_size: 640,
    map50: 0.599,
    description: "Le compromis retenu pour le projet.",
    recommended: true,
    available: false,
  },
  {
    id: "baseline",
    name: "YOLOv8n · Baseline",
    filename: "yolov8n_baseline.pt",
    architecture: "YOLOv8n",
    epochs: 15,
    image_size: 640,
    map50: 0.515,
    description: "La première validation du pipeline.",
    recommended: false,
    available: false,
  },
  {
    id: "small",
    name: "YOLOv8s",
    filename: "yolov8s.pt",
    architecture: "YOLOv8s",
    epochs: 80,
    image_size: 640,
    map50: 0.606,
    description: "Une architecture plus capacitaire.",
    recommended: false,
    available: false,
  },
  {
    id: "high-resolution",
    name: "YOLOv8n · 960",
    filename: "yolov8n_imgsz960.pt",
    architecture: "YOLOv8n",
    epochs: 80,
    image_size: 960,
    map50: 0.606,
    description: "Une analyse à plus haute résolution.",
    recommended: false,
    available: false,
  },
];
const routes: Record<Page, string> = {
  analysis: "analyse",
  history: "historique",
  models: "modeles",
  guide: "guide",
};
const readPage = (): Page =>
  (Object.entries(routes).find(
    ([, route]) => route === window.location.hash.slice(1),
  )?.[0] as Page) ?? "analysis";

export default function App() {
  const [page, setPage] = useState<Page>(readPage);
  const [health, setHealth] = useState<Health | null>(null);
  const [connecting, setConnecting] = useState(true);
  const [models, setModels] = useState(fallbackModels);
  const [history, setHistory] = useState<Analysis[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [modelId, setModelId] = useState("final");
  const [confidence, setConfidence] = useState(0.25);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [compactLayout, setCompactLayout] = useState(
    () => window.matchMedia("(max-width: 760px)").matches,
  );
  const submitController = useRef<AbortController | null>(null);
  const working =
    analysis?.status === "processing" || analysis?.status === "queued";
  useEffect(() => {
    const query = window.matchMedia("(max-width: 760px)");
    const update = () => setCompactLayout(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const navigate = (next: Page) => {
    window.location.hash = routes[next];
    setPage(next);
  };
  useEffect(() => {
    const update = () => setPage(readPage());
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  useEffect(() => {
    document.title = `STRATA · ${page === "analysis" ? "Analyse" : page === "history" ? "Historique" : page === "models" ? "Modèles" : "Guide"}`;
  }, [page]);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    const results = await Promise.allSettled([
      api.health(signal),
      api.models(signal),
      api.history(signal),
    ]);
    if (signal?.aborted) return;
    const [h, m, list] = results;
    setHealth(h.status === "fulfilled" ? h.value : null);
    if (m.status === "fulfilled")
      setModels(
        [...m.value.models].sort(
          (a, b) => Number(b.recommended) - Number(a.recommended),
        ),
      );
    if (list.status === "fulfilled") {
      setHistory((current) =>
        current.length > 50
          ? [...list.value.items, ...current.slice(50)]
          : list.value.items,
      );
      setHistoryTotal(list.value.total);
    }
    setConnecting(false);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    const interval = window.setInterval(() => {
      if (!document.hidden) void refresh(controller.signal);
    }, 10000);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [refresh]);
  useEffect(() => {
    if (!file) {
      setFileUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    if (!analysis || !working) return;
    const controller = new AbortController();
    let timeout: number;
    const poll = async () => {
      try {
        const result = await api.analysis(analysis.id, controller.signal);
        if (controller.signal.aborted) return;
        setAnalysis(result);
        if (result.status === "completed") {
          setAnnouncement("Analyse terminée. Les résultats sont disponibles.");
          void refresh();
        }
        if (result.status === "failed") {
          setError(
            result.error ?? "L’analyse a échoué. Essayez un autre fichier.",
          );
          void refresh();
        }
        if (result.status === "queued" || result.status === "processing")
          timeout = window.setTimeout(poll, 1200);
      } catch (e) {
        if (!controller.signal.aborted) {
          setError((e as Error).message);
          timeout = window.setTimeout(poll, 5000);
        }
      }
    };
    timeout = window.setTimeout(poll, 800);
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [analysis?.id, working, refresh]);

  const chooseFile = (next: File | null) => {
    if (busy || working) return;
    if (next) {
      const video = /\.(mp4|mov|avi|mkv|webm)$/i.test(next.name);
      if (!video && !/\.(jpe?g|png|webp)$/i.test(next.name)) {
        setError(
          "Format non pris en charge. Choisissez une image JPG, PNG ou WebP, ou une vidéo MP4, MOV, AVI, MKV ou WebM.",
        );
        return;
      }
      const max = video
        ? (health?.limits.video_max_mb ?? 250)
        : (health?.limits.image_max_mb ?? 25);
      if (next.size > max * 1024 * 1024) {
        setError(
          `Ce fichier dépasse la limite de ${max} Mo. Choisissez un fichier plus léger.`,
        );
        return;
      }
      if (next.size === 0) {
        setError("Ce fichier est vide. Choisissez un autre fichier.");
        return;
      }
    }
    setFile(next);
    setAnalysis(null);
    setSelected(null);
    setError(null);
    setAnnouncement(
      next ? `${next.name} est prêt à être analysé.` : "Sélection retirée.",
    );
  };
  const example = async () => {
    try {
      const response = await fetch("/terrain-cotonou.jpg");
      if (!response.ok)
        throw new Error(
          "L’exemple est indisponible. Choisissez un fichier sur votre ordinateur.",
        );
      chooseFile(
        new File([await response.blob()], "terrain-cotonou.jpg", {
          type: "image/jpeg",
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const analyze = async () => {
    if (!file || busy || working) return;
    setBusy(true);
    setError(null);
    const controller = new AbortController();
    submitController.current = controller;
    try {
      const result = await api.create(
        file,
        modelId,
        confidence,
        controller.signal,
      );
      setAnalysis(result);
      setSelected(null);
      setAnnouncement("Fichier reçu. L’analyse démarre.");
      void refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      submitController.current = null;
    }
  };
  const cancel = async () => {
    if (!analysis) return;
    try {
      setAnalysis(await api.cancel(analysis.id));
      setAnnouncement(
        "Interruption demandée. Le fichier et l’historique sont conservés.",
      );
      void refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const open = async (item: Analysis) => {
    setError(null);
    try {
      const detail = await api.analysis(item.id);
      setAnalysis(detail);
      setFile(null);
      setSelected(null);
      setModelId(detail.model_id);
      setConfidence(detail.confidence);
      navigate("analysis");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const newAnalysis = () => {
    if (!busy && !working) {
      setFile(null);
      setAnalysis(null);
      setSelected(null);
      setError(null);
    }
    navigate("analysis");
  };
  const loadMore = async () => {
    setHistoryLoading(true);
    try {
      const result = await api.history(undefined, history.length);
      setHistory((current) => [
        ...current,
        ...result.items.filter(
          (item) => !current.some((a) => a.id === item.id),
        ),
      ]);
      setHistoryTotal(result.total);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setHistoryLoading(false);
    }
  };

  const uploadPanel = (
    <UploadPanel
      key="upload"
      file={file}
      models={models}
      modelId={modelId}
      confidence={confidence}
      health={health}
      busy={busy}
      analysis={analysis}
      onFile={chooseFile}
      onModel={setModelId}
      onConfidence={setConfidence}
      onAnalyze={analyze}
      onExample={() => void example()}
      onModels={() => navigate("models")}
      onCancel={() => void cancel()}
    />
  );
  const mediaPanel = (
    <MediaViewer
      key="media"
      file={file}
      fileUrl={fileUrl}
      analysis={analysis}
      selected={selected}
      onSelect={setSelected}
    />
  );
  const resultsPanel = (
    <div className="analysis-results" key="results">
      <ResultsPanel
        key={analysis?.id ?? "empty"}
        analysis={analysis}
        selected={selected}
        onSelect={setSelected}
      />
      {analysis?.status === "cancelled" && (
        <p className="inline-info">
          Analyse interrompue. Vous pouvez relancer l’analyse ou retrouver le
          fichier dans l’historique.
        </p>
      )}
    </div>
  );
  const navigation = [
    { page: "analysis" as Page, label: "Analyse", icon: ScanLine },
    { page: "history" as Page, label: "Historique", icon: Clock3 },
    { page: "models" as Page, label: "Modèles", icon: Layers3 },
    { page: "guide" as Page, label: "Guide", icon: BookOpen },
  ];
  const links = navigation.map((item) => (
    <a
      key={item.page}
      href={`#${routes[item.page]}`}
      className={page === item.page ? "active" : ""}
      aria-current={page === item.page ? "page" : undefined}
    >
      <item.icon size={21} />
      <span>{item.label}</span>
    </a>
  ));
  const logo = (
    <svg width="30" height="32" viewBox="0 0 40 40" aria-hidden="true">
      <path
        d="m3 33 12-28h10l12 28H27L20 14l-7 19zM19 28h2v9h-2z"
        fill="currentColor"
      />
    </svg>
  );
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Aller au contenu
      </a>
      <aside className="sidebar">
        <a href="#analyse" className="brand" aria-label="STRATA, accueil">
          {logo}
          <span>STRATA</span>
        </a>
        <nav className="main-nav" aria-label="Navigation principale">
          {links}
        </nav>
        <div className="anonymous-user">
          <span>
            <UserRound size={21} />
          </span>
          Anonyme
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="header-title">
            <a
              href="#analyse"
              className="mobile-brand"
              aria-label="STRATA, accueil"
            >
              {logo}
            </a>
            <h1>{navigation.find((item) => item.page === page)?.label}</h1>
          </div>
          <div className="topbar-actions">
            <span
              className={`connection-status ${health ? "connected" : ""}`}
              title={
                health ? "Le service répond." : "Le serveur est inaccessible."
              }
            >
              {connecting ? (
                <LoaderCircle size={14} className="spinner" />
              ) : (
                <i />
              )}
              <span>
                {connecting
                  ? "Connexion…"
                  : health
                    ? "Service connecté"
                    : "Service déconnecté"}
              </span>
            </span>
            <button
              className="icon-button"
              aria-label="Actualiser la connexion et l’historique"
              onClick={() => {
                setConnecting(true);
                void refresh();
              }}
            >
              <RefreshCw size={19} />
            </button>
            <a
              className="icon-button help-button"
              href="#guide"
              aria-label="Ouvrir le guide"
            >
              <CircleHelp size={21} />
            </a>
          </div>
        </header>
        <main id="main-content" className="main-content" tabIndex={-1}>
          {error && (
            <div className="error-banner" role="alert">
              <div>
                <strong>Impossible de poursuivre</strong>
                <p>{error}</p>
              </div>
              <button
                className="icon-button"
                aria-label="Fermer le message d’erreur"
                onClick={() => setError(null)}
              >
                <X size={18} />
              </button>
            </div>
          )}
          {page === "analysis" && (
            <>
              <div className="page-intro">
                <h2>Nouvelle analyse</h2>
                <p>
                  Importez une image ou une vidéo pour détecter les dommages sur
                  la chaussée.
                </p>
              </div>
              <div className="analysis-grid">
                {compactLayout
                  ? !file && !analysis
                    ? [uploadPanel, mediaPanel, resultsPanel]
                    : [mediaPanel, resultsPanel, uploadPanel]
                  : [mediaPanel, uploadPanel, resultsPanel]}
              </div>
            </>
          )}
          {page === "history" && (
            <HistoryPage
              history={history}
              total={historyTotal}
              onOpen={(item) => void open(item)}
              onNew={newAnalysis}
              onLoadMore={() => void loadMore()}
              loading={historyLoading}
            />
          )}
          {page === "models" && (
            <ModelsPage
              models={models}
              health={health}
              onChoose={(id) => {
                setModelId(id);
                navigate("analysis");
              }}
            />
          )}
          {page === "guide" && <GuidePage onStart={newAnalysis} />}
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Navigation mobile">
        {links}
      </nav>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
    </div>
  );
}
