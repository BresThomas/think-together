import clsx from "clsx";
import { ComponentProps } from "react";
import { removeUserAccess, updateUserAccess } from "@/lib/actions";
import { Avatar } from "@/primitives/Avatar";
import { Select } from "@/primitives/Select";
import { Document, DocumentAccess, DocumentUser } from "@/types";
import styles from "./ShareDialogRows.module.css";

interface Props extends ComponentProps<"div"> {
  documentId: Document["id"];
  documentOwner: Document["owner"];
  fullAccess: boolean;
  onSetUsers: () => void;
  users: DocumentUser[];
}

export function ShareDialogUsers({
  documentId,
  documentOwner,
  fullAccess,
  users,
  onSetUsers,
  className,
  ...props
}: Props) {
  // Supprimer un collaborateur de la salle
  async function handleRemoveDocumentUser(id: DocumentUser["id"]) {
    const { data, error } = await removeUserAccess({
      userId: id,
      documentId: documentId,
    });

    if (error || !data) {
      return;
    }

    onSetUsers();
  }

  // Mettre à jour un collaborateur dans la salle en utilisant l'email comme identifiant utilisateur
  async function handleUpdateDocumentUser(
    id: DocumentUser["id"],
    access: DocumentAccess
  ) {
    const { data, error } = await updateUserAccess({
      userId: id,
      documentId: documentId,
      access: access,
    });

    if (error || !data) {
      return;
    }

    onSetUsers();
  }

  return (
    <div className={clsx(className, styles.rows)} {...props}>
      {users
        .sort((a, b) => Number(b.isCurrentUser) - Number(a.isCurrentUser))
        .map(({ id, name, access, isCurrentUser, avatar, color }) => (
          <div className={styles.row} key={id}>
            <Avatar
              className={styles.rowAvatar}
              color={color}
              name={name}
              size={36}
              src={avatar}
            />
            <div className={styles.rowInfo}>
              <span className={styles.rowName}>{name}</span>
              {!isCurrentUser && fullAccess ? (
                <>
                  {id !== documentOwner ? (
                    <button
                      className={styles.rowRemoveButton}
                      onClick={() => handleRemoveDocumentUser(id)}
                    >
                      Supprimer
                    </button>
                  ) : (
                    <span className={styles.rowDescription}>Propriétaire</span>
                  )}
                </>
              ) : null}
              {isCurrentUser ? (
                <span className={styles.rowDescription}>C'est vous</span>
              ) : null}
            </div>
            {!isCurrentUser && id !== documentOwner ? (
              <div className={styles.rowAccessSelect}>
                <Select
                  aboveOverlay
                  disabled={!fullAccess}
                  initialValue={access}
                  items={[
                    {
                      title: "Peut modifier",
                      value: DocumentAccess.FULL,
                      description:
                        "L'utilisateur peut lire, modifier et partager le document",
                    },
                    {
                      title: "Peut lire",
                      value: DocumentAccess.READONLY,
                      description: "L'utilisateur peut seulement lire le document",
                    },
                  ]}
                  onChange={(value) => {
                    handleUpdateDocumentUser(id, value as DocumentAccess);
                  }}
                  value={access}
                />
              </div>
            ) : null}
          </div>
        ))}
    </div>
  );
}
