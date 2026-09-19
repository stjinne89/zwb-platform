"use client";
import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { managePrize } from "./_actions";

export function PrizeForm({ children, label }: { children: ReactNode; label: string }) {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return <form className="space-y-3" onSubmit={(e) => {
    e.preventDefault(); const form = e.currentTarget; const data = new FormData(form);
    start(async () => {
      const r = await managePrize(data);
      setError(r.ok ? "Opgeslagen." : r.error);
      if (r.ok) { form.reset(); router.refresh(); }
    });
  }}><fieldset disabled={pending} className="space-y-3">{children}<Button type="submit">{label}</Button></fieldset>{error && <p role="status" className="text-sm">{error}</p>}</form>;
}
