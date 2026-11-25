import { piecePath, type PuzzlePiece } from "@/lib/zwblokken/puzzle";

// De Zwiftpuzzel: één rij in elkaar grijpende stukken, op de telefoon twee rijen.
// Een stuk dat af is, kleurt in de kleur van het soort wereld en leidt naar de
// kaart van die wereld; de rest blijft paneel met de eigen blokken erin. De
// kleuren staan in globals.css bij .zwift-puzzle, als klassen: een var() in een
// SVG-attribuut lost niet elke browser op.

const SIZE = 52;
const KNOB = { neck: 4, head: 8, d1: 4, d2: 7 };
const INSET = 13;
/** Op deze kleuren zijn de blokjes papier, op de lichtere inkt. */
const DARK_FILL = new Set(["eiland", "stad"]);

function Footprint({ piece, x, y }: { piece: PuzzlePiece; x: number; y: number }) {
  const box = SIZE - 2 * INSET;
  const s = Math.min(box / piece.width, box / piece.height, 9);
  const ox = x + INSET + (box - piece.width * s) / 2;
  const oy = y + INSET + (box - piece.height * s) / 2;
  const gap = s > 4 ? 0.6 : 0.3;
  const doneClass = DARK_FILL.has(piece.landscape) ? "zp-paper" : "zp-ink";
  return (
    <>
      {piece.blocks.map(([dx, dy, mine]) => (
        <rect
          key={`${dx}/${dy}`}
          x={round(ox + dx * s)}
          y={round(oy + dy * s)}
          width={round(s - gap)}
          height={round(s - gap)}
          className={piece.done ? doneClass : mine ? "zp-own" : "zp-ghost"}
        />
      ))}
    </>
  );
}

function Grid({
  pieces,
  cols,
  id,
  href,
  className,
}: {
  pieces: PuzzlePiece[];
  cols: number;
  id: string;
  href: (slug: string) => string;
  className?: string;
}) {
  const rows = Math.ceil(pieces.length / cols);
  const cells = pieces.map((piece, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    return { piece, i, x: col * SIZE, y: row * SIZE, d: piecePath(row, col, cols, rows, SIZE, KNOB) };
  });
  return (
    <svg viewBox={`0 0 ${cols * SIZE} ${rows * SIZE}`} className={className}>
      <defs>
        {/* Echte naden tussen de stukken, zodat het paneel erdoorheen schijnt. */}
        <mask id={`${id}-naden`} maskUnits="userSpaceOnUse">
          <rect width={cols * SIZE} height={rows * SIZE} fill="white" />
          {cells.map((c) => (
            <path key={c.i} d={c.d} fill="none" stroke="black" strokeWidth={2} />
          ))}
        </mask>
        {cells.map((c) => (
          <clipPath key={c.i} id={`${id}-stuk-${c.i}`}>
            <path d={c.d} />
          </clipPath>
        ))}
      </defs>
      <g mask={`url(#${id}-naden)`}>
        {cells.map(({ piece, i, x, y, d }) => {
          const label = piece.done ? piece.name : `${piece.name}, ${piece.pct}%`;
          const body = (
            <>
              <title>{label}</title>
              <path className={`zp-piece zp-${piece.done ? piece.landscape : "open"}`} d={d} />
              {piece.done ? (
                // De schuine tenuebaan van de tegels.
                <polygon
                  clipPath={`url(#${id}-stuk-${i})`}
                  className="zp-band"
                  points={`${x + SIZE * 0.62},${y} ${x + SIZE * 0.86},${y} ${x + SIZE * 0.52},${y + SIZE} ${x + SIZE * 0.28},${y + SIZE}`}
                />
              ) : null}
              <Footprint piece={piece} x={x} y={y} />
            </>
          );
          return piece.done ? (
            <a key={piece.slug} href={href(piece.slug)} aria-label={`${piece.name}, kaart`}>
              {body}
            </a>
          ) : (
            <g key={piece.slug}>{body}</g>
          );
        })}
      </g>
    </svg>
  );
}

export function ZwiftPuzzle({ pieces, href }: { pieces: PuzzlePiece[]; href: (slug: string) => string }) {
  if (pieces.length === 0) return null;
  const narrow = pieces.length % 2 === 0 ? pieces.length / 2 : pieces.length;
  return (
    <div className="zwift-puzzle">
      <Grid pieces={pieces} cols={pieces.length} id="zp-rij" href={href} className="hidden h-auto w-full sm:block" />
      <Grid pieces={pieces} cols={narrow} id="zp-blok" href={href} className="h-auto w-full sm:hidden" />
    </div>
  );
}

const round = (n: number) => Math.round(n * 100) / 100;
