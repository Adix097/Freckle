import { useState } from "react";
import { useAuth } from "../auth";

type Mode = "login" | "signup" | "code" | "forgot" | "reset";

const inputCls =
  "w-full rounded-xl border border-slate bg-graphite px-4 py-3 outline-none focus:border-ash";

const titles: Record<Mode, string> = {
  login: "Welcome back",
  signup: "Create your account",
  code: "Check your email",
  forgot: "Reset your password",
  reset: "Enter your code",
};

export default function AuthScreen() {
  const a = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const go = (m: Mode) => {
    setMode(m);
    setErr(null);
    setInfo(null);
  };

  const run = async (fn: () => Promise<string | null>, ok: () => void) => {
    setBusy(true);
    setErr(null);
    setInfo(null);
    const e = await fn();
    setBusy(false);
    if (e) setErr(e);
    else ok();
  };

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (mode === "login")
      return run(
        () => a.signIn(email, password),
        () => {},
      );
    if (mode === "signup") {
      if (!name.trim()) return setErr("Enter your name.");
      if (password.length < 8)
        return setErr("Password must be at least 8 characters.");
      return run(
        () => a.signUp(name, email, password),
        () => go("code"),
      );
    }
    if (mode === "code")
      return run(
        () => a.verifySignup(email, code),
        () => {},
      );
    if (mode === "forgot")
      return run(
        () => a.sendReset(email),
        () => go("reset"),
      );
    if (password.length < 8)
      return setErr("Password must be at least 8 characters.");
    return run(
      () => a.resetPassword(email, code, password),
      () => {
        setPassword("");
        setCode("");
        go("login");
        setInfo("Password changed. Log in with your new password.");
      },
    );
  };

  const resend = () =>
    run(
      () => (mode === "code" ? a.resendSignup(email) : a.sendReset(email)),
      () => setInfo("A new code is on its way."),
    );

  const button = {
    login: "Log in",
    signup: "Sign up",
    code: "Verify",
    forgot: "Send code",
    reset: "Change password",
  }[mode];

  return (
    <div className="scheme-dark grid h-screen place-items-center bg-ink px-4 font-sans text-bone">
      <form onSubmit={submit} className="w-full max-w-sm">
        <div className="mb-8 text-center font-display text-3xl font-extrabold tracking-tight">
          freckle
        </div>
        <h1 className="mb-1 font-display text-xl font-semibold tracking-tight">
          {titles[mode]}
        </h1>
        {(mode === "code" || mode === "reset") && (
          <p className="mb-4 text-sm text-smoke">We sent a code to {email}.</p>
        )}
        {mode === "forgot" && (
          <p className="mb-4 text-sm text-smoke">
            We will email you a code to set a new password.
          </p>
        )}
        <div className="mt-4 flex flex-col gap-3">
          {mode === "signup" && (
            <input
              className={inputCls}
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          )}
          {mode !== "code" && mode !== "reset" && (
            <input
              className={inputCls}
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus={mode !== "signup"}
            />
          )}
          {(mode === "code" || mode === "reset") && (
            <input
              className={`${inputCls} tracking-[0.4em]`}
              inputMode="numeric"
              maxLength={10}
              placeholder="Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
            />
          )}
          {(mode === "login" || mode === "signup" || mode === "reset") && (
            <input
              className={inputCls}
              type="password"
              placeholder={
                mode === "reset" ? "New password (8+ characters)" : "Password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </div>
        {err && <p className="mt-3 wrap-break-word text-sm text-ash">{err}</p>}
        {info && <p className="mt-3 text-sm text-bone">{info}</p>}
        <button
          disabled={busy}
          className="mt-5 w-full rounded-full bg-bone py-3 font-bold text-ink disabled:opacity-50"
        >
          {busy ? "Please wait…" : button}
        </button>
        <div className="mt-4 flex flex-col items-center gap-2 text-sm text-smoke">
          {mode === "login" && (
            <>
              <button
                type="button"
                onClick={() => go("forgot")}
                className="hover:text-bone"
              >
                Forgot password?
              </button>
              <button
                type="button"
                onClick={() => go("signup")}
                className="hover:text-bone"
              >
                New here? Create an account
              </button>
            </>
          )}
          {mode === "signup" && (
            <button
              type="button"
              onClick={() => go("login")}
              className="hover:text-bone"
            >
              Already have an account? Log in
            </button>
          )}
          {(mode === "code" || mode === "reset") && (
            <button type="button" onClick={resend} className="hover:text-bone">
              Resend code
            </button>
          )}
          {(mode === "code" || mode === "forgot" || mode === "reset") && (
            <button
              type="button"
              onClick={() => go("login")}
              className="hover:text-bone"
            >
              Back to log in
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
