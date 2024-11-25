"use server";

import { RoomUser } from "@liveblocks/node";
import { auth } from "@/auth";
import { liveblocks } from "@/liveblocks.server.config";
import { Document } from "@/types";

type ListeUtilisateursEnLigne = { documentId: Document["id"]; users: RoomUser[] };

type Props = {
  documentIds: Document["id"][];
};

/**
 * Obtenir les utilisateurs en ligne
 *
 * Obtenir les utilisateurs en ligne dans les documents passés
 * Utilise un point de terminaison API personnalisé
 *
 * @param documentIds - Un tableau d'identifiants de documents
 */
export async function getLiveUsers({ documentIds }: Props) {
  const promises: ReturnType<typeof liveblocks.getActiveUsers>[] = [];

  for (const roomId of documentIds) {
    promises.push(liveblocks.getActiveUsers(roomId));
  }

  let session;
  let utilisateursActifsActuels = [];
  try {
    // Obtenir la session et les salles
    const [sess, ...roomUsers] = await Promise.all([auth(), ...promises]);
    session = sess;
    utilisateursActifsActuels = roomUsers;
  } catch (err) {
    console.error(err);
    return {
      error: {
        code: 500,
        message: "Erreur lors de la récupération des salles",
        suggestion: "Rafraîchissez la page et réessayez",
      },
    };
  }

  // Vérifier que l'utilisateur est connecté
  if (!session) {
    return {
      error: {
        code: 401,
        message: "Non connecté",
        suggestion: "Connectez-vous pour accéder aux utilisateurs actifs",
      },
    };
  }

  const result: ListeUtilisateursEnLigne[] = [];
  // Ajouter les informations des utilisateurs actifs à la liste prête à être retournée
  for (const [i, roomId] of documentIds.entries()) {
    const { data } = utilisateursActifsActuels[i];
    const users = data ?? [];

    result.push({
      documentId: roomId,
      users: users,
    });
  }

  return { data: result };
}
