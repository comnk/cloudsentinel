"use client";

import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar/Navbar";

import { Metric } from "@/types/Metric";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metric | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/metrics/latest`);
        if (!response.ok) return;
        const data: Metric = await response.json();
        setMetrics(data);
      } catch (error) {
        console.error("Error fetching metrics:", error);
      }
    };

    fetchMetrics();
  }, []);

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <Navbar />
      <div>
        <h2>Current CPU</h2>
        <p>{metrics?.cpuUsage ?? "—"}%</p>
      </div>
      <div>
        <h2>Current Memory</h2>
        <p>{metrics?.memoryUsage ?? "—"}%</p>
      </div>
      <div>
        <h2>Current Disk</h2>
        <p>{metrics?.diskUsage ?? "—"}%</p>
      </div>
    </div>
  );
}
