import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LoginClient from "./LoginClient";

export default async function LoginPage() {
  const user = await getSession();
  if (user) redirect("/chat");

  return <LoginClient />;
}
