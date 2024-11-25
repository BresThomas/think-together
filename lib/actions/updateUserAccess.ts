"use server";

import { auth } from "@/auth";
import { getUser } from "@/lib/database/getUser";
import {
  buildDocument,
  buildDocumentUsers,
  documentAccessToRoomAccesses,
  isUserDocumentOwner,
  userAllowedInRoom,
} from "@/lib/utils";
import { liveblocks } from "@/liveblocks.server.config";
import { Document, DocumentAccess, DocumentUser } from "@/types";

type Props = {
  userId: DocumentUser["id"];
  documentId: Document["id"];
  access: DocumentAccess;
};

/**
 * Mettre à jour l'accès utilisateur
 *
 * Ajouter un collaborateur à un document donné avec son userId
 * Utilise un point de terminaison API personnalisé
 *
 * @param userId - L'identifiant de l'utilisateur invité
 * @param documentId - L'identifiant du document
 * @param access - Le niveau d'accès de l'utilisateur
 */
export async function updateUserAccess({ userId, documentId, access }: Props) {
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

  const document = await buildDocument(room);

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
        message: "L'utilisateur est le propriétaire",
        suggestion: `L'utilisateur ${userId} est le propriétaire du document et ne peut pas être modifié`,
      },
    };
  }

  // Si la salle existe, créer un élément userAccesses pour le nouveau collaborateur avec le niveau d'accès passé
  const userAccess = documentAccessToRoomAccesses(access);
  const usersAccesses: Record<
    string,
    ["room:write"] | ["room:read", "room:presence:write"] | null
  > = {
    [userId]: userAccess.length === 0 ? null : userAccess,
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

  // Si l'utilisateur n'avait pas accès au document auparavant, envoyer une notification indiquant qu'il a été ajouté
  const previousAccessLevel = document.accesses.users[userId];
  if (!previousAccessLevel || previousAccessLevel === DocumentAccess.NONE) {
    liveblocks.triggerInboxNotification({
      userId,
      kind: "$addedToDocument",
      subjectId: document.id,
      roomId: room.id,
      activityData: {
        documentId: document.id,
      },
    });
  }

  const result: DocumentUser[] = await buildDocumentUsers(
    updatedRoom,
    session.user.info.id
  );
  return { data: result };
}
