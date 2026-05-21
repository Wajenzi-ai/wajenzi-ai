"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";
import { supabase } from "@/lib/supabase";
import { roles, UserRole } from "@/types/profile";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [role, setRole] = useState<UserRole>("contractor");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            company_name: companyName,
            role
          }
        }
      });

      if (authError || !data.user) {
        setError(authError?.message ?? "Unable to create account. Please try again.");
        setLoading(false);
        return;
      }

      const { error: profileError } = await supabase.from("profiles").upsert({
        id: data.user.id,
        full_name: fullName,
        email,
        company_name: companyName,
        role
      });

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }

      router.replace(`/${role}`);
    } catch {
      setError("Cannot reach Supabase. Check the running app URL, internet connection, and env values.");
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Create account"
      title="Start your procurement workspace"
      subtitle="Add your company details and choose the dashboard role you need."
    >
      <form className="form" onSubmit={handleSignup}>
        <label>
          Full name
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Jane Wanjiku"
            required
          />
        </label>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Minimum 6 characters"
            required
          />
        </label>
        <label>
          Company name
          <input
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            placeholder="Company Ltd"
            required
          />
        </label>
        <label>
          Role
          <select value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
            {roles.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        {error ? <p className="form-error">{error}</p> : null}

        <button className="button primary full" disabled={loading} type="submit">
          <UserPlus size={18} />
          {loading ? "Creating account..." : "Sign Up"}
        </button>
      </form>

      <p className="form-footer">
        Already have an account? <Link href="/login">Login</Link>
      </p>
    </AuthShell>
  );
}
