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
import { calendarHref, toggleTypeFilter } from "@/lib/events/type-filter";

export type LabelOption = {
  value: string;
  label: string;
  count: number;
  /** Kleur van het bolletje; een type (Training, Social) heeft er geen. */
  dot: string | null;
};

export type LabelGroup = { title: string | null; options: LabelOption[] };

/**
 * Het labelfilter als dropdown naast Alles en Voor mij. Het menu blijft open
 * terwijl je aan- en uitvinkt; elke keuze past de URL aan.
 */
export function LabelFilter({
  groups,
  selected,
  onlyForMe,
}: {
  groups: LabelGroup[];
  selected: string[];
  onlyForMe: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  // De vinkjes lopen voor op de server, anders voelt elke klik traag.
  const [current, setCurrent] = useOptimistic(selected);

  function apply(next: string[]) {
    startTransition(() => {
      setCurrent(next);
      router.replace(calendarHref({ onlyForMe, types: next }), { scroll: false });
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs outline-none ${
          current.length > 0 ? "bg-foreground text-background" : "hover:bg-secondary"
        }`}
      >
        Labels{current.length > 0 ? ` (${current.length})` : ""}
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
                checked={current.includes(option.value)}
                onCheckedChange={() => apply(toggleTypeFilter(current, option.value))}
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
        {current.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => apply([])}>Wis labels</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
