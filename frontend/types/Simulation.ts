export type SimulationScenario = {
  id: string;
  name: string;
  description: string;
  durationSeconds: number;
};

export type SimulationEvent = {
  timestamp: string;
  message: string;
};

export type SimulationRun = {
  id: string;
  scenario: string;
  scenarioName: string;
  status: "RUNNING" | "COMPLETED" | "STOPPED" | "FAILED";
  startedAt: string;
  events: SimulationEvent[];
};
