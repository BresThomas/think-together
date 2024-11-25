"use server";

import { auth } from "@/auth";
import {
  buildDocument,
  documentAccessToRoomAccesses,
  userAllowedInRoom,
} from "@/lib/utils";
import { liveblocks } from "@/liveblocks.server.config";
import { Document, DocumentAccess } from "@/types";

type Props = {
  documentId: Document["id"];
  access: DocumentAccess;
};

/**
 * Mettre à jour l'accès par défaut
 *
 * Étant donné un document, mettez à jour son accès par défaut
 * Utilise un point de terminaison API personnalisé
 *
 * @param documentId - Le document à mettre à jour
 * @param access - Le nouveau niveau de permission DocumentAccess
 */
export async function updateDefaultAccess({ documentId, access }: Props) {
  let session;
  let room;
  try {
    // Obtenez la session et la salle
    const result = await Promise.all([auth(), liveblocks.getRoom(documentId)]);
    session = result[0];
    room = result[1];
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

  // Vérifiez que l'utilisateur est connecté
  if (!session) {
    return {
      error: {
        code: 401,
        message: "Non connecté",
        suggestion: "Connectez-vous pour mettre à jour le niveau d'accès public",
      },
    };
  }

  if (!room) {
    return {
      error: {
        code: 404,
        message: "Document non trouvé",
        suggestion: "Vérifiez que vous êtes sur la bonne page",
      },
    };
  }

  // Vérifiez que l'utilisateur connecté a un accès en écriture à la salle
  if (
    !userAllowedInRoom({
      accessAllowed: "write",
      userId: session.user.info.id,
      groupIds: session.user.info.groupIds,
      room,
    })
  ) {
    return {
      error: {
        code: 403,
        message: "Accès non autorisé",
        suggestion: "Vérifiez que vous avez reçu la permission pour la salle",
      },
    };
  }

  // Si la salle existe, créez un paramètre d'accès par défaut pour la salle
  const defaultAccesses = documentAccessToRoomAccesses(access);

  // Mettez à jour la salle avec les nouveaux collaborateurs
  let updatedRoom;
  try {
    updatedRoom = await liveblocks.updateRoom(documentId, {
      defaultAccesses,
    });
  } catch (err) {
    return {
      error: {
        code: 401,
        message: "Impossible de modifier le niveau d'accès par défaut dans la salle",
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

  // Si réussi, convertissez au format de document personnalisé et retournez
  const document: Document = buildDocument(updatedRoom);
  return { data: document };
}
