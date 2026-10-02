import { redirect } from "next/navigation";

// De segmentverkenner stond hier tot oktober 2026. Oude pushberichten en gedeelde
// links wijzen nog naar dit adres; ze komen nu uit bij de collecties.
export default function SegmentsPage() {
  redirect("/profiel/segments/collecties");
}
