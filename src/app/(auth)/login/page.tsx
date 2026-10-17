import { Suspense } from "react";
import { TegelsAuthFrame } from "@/components/tegels/auth-frame";
import { getAuthDesign } from "@/lib/design";
import { AuthScreen } from "./auth-screen";

export default async function LoginPage() {
  const tegels = (await getAuthDesign()) === "tegels";
  const screen = (
    <Suspense fallback={null}>
      <AuthScreen tegels={tegels} />
    </Suspense>
  );
  return tegels ? <TegelsAuthFrame>{screen}</TegelsAuthFrame> : screen;
}
