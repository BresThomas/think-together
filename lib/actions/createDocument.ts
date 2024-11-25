"use server";

import { RoomAccesses } from "@liveblocks/node";
import { nanoid } from "nanoid";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DOCUMENT_URL } from "@/constants";
import { buildDocument, getDraftsGroupName } from "@/lib/utils";
import { liveblocks } from "@/liveblocks.server.config";
import {
  Document,
  DocumentGroup,
  DocumentRoomMetadata,
  DocumentType,
  DocumentUser,
} from "@/types";

type Props = {
  name: Document["name"];
  type: DocumentType;
  userId: DocumentUser["id"];
  groupIds?: DocumentGroup["id"][];
  draft?: boolean;
};

/**
 * Créer un document
 *
 * Crée un nouveau document, avec un nom et un type spécifiés, à partir de userId et groupId
 * Utilise un point de terminaison API personnalisé
 *
 * @param options - Options de création de document
 * @param options.name - Le nom du nouveau document
 * @param options.type - Le type du nouveau document, par exemple "canvas"
 * @param options.groupIds - Les groupes initiaux du nouveau document
 * @param options.userId - L'utilisateur créant le document
 * @param options.draft - Si le document est un brouillon (pas d'accès public ou de groupe, mais peut inviter)
 * @param redirectToDocument - Rediriger vers le document nouvellement créé en cas de succès
 */
export async function createDocument(
  { name, type, groupIds, userId, draft = false }: Props,
  redirectToDocument?: boolean
) {
  const session = await auth();

  if (!session) {
    return {
      error: {
        code: 401,
        message: "Non connecté",
        suggestion: "Connectez-vous pour créer un nouveau document",
      },
    };
  }

  // Métadonnées personnalisées pour notre document
  const metadata: DocumentRoomMetadata = {
    name: name,
    type: type,
    owner: userId,
    draft: draft ? "oui" : "non",
  };

  // Donner au créateur du document un accès complet
  const usersAccesses: RoomAccesses = {
    [userId]: ["room:write"],
  };

  const groupsAccesses: RoomAccesses = {};

  if (draft) {
    // Si brouillon, ajouter uniquement l'accès au groupe de brouillons
    groupsAccesses[getDraftsGroupName(userId)] = ["room:write"];
  } else if (groupIds) {
    // Si groupIds envoyé, limiter l'accès à ces groupes
    groupIds.forEach((groupId: string) => {
      groupsAccesses[groupId] = ["room:write"];
    });
  }

  const roomId = nanoid();

  let room;
  try {
    room = await liveblocks.createRoom(roomId, {
      metadata,
      usersAccesses,
      groupsAccesses,
      defaultAccesses: [],
    });
  } catch (err) {
    return {
      error: {
        code: 401,
        message: "Impossible de créer la salle",
        suggestion: "Veuillez rafraîchir la page et réessayer",
      },
    };
  }

  const document: Document = buildDocument(room);

  if (redirectToDocument) {
    // Doit retourner `undefined`
    return redirect(DOCUMENT_URL(document.type, document.id));
  }

  return { data: document };
}
