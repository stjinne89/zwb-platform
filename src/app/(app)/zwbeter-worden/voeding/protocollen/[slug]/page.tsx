import { ProtocolDetailPage } from "../../../_components/protocols/protocol-pages";

export const dynamic = "force-dynamic";

export default async function NutritionProtocolPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ event?: string | string[] }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const event = Array.isArray(query.event) ? query.event[0] : query.event;
  // Alleen een uuid; de pagina zoekt het event zelf op.
  const eventId = event && /^[0-9a-f-]{36}$/i.test(event) ? event : null;
  return (
    <ProtocolDetailPage pillar="voeden" basePath="/zwbeter-worden/voeding/protocollen" slug={slug} eventId={eventId} />
  );
}
