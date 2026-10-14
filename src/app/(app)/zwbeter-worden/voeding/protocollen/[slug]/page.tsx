import { ProtocolDetailPage } from "../../../_components/protocols/protocol-pages";

export const dynamic = "force-dynamic";

export default async function NutritionProtocolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ProtocolDetailPage pillar="voeden" basePath="/zwbeter-worden/voeding/protocollen" slug={slug} />;
}
