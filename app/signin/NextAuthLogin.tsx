"use client";

import { signIn } from "next-auth/react";
import { ComponentProps } from "react";
import { Button } from "@/primitives/Button";
import styles from "./signin.module.css";

interface Props extends ComponentProps<"div"> {
  providers?: Record<string, string>;
}

export function NextAuthLogin({ providers }: Props) {
  if (!providers) {
    return <h4 className={styles.error}>Aucun fournisseur NextAuth activé</h4>;
  }

  return (
    <div className={styles.actions}>
      {Object.entries(providers).map(([id, name]) => (
        <Button key={name} onClick={() => signIn(id)}>
          Se connecter avec {name}
        </Button>
      ))}
    </div>
  );
}
