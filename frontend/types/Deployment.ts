export type Deployment = {
  id: number;
  deploymentName: string;
  namespace: string;
  replicas: number;
  availableReplicas: number;
  timestamp: string;
};
