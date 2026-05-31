export type Metric = {
    id: number;
    timestamp: string;
    host: string;
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
};