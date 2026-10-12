"use server";

// De schakelaar voor het design "tegels"; zie lib/design.ts.

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getRequestAccess } from "@/lib/auth/request";
import { DESIGN_COOKIE, DESIGN_PREVIEW_PERMISSION } from "@/lib/design";

export async function setDesign(formData: FormData) {
  const access = await getRequestAccess();
  if (!access.has(DESIGN_PREVIEW_PERMISSION)) return;

  const store = await cookies();
  if (formData.get("design") === "tegels") {
    store.set(DESIGN_COOKIE, "tegels", {
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
  } else {
    store.delete(DESIGN_COOKIE);
  }
  revalidatePath("/", "layout");
}
