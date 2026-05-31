"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createWorkspace(prevState: any, formData: FormData) {
  const name = formData.get("name") as string;

  if (!name) return { error: "Workspace name is required." };

  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;

  if (!token) return { error: "Not authenticated." };

  // 1. Setup a variable outside the try/catch to hold our new URL
  let destination = "";

  try {
    const res = await fetch("http://127.0.0.1:4000/api/v1/workspaces", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return { error: errorData.message || "Failed to create workspace." };
    }

    // 2. Parse the successful response to get the new ID
    const responseData = await res.json();

    // Adjust `.data.id` if your Fastify JSON structure is slightly different!
    const newWorkspaceId = responseData.data.id;

    // 3. Set the destination URL dynamically
    destination = `/workspaces/${newWorkspaceId}/monitors`;
  } catch (err) {
    console.error("Workspace creation failed:", err);
    return { error: "Network error connecting to the server." };
  }

  // 4. Execute the redirect OUTSIDE the try/catch block
  if (destination) {
    // Optional: Clear the router cache so the sidebar updates instantly
    revalidatePath("/", "layout");
    redirect(destination);
  }
}
