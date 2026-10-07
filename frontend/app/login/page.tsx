"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function login() {
    setBusy(true); setError("");
    try {
      const response = await fetch(API_URL + "/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Authentication failed.");
      sessionStorage.setItem("cs4_access_token", data.access_token);
      sessionStorage.setItem("cs4_user", JSON.stringify(data.user));
      router.replace("/dashboard");
    } catch (e: any) { setError(e.message || "Authentication failed."); }
    finally { setBusy(false); }
  }

  return (
    <main className="min-h-screen bg-[#05070A] text-[#c9d1d9] flex items-center justify-center p-6">
      <section className="w-full max-w-md bg-[#0d1117] border border-[#30363d] rounded-xl p-7">
        <p className="font-mono text-xs text-cyan-400 tracking-[0.3em]">CASE STUDY 4</p>
        <h1 className="text-2xl font-black text-white mt-2">Secure Code Review</h1>
        <p className="text-sm text-gray-400 mt-2">Authenticated local/private review workspace.</p>
        <div className="space-y-4 mt-6">
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username"
            className="w-full bg-black border border-gray-800 rounded px-3 py-3 text-sm" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password"
            onKeyDown={e => { if (e.key === "Enter") login(); }}
            className="w-full bg-black border border-gray-800 rounded px-3 py-3 text-sm" />
          <button onClick={login} disabled={busy || !username || !password}
            className="w-full bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white font-bold rounded px-4 py-3">
            {busy ? "AUTHENTICATING..." : "SIGN IN"}
          </button>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
      </section>
    </main>
  );
}
