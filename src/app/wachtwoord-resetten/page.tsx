import { TegelsAuthFrame } from "@/components/tegels/auth-frame";
import { PasswordResetForm } from "./password-reset-form";

export default function PasswordResetPage() {
  return (
    <TegelsAuthFrame>
      <h1 className="tg-display">Nieuw wachtwoord</h1>
      <PasswordResetForm />
    </TegelsAuthFrame>
  );
}
