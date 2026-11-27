import { useState } from "react";
import { displayName, useAuth } from "../auth";

export function AvatarButton() {
  const { session, setAccountOpen } = useAuth();
  return (
    <button
      onClick={() => setAccountOpen(true)}
      aria-label="Account"
      className="grid size-9 place-items-center rounded-full bg-bone font-bold text-ink"
    >
      {displayName(session)[0]?.toUpperCase()}
    </button>
  );
}

export default function Account() {
  const { session, accountOpen, setAccountOpen, changePassword, signOut } =
    useAuth();
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!accountOpen) return null;
  const close = () => {
    setAccountOpen(false);
    setCur("");
    setNext("");
    setMsg(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 8) {
      setOk(false);
      return setMsg("New password must be at least 8 characters.");
    }
    setBusy(true);
    const err = await changePassword(cur, next);
    setBusy(false);
    setOk(!err);
    setMsg(err ?? "Password changed.");
    if (!err) {
      setCur("");
      setNext("");
    }
  };

  const cls =
    "w-full rounded-xl border border-slate bg-ink px-3 py-2.5 outline-none focus:border-ash";
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/70"
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div className="w-95 rounded-3xl bg-graphite p-6">
        <div className="mb-5">
          <div className="font-display text-lg font-semibold tracking-tight">
            {displayName(session)}
          </div>
          <div className="text-sm text-smoke">{session?.user.email}</div>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="text-sm font-medium">Change password</div>
          <input
            className={cls}
            type="password"
            placeholder="Current password"
            value={cur}
            onChange={(e) => setCur(e.target.value)}
          />
          <input
            className={cls}
            type="password"
            placeholder="New password (8+ characters)"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
          {msg && (
            <p className={`text-sm ${ok ? "text-bone" : "text-ash"}`}>{msg}</p>
          )}
          <button
            disabled={busy}
            className="rounded-full bg-bone py-2.5 font-bold text-ink disabled:opacity-50"
          >
            {busy ? "Please wait…" : "Update password"}
          </button>
        </form>
        <div className="mt-5 flex gap-2">
          <button
            onClick={signOut}
            className="flex-1 rounded-full border border-slate py-2.5 text-ash hover:text-bone"
          >
            Sign out
          </button>
          <button
            onClick={close}
            className="flex-1 rounded-full border border-slate py-2.5 text-ash hover:text-bone"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
