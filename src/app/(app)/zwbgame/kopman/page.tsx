import { redirect } from "next/navigation";

// Kopman heeft sinds 2026-11-11 een eigen pagina buiten de schil van de club.
export default function KopmanOldPage() {
  redirect("/kopman");
}
