"use server";

import { auth } from "@/auth";
import { getUser } from "@/lib/database";
import {
  buildDocumentUsers,
  isUserDocumentOwner,
  userAllowedInRoom,
} from "@/lib/utils";
import { liveblocks } from "@/liveblocks.server.config";
import { Document, DocumentUser } from "@/types";

type Props = {
  userId: DocumentUser["id"];
  documentId: Document["id"];
};

/**
 * Supprimer l'accès utilisateur
 *
 * Supprime un utilisateur d'un document donné avec son userId
 * Utilise un point de terminaison API personnalisé
 *
 * @param userId - L'identifiant de l'utilisateur supprimé
 * @param documentId - L'identifiant du document
 */
export async function removeUserAccess({ userId, documentId }: Props) {
  let session;
  let room;
  let user;
  try {
    // Obtenir la session et la salle
    const result = await Promise.all([
      auth(),
      liveblocks.getRoom(documentId),
      getUser(userId),
    ]);
    session = result[0];
    room = result[1];
    user = result[2];
  } catch (err) {
    console.error(err);
    return {
      error: {
        code: 500,
        message: "Erreur lors de la récupération du document",
        suggestion: "Actualisez la page et réessayez",
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
        suggestion: "Vérifiez que vous avez reçu la permission d'accéder au document",
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

  // Vérifier que l'utilisateur existe dans le système
  if (!user) {
    return {
      error: {
        code: 400,
        message: "Utilisateur non trouvé",
        suggestion: "Vérifiez que vous avez utilisé le bon identifiant utilisateur",
      },
    };
  }

  // Si l'utilisateur existe, vérifier qu'il n'est pas le propriétaire
  if (isUserDocumentOwner({ room, userId })) {
    return {
      error: {
        code: 400,
        message: "L'utilisateur est propriétaire",
        suggestion: `L'utilisateur ${userId} est le propriétaire du document et ne peut pas être modifié`,
      },
    };
  }

  // Si la salle existe, créer un élément userAccesses pour supprimer le collaborateur actuel
  const usersAccesses = {
    [userId]: null,
  };

  // Envoyer userAccesses à la salle et supprimer l'utilisateur
  let updatedRoom;
  try {
    updatedRoom = await liveblocks.updateRoom(documentId, {
      usersAccesses,
    });
  } catch (err) {
    return {
      error: {
        code: 401,
        message: "Impossible de supprimer l'utilisateur de la salle",
        suggestion: "Veuillez actualiser la page et réessayer",
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

  const result: DocumentUser[] = await buildDocumentUsers(
    updatedRoom,
    session.user.info.id
  );
  return { data: result };
}
