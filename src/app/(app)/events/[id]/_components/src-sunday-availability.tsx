import { MemberLink } from "@/components/member-link";
import { cn } from "@/lib/utils";
import { genderLabel, type SrcGender } from "@/lib/src/feed";

type Status = "available" | "maybe" | "unavailable";

export type SrcSundayRider = {
  profileId: string;
  name: string;
  race: SrcGender;
  category: number | null;
  status: Status | null;
  isMe: boolean;
};

const COLUMNS: Array<{ key: Status | "open"; label: string }> = [
  { key: "available", label: "Beschikbaar" },
  { key: "maybe", label: "Misschien" },
  { key: "unavailable", label: "Niet" },
  { key: "open", label: "Nog niet opgegeven" },
];

/**
 * Wie deze maand SRC rijdt en wat hij voor deze zondag opgaf (migr. 0201). Tot
 * 2026-11-14 toonde de zondag alleen je eigen knoppen; het overzicht stond
 * alleen op /src.
 */
export function SrcSundayAvailability({ riders }: { riders: SrcSundayRider[] }) {
  const columns = COLUMNS.filter(
    (column) => column.key !== "open" || riders.some((rider) => !rider.status),
  );
  return (
    <div className={cn("grid grid-cols-1 gap-4", columns.length === 4 ? "sm:grid-cols-4" : "sm:grid-cols-3")}>
      {columns.map((column) => {
        const group = riders.filter((rider) => (rider.status ?? "open") === column.key);
        return (
          <div key={column.key} className="rounded-lg border bg-card p-4">
            <h3 className="mb-2 text-sm font-semibold">
              {column.label} <span className="text-muted-foreground">({group.length})</span>
            </h3>
            {group.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {group.map((rider) => (
                  <li key={rider.profileId} className="flex flex-wrap items-center gap-1.5">
                    <MemberLink id={rider.profileId} className={cn(rider.isMe && "font-medium")}>
                      {rider.name}
                    </MemberLink>
                    <span
                      className="rounded-full bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground"
                      title={`${genderLabel(rider.race)}${rider.category ? `, categorie ${rider.category}` : ""}`}
                    >
                      {genderLabel(rider.race).charAt(0)}
                      {rider.category ?? ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
