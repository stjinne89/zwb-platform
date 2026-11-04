"use client";

// "Nog niet gekoppeld": een melding die beheer vanaf /beheer/koppelingen stuurde
// (0307). Opent na een tel en alleen als er geen andere dialoog openstaat; anders
// komt hij bij een volgende pagina terug. Sluiten of de link volgen zet hem op
// gezien, zodat beheer dat ziet.

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { OpenIntegrationNotice } from "@/lib/integrations/member-notices";
import { markIntegrationNoticesSeen } from "./integration-notice-actions";

const OPEN_DELAY_MS = 2000;

export function IntegrationNoticeDialog({ notices }: { notices: OpenIntegrationNotice[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!document.querySelector('[data-slot="dialog-content"]')) setOpen(true);
    }, OPEN_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  function close() {
    setOpen(false);
    void markIntegrationNoticesSeen(notices.map((notice) => notice.id)).catch(() => null);
  }

  const single = notices.length === 1 ? notices[0] : null;

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{single ? single.title : "Nog niet gekoppeld"}</DialogTitle>
          <DialogDescription className={single ? "whitespace-pre-line text-sm" : "sr-only"}>
            {single ? single.body : "Koppelingen die je nog mist."}
          </DialogDescription>
        </DialogHeader>
        {single ? null : (
          <ul className="space-y-4 text-sm">
            {notices.map((notice) => (
              <li key={notice.id} className="space-y-2">
                <p className="font-semibold">{notice.title}</p>
                <p className="whitespace-pre-line text-muted-foreground">{notice.body}</p>
                <Link
                  href={notice.href}
                  onClick={close}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  {notice.linkLabel}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <DialogFooter>
          <Button type="button" size="sm" variant={single ? "outline" : "default"} onClick={close}>
            {single ? "Sluiten" : "Begrepen"}
          </Button>
          {single ? (
            <Link href={single.href} onClick={close} className={buttonVariants({ size: "sm" })}>
              {single.linkLabel}
            </Link>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
