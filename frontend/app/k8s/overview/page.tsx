"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar/Navbar";
import Link from "next/link";

type Pod = { status: string };
type Deployment = { id: number };
type Node = { id: number };

const API = process.env.NEXT_PUBLIC_API_URL;

export default function ClusterOverviewPage() {
  const [pods, setPods] = useState<Pod[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [podRes, deployRes, nodeRes] = await Promise.all([
          fetch(`${API}/k8s/pods`),
          fetch(`${API}/k8s/deployments`),
          fetch(`${API}/k8s/nodes`),
        ]);
        if (podRes.ok) setPods(await podRes.json());
        if (deployRes.ok) setDeployments(await deployRes.json());
        if (nodeRes.ok) setNodes(await nodeRes.json());
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
    const interval = setInterval(fetchAll, 15000);
    return () => clearInterval(interval);
  }, []);

  const running = pods.filter((p) => p.status === "Running").length;
  const failed = pods.filter((p) => p.status === "Failed").length;

  return (
    <div className="min-h-screen w-screen">
      <Navbar />
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">Cluster Overview</h1>
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-10">
              <StatCard label="Nodes" value={nodes.length} color="text-blue-600" href="/k8s/nodes" />
              <StatCard label="Pods Running" value={running} color="text-green-600" href="/k8s/pods" />
              <StatCard label="Pods Failed" value={failed} color={failed > 0 ? "text-red-600" : "text-gray-400"} href="/k8s/pods" />
              <StatCard label="Deployments" value={deployments.length} color="text-purple-600" href="/k8s/deployments" />
            </div>
            <div className="flex gap-4 text-sm">
              <Link href="/k8s/pods" className="text-blue-600 hover:underline">View Pods →</Link>
              <Link href="/k8s/deployments" className="text-blue-600 hover:underline">View Deployments →</Link>
              <Link href="/k8s/timeline" className="text-blue-600 hover:underline">View Timeline →</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  href,
}: {
  label: string;
  value: number;
  color: string;
  href: string;
}) {
  return (
    <Link href={href} className="rounded-lg border p-5 hover:bg-gray-50 block">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-4xl font-bold mt-1 ${color}`}>{value}</p>
    </Link>
  );
}
