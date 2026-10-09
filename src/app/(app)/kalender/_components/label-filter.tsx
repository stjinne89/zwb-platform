"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
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

/**
 * Het labelfilter als dropdown naast Alles en Voor mij. Het menu blijft open
 * terwijl je aan- en uitvinkt; elke keuze past de URL aan.
 */
export function LabelFilter({
  groups,
  selected,
  selectedPrograms,
  onlyForMe,
}: {
  groups: LabelGroup[];
  selected: string[];
  selectedPrograms: string[];
  onlyForMe: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  // De vinkjes lopen voor op de server, anders voelt elke klik traag.
  const [current, setCurrent] = useOptimistic({ types: selected, programs: selectedPrograms });
  const total = current.types.length + current.programs.length;

  function apply(next: { types: string[]; programs: string[] }) {
    startTransition(() => {
      setCurrent(next);
      router.replace(calendarHref({ onlyForMe, ...next }), { scroll: false });
    });
  }

  function toggle(axis: LabelGroup["axis"], value: string) {
    apply(
      axis === "program"
        ? { ...current, programs: toggleProgramFilter(current.programs, value) }
        : { ...current, types: toggleTypeFilter(current.types, value) },
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs outline-none ${
          total > 0 ? "bg-foreground text-background" : "hover:bg-secondary"
        }`}
      >
        Labels{total > 0 ? ` (${total})` : ""}
        <ChevronDown className="size-3.5" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        {groups.map((group, index) => (
          <DropdownMenuGroup key={group.title ?? index}>
            {index > 0 && <DropdownMenuSeparator />}
            {group.title && <DropdownMenuLabel>{group.title}</DropdownMenuLabel>}
            {group.options.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={(group.axis === "program" ? current.programs : current.types).includes(
                  option.value,
                )}
                onCheckedChange={() => toggle(group.axis, option.value)}
              >
                {option.dot && (
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: option.dot }}
                  />
                )}
                <span className="min-w-0 truncate">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.count}</span>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        ))}
        {total > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => apply({ types: [], programs: [] })}>
              Wis labels
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
