import { permanentRedirect } from "next/navigation";

// Een serie stond eerst direct onder /core. Sinds de tabs staat hij onder
// /core/series; oude links en bladwijzers blijven zo werken.
export default async function LegacySeriesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  permanentRedirect(`/zwbeter-worden/core/series/${encodeURIComponent(slug)}`);
}
