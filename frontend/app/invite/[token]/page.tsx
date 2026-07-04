import { cookies } from "next/headers";
import { API_URL } from "@/lib/constants";
import { AcceptInviteButton } from "./accept-button";
import Link from "next/link";
import AmbientGlow from "@/components/AmbientGlow";
import { Brand } from "@/components/Brand";
import { ShieldCheck, Clock, AlertTriangle, UserPlus, LogIn, Link as LinkIcon, Mail, Users } from "lucide-react";

interface InviteData {
  workspace: { id: number; name: string; slug: string };
  role: string;
  expiresAt: string | null;
  expired: boolean;
  exhausted: boolean;
  isLink: boolean;
  invitedByName: string | null;
  maxUses: number | null;
  useCount: number;
  remainingUses: number | null;
}

const ROLE_HELP: Record<string, string> = {
  VIEWER: "Read-only access to monitors and incidents.",
  MEMBER: "Can create and manage monitors.",
  ADMIN: "Full access — manage monitors, members and settings.",
};

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

function StatusCard({
  tone,
  icon,
  title,
  children,
}: {
  tone: "down" | "up";
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  const ring = tone === "up" ? "border-up/30 bg-up/10" : "border-down/30 bg-down/10";
  return (
    <div className="glass rounded-xl p-8 text-center">
      <div className={`mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full border ${ring}`}>
        {icon}
      </div>
      <h1 className="font-display text-xl font-semibold text-foreground">{title}</h1>
      <div className="mt-2 text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

function InviteCard({ invite, children }: { invite: InviteData; children: React.ReactNode }) {
  return (
    <div className="pulse-shell">
      <div className="p-8 text-center">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full border border-up/30 bg-up/10">
          <ShieldCheck className="h-7 w-7 text-up" />
        </div>
        <h1 className="font-display text-xl font-semibold text-foreground">You’re invited</h1>
        {invite.invitedByName && (
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{invite.invitedByName}</span> invited you to join
          </p>
        )}
        {!invite.invitedByName && <p className="mt-1 text-sm text-muted-foreground">to join</p>}
        <p className="mt-1 font-display text-lg font-semibold text-up">{invite.workspace.name}</p>

        <div className="mt-5 space-y-2.5 rounded-lg border border-border p-4 text-left">
          <div className="flex items-start justify-between gap-4 text-sm">
            <span className="text-muted-foreground">Role</span>
            <span className="text-right">
              <span className="font-medium text-info">{invite.role}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{ROLE_HELP[invite.role]}</span>
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-2.5 text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              {invite.isLink ? <LinkIcon className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
              {invite.isLink ? "Type" : "Sent to you"}
            </span>
            <span className="text-foreground">{invite.isLink ? "Shareable link" : "Personal invite"}</span>
          </div>
          {invite.isLink && invite.remainingUses !== null && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground"><Users className="h-3.5 w-3.5" /> Spots left</span>
              <span className="text-foreground">{invite.remainingUses}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground"><Clock className="h-3.5 w-3.5" /> Expires</span>
            <span className="text-foreground">{invite.expiresAt ? new Date(invite.expiresAt).toLocaleDateString() : "Never"}</span>
          </div>
        </div>

        <div className="mt-6">{children}</div>
      </div>
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

  if (invite && (invite.expired || invite.exhausted)) {
    return (
      <Shell>
        <StatusCard tone="down" icon={<Clock className="h-7 w-7 text-down" />} title={invite.exhausted ? "Invite used up" : "Invite expired"}>
          This invite to <span className="font-medium text-foreground">{invite.workspace.name}</span>{" "}
          {invite.exhausted ? "has reached its maximum number of uses" : "is no longer valid"}. Ask an admin for a new one.
          <div className="mt-6">
            <Link href="/login" className="btn btn-ghost">Back to sign in</Link>
          </div>
        </StatusCard>
      </Shell>
    );
  }

  if (error || !invite) {
    return (
      <Shell>
        <StatusCard tone="down" icon={<AlertTriangle className="h-7 w-7 text-down" />} title="Invalid invite">
          {error}
          <div className="mt-6">
            <Link href="/login" className="btn btn-ghost">Back to sign in</Link>
          </div>
        </StatusCard>
      </Shell>
    );
  }

  if (!userToken) {
    return (
      <Shell>
        <InviteCard invite={invite}>
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
      <InviteCard invite={invite}>
        <AcceptInviteButton token={token} workspaceName={invite.workspace.name} />
      </InviteCard>
    </Shell>
  );
}
