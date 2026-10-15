import Link from "next/link";
import { MessageCircleQuestion } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Naar het vraagformulier voor dit lid en dit onderwerp. */
export function AskLink({
  expertId,
  topic,
  tipId,
  className,
}: {
  expertId: string;
  topic: string;
  tipId?: string;
  className?: string;
}) {
  const params = new URLSearchParams({ aan: expertId, onderwerp: topic });
  if (tipId) params.set("tip", tipId);
  return (
    <Link
      href={`/leden/wie-weet-wat/vraag?${params.toString()}`}
      className={cn(buttonVariants({ variant: "outline", size: "sm" }), className)}
    >
      <MessageCircleQuestion />
      Vraag het aan
    </Link>
  );
}
