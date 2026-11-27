import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

type Res = Promise<string | null>;

type Auth = {
  session: Session | null;
  ready: boolean;
  locked: boolean;
  accountOpen: boolean;
  init: () => Promise<void>;
  signIn: (email: string, password: string) => Res;
  signUp: (name: string, email: string, password: string) => Res;
  verifySignup: (email: string, code: string) => Res;
  resendSignup: (email: string) => Res;
  sendReset: (email: string) => Res;
  resetPassword: (email: string, code: string, password: string) => Res;
  changePassword: (current: string, next: string) => Res;
  signOut: () => Promise<void>;
  setAccountOpen: (v: boolean) => void;
};

let started = false;

export const displayName = (s: Session | null) =>
  (s?.user.user_metadata?.display_name as string | undefined) ||
  s?.user.email?.split("@")[0] ||
  "You";

export const useAuth = create<Auth>((set, get) => ({
  session: null,
  ready: false,
  locked: false,
  accountOpen: false,
  init: async () => {
    if (started) return;
    started = true;
    const { data } = await supabase.auth.getSession();
    set({ session: data.session, ready: true });
    supabase.auth.onAuthStateChange((_e, s) => set({ session: s }));
  },
  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return error ? error.message : null;
  },
  signUp: async (name, email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { display_name: name.trim() } },
    });
    if (error) return error.message;
    if (data.user && data.user.identities?.length === 0)
      return "An account with this email already exists. Log in or reset your password.";
    return null;
  },
  verifySignup: async (email, code) => {
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "signup",
    });
    return error ? error.message : null;
  },
  resendSignup: async (email) => {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
    });
    return error ? error.message : null;
  },
  sendReset: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    return error ? error.message : null;
  },
  resetPassword: async (email, code, password) => {
    set({ locked: true });
    const v = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "recovery",
    });
    if (v.error) {
      set({ locked: false });
      return v.error.message;
    }
    const u = await supabase.auth.updateUser({ password });
    if (u.error) {
      await supabase.auth.signOut();
      set({ locked: false });
      return u.error.message;
    }
    set({ locked: false });
    return null;
  },
  changePassword: async (current, next) => {
    const email = get().session?.user.email;
    if (!email) return "You are not signed in.";
    const a = await supabase.auth.signInWithPassword({
      email,
      password: current,
    });
    if (a.error) return "Your current password is incorrect.";
    const { error } = await supabase.auth.updateUser({ password: next });
    return error ? error.message : null;
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ accountOpen: false });
  },
  setAccountOpen: (v) => set({ accountOpen: v }),
}));
