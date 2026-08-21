import { redirect } from "next/navigation";
import { hasEntryPass } from "@/lib/auth";
import WelcomeClient from "./WelcomeClient";

export default async function WelcomePage() {
  const ok = await hasEntryPass();
  if (!ok) redirect("/");

  return <WelcomeClient />;
}
