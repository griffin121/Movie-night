import { redirect } from "next/navigation";
const { getCurrentUser } = require("../lib/currentUser");
import Dashboard from "./Dashboard";

export default function Home() {
  const user = getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return <Dashboard user={user} />;
}
