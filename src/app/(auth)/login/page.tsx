import { Suspense } from "react";
import { TegelsAuthFrame } from "@/components/tegels/auth-frame";
import { AuthScreen } from "./auth-screen";

export default function LoginPage() {
  return (
    <TegelsAuthFrame>
      <Suspense fallback={null}>
        <AuthScreen />
      </Suspense>
    </TegelsAuthFrame>
  );
}
