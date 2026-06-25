import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import { API_URL } from "@/lib/constants";
import { Mail, Terminal, Calendar, ShieldCheck } from "lucide-react";
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
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-10">
        <h1 className="text-2xl font-medium text-[#EEEAE0] flex items-center gap-3">
          <Terminal className="w-6 h-6 text-[#9FD8BD]" />
          My Account
        </h1>
        <p className="text-[#93A096] text-body-md font-medium mt-2">
          Manage your profile and security settings
        </p>
      </div>

      {/* INFO CARD */}
      <div className="glass rounded-[9px] p-[18px] mb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-[rgba(163,209,223,0.1)] border border-[rgba(163,209,223,0.2)] rounded-[4px] flex items-center justify-center text-[#A3D1DF]">
            <Terminal className="w-6 h-6" />
          </div>
          <div>
            <p className="text-lg font-medium text-[#EEEAE0]">
              {user.name || "Operator"}
            </p>
            <p className="text-body-md text-[#93A096]">
              {user.email}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-body-md text-[#93A096] font-medium">
          <Calendar className="w-3.5 h-3.5" />
          Member since {memberSince}
        </div>
      </div>

      {/* EDIT PROFILE */}
      <div className="glass rounded-[9px] p-[18px] mb-8">
        <h2 className="text-sm font-medium text-[#EEEAE0] mb-6 flex items-center gap-2">
          <Mail className="w-4 h-4 text-[#9FD8BD]" />
          Edit Profile
        </h2>
        <form action={updateProfile} className="space-y-5">
          <div>
            <label className="text-label-md text-[#93A096] block mb-1.5">
              Name
            </label>
            <input
              name="name"
              defaultValue={user.name}
              className="w-full bg-[rgba(238,234,224,0.03)] border border-[rgba(238,234,224,0.15)] rounded-[9px] px-[12px] py-[10px] text-sm text-[#EEEAE0] placeholder:text-[#93A096]/40 focus-visible:border-[#9FD8BD] focus-visible:ring-2 focus-visible:ring-[rgba(159,216,189,0.2)] outline-none transition-colors"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="text-label-md text-[#93A096] block mb-1.5">
              Email
            </label>
            <input
              name="email"
              type="email"
              defaultValue={user.email}
              className="w-full bg-[rgba(238,234,224,0.03)] border border-[rgba(238,234,224,0.15)] rounded-[9px] px-[12px] py-[10px] text-sm text-[#EEEAE0] placeholder:text-[#93A096]/40 focus-visible:border-[#9FD8BD] focus-visible:ring-2 focus-visible:ring-[rgba(159,216,189,0.2)] outline-none transition-colors"
              placeholder="email@example.com"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 bg-[#9FD8BD] hover:bg-[#9FD8BD]/90 text-[#0A0F0C] rounded-[999px] text-label-md font-medium transition-all border-0"
          >
            Save Changes
          </button>
        </form>
      </div>

      {/* CHANGE PASSWORD */}
      <ChangePasswordForm />

      {/* SECURITY NOTE */}
      <div className="glass rounded-[9px] p-[12px] flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-[#A3D1DF] mt-0.5 shrink-0" />
        <p className="text-body-md text-[#93A096]/60 font-medium leading-relaxed">
          Your credentials are hashed and stored securely. We never store
          plain-text passwords. Session tokens expire after 15 minutes.
        </p>
      </div>
    </div>
  );
}
