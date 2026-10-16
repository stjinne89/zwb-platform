import Link from "next/link";
import { MessageCircleQuestion } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Naar het vraagformulier voor dit lid en dit onderwerp. */
export function AskLink({
  expertId,
  topic,
  tipId,
  compact = false,
  className,
}: {
  expertId: string;
  topic: string;
  tipId?: string;
  /** Op de telefoon alleen het icoon, op een duimvlak van 44px. */
  compact?: boolean;
  className?: string;
}) {
  const params = new URLSearchParams({ aan: expertId, onderwerp: topic });
  if (tipId) params.set("tip", tipId);
  return (
    <Link
      href={`/zwbieb/vraag?${params.toString()}`}
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        compact && "max-sm:size-11 max-sm:p-0 max-sm:[&_svg]:size-4.5",
        className,
      )}
    >
      <MessageCircleQuestion />
      <span className={compact ? "max-sm:sr-only" : undefined}>Vraag het aan</span>
    </Link>
  );
}
