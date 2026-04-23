"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { signOutAction } from "@/lib/auth/actions";

export function SignOutButton({ label }: { label: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <form
      action={() => {
        startTransition(() => {
          signOutAction();
        });
      }}
    >
      <button
        type="submit"
        disabled={pending}
        className="btn-ghost !py-1.5 !px-3 text-[13px]"
      >
        <LogOut className="w-4 h-4" aria-hidden />
        <span className="hidden sm:inline">{label}</span>
      </button>
    </form>
  );
}
