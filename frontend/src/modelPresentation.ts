const versions: Record<string, { name: string; description: string }> = {
  final: {
    name: "Standard",
    description: "La version retenue pour les analyses courantes.",
  },
  baseline: {
    name: "Version initiale",
    description: "Le premier entraînement, pour comparer les résultats.",
  },
  small: {
    name: "Réseau étendu",
    description:
      "Une architecture plus grande, entraînée sur les mêmes dommages.",
  },
  "high-resolution": {
    name: "Haute résolution",
    description: "Un entraînement avec des images de plus grande résolution.",
  },
};
export const modelPresentation = (id: string) =>
  versions[id] ?? { name: id, description: "Version du modèle de détection." };
