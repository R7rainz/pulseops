import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import { API_URL } from "@/lib/constants";
import { Key, Mail, Terminal, User, Calendar, ShieldCheck } from "lucide-react";
import { updateProfile, changePassword } from "./actions";

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
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-10">
        <h1 className="text-2xl font-black uppercase tracking-widest text-zinc-100 flex items-center gap-3">
          <Terminal className="w-6 h-6 text-emerald-400" />
          My Account
        </h1>
        <p className="text-zinc-600 text-xs uppercase tracking-widest font-bold mt-2">
          Manage your profile and security settings
        </p>
      </div>

      {/* INFO CARD */}
      <div className="border-2 border-zinc-900 bg-zinc-950 p-6 mb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-zinc-950 border-2 border-zinc-800 flex items-center justify-center text-cyan-400">
            <Terminal className="w-6 h-6" />
          </div>
          <div>
            <p className="text-lg font-bold text-zinc-100 uppercase tracking-widest">
              {user.name || "Operator"}
            </p>
            <p className="text-xs text-zinc-600 uppercase tracking-widest">
              {user.email}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-600 uppercase tracking-widest font-bold">
          <Calendar className="w-3.5 h-3.5" />
          Member since {memberSince}
        </div>
      </div>

      {/* EDIT PROFILE */}
      <div className="border-2 border-zinc-900 bg-zinc-950 p-6 mb-8">
        <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-widest mb-6 flex items-center gap-2">
          <Mail className="w-4 h-4 text-emerald-400" />
          Edit Profile
        </h2>
        <form action={updateProfile} className="space-y-5">
          <div>
            <label className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] font-bold block mb-1.5">
              Name
            </label>
            <input
              name="name"
              defaultValue={user.name}
              className="w-full px-3 py-2.5 bg-zinc-950 border-2 border-zinc-800 text-zinc-200 text-sm uppercase tracking-widest font-bold placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] font-bold block mb-1.5">
              Email
            </label>
            <input
              name="email"
              type="email"
              defaultValue={user.email}
              className="w-full px-3 py-2.5 bg-zinc-950 border-2 border-zinc-800 text-zinc-200 text-sm uppercase tracking-widest font-bold placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="email@example.com"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold uppercase tracking-widest transition-colors"
          >
            Save Changes
          </button>
        </form>
      </div>

      {/* CHANGE PASSWORD */}
      <div className="border-2 border-zinc-900 bg-zinc-950 p-6 mb-8">
        <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-widest mb-6 flex items-center gap-2">
          <Key className="w-4 h-4 text-amber-400" />
          Change Password
        </h2>
        <form action={changePassword} className="space-y-5">
          <div>
            <label className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] font-bold block mb-1.5">
              Current Password
            </label>
            <input
              name="currentPassword"
              type="password"
              className="w-full px-3 py-2.5 bg-zinc-950 border-2 border-zinc-800 text-zinc-200 text-sm uppercase tracking-widest font-bold placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="Current password"
            />
          </div>
          <div>
            <label className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] font-bold block mb-1.5">
              New Password
            </label>
            <input
              name="newPassword"
              type="password"
              className="w-full px-3 py-2.5 bg-zinc-950 border-2 border-zinc-800 text-zinc-200 text-sm uppercase tracking-widest font-bold placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="New password"
            />
          </div>
          <div>
            <label className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] font-bold block mb-1.5">
              Confirm New Password
            </label>
            <input
              name="confirmPassword"
              type="password"
              className="w-full px-3 py-2.5 bg-zinc-950 border-2 border-zinc-800 text-zinc-200 text-sm uppercase tracking-widest font-bold placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="Confirm new password"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold uppercase tracking-widest transition-colors"
          >
            Update Password
          </button>
        </form>
      </div>

      {/* SECURITY NOTE */}
      <div className="border-2 border-zinc-900/50 bg-zinc-950/50 p-4 flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
        <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold leading-relaxed">
          Your credentials are hashed and stored securely. We never store
          plain-text passwords. Session tokens expire after 15 minutes.
        </p>
      </div>
    </div>
  );
}
