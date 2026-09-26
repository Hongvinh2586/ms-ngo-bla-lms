"use client";

import { useState, useTransition } from "react";
import type { UserRole } from "@/lib/types";
import { setUserRole } from "./actions";

const ROLES: UserRole[] = ["student", "teacher", "admin"];

export default function RoleSelect({
  profileId,
  role,
  disabled,
}: {
  profileId: string;
  role: UserRole;
  disabled?: boolean;
}) {
  const [current, setCurrent] = useState<UserRole>(role);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(newRole: UserRole) {
    setError(null);
    const previous = current;
    setCurrent(newRole);

    startTransition(async () => {
      try {
        await setUserRole(profileId, newRole);
      } catch (err) {
        setCurrent(previous);
        setError(err instanceof Error ? err.message : "Could not update role.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        value={current}
        disabled={disabled || isPending}
        onChange={(e) => handleChange(e.target.value as UserRole)}
        className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent disabled:opacity-60"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      {disabled && <span className="text-[10px] text-ink-faint">This is you</span>}
      {error && <span className="text-xs text-bad">{error}</span>}
    </div>
  );
}
