"use server";

import { auth } from "@/auth";
import { getGroup } from "@/lib/database/getGroup";
import {
  buildDocumentGroups,
  documentAccessToRoomAccesses,
  getDraftsGroupName,
  userAllowedInRoom,
} from "@/lib/utils";
import { liveblocks } from "@/liveblocks.server.config";
import { Document, DocumentAccess, DocumentGroup } from "@/types";

type Props = {
  groupId: DocumentGroup["id"];
  documentId: Document["id"];
  access: DocumentAccess;
};

/**
 * Mettre à jour l'accès du groupe
 *
 * Ajouter un groupe à un document donné avec leur groupId
 * Utilise un point de terminaison API personnalisé
 *
 * @param groupId - L'identifiant du groupe
 * @param documentId - L'identifiant du document
 * @param access - Le niveau d'accès de l'utilisateur
 */
export async function updateGroupAccess({
  groupId,
  documentId,
  access,
}: Props) {
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

  // Vérifier que l'utilisateur connecté a un accès d'édition à la salle
  if (
    !userAllowedInRoom({
      accessAllowed: "write",
      checkAccessLevel: "user",
      userId: session.user.info.id,
      groupIds: session.user.info.groupIds,
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

  // Si la salle existe, créer un élément groupsAccesses pour le nouveau collaborateur avec le niveau d'accès passé
  const groupAccess = documentAccessToRoomAccesses(access);
  const groupsAccesses: Record<
    string,
    ["room:write"] | ["room:read", "room:presence:write"] | null
  > = {
    [groupId]: groupAccess.length === 0 ? null : groupAccess,
  };

  // Si brouillon et ajout d'un groupe, supprimer le groupe de brouillons
  const draftGroupId = getDraftsGroupName(session.user.info.id);
  if (groupId !== draftGroupId && draftGroupId in room.groupsAccesses) {
    groupsAccesses[draftGroupId] = null;
  }

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

  // Si réussi, convertir la salle en une liste de groupes et envoyer
  const result: DocumentGroup[] = await buildDocumentGroups(updatedRoom);
  return { data: result };
}
