import { redirect } from "next/navigation";

export default async function CreateMonitorPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  redirect(`/workspaces/${workspaceId}/monitors`);
}
