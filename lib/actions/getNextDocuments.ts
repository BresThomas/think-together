"use server";

import { auth } from "@/auth";
import { GetDocumentsResponse } from "@/lib/actions/getDocuments";
import { buildDocuments, userAllowedInRoom } from "@/lib/utils";
import { liveblocks } from "@/liveblocks.server.config";

type Props = {
  nextCursor: string;
};

/**
 * Obtenir les documents suivants
 *
 * Obtenez le prochain ensemble de documents en utilisant userId et nextPage.
 * nextPage peut être récupéré à partir de getDocumentsByGroup.ts
 * Utilise un point de terminaison API personnalisé
 *
 * @param nextPage - nextPage, récupéré à partir de getDocumentByGroup
 */
export async function getNextDocuments({ nextCursor }: Props) {
  let session;
  let getRoomsResponse;
  try {
    // Obtenez la session et les salles
    const result = await Promise.all([
      auth(),
      liveblocks.getRooms({ startingAfter: nextCursor }),
    ]);
    session = result[0];
    getRoomsResponse = result[1];
  } catch (err) {
    console.log(err);
    return {
      error: {
        code: 500,
        message: "Erreur lors de la récupération des salles",
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
        suggestion: "Connectez-vous pour obtenir des documents",
      },
    };
  }

  const { data: rooms, nextCursor: newNextCursor } = getRoomsResponse;

  if (!rooms) {
    return {
      error: {
        code: 404,
        message: "Aucune salle supplémentaire trouvée",
        suggestion: "Plus de salles à paginer",
      },
    };
  }

  // Au cas où une salle aurait changé, filtrez les salles auxquelles l'utilisateur n'a plus accès
  const finalRooms = [];
  for (const room of rooms) {
    if (
      userAllowedInRoom({
        accessAllowed: "read",
        userId: session.user.info.id,
        groupIds: session.user.info.groupIds,
        room: room,
      })
    ) {
      finalRooms.push(room);
    }
  }

  // Convertir au format de document et retourner
  const documents = buildDocuments(finalRooms);
  const result: GetDocumentsResponse = {
    documents: documents,
    nextCursor: newNextCursor,
  };

  return { data: result };
}
