import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardContent } from "@/components/DashboardContent";

export default async function DashboardPage() {
  const { userId } = await auth();

  // Middleware already handles this, but double-check server-side
  if (!userId) redirect("/sign-in");

  const user = await currentUser();
  const firstName = user?.firstName ?? "there";

  return <DashboardContent firstName={firstName} />;
}

