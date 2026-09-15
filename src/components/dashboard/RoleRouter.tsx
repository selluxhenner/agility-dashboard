"use client";
// /[company] -> the role's home (ROLE_HOME). The role lives in the browser until sessions land
// in Phase 2, so the redirect happens client-side once the persisted state is in.
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ROLE_HOME } from "@/config/roles";
import { useDemo } from "./DemoProvider";
import ui from "./shared/ui.module.css";

export function RoleRouter() {
  const { ready, role, href } = useDemo();
  const router = useRouter();
  useEffect(() => { if (ready) router.replace(href(ROLE_HOME[role])); }, [ready, role, href, router]);
  return <div className={ui.loading} />;
}
