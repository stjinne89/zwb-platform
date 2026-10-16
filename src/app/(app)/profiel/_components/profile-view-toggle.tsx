import Link from "next/link";

const OPTIONS = [
  { href: "/profiel", label: "Bewerken", members: false },
  { href: "/profiel?weergave=leden", label: "Zoals leden je zien", members: true },
];

/** Wissel tussen het eigen, bewerkbare profiel en het ledenprofiel. */
export function ProfileViewToggle({ membersView }: { membersView: boolean }) {
  return (
    <nav aria-label="Profielweergave" className="flex flex-wrap gap-2">
      {OPTIONS.map((option) => {
        const active = option.members === membersView;
        return (
          <Link
            key={option.href}
            href={option.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full border px-3 py-1 text-xs ${
              active ? "bg-foreground text-background" : "hover:bg-secondary"
            }`}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}
