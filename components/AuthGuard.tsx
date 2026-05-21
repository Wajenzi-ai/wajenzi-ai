"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { fetchProfile, routeForRole } from "@/lib/auth";
import { Profile, UserRole } from "@/types/profile";

type AuthGuardProps = {
  allowedRole?: UserRole;
  children: (profile: Profile) => ReactNode;
};

export function AuthGuard({ allowedRole, children }: AuthGuardProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.replace("/login");
        return;
      }

      try {
        const userProfile = await fetchProfile(data.user.id);

        if (!userProfile.role) {
          router.replace("/select-role");
          return;
        }

        if (allowedRole && userProfile.role !== allowedRole) {
          router.replace(routeForRole(userProfile.role));
          return;
        }

        setProfile(userProfile);
      } catch {
        router.replace("/select-role");
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, [allowedRole, router]);

  if (loading || !profile) {
    return (
      <main className="center-screen">
        <div className="loader-card">
          <span className="spinner" />
          <p>Loading your workspace...</p>
        </div>
      </main>
    );
  }

  return <>{children(profile)}</>;
}
