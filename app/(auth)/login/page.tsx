"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";
import { fetchProfile, routeForRole } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError || !data.user) {
        setError(authError?.message ?? "Unable to log in. Please try again.");
        setLoading(false);
        return;
      }

      const profile = await fetchProfile(data.user.id);
      router.replace(routeForRole(profile.role));
    } catch (error) {
      if (error instanceof TypeError) {
        setError("Cannot reach Supabase. Check the running app URL, internet connection, and env values.");
        setLoading(false);
        return;
      }

      router.replace("/select-role");
    }
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Log in to Wajenzi.ai"
      subtitle="Access your procurement dashboard with your email and password."
    >
      <form className="form" onSubmit={handleLogin}>
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
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Your password"
            required
          />
        </label>

        {error ? <p className="form-error">{error}</p> : null}

        <button className="button primary full" disabled={loading} type="submit">
          <LogIn size={18} />
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      <p className="form-footer">
        New to Wajenzi.ai? <Link href="/signup">Create an account</Link>
      </p>
    </AuthShell>
  );
}
