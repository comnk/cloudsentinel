export type ClusterEvent = {
  id: number;
  reason: string;
  message: string;
  namespace: string;
  resource: string;
  timestamp: string;
};
