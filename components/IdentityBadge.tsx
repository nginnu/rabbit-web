"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { me } from "@/lib/api";
import { splitMarker, tintAt } from "@/lib/version";
import { DEPLOY_MARKER, DEPLOY_TINT } from "@/app/deploy-marker";

const GIT_SHA = process.env.NEXT_PUBLIC_GIT_SHA || "dev";

function Field({
  label,
  children,
  testId,
}: {
  label: string;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
        {label}
      </span>
      <span
        data-testid={testId}
        className="font-mono text-4xl font-bold leading-none tracking-tight text-white"
      >
        {children}
      </span>
    </div>
  );
}

export default function IdentityBadge() {
  const pathname = usePathname();
  const [username, setUsername] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    me().then((res) => {
      if (res.ok && "user_id" in res.data) {
        setUsername(res.data.username);
        setRole(res.data.role);
      } else {
        setUsername(null);
        setRole(null);
      }
    });
  }, [pathname]);

  const tint = tintAt(DEPLOY_TINT);
  const when = splitMarker(DEPLOY_MARKER);

  return (
    <div
      data-testid="identity-badge"
      title={DEPLOY_MARKER}
      className={`flex w-full flex-wrap items-center gap-x-16 gap-y-6 rounded-2xl px-9 py-7 shadow-glass-sm ${tint.solid}`}
    >
      <Field label="user" testId="badge-user">
        {username ?? "—"}
      </Field>

      <Field label="role" testId="badge-role">
        {role ? role.toUpperCase() : "—"}
      </Field>

      <Field label="version" testId="badge-version">
        {GIT_SHA}
      </Field>

      <Field label="deployed">
        <span className="flex items-baseline gap-2">
          {when.date && (
            <span className="text-2xl font-semibold text-white/70">
              {when.date}
            </span>
          )}
          {when.time}
        </span>
      </Field>
    </div>
  );
}
