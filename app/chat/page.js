import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import ChatClient from "./ChatClient";

export default async function ChatPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  return <ChatClient user={user} />;
}
