"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  calendarHref,
  toggleProgramFilter,
  toggleTypeFilter,
} from "@/lib/events/type-filter";

export type LabelOption = {
  value: string;
  label: string;
  count: number;
  /** Kleur van het bolletje; een type (Training, Social, Goed doel) of programma heeft er geen. */
  dot: string | null;
};

export type LabelGroup = {
  title: string | null;
  /** Programma's hebben hun eigen URL-parameter (`programma`), de rest deelt `type`. */
  axis: "type" | "program";
  options: LabelOption[];
};

type FilterState = {
  types: string[];
  programs: string[];
  excluded: string[];
  excludedPrograms: string[];
};

/**
 * Het labelfilter als dropdown naast Alles en Voor mij. Het menu blijft open
 * terwijl je aan- en uitvinkt; elke keuze past de URL aan. Het kruisje achter
 * een label zet het uit: dat label verdwijnt dan van de kalender.
 */
export function LabelFilter({
  groups,
  selected,
  selectedPrograms,
  excluded,
  excludedPrograms,
  onlyForMe,
}: {
  groups: LabelGroup[];
  selected: string[];
  selectedPrograms: string[];
  excluded: string[];
  excludedPrograms: string[];
  onlyForMe: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  // De vinkjes lopen voor op de server, anders voelt elke klik traag.
  const [current, setCurrent] = useOptimistic<FilterState>({
    types: selected,
    programs: selectedPrograms,
    excluded,
    excludedPrograms,
  });
  const total =
    current.types.length +
    current.programs.length +
    current.excluded.length +
    current.excludedPrograms.length;

  function apply(next: FilterState) {
    startTransition(() => {
      setCurrent(next);
      router.replace(calendarHref({ onlyForMe, ...next }), { scroll: false });
    });
  }

  // Aan en uit sluiten elkaar uit: wie het ene kiest, haalt het andere weg.
  function toggle(axis: LabelGroup["axis"], value: string) {
    apply(
      axis === "program"
        ? {
            ...current,
            programs: toggleProgramFilter(current.programs, value),
            excludedPrograms: current.excludedPrograms.filter((slug) => slug !== value),
          }
        : {
            ...current,
            types: toggleTypeFilter(current.types, value),
            excluded: current.excluded.filter((item) => item !== value),
          },
    );
  }

  function toggleExcluded(axis: LabelGroup["axis"], value: string) {
    apply(
      axis === "program"
        ? {
            ...current,
            programs: current.programs.filter((slug) => slug !== value),
            excludedPrograms: toggleProgramFilter(current.excludedPrograms, value),
          }
        : {
            ...current,
            types: current.types.filter((item) => item !== value),
            excluded: toggleTypeFilter(current.excluded, value),
          },
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`tg-link tg-kalender tg-chip inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs outline-none ${
          total > 0 ? "bg-foreground text-background" : "hover:bg-secondary"
        }`}
      >
        Labels{total > 0 ? ` (${total})` : ""}
        <ChevronDown className="size-3.5" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {groups.map((group, index) => (
          <DropdownMenuGroup key={group.title ?? index}>
            {index > 0 && <DropdownMenuSeparator />}
            {group.title && <DropdownMenuLabel>{group.title}</DropdownMenuLabel>}
            {group.options.map((option) => {
              const isProgram = group.axis === "program";
              const isOff = (isProgram ? current.excludedPrograms : current.excluded).includes(
                option.value,
              );
              return (
                <div key={option.value} className="flex items-center">
                  <DropdownMenuCheckboxItem
                    className="min-w-0 flex-1"
                    checked={(isProgram ? current.programs : current.types).includes(
                      option.value,
                    )}
                    onCheckedChange={() => toggle(group.axis, option.value)}
                  >
                    {option.dot && (
                      <span
                        className={`size-2 shrink-0 rounded-full ${isOff ? "opacity-40" : ""}`}
                        style={{ backgroundColor: option.dot }}
                      />
                    )}
                    <span
                      className={`min-w-0 truncate ${
                        isOff ? "text-muted-foreground line-through" : ""
                      }`}
                    >
                      {option.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{option.count}</span>
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuItem
                    closeOnClick={false}
                    aria-label={`${isOff ? "Toon" : "Verberg"} ${option.label}`}
                    className={`shrink-0 px-1.5 ${isOff ? "text-destructive" : "text-muted-foreground"}`}
                    onClick={() => toggleExcluded(group.axis, option.value)}
                  >
                    <X className="size-3.5" aria-hidden />
                  </DropdownMenuItem>
                </div>
              );
            })}
          </DropdownMenuGroup>
        ))}
        {total > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                apply({ types: [], programs: [], excluded: [], excludedPrograms: [] })
              }
            >
              Wis labels
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
