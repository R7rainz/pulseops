"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function logoutUser() {
  const cookieStore = await cookies();

  cookieStore.delete("pulseops_token");

  redirect("/login");
}
