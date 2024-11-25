import { ComponentProps, useState } from "react";
import { PlusIcon } from "@/icons";
import { createDocument } from "@/lib/actions";
import { Button } from "@/primitives/Button";
import { Popover } from "@/primitives/Popover";
import { Document, DocumentGroup, DocumentType, DocumentUser } from "@/types";
import styles from "./DocumentCreatePopover.module.css";

interface Props extends Omit<ComponentProps<typeof Popover>, "content"> {
  documentName?: Document["name"];
  draft: Document["draft"];
  groupIds?: DocumentGroup["id"][];
  userId: DocumentUser["id"];
}

export function DocumentCreatePopover({
  groupIds,
  userId,
  draft,
  children,
  ...props
}: Props) {
  const [disableButtons, setDisableButtons] = useState(false);

  // Créer un nouveau document, puis naviguer vers l'emplacement URL du document
  async function createNewDocument(name: string, type: DocumentType) {
    setDisableButtons(true);
    const result = await createDocument(
      {
        name,
        type,
        userId,
        draft,
        groupIds: draft ? undefined : groupIds,
      },
      true
    );

    // Si cela s'exécute, il y a une erreur et la redirection a échoué
    if (!result || result?.error || !result.data) {
      setDisableButtons(false);
      return;
    }
  }

  return (
    <Popover
      content={
        <div className={styles.popover}>
          <Button
            icon={<PlusIcon />}
            onClick={() => {
              createNewDocument("Sans titre", "text");
            }}
            variant="subtle"
            disabled={disableButtons}
          >
            Texte
          </Button>
          <Button
            icon={<PlusIcon />}
            onClick={() => {
              createNewDocument("Sans titre", "whiteboard");
            }}
            variant="subtle"
            disabled={disableButtons}
          >
            Tableau blanc
          </Button>
          <Button
            disabled
            icon={<PlusIcon />}
            onClick={() => {
              createNewDocument("Sans titre", "spreadsheet");
            }}
            variant="subtle"
          >
            Tableur
          </Button>
        </div>
      }
      modal
      side="bottom"
      {...props}
    >
      {children}
    </Popover>
  );
}
