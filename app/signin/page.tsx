import { redirect } from "next/navigation";
import { auth, getProviders } from "@/auth";
import { DASHBOARD_URL } from "@/constants";
import { DemoLogin } from "./DemoLogin";
import { NextAuthLogin } from "./NextAuthLogin";
import styles from "./signin.module.css";

export default async function SignInPage() {
  const session = await auth();

  // Si connecté, aller au tableau de bord
  if (session) {
    redirect(DASHBOARD_URL);
  }

  const providers = await getProviders();

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h2 className={styles.title}>Connectez-vous à votre compte</h2>
        {providers && providers.credentials ? (
          <DemoLogin />
        ) : (
          <NextAuthLogin providers={providers} />
        )}
      </main>
      {/* <aside className={styles.aside} /> */}
    </div>
  );
}
