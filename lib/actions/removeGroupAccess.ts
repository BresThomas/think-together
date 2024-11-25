"use server";

import { auth } from "@/auth";
import { getGroup } from "@/lib/database/getGroup";
import { buildDocumentGroups, userAllowedInRoom } from "@/lib/utils";
import { liveblocks } from "@/liveblocks.server.config";
import { Document, DocumentGroup } from "@/types";

type Props = {
  groupId: DocumentGroup["id"];
  documentId: Document["id"];
};

/**
 * Supprimer l'accès du groupe
 *
 * Supprime un groupe d'un document donné avec son groupId
 * Utilise un point de terminaison API personnalisé
 *
 * @param groupId - L'identifiant du groupe supprimé
 * @param documentId - L'identifiant du document
 */
export async function removeGroupAccess({ groupId, documentId }: Props) {
  let session;
  let room;
  let group;
  try {
    // Obtenir la session et la salle
    const result = await Promise.all([
      auth(),
      liveblocks.getRoom(documentId),
      getGroup(groupId),
    ]);
    session = result[0];
    room = result[1];
    group = result[2];
  } catch (err) {
    console.error(err);
    return {
      error: {
        code: 500,
        message: "Erreur lors de la récupération du document",
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
        suggestion: "Connectez-vous pour supprimer un utilisateur",
      },
    };
  }

  // Vérifier que l'utilisateur connecté actuel est défini comme utilisateur avec id, en ignorant les groupIds et l'accès par défaut
  if (
    !userAllowedInRoom({
      accessAllowed: "write",
      checkAccessLevel: "user",
      userId: session.user.info.id,
      groupIds: [],
      room,
    })
  ) {
    return {
      error: {
        code: 403,
        message: "Accès non autorisé",
        suggestion: "Vérifiez que vous avez reçu la permission pour le document",
      },
    };
  }

  // Vérifier que la salle `documentId` existe
  if (!room) {
    return {
      error: {
        code: 404,
        message: "Document non trouvé",
        suggestion: "Vérifiez que vous êtes sur la bonne page",
      },
    };
  }

  // Vérifier que le groupe existe dans le système
  if (!group) {
    return {
      error: {
        code: 400,
        message: "Le groupe n'existe pas",
        suggestion: `Vérifiez que le groupe ${groupId} existe dans le système`,
      },
    };
  }

  // Si la salle existe, créer un élément groupsAccess pour supprimer le groupe actuel
  const groupsAccesses = {
    [groupId]: null,
  };

  // Mettre à jour la salle avec les nouveaux collaborateurs
  let updatedRoom;
  try {
    updatedRoom = await liveblocks.updateRoom(documentId, {
      groupsAccesses,
    });
  } catch (err) {
    return {
      error: {
        code: 401,
        message: "Impossible de modifier le groupe dans la salle",
        suggestion: "Veuillez rafraîchir la page et réessayer",
      },
    };
  }

  if (!updatedRoom) {
    return {
      error: {
        code: 404,
        message: "Salle mise à jour non trouvée",
        suggestion: "Contactez un administrateur",
      },
    };
  }

  // Si réussi, convertir la salle en une liste de groupes et envoyer
  const result: DocumentGroup[] = await buildDocumentGroups(updatedRoom);
  return { data: result };
}
