import { BeheerFrame } from "../../_components/beheer-frame";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <BeheerFrame>{children}</BeheerFrame>;
}
