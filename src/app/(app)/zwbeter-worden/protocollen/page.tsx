import { ProtocolListPage } from "../_components/protocols/protocol-pages";

export const dynamic = "force-dynamic";

export default function TrainingProtocolsPage() {
  return <ProtocolListPage pillar="trainen" basePath="/zwbeter-worden/protocollen" />;
}
