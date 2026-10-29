import Link from "next/link";
import { PenLine } from "lucide-react";
import styles from "./verhaal.module.css";

/** De balk boven het clubverhaal: terug naar het begin, en een verhaal insturen. */
export function StoryBar() {
  return (
    <header className={styles.bar}>
      <Link href="/verhaal" className={styles.brand} aria-label="Het verhaal van ZWB">
        ZWB<span>verhaal</span>
      </Link>
      <Link href="/clubverhaal/insturen" className={styles.cta}>
        <PenLine className="size-4" aria-hidden />
        Vertel jouw verhaal
      </Link>
    </header>
  );
}
