import { ProtocolDetailPage } from "../../_components/protocols/protocol-pages";

export const dynamic = "force-dynamic";

export default async function TrainingProtocolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ProtocolDetailPage pillar="trainen" basePath="/zwbeter-worden/protocollen" slug={slug} />;
}
