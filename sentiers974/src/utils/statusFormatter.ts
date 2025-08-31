/**
 * Retourne le texte d'affichage selon le statut de la session
 */
export const getStatusText = (status: string): string => {
  switch (status) {
    case "idle":
      return "Prêt à démarrer";
    case "running":
      return "En cours...";
    case "paused":
      return "En pause";
    case "stopped":
      return "Session terminée";
    default:
      return "";
  }
};