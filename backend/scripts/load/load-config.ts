export type LoadProfileName = "smoke" | "baseline";

export interface EndpointThreshold {
  p95Ms: number;
  p99Ms: number;
  maxErrorRate: number;
}

export interface LoadProfile {
  name: LoadProfileName;
  seed: {
    properties: number;
    unitsPerProperty: number;
    roomsPerUnit: number;
    historicalBookings: number;
  };
  workloads: {
    availability: { iterations: number; concurrency: number };
    bookingRace: { scenarios: number; contenders: number };
    operationsBoard: { iterations: number; concurrency: number };
    roomBoard: { iterations: number; concurrency: number };
    reporting: { iterations: number; concurrency: number };
  };
  thresholds: Record<string, EndpointThreshold>;
}

const smokeReadThreshold: EndpointThreshold = {
  p95Ms: 1_500,
  p99Ms: 3_000,
  maxErrorRate: 0,
};

const smokeWriteThreshold: EndpointThreshold = {
  p95Ms: 3_000,
  p99Ms: 5_000,
  maxErrorRate: 0,
};

const scheduledReadThreshold: EndpointThreshold = {
  p95Ms: 1_000,
  p99Ms: 2_000,
  maxErrorRate: 0.01,
};

const scheduledWriteThreshold: EndpointThreshold = {
  p95Ms: 2_000,
  p99Ms: 4_000,
  maxErrorRate: 0.01,
};

export const loadProfiles: Record<LoadProfileName, LoadProfile> = {
  smoke: {
    name: "smoke",
    seed: {
      properties: 2,
      unitsPerProperty: 8,
      roomsPerUnit: 2,
      historicalBookings: 200,
    },
    workloads: {
      availability: { iterations: 20, concurrency: 2 },
      bookingRace: { scenarios: 2, contenders: 2 },
      operationsBoard: { iterations: 10, concurrency: 2 },
      roomBoard: { iterations: 10, concurrency: 2 },
      reporting: { iterations: 6, concurrency: 2 },
    },
    thresholds: {
      availability: smokeReadThreshold,
      inventoryLock: smokeWriteThreshold,
      bookingCreate: smokeWriteThreshold,
      operationsBoard: smokeReadThreshold,
      roomBoard: smokeReadThreshold,
      reporting: smokeReadThreshold,
    },
  },
  baseline: {
    name: "baseline",
    seed: {
      properties: 5,
      unitsPerProperty: 40,
      roomsPerUnit: 2,
      historicalBookings: 5_000,
    },
    workloads: {
      availability: { iterations: 200, concurrency: 8 },
      bookingRace: { scenarios: 10, contenders: 5 },
      operationsBoard: { iterations: 100, concurrency: 5 },
      roomBoard: { iterations: 100, concurrency: 5 },
      reporting: { iterations: 50, concurrency: 3 },
    },
    thresholds: {
      availability: scheduledReadThreshold,
      inventoryLock: scheduledWriteThreshold,
      bookingCreate: scheduledWriteThreshold,
      operationsBoard: scheduledReadThreshold,
      roomBoard: scheduledReadThreshold,
      reporting: scheduledReadThreshold,
    },
  },
};

export const parseLoadProfileName = (value: string | undefined): LoadProfileName => {
  if (value === "smoke" || value === "baseline") {
    return value;
  }
  throw new Error("Load profile must be either smoke or baseline");
};
