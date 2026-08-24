"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { me } from "@/lib/api";
import { splitMarker, tintAt } from "@/lib/version";

const ROLE_COLOR: Record<string, string> = {
  admin: "text-rose-700",
  qa: "text-violet-700",
  member: "text-teal-700",
};

export default function IdentityBadge({
  sha,
  marker,
  tintIndex,
}: {
  sha: string;
  marker: string;
  tintIndex: number;
}) {
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

  const tint = tintAt(tintIndex);
  const when = splitMarker(marker);

  return (
    <div
      data-testid="identity-badge"
      className="inline-flex items-stretch overflow-hidden rounded-2xl border-[1.5px] border-slate-300 bg-white/90 backdrop-blur whitespace-nowrap"
    >
      {username && (
        <div className="flex flex-col justify-center gap-1 px-5 py-2.5">
          <span className="font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-slate-400">
            user
          </span>
          <span
            data-testid="badge-user"
            className="font-mono text-lg font-semibold leading-none text-slate-800"
          >
            {username}
          </span>
        </div>
      )}

      {role && (
        <div className="flex flex-col justify-center gap-1 border-l border-slate-200 px-5 py-2.5">
          <span className="font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-slate-400">
            role
          </span>
          <span
            data-testid="badge-role"
            className={`font-mono text-lg font-semibold uppercase leading-none tracking-wide ${
              ROLE_COLOR[role] ?? "text-slate-600"
            }`}
          >
            {role}
          </span>
        </div>
      )}

      <div
        title={marker}
        className="flex flex-col justify-center gap-1 border-l border-slate-200 bg-slate-50/80 px-5 py-2.5"
      >
        <span className="font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-slate-400">
          version
        </span>
        <span className="flex items-center gap-2.5 font-mono text-lg font-semibold leading-none">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${tint.dot}`} />
          <span data-testid="badge-version" className={tint.text}>
            {sha}
          </span>
          <span className="flex flex-col items-end gap-0.5 leading-none">
            {when.date && (
              <span className="text-[9px] font-medium uppercase tracking-[0.12em] text-slate-400">
                {when.date}
              </span>
            )}
            <span className="text-sm font-medium text-slate-500">
              {when.time}
            </span>
          </span>
        </span>
      </div>
    </div>
  );
}
