import clsx from "clsx";
import { useSession } from "next-auth/react";
import { ComponentProps, FormEvent, useState } from "react";
import { PlusIcon } from "@/icons";
import { updateGroupAccess } from "@/lib/actions";
import { Button } from "@/primitives/Button";
import { Select } from "@/primitives/Select";
import { Spinner } from "@/primitives/Spinner";
import { Document, DocumentAccess, DocumentGroup, Group } from "@/types";
import { capitalize } from "@/utils";
import styles from "./ShareDialogInvite.module.css";

interface Props extends ComponentProps<"div"> {
  documentId: Document["id"];
  fullAccess: boolean;
  currentGroups: Group[];
  onSetGroups: () => void;
}

export function ShareDialogInviteGroup({
  documentId,
  fullAccess,
  onSetGroups,
  className,
  currentGroups,
  ...props
}: Props) {
  const { data: session } = useSession();

  const [isInviteLoading, setInviteLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  // Ajouter un groupe au document
  async function handleAddDocumentGroup(id: DocumentGroup["id"]) {
    setErrorMessage(undefined);
    setInviteLoading(true);

    const { error } = await updateGroupAccess({
      groupId: id,
      documentId: documentId,
      access: DocumentAccess.READONLY,
    });

    setInviteLoading(false);

    if (error) {
      setErrorMessage(error?.suggestion);
      return;
    }

    onSetGroups();
  }

  const invitableGroupIds = (session?.user.info.groupIds ?? []).filter(
    (groupId) => currentGroups.every((group) => group.id !== groupId)
  );

  return (
    <div className={clsx(className, styles.section)} {...props}>
      {fullAccess ? (
        <>
          {!session || invitableGroupIds.length ? (
            <form
              className={styles.inviteForm}
              onSubmit={(e: FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                const id = new FormData(e.currentTarget).get(
                  "groupId"
                ) as string;
                handleAddDocumentGroup(id);
              }}
            >
              <Select
                key={currentGroups[0]?.id || undefined}
                aboveOverlay
                name="groupId"
                className={styles.inviteSelect}
                items={invitableGroupIds.map((groupId) => ({
                  value: groupId,
                  title: capitalize(groupId),
                }))}
                placeholder="Choisissez un groupe…"
                required
                disabled={isInviteLoading}
              />
              <Button
                className={styles.inviteButton}
                icon={isInviteLoading ? <Spinner /> : <PlusIcon />}
                disabled={isInviteLoading}
              >
                Inviter
              </Button>
            </form>
          ) : (
            <div className={clsx(styles.error, styles.inviteFormMessage)}>
              Tous vos groupes ont déjà été ajoutés.
            </div>
          )}
          {errorMessage && (
            <div className={clsx(styles.error, styles.inviteFormMessage)}>
              {errorMessage}
            </div>
          )}
        </>
      ) : (
        <div className={styles.error}>
          Vous avez besoin d'un accès complet pour inviter des groupes.
        </div>
      )}
    </div>
  );
}
