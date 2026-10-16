"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  TOPIC_LABEL_MAX,
  TOPIC_LABEL_MIN,
  similarTopics,
  type TopicKind,
  type TopicOption,
} from "@/lib/zwbieb/topics";
import { addTopic } from "../_actions";

/**
 * Een onderwerp of spul toevoegen dat er nog niet tussen staat. Toont eerst wat
 * er al op lijkt, zodat niemand "Gravel" naast "Gravel en bikepacking" zet.
 */
export function AddTopic({
  kind,
  options,
  onAdded,
}: {
  kind: TopicKind;
  /** Alle kiesbare onderwerpen, van beide soorten. */
  options: TopicOption[];
  onAdded: (topic: TopicOption) => void;
}) {
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const similar = similarTopics(options, label);
  const length = label.trim().length;

  function add() {
    setError(null);
    startTransition(async () => {
      const res = await addTopic({ label, kind });
      if (!res.ok || !res.data) {
        setError(res.ok ? "Mislukt." : res.error);
        return;
      }
      setLabel("");
      onAdded(res.data);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={label}
          maxLength={TOPIC_LABEL_MAX}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && length >= TOPIC_LABEL_MIN) {
              e.preventDefault();
              add();
            }
          }}
          placeholder={kind === "spullen" ? "Ander spul" : "Ander onderwerp"}
          aria-label={kind === "spullen" ? "Ander spul toevoegen" : "Ander onderwerp toevoegen"}
          className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button
          variant="outline"
          className="min-h-11"
          disabled={pending || length < TOPIC_LABEL_MIN}
          onClick={add}
        >
          <Plus />
          Toevoegen
        </Button>
      </div>
      {similar.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Bestaat al:</span>
          {similar.map((option) => (
            <button
              key={option.slug}
              type="button"
              onClick={() => {
                setLabel("");
                onAdded(option);
              }}
              className="rounded-full border px-2.5 py-1 text-foreground hover:bg-muted"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
