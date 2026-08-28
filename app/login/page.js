import { getSession } from "@/lib/auth";
import LoginClient from "./LoginClient";

export default async function LoginPage() {
  const currentUser = await getSession();
  return <LoginClient currentUser={currentUser} />;
}
