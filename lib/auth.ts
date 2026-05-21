"use client";

import { supabase } from "@/lib/supabase";
import { Profile, roleRoutes, UserRole } from "@/types/profile";

export async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, company_name, role")
    .eq("id", userId)
    .single();

  if (error) {
    throw error;
  }

  return data as Profile;
}

export function routeForRole(role: UserRole | null | undefined) {
  return role ? roleRoutes[role] : "/select-role";
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = "/login";
}
