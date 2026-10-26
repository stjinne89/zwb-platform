"use server";

// De schakelaar terug naar het oude design; zie lib/design.ts.

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getRequestAccess } from "@/lib/auth/request";
import { DESIGN_COOKIE, DESIGN_PREVIEW_PERMISSION } from "@/lib/design";

export async function setDesign(formData: FormData) {
  const access = await getRequestAccess();
  if (!access.has(DESIGN_PREVIEW_PERMISSION)) return;

  const store = await cookies();
  if (formData.get("design") === "klassiek") {
    store.set(DESIGN_COOKIE, "klassiek", {
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
