import * as Tabs from "@radix-ui/react-tabs";
import { useSession } from "next-auth/react";
import { ComponentProps, useCallback, useEffect, useState } from "react";
import { UserIcon, UsersIcon } from "@/icons";
import {
  getDocument,
  getDocumentGroups,
  getDocumentUsers,
} from "@/lib/actions";
import { useDocumentsFunctionSWR, useInitialDocument } from "@/lib/hooks";
import { getDocumentAccess } from "@/lib/utils";
import {
  useBroadcastEvent,
  useEventListener,
} from "@liveblocks/react/suspense";
import { Dialog } from "@/primitives/Dialog";
import { DocumentAccess } from "@/types";
import { ShareDialogDefault } from "./ShareDialogDefault";
import { ShareDialogGroups } from "./ShareDialogGroups";
import { ShareDialogInviteGroup } from "./ShareDialogInviteGroup";
import { ShareDialogInviteUser } from "./ShareDialogInviteUser";
import { ShareDialogUsers } from "./ShareDialogUsers";
import styles from "./ShareDialog.module.css";

type Props = Omit<ComponentProps<typeof Dialog>, "content" | "title">;

export function ShareDialog({ children, ...props }: Props) {
  const { id: documentId, accesses: documentAccesses } = useInitialDocument();

  const { data: session } = useSession();
  const [currentUserAccess, setCurrentUserAccess] = useState(
    DocumentAccess.NONE
  );

  // Obtenir une liste d'utilisateurs attachés au document (+ leurs informations)
  const {
    data: users,
    mutate: revalidateUsers,
    // error: usersError,
  } = useDocumentsFunctionSWR([getDocumentUsers, { documentId }], {
    refreshInterval: 0,
  });

  // Obtenir une liste de groupes attachés au document (+ leurs informations)
  const {
    data: groups,
    mutate: revalidateGroups,
    // error: groupsError,
  } = useDocumentsFunctionSWR([getDocumentGroups, { documentId }], {
    refreshInterval: 0,
  });

  // Obtenir le document actuel
  const {
    data: document,
    error: defaultAccessError,
    mutate: revalidateDefaultAccess,
  } = useDocumentsFunctionSWR([getDocument, { documentId }], {
    refreshInterval: 0,
  });

  // Obtenir la valeur d'accès par défaut du document, ou la valeur par défaut de la propriété
  const defaultAccess = document
    ? document.accesses.default
    : documentAccesses.default;

  // Si vous n'avez pas accès à cette salle, actualisez
  if (defaultAccessError && defaultAccessError.code === 403) {
    window.location.reload();
  }

  // Actualiser le niveau d'accès de l'utilisateur actuel
  const revalidateCurrentUserAccess = useCallback(() => {
    if (!document) {
      return;
    }

    const accessLevel = getDocumentAccess({
      documentAccesses: document.accesses,
      userId: session?.user?.info.id ?? "",
      groupIds: session?.user?.info.groupIds ?? [],
    });

    // Recharger si l'utilisateur actuel n'a pas accès (affichera la page d'erreur)
    if (accessLevel === DocumentAccess.NONE) {
      window.location.reload();
      return;
    }

    // Recharger l'application si l'utilisateur actuel passe de LECTURE SEULE à ÉDITION/COMPLET (se reconnectera à l'application avec le nouveau niveau d'accès)
    const accessChanges = new Set([currentUserAccess, accessLevel]);
    if (
      accessChanges.has(DocumentAccess.READONLY) &&
      (accessChanges.has(DocumentAccess.EDIT) ||
        accessChanges.has(DocumentAccess.FULL))
    ) {
      window.location.reload();
      return;
    }

    setCurrentUserAccess(accessLevel);
  }, [document, session, currentUserAccess]);

  useEffect(() => {
    revalidateCurrentUserAccess();
  }, [document, revalidateCurrentUserAccess, session]);

  // Réactualiser toutes les données d'accès
  function revalidateAll() {
    revalidateUsers();
    revalidateGroups();
    revalidateDefaultAccess();
    revalidateCurrentUserAccess();
  }

  // Les diffusions sont utilisées pour envoyer les mises à jour de la boîte de dialogue de partage ci-dessous
  const broadcast = useBroadcastEvent();

  // Si une mise à jour de la boîte de dialogue de partage a été reçue, actualiser les données
  useEventListener(({ event }) => {
    if (event.type === "SHARE_DIALOG_UPDATE") {
      revalidateAll();
    }
  });

  return (
    <Dialog
      content={
        <div className={styles.dialog}>
          <Tabs.Root className={styles.dialogTabs} defaultValue="users">
            <Tabs.List className={styles.dialogTabList}>
              <Tabs.Trigger className={styles.dialogTab} value="users">
                <span className={styles.dialogTabLabel}>
                  <UserIcon className={styles.dialogTabIcon} />
                  <span>Utilisateurs</span>
                </span>
              </Tabs.Trigger>
              <Tabs.Trigger className={styles.dialogTab} value="groups">
                <span className={styles.dialogTabLabel}>
                  <UsersIcon className={styles.dialogTabIcon} />
                  <span>Groupes</span>
                </span>
              </Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="users" className={styles.dialogTabContent}>
              <ShareDialogInviteUser
                className={styles.dialogSection}
                documentId={documentId}
                fullAccess={currentUserAccess === DocumentAccess.FULL}
                onSetUsers={() => {
                  revalidateAll();
                  broadcast({ type: "SHARE_DIALOG_UPDATE" });
                }}
              />
              {users?.length ? (
                <ShareDialogUsers
                  className={styles.dialogSection}
                  documentId={documentId}
                  documentOwner={document?.owner || ""}
                  fullAccess={currentUserAccess === DocumentAccess.FULL}
                  onSetUsers={() => {
                    revalidateAll();
                    broadcast({ type: "SHARE_DIALOG_UPDATE" });
                  }}
                  users={users}
                />
              ) : null}
            </Tabs.Content>
            <Tabs.Content value="groups" className={styles.dialogTabContent}>
              <ShareDialogInviteGroup
                className={styles.dialogSection}
                documentId={documentId}
                fullAccess={currentUserAccess === DocumentAccess.FULL}
                currentGroups={groups || []}
                onSetGroups={() => {
                  revalidateAll();
                  broadcast({ type: "SHARE_DIALOG_UPDATE" });
                }}
              />
              {groups?.length ? (
                <ShareDialogGroups
                  className={styles.dialogSection}
                  documentId={documentId}
                  fullAccess={currentUserAccess === DocumentAccess.FULL}
                  groups={groups}
                  onSetGroups={() => {
                    revalidateAll();
                    broadcast({ type: "SHARE_DIALOG_UPDATE" });
                  }}
                />
              ) : null}
            </Tabs.Content>
          </Tabs.Root>
          <ShareDialogDefault
            className={styles.dialogSection}
            defaultAccess={defaultAccess}
            documentId={documentId}
            fullAccess={currentUserAccess === DocumentAccess.FULL}
            onSetDefaultAccess={() => {
              revalidateAll();
              broadcast({ type: "SHARE_DIALOG_UPDATE" });
            }}
          />
        </div>
      }
      title="Partager le document"
      {...props}
    >
      {children}
    </Dialog>
  );
}
