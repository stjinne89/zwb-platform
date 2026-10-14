import { ProtocolListPage } from "../../_components/protocols/protocol-pages";

export const dynamic = "force-dynamic";

export default function NutritionProtocolsPage() {
  return <ProtocolListPage pillar="voeden" basePath="/zwbeter-worden/voeding/protocollen" />;
}
