import { redirect } from "next/navigation";

export default function Home() {
  // Bounces users from "/" to "/login" automatically
  redirect("/login");
}
