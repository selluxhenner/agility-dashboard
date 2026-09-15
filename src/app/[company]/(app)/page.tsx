// Role router: /[company] -> the role's home (ROLE_HOME). Reads the session in Phase 2; demo role until then.
import { redirect } from "next/navigation";
import { ROLE_HOME } from "@/config/roles";

export default async function AppIndexPage({ params }: { params: Promise<{ company: string }> }) {
  const { company } = await params;
  redirect(`/${company}${ROLE_HOME.manager}`);
}
