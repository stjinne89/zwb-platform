import { redirect } from "next/navigation";

// ZWBriljant staat sinds 2026-10-21 bij Stats; oude links (tegel, bladwijzers)
// komen daar terecht, met datum en vergelijking.
export default async function OldBriljantPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") params.set(key, value);
  }
  redirect(params.size ? `/stats/zwbriljant?${params}` : "/stats/zwbriljant");
}
