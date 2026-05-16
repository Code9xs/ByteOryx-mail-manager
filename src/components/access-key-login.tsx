"use client";

import { KeyRound } from "lucide-react";
import { FormEvent, useState } from "react";

export function AccessKeyLogin() {
  const [accessKey, setAccessKey] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const response = await fetch("/api/auth/access-key", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accessKey })
    });

    setSubmitting(false);

    if (!response.ok) {
      setError("Access Key 不正确");
      return;
    }

    window.location.reload();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8f6] px-4 text-ink">
      <section className="w-full max-w-sm rounded-lg border border-line bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-action/10 text-action">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-action">
              ByteOryx
            </p>
            <h1 className="mt-1 text-lg font-semibold">输入 Access Key</h1>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <label className="block space-y-1 text-sm">
            <span className="text-slate-600">Access Key</span>
            <input
              value={accessKey}
              onChange={(event) => setAccessKey(event.target.value)}
              autoFocus
              type="password"
              className="h-10 w-full rounded-md border border-line px-3 outline-none focus:border-action"
            />
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="h-10 w-full rounded-md bg-action text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "验证中..." : "进入管理器"}
          </button>
        </form>
      </section>
    </main>
  );
}
