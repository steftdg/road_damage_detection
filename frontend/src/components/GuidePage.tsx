import { ArrowRight } from "lucide-react";
export default function GuidePage({ onStart }: { onStart: () => void }) {
  const steps = [
    {
      title: "Importer un fichier",
      text: "Dans Analyse, glissez une image ou une vidéo dans la zone d’import, ou utilisez Parcourir les fichiers. L’aperçu permet de vérifier le cadrage avant de continuer.",
      tip: "Privilégiez une chaussée bien visible, une image nette et une vidéo stable.",
    },
    {
      title: "Choisir les paramètres",
      text: "Gardez la version Standard pour commencer. Dans Affiner l’analyse, ajustez le seuil de confiance si vous voulez retenir davantage de zones ou être plus sélectif.",
      tip: "Un seuil plus bas peut faire apparaître davantage de fausses détections.",
    },
    {
      title: "Lancer l’analyse",
      text: "Cliquez sur Lancer l’analyse. La progression indique l’avancement. Vous pouvez interrompre le traitement ; le fichier reste accessible dans l’historique.",
      tip: "Si le bouton est indisponible, vérifiez la connexion et l’installation du modèle.",
    },
    {
      title: "Examiner et exporter",
      text: "Basculez entre Original et Détections. Sélectionnez une zone dans la liste pour la retrouver sur l’image ; pour une vidéo, la lecture se positionne au moment concerné. Téléchargez le média annoté ou exportez les résultats.",
      tip: "La confiance mesure la certitude du modèle, pas la gravité du dommage.",
    },
  ];
  return (
    <>
      <div className="page-intro history-intro">
        <div>
          <h2>Comment utiliser STRATA</h2>
          <p>De l’import du fichier à la consultation des résultats.</p>
        </div>
        <button className="button button-primary" onClick={onStart}>
          Nouvelle analyse <ArrowRight size={18} />
        </button>
      </div>
      <ol className="guide-steps">
        {steps.map((step, index) => (
          <li key={step.title}>
            <span className="guide-step-number">{index + 1}</span>
            <h3>{step.title}</h3>
            <div>
              <p>{step.text}</p>
              <p className="guide-tip">{step.tip}</p>
            </div>
          </li>
        ))}
      </ol>
      <section className="damage-guide">
        <h3>Reconnaître les dommages détectés</h3>
        <div>
          <article>
            <span className="damage-sample cracks" aria-hidden="true">
              <svg viewBox="0 0 120 72">
                <path d="M0 22 29 15 48 32 73 14 94 22 120 8M29 15 23 48 43 65M48 32 60 54 94 58 94 22M23 48 60 54M73 14 80 0M60 54 62 72M0 57 23 48M94 58 120 45" />
              </svg>
            </span>
            <div>
              <h4>Fissures alligator</h4>
              <p>
                Un réseau de fissures qui forme de petites plaques sur la
                chaussée.
              </p>
            </div>
          </article>
          <article>
            <span className="damage-sample potholes" aria-hidden="true">
              <svg viewBox="0 0 120 72">
                <path d="M20 26 32 15 67 12 98 24 103 48 77 60 44 57 19 45Z" />
                <path d="M30 32 45 25 72 23 89 33 87 45 67 50 41 45Z" />
              </svg>
            </span>
            <div>
              <h4>Nids-de-poule</h4>
              <p>Une cavité où une partie du revêtement a disparu.</p>
            </div>
          </article>
        </div>
        <p className="guide-tip">
          Sur une vidéo, un même dommage peut être détecté sur plusieurs images.
          Le total correspond aux détections, pas à un nombre de dommages
          uniques.
        </p>
      </section>
    </>
  );
}
