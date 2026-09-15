// Role router: /[company] -> the role's home (ROLE_HOME). Reads the session in Phase 2; until
// then the role is the one the dev panel set in this browser (RoleRouter).
import { RoleRouter } from "@/components/dashboard/RoleRouter";

export default function AppIndexPage() {
  return <RoleRouter />;
}
