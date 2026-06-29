import { cookies } from "next/headers";
import { API_URL } from "@/lib/constants";
import { AcceptInviteButton } from "./accept-button";
import Link from "next/link";
import AmbientGlow from "@/components/AmbientGlow";
import { Brand } from "@/components/Brand";
import { ShieldCheck, Clock, AlertTriangle, UserPlus, LogIn } from "lucide-react";

interface InviteData {
  workspace: { id: number; name: string; slug: string };
  role: string;
  expiresAt: string;
  expired: boolean;
}

function InviteCard({
  workspaceName,
  role,
  expiresAt,
  children,
}: {
  workspaceName: string;
  role: string;
  expiresAt: string;
  children: React.ReactNode;
}) {
  return (
    <div className="pulse-shell">
      <div className="p-8 text-center">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full border border-up/30 bg-up/10">
          <ShieldCheck className="h-7 w-7 text-up" />
        </div>
        <h1 className="font-display text-xl font-semibold text-foreground">You’re invited</h1>
        <p className="mt-1 text-sm text-muted-foreground">to join</p>
        <p className="mt-1 font-display text-lg font-semibold text-up">{workspaceName}</p>

        <div className="mt-5 space-y-2 rounded-lg border border-border p-4 text-left">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Role</span>
            <span className="font-medium text-info">{role}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Expires</span>
            <span className="text-foreground">{new Date(expiresAt).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden p-6 text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-background" />
        <AmbientGlow />
      </div>
      <div className="absolute left-6 top-6">
        <Brand href="/" />
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let invite: InviteData | null = null;
  let error: string | null = null;

  try {
    const res = await fetch(`${API_URL}/api/v1/invites/${token}`, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      invite = json.data;
    } else {
      const json = await res.json().catch(() => ({}));
      error = json.message || "Invalid invite link";
    }
  } catch {
    error = "Failed to look up invite";
  }

  const cookieStore = await cookies();
  const userToken = cookieStore.get("pulseops_token")?.value;

  if (invite && invite.expired) {
    return (
      <Shell>
        <div className="glass rounded-xl p-8 text-center">
          <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full border border-down/30 bg-down/10">
            <Clock className="h-7 w-7 text-down" />
          </div>
          <h1 className="font-display text-xl font-semibold text-foreground">Invite expired</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This invite to <span className="font-medium text-foreground">{invite.workspace.name}</span> is no longer valid. Ask an admin for a new one.
          </p>
          <Link href="/login" className="btn btn-ghost mt-6">Back to sign in</Link>
        </div>
      </Shell>
    );
  }

  if (error || !invite) {
    return (
      <Shell>
        <div className="glass rounded-xl p-8 text-center">
          <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full border border-down/30 bg-down/10">
            <AlertTriangle className="h-7 w-7 text-down" />
          </div>
          <h1 className="font-display text-xl font-semibold text-foreground">Invalid invite</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Link href="/login" className="btn btn-ghost mt-6">Back to sign in</Link>
        </div>
      </Shell>
    );
  }

  if (!userToken) {
    return (
      <Shell>
        <InviteCard workspaceName={invite.workspace.name} role={invite.role} expiresAt={invite.expiresAt}>
          <div className="flex flex-col gap-3">
            <Link href={`/login?callbackUrl=/invite/${token}`} className="btn btn-primary w-full py-3">
              <LogIn className="h-4 w-4" /> Sign in to accept
            </Link>
            <Link href={`/signup?invite_token=${token}`} className="btn btn-ghost w-full py-3">
              <UserPlus className="h-4 w-4" /> Create an account
            </Link>
          </div>
        </InviteCard>
      </Shell>
    );
  }

  return (
    <Shell>
      <InviteCard workspaceName={invite.workspace.name} role={invite.role} expiresAt={invite.expiresAt}>
        <AcceptInviteButton token={token} workspaceName={invite.workspace.name} />
      </InviteCard>
    </Shell>
  );
}
