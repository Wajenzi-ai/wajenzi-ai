"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";
import { supabase } from "@/lib/supabase";
import { roles, UserRole } from "@/types/profile";

export default function SelectRolePage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<UserRole>("contractor");
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.replace("/login");
        return;
      }

      setUserId(data.user.id);
      setEmail(data.user.email ?? "");
      setFullName((data.user.user_metadata.full_name as string | undefined) ?? "");
      setCompanyName((data.user.user_metadata.company_name as string | undefined) ?? "");
    }

    loadUser();
  }, [router]);

  async function saveRole() {
    if (!userId) return;

    setError("");
    setLoading(true);

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("full_name, company_name")
      .eq("id", userId)
      .maybeSingle();

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      email,
      full_name: existingProfile?.full_name ?? fullName,
      company_name: existingProfile?.company_name ?? companyName,
      role: selectedRole
    });

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    router.replace(`/${selectedRole}`);
  }

  return (
    <AuthShell
      eyebrow="Choose role"
      title="Select your Wajenzi.ai workspace"
      subtitle="Your role controls which dashboard opens after login."
    >
      <div className="role-list">
        {roles.map((role) => (
          <button
            className={`role-option ${selectedRole === role.value ? "selected" : ""}`}
            key={role.value}
            onClick={() => setSelectedRole(role.value)}
            type="button"
          >
            <span>
              <strong>{role.label}</strong>
              <small>{role.description}</small>
            </span>
            {selectedRole === role.value ? <CheckCircle2 size={20} /> : null}
          </button>
        ))}
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <button className="button primary full" disabled={loading || !userId} onClick={saveRole}>
        {loading ? "Saving role..." : "Continue"}
      </button>
    </AuthShell>
  );
}
