import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import DevClient from "./DevClient";

export default async function DevPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  return <DevClient />;
}
