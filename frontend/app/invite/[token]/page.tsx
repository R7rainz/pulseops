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
            <div className="min-h-screen bg-transparent text-[#EEEAE0] flex items-center justify-center p-6">
                <div className="w-full max-w-md gradient-border-shell text-center space-y-6">
                    <div className="shell-inner p-[29.6px] space-y-6">
                        <div className="inline-flex p-4 bg-[rgba(194,118,107,0.1)] border border-[rgba(194,118,107,0.3)] rounded-[4px]">
                            <Clock className="w-8 h-8 text-[#C2766B]" />
                        </div>
                        <h1 className="text-xl font-medium text-[#C2766B]">
                            Invite Expired
                        </h1>
                        <p className="text-sm text-[#93A096]">
                            This invite to <span className="text-[#EEEAE0] font-medium">{invite.workspace.name}</span> is no longer valid. Contact the workspace admin for a new one.
                        </p>
                        <Link href="/login" className="inline-block px-6 py-3 border border-[rgba(238,234,224,0.1)] text-[#93A096] hover:text-[#EEEAE0] rounded-[999px] text-label-md font-medium transition-colors">
                            Return to Gateway
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !invite) {
        return (
            <div className="min-h-screen bg-transparent text-[#EEEAE0] flex items-center justify-center p-6">
                <div className="w-full max-w-md gradient-border-shell text-center space-y-6">
                    <div className="shell-inner p-[29.6px] space-y-6">
                        <div className="inline-flex p-4 bg-[rgba(194,118,107,0.1)] border border-[rgba(194,118,107,0.3)] rounded-[4px]">
                            <AlertTriangle className="w-8 h-8 text-[#C2766B]" />
                        </div>
                        <h1 className="text-xl font-medium text-[#C2766B]">
                            Invalid Signature
                        </h1>
                        <p className="text-sm text-[#93A096]">{error}</p>
                        <Link href="/login" className="inline-block px-6 py-3 border border-[rgba(238,234,224,0.1)] text-[#93A096] hover:text-[#EEEAE0] rounded-[999px] text-label-md font-medium transition-colors">
                            Return to Gateway
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (!userToken) {
        return (
            <div className="min-h-screen bg-transparent text-[#EEEAE0] flex items-center justify-center p-6">
                <div className="w-full max-w-md gradient-border-shell text-center space-y-6">
                    <div className="shell-inner p-[29.6px] space-y-6">
                        <div className="inline-flex p-4 bg-[rgba(159,216,189,0.1)] border border-[rgba(159,216,189,0.2)] rounded-[4px]">
                            <ShieldCheck className="w-8 h-8 text-[#9FD8BD]" />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-xl font-medium text-[#EEEAE0]">
                                Workspace Invite
                            </h1>
                            <p className="text-sm text-[#93A096]">
                                You have been invited to join
                            </p>
                            <p className="text-lg font-medium text-[#9FD8BD]">
                                {invite.workspace.name}
                            </p>
                        </div>
                        <div className="border border-[rgba(238,234,224,0.06)] bg-[rgba(238,234,224,0.02)] p-4 space-y-2 rounded-[4px]">
                            <div className="flex justify-between text-label-md">
                                <span className="text-[#93A096]">Role</span>
                                <span className="text-[#A3D1DF] font-medium">{invite.role}</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-3">
                            <Link
                                href={`/login?callbackUrl=/invite/${token}`}
                                className="w-full bg-[#EEEAE0] hover:bg-[#EEEAE0]/90 text-[#0A0F0C] rounded-[999px] py-3 border-0 transition-all text-label-md font-medium flex items-center justify-center gap-2"
                            >
                                <LogIn className="w-4 h-4" />
                                Login to Accept Invite
                            </Link>
                            <Link
                                href={`/signup?invite_token=${token}`}
                                className="w-full border border-[rgba(238,234,224,0.1)] text-[#93A096] hover:text-[#EEEAE0] hover:border-[rgba(238,234,224,0.2)] rounded-[999px] py-3 transition-all text-label-md font-medium flex items-center justify-center gap-2"
                            >
                                <UserPlus className="w-4 h-4" />
                                Create Account
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-transparent text-[#EEEAE0] flex items-center justify-center p-6 selection:bg-[#9FD8BD]/20 selection:text-[#9FD8BD]">
            <div className="w-full max-w-md gradient-border-shell text-center space-y-6">
                <div className="shell-inner p-[29.6px] space-y-6">
                    <div className="inline-flex p-4 bg-[rgba(159,216,189,0.1)] border border-[rgba(159,216,189,0.2)] rounded-[4px]">
                        <ShieldCheck className="w-8 h-8 text-[#9FD8BD]" />
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-xl font-medium text-[#EEEAE0]">
                            Workspace Invite
                        </h1>
                        <p className="text-sm text-[#93A096]">
                            You have been invited to join
                        </p>
                        <p className="text-lg font-medium text-[#9FD8BD]">
                            {invite.workspace.name}
                        </p>
                    </div>

                    <div className="border border-[rgba(238,234,224,0.06)] bg-[rgba(238,234,224,0.02)] p-4 space-y-2 rounded-[4px]">
                        <div className="flex justify-between text-label-md">
                            <span className="text-[#93A096]">Role</span>
                            <span className="text-[#A3D1DF] font-medium">{invite.role}</span>
                        </div>
                        <div className="flex justify-between text-label-md">
                            <span className="text-[#93A096]">Expires</span>
                            <span className="text-[#93A096]">{new Date(invite.expiresAt).toLocaleDateString()}</span>
                        </div>
                    </div>

                    <AcceptInviteButton token={token} workspaceName={invite.workspace.name} />
                </div>
            </div>
        </div>
    );
}
