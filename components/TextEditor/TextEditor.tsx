"use client";

import { ClientSideSuspense } from "@liveblocks/react";
import { useRoom, useSelf } from "@liveblocks/react/suspense";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";
import { CharacterCount } from "@tiptap/extension-character-count";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import Highlight from "@tiptap/extension-highlight";
import { Image } from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import Youtube from "@tiptap/extension-youtube";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { EditorView } from "prosemirror-view";
import { useEffect, useState } from "react";
import * as Y from "yjs";
import { DocumentSpinner } from "@/primitives/Spinner";
import { LiveblocksCommentsHighlight } from "./comment-highlight";
import { CustomTaskItem } from "./CustomTaskItem";
import { SelectionMenu } from "./SelectionMenu";
import { ThreadList } from "./ThreadList";
import { Toolbar } from "./Toolbar";
import { WordCount } from "./WordCount";
import styles from "./TextEditor.module.css";

export function TextEditor() {
  return (
    <ClientSideSuspense fallback={<DocumentSpinner />}>
      <Editor />
    </ClientSideSuspense>
  );
}

// Éditeur de texte collaboratif avec texte enrichi simple et curseurs en direct
export function Editor() {
  const room = useRoom();
  const [doc, setDoc] = useState<Y.Doc>();
  const [provider, setProvider] = useState<any>();

  // Configurer le fournisseur Yjs de Liveblocks
  useEffect(() => {
    const yDoc = new Y.Doc();
    const yProvider = new LiveblocksYjsProvider(room, yDoc);
    setDoc(yDoc);
    setProvider(yProvider);

    return () => {
      yDoc?.destroy();
      yProvider?.destroy();
    };
  }, [room]);

  if (!doc || !provider) {
    return null;
  }

  return <TiptapEditor doc={doc} provider={provider} />;
}

type EditorProps = {
  doc: Y.Doc;
  provider: any;
};

function TiptapEditor({ doc, provider }: EditorProps) {
  // Obtenir les informations de l'utilisateur à partir du point de terminaison d'authentification de Liveblocks
  const { name, color, avatar: picture } = useSelf((me) => me.info);

  // Vérifier si l'utilisateur a des droits d'écriture dans la salle actuelle
  const canWrite = useSelf((me) => me.canWrite);

  // Configurer l'éditeur avec des plugins et placer les informations de l'utilisateur dans la sensibilisation Yjs et les curseurs
  const editor = useEditor({
    editable: canWrite,
    editorProps: {
      attributes: {
        // Ajouter des styles à l'élément de l'éditeur
        class: styles.editor,
      },
    },
    extensions: [
      // Extension de commentaires personnalisée de Liveblocks
      LiveblocksCommentsHighlight.configure({
        HTMLAttributes: {
          class: "comment-highlight",
        },
      }),
      StarterKit.configure({
        blockquote: {
          HTMLAttributes: {
            class: "tiptap-blockquote",
          },
        },
        code: {
          HTMLAttributes: {
            class: "tiptap-code",
          },
        },
        codeBlock: {
          languageClassPrefix: "language-",
          HTMLAttributes: {
            class: "tiptap-code-block",
            spellcheck: false,
          },
        },
        heading: {
          levels: [1, 2, 3],
          HTMLAttributes: {
            class: "tiptap-heading",
          },
        },
        // L'extension Collaboration gère son propre historique
        history: false,
        horizontalRule: {
          HTMLAttributes: {
            class: "tiptap-hr",
          },
        },
        listItem: {
          HTMLAttributes: {
            class: "tiptap-list-item",
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: "tiptap-ordered-list",
          },
        },
        paragraph: {
          HTMLAttributes: {
            class: "tiptap-paragraph",
          },
        },
      }),
      CharacterCount,
      Highlight.configure({
        HTMLAttributes: {
          class: "tiptap-highlight",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "tiptap-image",
        },
      }),
      Link.configure({
        HTMLAttributes: {
          class: "tiptap-link",
        },
      }),
      Placeholder.configure({
        placeholder: "Commencez à écrire…",
        emptyEditorClass: "tiptap-empty",
      }),
      CustomTaskItem,
      TaskList.configure({
        HTMLAttributes: {
          class: "tiptap-task-list",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Typography,
      Youtube.configure({
        modestBranding: true,
        HTMLAttributes: {
          class: "tiptap-youtube",
        },
      }),
      // Enregistrer le document avec Tiptap
      Collaboration.configure({
        document: doc,
      }),
      // Attacher le fournisseur et les informations de l'utilisateur
      CollaborationCursor.configure({
        provider: provider,
        user: {
          name,
          color,
          picture,
        },
      }),
    ],
  });

  return (
    <div className={styles.container}>
      {canWrite ? (
        <div className={styles.editorHeader}>
          {editor ? <Toolbar editor={editor} /> : null}
        </div>
      ) : null}
      <div className={styles.editorPanel}>
        {editor ? <SelectionMenu editor={editor} /> : null}
        <div className={styles.editorContainerOffset}>
          <div className={styles.editorContainer}>
            <EditorContent editor={editor} />
            <div className={styles.threadListContainer} data-threads="desktop">
              {editor ? <ThreadList editor={editor} /> : null}
            </div>
          </div>
          <div
            className={styles.mobileThreadListContainer}
            data-threads="mobile"
          >
            {editor ? <ThreadList editor={editor} /> : null}
          </div>
        </div>
      </div>
      {editor ? <WordCount editor={editor} /> : null}
    </div>
  );
}

// Empêche une erreur matchesNode lors du rechargement à chaud
EditorView.prototype.updateState = function updateState(state) {
  // @ts-ignore
  if (!this.docView) return;
  // @ts-ignore
  this.updateStateInner(state, this.state.plugins != state.plugins);
};
