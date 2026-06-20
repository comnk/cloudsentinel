"use client";

import Link from "next/link";
import "./Navbar.scss";

export default function Navbar() {
  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex items-center justify-between">
        <div className="text-xl font-bold">CloudSentinel</div>
        <div className="space-x-4">
          <Link href="/dashboard" className="hover:text-gray-400">
            Dashboard
          </Link>
          <Link href="/metrics-table" className="hover:text-gray-400">
            Metrics
          </Link>
          <Link href="/investigations" className="hover:text-gray-400">
            Investigations
          </Link>
          <Link href="/k8s/overview" className="hover:text-gray-400">
            Cluster
          </Link>
          <Link href="/k8s/pods" className="hover:text-gray-400">
            Pods
          </Link>
          <Link href="/k8s/deployments" className="hover:text-gray-400">
            Deployments
          </Link>
          <Link href="/k8s/timeline" className="hover:text-gray-400">
            Timeline
          </Link>
        </div>
      </div>
    </nav>
  );
}
