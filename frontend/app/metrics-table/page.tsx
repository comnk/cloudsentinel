"use client";

import { useEffect, useState } from "react";

import { Metric } from "@/types/Metric";
import Navbar from "@/components/Navbar/Navbar";

export default function MetricsTablePage() {
  const [metrics, setMetrics] = useState<Metric[]>([]);

  useEffect(() => {
    const fetchMetricsHistory = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/metrics/history`,
        );
        if (!response.ok) throw new Error("Failed to fetch metrics history");
        const data: Metric[] = await response.json();
        setMetrics(data);
      } catch (error) {
        console.error("Error fetching metrics history:", error);
      }
    };

    fetchMetricsHistory();
  }, []);

  return (
    <div>
      <Navbar />
      <h1>Metrics Table</h1>
      <table>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Host</th>
            <th>CPU</th>
            <th>Memory</th>
            <th>Disk</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((metric) => (
            <tr key={metric.id}>
              <td>{metric.timestamp}</td>
              <td>{metric.host}</td>
              <td>{metric.cpuUsage}%</td>
              <td>{metric.memoryUsage}%</td>
              <td>{metric.diskUsage}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
