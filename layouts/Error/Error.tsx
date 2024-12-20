import clsx from "clsx";
import { signIn, useSession } from "next-auth/react";
import { ComponentProps } from "react";
import { Button, LinkButton } from "@/primitives/Button";
import { ErrorData } from "@/types";
import styles from "./Error.module.css";

interface Props extends ComponentProps<"main"> {
  error: ErrorData;
}

export function ErrorLayout({ error, className, ...props }: Props) {
  const { data: session } = useSession();

  return (
    <main className={clsx(className, styles.main)} {...props}>
      <p className={styles.error}>
        {error?.code ?? ""} {error.message}
      </p>
      {error.suggestion ? (
        <p className={styles.suggestion}>{error.suggestion}</p>
      ) : null}
      <div className={styles.actions}>
        {session ? (
          <LinkButton href="/">Aller au tableau de bord</LinkButton>
        ) : (
          <Button onClick={() => signIn()}>Se connecter</Button>
        )}
      </div>
    </main>
  );
}
