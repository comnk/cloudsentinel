export type Pod = {
  id: number;
  podName: string;
  namespace: string;
  status: string;
  node: string;
  restarts: number;
  timestamp: string;
};
