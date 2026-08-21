import { redirect } from "next/navigation";
import { hasEntryPass, getSession } from "@/lib/auth";
import LoginClient from "./LoginClient";

export default async function LoginPage() {
  const okEntry = await hasEntryPass();
  if (!okEntry) redirect("/");

  const user = await getSession();
  if (user) redirect("/chat");

  return <LoginClient />;
}
