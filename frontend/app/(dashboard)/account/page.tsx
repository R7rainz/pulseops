import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import { API_URL } from "@/lib/constants";
import { Mail, Calendar, ShieldCheck } from "lucide-react";
import { updateProfile } from "./actions";
import ChangePasswordForm from "./ChangePasswordForm";

export default async function AccountPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;

  if (!token) redirect("/login");

  let user = { id: 0, name: "", email: "", createdAt: "" };

  try {
    const res = await apiFetch(`${API_URL}/api/v1/auth/me`, { token, cookieStore });
    if (res.ok) {
      const json = await res.json();
      user = json.data || user;
    }
  } catch {
    /* fallback to empty */
  }

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "N/A";

  return (
    <div className="mx-auto max-w-3xl p-6 md:p-10">
      <div className="mb-8 border-b border-border pb-5">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your profile and security</p>
      </div>

      {/* INFO CARD */}
      <div className="glass mb-6 rounded-lg p-6">
        <div className="mb-5 flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-info/30 bg-info/10 font-display text-xl font-semibold text-info">
            {(user.name || user.email || "?").charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-semibold text-foreground">{user.name || "Operator"}</p>
            <p className="truncate font-mono text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          Member since {memberSince}
        </div>
      </div>

      {/* EDIT PROFILE */}
      <div className="glass mb-6 rounded-lg p-6">
        <h2 className="mb-5 flex items-center gap-2 font-display text-sm font-semibold text-foreground">
          <Mail className="h-4 w-4 text-up" /> Profile
        </h2>
        <form action={updateProfile} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="acc-name" className="block text-sm font-medium text-foreground">Name</label>
            <input id="acc-name" name="name" defaultValue={user.name} className="field" placeholder="Your name" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="acc-email" className="block text-sm font-medium text-foreground">Email</label>
            <input id="acc-email" name="email" type="email" defaultValue={user.email} className="field" placeholder="you@company.com" />
          </div>
          <button type="submit" className="btn btn-primary">Save changes</button>
        </form>
      </div>

      {/* CHANGE PASSWORD */}
      <ChangePasswordForm />

      {/* SECURITY NOTE */}
      <div className="mt-6 flex items-start gap-3 rounded-lg border border-border p-4">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-info" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Your credentials are hashed and stored securely — we never store plain-text passwords. Session tokens expire after 15 minutes.
        </p>
      </div>
    </div>
  );
}
