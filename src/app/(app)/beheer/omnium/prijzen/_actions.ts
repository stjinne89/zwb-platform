"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOmniumAccess } from "@/lib/omnium/access";
import { OMNIUM_LEAGUES } from "@/lib/omnium/scales";

export async function managePrize(form: FormData) {
  try {
    const { admin, userId } = await requireOmniumAccess();
    const command = form.get("command");
    if (command === "create") {
      const input = z.object({ season_id: z.uuid(), title: z.string().trim().min(1).max(200), scope: z.enum(["edition", "season"]), kind: z.enum(["zwift_kit", "other"]), league: z.union([z.enum(OMNIUM_LEAGUES), z.literal("")]) }).parse(Object.fromEntries(form));
      const { error } = await admin.from("omnium_prizes").insert({ ...input, league: input.league || null });
      if (error) throw new Error(error.message);
    } else if (command === "codes") {
      const season = z.uuid().parse(form.get("season_id"));
      const raw = z.string().max(100_000).parse(form.get("codes"));
      const codes = [...new Set(raw.split(/\r?\n/).map((c) => c.trim()).filter(Boolean))];
      if (!codes.length || codes.length > 2000 || codes.some((c) => c.length > 200)) throw new Error("Ongeldige kitcodes.");
      const { error } = await admin.from("omnium_kit_codes").upsert(codes.map((code) => ({ season_id: season, code })), { onConflict: "code", ignoreDuplicates: true });
      // Databasefouten kunnen de geheime code bevatten; alleen een vaste fout teruggeven.
      if (error) throw new Error("Kitcodes konden niet worden geïmporteerd.");
    } else if (command === "award") {
      const { error } = await admin.rpc("omnium_award_prize", {
        p_prize_id: z.uuid().parse(form.get("prize_id")), p_rider_id: z.uuid().parse(form.get("rider_id")),
        p_edition_id: form.get("edition_id") ? z.uuid().parse(form.get("edition_id")) : null, p_user_id: userId,
      });
      if (error) throw new Error(error.message);
    } else if (command === "status") {
      const id = z.uuid().parse(form.get("award_id"));
      const status = z.enum(["sent", "claimed"]).parse(form.get("status"));
      const { error, data } = await admin.from("omnium_prize_awards").update({ status }).eq("id", id).eq("status", status === "sent" ? "pending" : "sent").select("id").maybeSingle();
      if (error || !data) throw new Error("Status gewijzigd; ververs de pagina.");
    } else throw new Error("Onbekende actie.");
    revalidatePath("/beheer/omnium/prijzen"); revalidatePath("/omnium", "layout");
    return { ok: true as const };
  } catch (e) { return { ok: false as const, error: e instanceof z.ZodError ? "Controleer de ingevulde velden." : e instanceof Error ? e.message : "Opslaan mislukt." }; }
}
