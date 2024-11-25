import clsx from "clsx";
import { redirect } from "next/navigation";
import { ComponentProps, ReactNode } from "react";
import { auth, signIn } from "@/auth";
import { DASHBOARD_URL } from "@/constants";
import { SignInIcon } from "@/icons";
import { MarketingLayout } from "@/layouts/Marketing";
import { Button, LinkButton } from "@/primitives/Button";
import { Container } from "@/primitives/Container";
import styles from "./page.module.css";

interface FeatureProps extends Omit<ComponentProps<"div">, "title"> {
  description: ReactNode;
  title: ReactNode;
}

function Feature({ title, description, className, ...props }: FeatureProps) {
  return (
    <div className={clsx(className, styles.featuresFeature)} {...props}>
      <h4 className={styles.featuresFeatureTitle}>{title}</h4>
      <p className={styles.featuresFeatureDescription}>{description}</p>
    </div>
  );
}

export default async function Index() {
  const session = await auth();

  // If logged in, go to dashboard
  if (session) {
    redirect(DASHBOARD_URL);
  }

  return (
    <MarketingLayout>
      <Container className={styles.section}>
        <div className={styles.heroInfo}>
          <h1 className={styles.heroTitle}>
          Collaborez et innovez ensemble.
          </h1>
          <p className={styles.heroLead}>
          ThinkTogether est une plateforme de collaboration intuitive qui facilite le brainstorming en équipe. Travaillez sur vos idées en temps réel, où que vous soyez.
          </p>
          <div className={styles.heroImage}>
            <img
              src="../image.png"
              alt="Illustration de ThinkTogether"
              className={styles.heroImageElement}
            />
          </div>
        </div>
        <div className={styles.heroActions}>
          <form
            action={async () => {
              "use server";
              await signIn();
            }}
          >
            <Button icon={<SignInIcon />}>Se connecter</Button>
          </form>
          <LinkButton
            href="https://liveblocks.io/docs/guides/nextjs-starter-kit"
            target="_blank"
            variant="secondary"
          >
            En savoir plus
          </LinkButton>
        </div>
      </Container>
    </MarketingLayout>
  );
}
