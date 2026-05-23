"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";

export type BenefitCardData = {
  id: string;
  title: string;
  description_md: string | null;
  discount_code: string | null;
  redeem_url: string | null;
  valid_from: string | null;
  valid_until: string | null;
  sponsor: {
    name: string;
    slug: string;
    logo_url: string | null;
  } | null;
};

function formatDate(value: string | null): string | null {
  if (!value) return null;
  try {
    return new Date(value + "T12:00:00Z").toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

export function BenefitCard({ benefit }: { benefit: BenefitCardData }) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    if (!benefit.discount_code) return;
    try {
      await navigator.clipboard.writeText(benefit.discount_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // negeer; sommige browsers blokkeren clipboard zonder gebruikersinteractie
    }
  }

  const validFrom = formatDate(benefit.valid_from);
  const validUntil = formatDate(benefit.valid_until);

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{benefit.title}</h3>
          {benefit.sponsor && (
            <p className="text-xs text-muted-foreground">
              via {benefit.sponsor.name}
            </p>
          )}
        </div>
        {benefit.sponsor?.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={benefit.sponsor.logo_url}
            alt={`Logo ${benefit.sponsor.name}`}
            className="h-10 w-auto object-contain"
          />
        )}
      </div>

      {benefit.description_md && (
        <div className="prose prose-sm dark:prose-invert text-sm">
          <Markdown source={benefit.description_md} />
        </div>
      )}

      {benefit.discount_code && (
        <div className="flex items-center gap-2 rounded-md border-2 border-dashed border-foreground/30 bg-muted/40 p-2">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Code
          </span>
          <code className="flex-1 font-mono font-semibold">
            {benefit.discount_code}
          </code>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={copyCode}
            aria-label="Code kopiëren"
          >
            {copied ? (
              <>
                <Check className="size-4" /> Gekopieerd
              </>
            ) : (
              <>
                <Copy className="size-4" /> Kopieer
              </>
            )}
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        {(validFrom || validUntil) && (
          <span>
            {validFrom && validUntil
              ? `Geldig ${validFrom} — ${validUntil}`
              : validUntil
                ? `Geldig t/m ${validUntil}`
                : `Geldig vanaf ${validFrom}`}
          </span>
        )}
        {benefit.redeem_url && (
          <Link
            href={benefit.redeem_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border px-3 py-1 text-xs font-medium hover:bg-accent"
          >
            Verzilver <ExternalLink className="size-3" />
          </Link>
        )}
      </div>
    </div>
  );
}
