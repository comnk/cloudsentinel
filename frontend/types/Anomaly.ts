export type Anomaly = {
  id: number;
  timestamp: string;
  host: string;
  type: string;
  severity: string;
  score: number;
  message: string;
  explanation: string | null;
};
