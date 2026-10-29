"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { DEFAULT_DESIGN, type BekerDesign } from "@/lib/zwbekers/design";
import { briljantSans, briljantSerif } from "@/components/briljant/fonts";
import { BekerIcon } from "./beker-icon";
import styles from "./zwbekers.module.css";

const CabinetScene = dynamic(() => import("./cabinet-scene"), {
  ssr: false,
  loading: () => <div className={styles.loading}>Prijzenkast inrichten…</div>,
});

export type KastItem = {
  id: string;
  title: string;
  /** Wie hem won: een naam, of het team. */
  who: string;
  /** Bij een team de renners, anders leeg. */
  riders: string | null;
  date: string;
  /** Het jaar van de prestatie: elk jaar heeft zijn eigen kast. */
  year: number;
  design: BekerDesign;
};

type Props = {
  bekers: KastItem[];
  startId?: string;
  sponsors: Array<{ id: string; name: string }>;
  /** Je eigen voordrachten die nog niet in de kast staan. */
  ownOpen: number;
  /** Voor wie keurt: hoeveel voordrachten wachten; anders null. */
  waiting: number | null;
};

export function KastView({ bekers, startId, sponsors, ownOpen, waiting }: Props) {
  const labels = useRef(new Map<string, HTMLElement>());
  const [failed, setFailed] = useState(false);
  const [aiming, setAiming] = useState(false);
  const router = useRouter();

  const setLabel = useCallback(
    (key: string) => (element: HTMLElement | null) => {
      if (element) labels.current.set(key, element);
      else labels.current.delete(key);
    },
    [],
  );

  // Op de telefoon vult de kast het hele scherm; de pagina eronder scrolt dan niet mee.
  useEffect(() => {
    if (!window.matchMedia("(max-width: 640px)").matches) return;
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = before;
    };
  }, []);

  const back = () => {
    if (window.history.length > 1) router.back();
    else router.push("/club");
  };

  const empty = bekers.length === 0;
  const flat = failed || empty;

  return (
    <div className={`${styles.root} ${briljantSerif.variable} ${briljantSans.variable}`}>
      <div className={styles.stage}>
        {!flat && (
          <CabinetScene
            bekers={bekers.map(({ id, year, design }) => ({ id, year, design }))}
            startId={startId}
            sponsors={sponsors}
            labels={labels}
            onFailed={() => setFailed(true)}
            rotate={!aiming}
          />
        )}

        <button type="button" className={styles.back} onClick={back}>
          <ArrowLeft className="size-4" aria-hidden />
          Terug
        </button>

        <header className={styles.crest}>
          <h1>ZWBekers</h1>
          <p>{empty ? "De kast is nog leeg" : bekers.length === 1 ? "1 beker" : `${bekers.length} bekers`}</p>
        </header>

        <nav className={styles.actions} aria-label="ZWBekers">
          {waiting != null && (
            <Link href="/beheer/zwbekers" className={styles.action}>
              Keuren
              {waiting > 0 && <span className={styles.count}>{waiting}</span>}
            </Link>
          )}
          {ownOpen > 0 && (
            <Link href="/zwbekers/voordrachten" className={styles.action}>
              Je voordrachten <span className={styles.count}>{ownOpen}</span>
            </Link>
          )}
          <Link href="/zwbekers/voordragen" className={`${styles.action} ${styles.primary}`}>
            <Plus className="size-3.5" aria-hidden />
            Voordragen
          </Link>
        </nav>

        {empty ? (
          <div className={styles.empty}>
            <BekerIcon design={{ ...DEFAULT_DESIGN, gravure: "ZWB" }} title="" />
            <p>Wie verdient de eerste ZWBeker?</p>
          </div>
        ) : failed ? (
          <ul className={styles.shelf} role="list">
            {bekers.map((beker) => (
              <li key={beker.id}>
                <Link href={`/zwbekers/${beker.id}`} className={styles.shelfItem}>
                  <BekerIcon design={beker.design} title="" />
                  <b>{beker.title}</b>
                  <small>
                    {beker.who} · {beker.date}
                  </small>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.labels} onPointerOver={() => setAiming(true)} onPointerOut={() => setAiming(false)}>
            {bekers.map((beker) => (
              <div key={beker.id} ref={setLabel(`kast:${beker.id}`)} className={styles.anchor}>
                {/* Een messing bordje op de rand van de plank: titel en wie hem won. */}
                <Link
                  href={`/zwbekers/${beker.id}`}
                  className={styles.plaque}
                  aria-label={`${beker.title}, ${beker.who}${beker.riders ? ` (${beker.riders})` : ""}, ${beker.date}`}
                >
                  <b>{beker.title}</b>
                  <span>{beker.who}</span>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
