"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { leaveBokaal } from "../actions";
import styles from "@/components/bokaal/bokaal.module.css";

/** Stoppen wist je saldo, briefjes en antwoorden van dit seizoen; met een bevestigstap. */
export function LeaveBokaal() {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  return (
    <div className={styles.stop}>
      {!asking ? (
        <button type="button" className={styles.btn} onClick={() => setAsking(true)}>Stoppen</button>
      ) : (
        <>
          <p className={styles.wallText}>Je saldo, briefjes en antwoorden van dit seizoen worden gewist.</p>
          <div className={styles.actions}>
            <button
              type="button"
              className={cn(styles.btn, styles.danger)}
              disabled={busy}
              onClick={() =>
                startTransition(async () => {
                  const reply = await leaveBokaal();
                  if (!reply.ok) return setError(reply.error);
                  router.push("/voorzpwelbokaal");
                })
              }
            >
              Stoppen en wissen
            </button>
            <button type="button" className={styles.btn} onClick={() => setAsking(false)} disabled={busy}>Toch niet</button>
          </div>
        </>
      )}
      {error && <p className={styles.slipError} role="alert">{error}</p>}
    </div>
  );
}
