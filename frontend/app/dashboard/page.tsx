"use client";

import Navbar from "../components/Navbar/Navbar";

export default function DashboardPage() {
  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <Navbar />
      <h1 className="text-4xl font-bold">No incidents yet</h1>
    </div>
  );
}
