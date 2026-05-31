"use client";

import "./Navbar.scss";

export default function Navbar() {
  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex items-center justify-between">
        <div className="text-xl font-bold">AstraQuant</div>
        <div className="space-x-4">
          <a href="/dashboard" className="hover:text-gray-400">
            Dashboard
          </a>
          <a href="/metrics-table" className="hover:text-gray-400">
            Metrics
          </a>
        </div>
      </div>
    </nav>
  );
}
