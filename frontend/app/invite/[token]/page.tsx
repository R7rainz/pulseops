import { cookies } from "next/headers";
import { API_URL } from "@/lib/constants";
import { AcceptInviteButton } from "./accept-button";
import Link from "next/link";
import { ShieldCheck, Clock, AlertTriangle, UserPlus, LogIn } from "lucide-react";

interface InviteData {
    workspace: { id: number; name: string; slug: string };
    role: string;
    expiresAt: string;
    expired: boolean;
}

export default async function InvitePage({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    const { token } = await params;

    let invite: InviteData | null = null;
    let error: string | null = null;

    try {
        const res = await fetch(
            `${API_URL}/api/v1/invites/${token}`,
            { cache: "no-store" },
        );
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
            <div className="min-h-screen bg-zinc-950 text-zinc-50 font-mono flex items-center justify-center p-6">
                <div className="w-full max-w-md border-2 border-red-900/50 bg-zinc-950 p-8 shadow-[8px_8px_0px_0px_rgba(239,68,68,0.05)] text-center space-y-6">
                    <div className="inline-flex p-4 bg-red-950/30 border-2 border-red-800">
                        <Clock className="w-8 h-8 text-red-400" />
                    </div>
                    <h1 className="text-xl font-black uppercase tracking-widest text-red-400">
                        Invite Expired
                    </h1>
                    <p className="text-sm text-zinc-500">
                        This invite to <span className="text-zinc-300 font-bold">{invite.workspace.name}</span> is no longer valid. Contact the workspace admin for a new one.
                    </p>
                    <Link href="/login" className="inline-block px-6 py-3 bg-zinc-900 border-2 border-zinc-800 text-zinc-400 hover:text-zinc-100 text-xs font-bold uppercase tracking-widest transition-colors">
                        Return to Gateway
                    </Link>
                </div>
            </div>
        );
    }

    if (error || !invite) {
        return (
            <div className="min-h-screen bg-zinc-950 text-zinc-50 font-mono flex items-center justify-center p-6">
                <div className="w-full max-w-md border-2 border-red-900/50 bg-zinc-950 p-8 shadow-[8px_8px_0px_0px_rgba(239,68,68,0.05)] text-center space-y-6">
                    <div className="inline-flex p-4 bg-red-950/30 border-2 border-red-800">
                        <AlertTriangle className="w-8 h-8 text-red-400" />
                    </div>
                    <h1 className="text-xl font-black uppercase tracking-widest text-red-400">
                        Invalid Signature
                    </h1>
                    <p className="text-sm text-zinc-500">{error}</p>
                    <Link href="/login" className="inline-block px-6 py-3 bg-zinc-900 border-2 border-zinc-800 text-zinc-400 hover:text-zinc-100 text-xs font-bold uppercase tracking-widest transition-colors">
                        Return to Gateway
                    </Link>
                </div>
            </div>
        );
    }

    if (!userToken) {
        return (
            <div className="min-h-screen bg-zinc-950 text-zinc-50 font-mono flex items-center justify-center p-6">
                <div className="w-full max-w-md border-2 border-zinc-800 bg-zinc-950 p-8 shadow-[8px_8px_0px_0px_rgba(52,211,153,0.05)] text-center space-y-6">
                    <div className="inline-flex p-4 bg-zinc-900 border-2 border-zinc-800">
                        <ShieldCheck className="w-8 h-8 text-emerald-400" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-xl font-black uppercase tracking-widest text-zinc-100">
                            Workspace Invite
                        </h1>
                        <p className="text-sm text-zinc-500">
                            You have been invited to join
                        </p>
                        <p className="text-lg font-bold text-emerald-400 uppercase tracking-widest">
                            {invite.workspace.name}
                        </p>
                    </div>
                    <div className="border-2 border-zinc-900 bg-zinc-950/50 p-4 space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-zinc-500 uppercase tracking-widest">Role</span>
                            <span className="text-cyan-400 font-bold uppercase tracking-widest">{invite.role}</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-3">
                        <Link
                            href={`/login?callbackUrl=/invite/${token}`}
                            className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold uppercase tracking-widest py-3 border-2 border-transparent transition-all text-xs flex items-center justify-center gap-2"
                        >
                            <LogIn className="w-4 h-4" />
                            Login to Accept Invite
                        </Link>
                        <Link
                            href={`/signup?invite_token=${token}`}
                            className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold uppercase tracking-widest py-3 border-2 border-zinc-800 transition-all text-xs flex items-center justify-center gap-2"
                        >
                            <UserPlus className="w-4 h-4" />
                            Create Account
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-50 font-mono flex items-center justify-center p-6 selection:bg-emerald-500/30 selection:text-emerald-400">
            <div className="w-full max-w-md border-2 border-zinc-800 bg-zinc-950 p-8 shadow-[8px_8px_0px_0px_rgba(52,211,153,0.05)] text-center space-y-6">
                <div className="inline-flex p-4 bg-zinc-900 border-2 border-zinc-800">
                    <ShieldCheck className="w-8 h-8 text-emerald-400" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-xl font-black uppercase tracking-widest text-zinc-100">
                        Workspace Invite
                    </h1>
                    <p className="text-sm text-zinc-500">
                        You have been invited to join
                    </p>
                    <p className="text-lg font-bold text-emerald-400 uppercase tracking-widest">
                        {invite.workspace.name}
                    </p>
                </div>

                <div className="border-2 border-zinc-900 bg-zinc-950/50 p-4 space-y-2">
                    <div className="flex justify-between text-xs">
                        <span className="text-zinc-500 uppercase tracking-widest">Role</span>
                        <span className="text-cyan-400 font-bold uppercase tracking-widest">{invite.role}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-zinc-500 uppercase tracking-widest">Expires</span>
                        <span className="text-zinc-400">{new Date(invite.expiresAt).toLocaleDateString()}</span>
                    </div>
                </div>

                <AcceptInviteButton token={token} workspaceName={invite.workspace.name} />
            </div>
        </div>
    );
}
