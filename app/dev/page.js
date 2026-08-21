import { redirect } from "next/navigation";
import DevClient from "./DevClient";

export default async function DevPage() {
  if (process.env.DEV_MODE !== "true") {
    redirect("/");
  }

  return <DevClient />;
}
