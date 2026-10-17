import { ZwbiebOverview } from "./_components/overview";

type PageProps = {
  searchParams: Promise<{ onderwerp?: string }>;
};

/** ZWBieb, tab Kennis: wie weet wat. */
export default async function ZwbiebPage({ searchParams }: PageProps) {
  const { onderwerp } = await searchParams;
  return <ZwbiebOverview kind="kennis" onderwerp={onderwerp} />;
}
