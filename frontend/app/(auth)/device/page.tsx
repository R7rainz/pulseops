import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ApproveForm from "./approve-form";

export const metadata = { title: "Authorize device · PulseOps" };

/**
 * Device-authorization approval page. The CLI/TUI sends the user here (with a
 * prefilled `code`); they must be signed in to approve. Not covered by the auth
 * middleware matcher, so we gate it here and bounce guests through login with a
 * callback back to this page.
 */
export default async function DevicePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;

  if (!token) {
    const target = `/device${code ? `?code=${encodeURIComponent(code)}` : ""}`;
    redirect(`/login?callbackUrl=${encodeURIComponent(target)}`);
  }

  return <ApproveForm initialCode={code ?? ""} />;
}
