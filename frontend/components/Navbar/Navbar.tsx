"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PRIMARY_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/metrics-table", label: "Metrics" },
  { href: "/anomalies", label: "Anomalies" },
  { href: "/investigations", label: "Investigations" },
  { href: "/simulation-lab", label: "Sim Lab" },
];

const K8S_LINKS = [
  { href: "/k8s/overview", label: "Overview" },
  { href: "/k8s/pods", label: "Pods" },
  { href: "/k8s/deployments", label: "Deployments" },
  { href: "/k8s/timeline", label: "Timeline" },
];

function NavLink({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
        active
          ? "bg-slate-700 text-white"
          : "text-slate-400 hover:text-white hover:bg-slate-700"
      }`}
    >
      {label}
    </Link>
  );
}

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-slate-900 text-white sticky top-0 z-50 border-b border-slate-800">
      <div className="max-w-screen-xl mx-auto px-4">
        <div className="flex items-center h-14 gap-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-white font-semibold text-base tracking-tight shrink-0"
          >
            <span className="inline-block w-2 h-2 rounded-full bg-indigo-400" />
            CloudSentinel
          </Link>

          <div className="flex items-center gap-1">
            {PRIMARY_LINKS.map((link) => (
              <NavLink key={link.href} {...link} pathname={pathname} />
            ))}
          </div>

          <div className="flex items-center gap-1 ml-auto pl-4 border-l border-slate-700">
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-widest mr-1">
              K8s
            </span>
            {K8S_LINKS.map((link) => (
              <NavLink key={link.href} {...link} pathname={pathname} />
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
