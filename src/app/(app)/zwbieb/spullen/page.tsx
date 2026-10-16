import { ZwbiebOverview } from "../_components/overview";

type PageProps = {
  searchParams: Promise<{ onderwerp?: string }>;
};

/** ZWBieb, tab Spullen: wie heeft wat en wil het uitlenen. */
export default async function ZwbiebSpullenPage({ searchParams }: PageProps) {
  const { onderwerp } = await searchParams;
  return <ZwbiebOverview kind="spullen" onderwerp={onderwerp} />;
}
