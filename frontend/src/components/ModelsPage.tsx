import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  Copy,
  FolderOpen,
  Info,
} from "lucide-react";
import { useState } from "react";
import { modelPresentation } from "../modelPresentation";
import type { Health, Model } from "../types";

export default function ModelsPage({
  models,
  health,
  onChoose,
}: {
  models: Model[];
  health: Health | null;
  onChoose: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText("models/yolov8n_final.pt");
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopyError(true);
    }
  };
  return (
    <>
      <div className="page-intro">
        <h2>Versions du modèle</h2>
        <p>
          Choisissez une version pour détecter les fissures et les
          nids-de-poule.
        </p>
      </div>
      <div className="model-version-list">
        {models.map((model) => (
          <article className="model-version" key={model.id}>
            <div>
              <h3>
                {modelPresentation(model.id).name}
                {model.recommended && (
                  <span className="recommended-tag">Recommandé</span>
                )}
              </h3>
              <p>{modelPresentation(model.id).description}</p>
            </div>
            <span
              className={`model-state ${model.available ? "available" : ""}`}
            >
              {model.available ? (
                <CheckCircle2 size={17} />
              ) : (
                <FolderOpen size={17} />
              )}
              {model.available ? "Installé" : "À installer"}
            </span>
            <button
              className="button button-secondary"
              onClick={() => onChoose(model.id)}
            >
              Choisir <ArrowUpRight size={17} />
              <span className="sr-only">
                {modelPresentation(model.id).name}
              </span>
            </button>
          </article>
        ))}
      </div>
      <section className="model-explanation">
        <h3>Qu’est-ce qui change entre les versions ?</h3>
        <p>
          Ce sont quatre entraînements distincts pour les mêmes types de
          dommages. Standard, Version initiale et Haute résolution partagent une
          architecture ; Réseau étendu utilise une architecture plus grande.
          Chaque version possède son propre fichier entraîné.
        </p>
        <details>
          <summary>Comparer les caractéristiques techniques</summary>
          <div className="models-table-wrap">
            <table className="models-table">
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Architecture</th>
                  <th>Entraînement</th>
                  <th>Résolution</th>
                  <th>mAP50</th>
                </tr>
              </thead>
              <tbody>
                {models.map((model) => (
                  <tr key={model.id}>
                    <td>{modelPresentation(model.id).name}</td>
                    <td>{model.architecture}</td>
                    <td>{model.epochs} cycles</td>
                    <td>{model.image_size} px</td>
                    <td>
                      {(model.map50 * 100).toFixed(1).replace(".", ",")} %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Scores mesurés sur la validation RDD2022. Ils ne garantissent pas la
            même précision sur chaque image importée.
          </p>
        </details>
      </section>
      <section className="connection-guide">
        <div className="guide-icon">
          <FolderOpen size={29} strokeWidth={1.5} />
        </div>
        <div>
          <h3>Installer les fichiers du modèle</h3>
          <p>
            Le notebook peut entraîner les modèles avec le jeu de données
            RDD2022. Le fichier <code>.pt</code> contient le modèle appris.
            Récupérez les poids dans les sorties du notebook Kaggle, puis
            placez-les dans le dossier <code>models/</code> du projet.
          </p>
          <div className="path-copy">
            <code>models/yolov8n_final.pt</code>
            <button
              className="icon-button"
              aria-label="Copier le chemin du modèle final"
              onClick={copy}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          {copyError && (
            <p role="status">
              Copie indisponible dans ce navigateur. Sélectionnez le chemin
              ci-dessus.
            </p>
          )}
          <details className="installation-details">
            <summary>Afficher les étapes d’installation</summary>
            <p className="guide-detail">
              Sortie Kaggle du modèle final :{" "}
              <code>
                runs_entrainement/entrainement_final_D20_D40/weights/best.pt
              </code>
              . Renommez ce fichier <code>yolov8n_final.pt</code> en le copiant
              dans <code>models/</code>.
            </p>
            <details>
              <summary>Noms attendus pour les autres modèles</summary>
              <ul>
                {models
                  .filter((m) => !m.recommended)
                  .map((m) => (
                    <li key={m.id}>
                      <code>models/{m.filename}</code> —{" "}
                      {modelPresentation(m.id).name}
                    </li>
                  ))}
              </ul>
            </details>
            <p
              className={`runtime-status ${health?.inference_runtime_available ? "ready" : ""}`}
            >
              {health?.inference_runtime_available ? (
                <CheckCircle2 size={15} />
              ) : (
                <Info size={15} />
              )}
              {health?.inference_runtime_available
                ? "Moteur d’inférence installé. Les fichiers ajoutés sont détectés automatiquement."
                : "Installez également les dépendances d’inférence avec le script setup.ps1 -WithInference -EnvironmentPath .venv-inference, puis lancez start.ps1 -EnvironmentPath .venv-inference."}
            </p>
          </details>
        </div>
      </section>
    </>
  );
}
