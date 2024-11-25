"use server";

import { auth } from "@/auth";
import {
  buildDocuments,
  getDraftsGroupName,
  userAllowedInRoom,
} from "@/lib/utils";
import { liveblocks } from "@/liveblocks.server.config";
import { Document, DocumentGroup, DocumentType, DocumentUser } from "@/types";

export type GetDocumentsProps = {
  groupIds?: DocumentGroup["id"][];
  userId?: DocumentUser["id"];
  documentType?: DocumentType;
  drafts?: boolean;
  limit?: number;
};

export type GetDocumentsResponse = {
  documents: Document[];
  nextCursor: string | null;
};

/**
 * Obtenir des documents
 *
 * Obtenez une liste de documents par groupId, userId et métadonnées
 * Utilise un point de terminaison API personnalisé
 *
 * @param groupIds - Les groupes à filtrer
 * @param userId - L'utilisateur à filtrer
 * @param documentType - Le type de document à filtrer
 * @param drafts - Obtenir uniquement les brouillons
 * @param limit - Le nombre de documents à récupérer
 */
export async function getDocuments({
  groupIds = [],
  userId = undefined,
  documentType,
  drafts = false,
  limit = 20,
}: GetDocumentsProps) {
  // Construire les arguments getRooms
  let query: string | undefined = undefined;

  if (documentType) {
    query = `metadata["type"]:${JSON.stringify(documentType)}`;
  }

  let getRoomsOptions: Parameters<typeof liveblocks.getRooms>[0] = {
    limit,
    query,
  };

  const draftGroupName = getDraftsGroupName(userId || "");

  if (drafts) {
    // Les brouillons sont stockés en tant que groupe utilisant l'userId
    getRoomsOptions = {
      ...getRoomsOptions,
      groupIds: [draftGroupName],
    };
  } else {
    // Pas un brouillon, utiliser d'autres informations
    getRoomsOptions = {
      ...getRoomsOptions,
      groupIds: groupIds.filter((id) => id !== draftGroupName),
      userId: userId,
    };
  }

  let session;
  let getRoomsResponse;
  try {
    // Obtenir la session et les rooms
    const result = await Promise.all([
      auth(),
      liveblocks.getRooms(getRoomsOptions),
    ]);
    session = result[0];
    getRoomsResponse = result[1];
  } catch (err) {
    console.log(err);
    return {
      error: {
        code: 500,
        message: "Erreur lors de la récupération des rooms",
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
        suggestion: "Connectez-vous pour obtenir des documents",
      },
    };
  }

  const { data: rooms, nextCursor } = getRoomsResponse;

  if (!rooms) {
    return {
      error: {
        code: 400,
        message: "Aucune room trouvée",
        suggestion: "Rafraîchissez la page et réessayez",
      },
    };
  }

  // En cas de changement de room, filtrer les rooms auxquelles l'utilisateur n'a plus accès
  const finalRooms = [];
  for (const room of rooms) {
    if (
      userAllowedInRoom({
        accessAllowed: "read",
        userId: session.user.info.id,
        groupIds: session.user.info.groupIds,
        room,
      })
    ) {
      finalRooms.push(room);
    }
  }

  // Convertir les rooms au format de document personnalisé
  const documents = buildDocuments(finalRooms);
  const result: GetDocumentsResponse = {
    documents,
    nextCursor,
  };

  return { data: result };
}
