import type {
  ApiAllocationRequest,
  ApiAllocationResponse,
  ApiParkingStatus,
  ApiSimulationRequest,
  ApiSimulationResponse,
  ApiComparisonRequest,
  ApiComparisonResponse,
  ApiAllocationsResponse,
  ApiUpdateAllocationRequest,
  ParkingData,
  VehicleEntry,
  VehicleType,
  ParkingAlgorithm,
  AlgorithmComparison,
} from "@/types/parking";

const API_BASE_URL = "http://localhost:8000/api";

/**
 * Fetches the current parking status from the API
 */
export async function fetchParkingStatus(): Promise<ParkingData> {
  try {
    const response = await fetch(`${API_BASE_URL}/parking/status`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    // Transform API data to frontend model
    return transformApiStatusToFrontend(data);
  } catch (error) {
    throw error;
  }
}

/**
 * Allocates a parking spot for a vehicle
 */
export async function allocateParking(
  vehicleEntry: VehicleEntry,
  algorithm: ParkingAlgorithm = "algorithm"
): Promise<ApiAllocationResponse> {
  try {
    // The backend expects vehicle_plate_num, vehicle_plate_type, vehicle_type, arrival_time, departure_time, priority_level
    const now = new Date();
    const arrivalTime = vehicleEntry.arrivalTime || now.toISOString();
    const departureTime =
      vehicleEntry.expectedDeparture ||
      new Date(
        now.getTime() + (vehicleEntry.stayDuration || 1) * 60 * 60 * 1000
      ).toISOString();

    const payload: any = {
      vehicle_plate_num: vehicleEntry.licensePlate,
      vehicle_plate_type: mapVehicleTypeToApi(vehicleEntry.vehicleType),
      vehicle_type: getVehicleTypeNumber(vehicleEntry.vehicleType),
      arrival_time: arrivalTime,
      departure_time: departureTime,
      priority_level: calculatePriorityLevel(
        vehicleEntry.vehicleType,
        vehicleEntry.priorityLevel
      ),
    };

    const response = await fetch(`${API_BASE_URL}/parking/allocate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}

/**
 * Gets all allocations with optional filters
 */
export async function getAllocations(
  activeOnly = true,
  vehiclePlateNum?: string
): Promise<ApiAllocationsResponse> {
  try {
    const params = new URLSearchParams();
    if (activeOnly) params.append("active_only", "true");
    if (vehiclePlateNum) params.append("vehicle_plate_num", vehiclePlateNum);

    const response = await fetch(
      `${API_BASE_URL}/parking/allocations?${params.toString()}`
    );
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (error) {
    throw error;
  }
}

/**
 * Runs a strategy simulation
 */
export async function runSimulation(
  vehicles: VehicleEntry[],
  strategy: ParkingAlgorithm
): Promise<ApiSimulationResponse> {
  try {
    const payload: ApiSimulationRequest = {
      vehicles: vehicles.map((vehicle) => ({
        vehicle_plate_num: vehicle.licensePlate,
        vehicle_plate_type: mapVehicleTypeToApi(vehicle.vehicleType),
        vehicle_type: getVehicleTypeNumber(vehicle.vehicleType),
        arrival_time: vehicle.arrivalTime || new Date().toISOString(),
        departure_time:
          vehicle.expectedDeparture ||
          new Date(
            Date.now() + (vehicle.stayDuration || 1) * 60 * 60 * 1000
          ).toISOString(),
        priority_level: calculatePriorityLevel(
          vehicle.vehicleType,
          vehicle.priorityLevel
        ),
      })),
      allocation_strategy: strategy,
    };

    const response = await fetch(`${API_BASE_URL}/parking/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (error) {
    throw error;
  }
}

/**
 * Compares all allocation strategies
 */
export async function compareAllStrategies(
  vehicles: VehicleEntry[]
): Promise<ApiComparisonResponse> {
  try {
    const payload: ApiComparisonRequest = vehicles.map((vehicle) => ({
      vehicle_plate_num: vehicle.licensePlate,
      vehicle_plate_type: mapVehicleTypeToApi(vehicle.vehicleType),
      vehicle_type: getVehicleTypeNumber(vehicle.vehicleType),
      arrival_time: vehicle.arrivalTime || new Date().toISOString(),
      departure_time:
        vehicle.expectedDeparture ||
        new Date(
          Date.now() + (vehicle.stayDuration || 1) * 60 * 60 * 1000
        ).toISOString(),
      priority_level: calculatePriorityLevel(
        vehicle.vehicleType,
        vehicle.priorityLevel
      ),
    }));

    const response = await fetch(`${API_BASE_URL}/parking/compare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (error) {
    throw error;
  }
}

/**
 * Updates an existing allocation
 */
export async function updateAllocation(
  allocationId: number,
  departureTime: string
): Promise<{ success: boolean; message: string }> {
  try {
    const payload: ApiUpdateAllocationRequest = {
      departure_time: departureTime,
    };
    const response = await fetch(
      `${API_BASE_URL}/parking/allocation/${allocationId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (error) {
    throw error;
  }
}

/**
 * Ends an allocation (vehicle exit)
 */
export async function endAllocation(
  allocationId: number
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/parking/allocation/${allocationId}`,
      { method: "DELETE" }
    );
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (error) {
    throw error;
  }
}

/**
 * Gets parking statistics
 */
export async function getParkingStatistics() {
  try {
    const response = await fetch(`${API_BASE_URL}/parking/statistics`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (error) {
    throw error;
  }
}

/**
 * Gets vehicle history by license plate
 */
export async function getVehicleHistory(licensePlate: string) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/vehicle/history?plate=${encodeURIComponent(
        licensePlate
      )}`
    );
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (error) {
    throw error;
  }
}

/**
 * Gets algorithm comparison data using the compare endpoint
 */
export async function getAlgorithmComparison(): Promise<AlgorithmComparison> {
  try {
    // Create a sample vehicle for comparison
    const sampleVehicles: VehicleEntry[] = [
      {
        licensePlate: "SAMPLE001",
        vehicleType: "private",
        arrivalTime: new Date().toISOString(),
        expectedDeparture: new Date(
          Date.now() + 2 * 60 * 60 * 1000
        ).toISOString(),
        stayDuration: 2,
      },
    ];

    const comparisonData = await compareAllStrategies(sampleVehicles);

    // Transform to frontend format (adjust as needed based on backend response)
    return {
      algorithm: {
        algorithm: "algorithm",
        totalAllocations: comparisonData.algorithm?.successful_allocations ?? 0,
        averageWalkingDistance:
          comparisonData.algorithm?.average_walking_distance ?? 0,
        spaceUtilization: comparisonData.algorithm?.space_utilization ?? 0,
        allocationTime: comparisonData.algorithm?.allocation_time ?? 0,
        vehicleTypeOptimization: 0,
        overallScore: comparisonData.algorithm?.overall_score ?? 0,
      },
      random: {
        algorithm: "random",
        totalAllocations: comparisonData.random?.successful_allocations ?? 0,
        averageWalkingDistance:
          comparisonData.random?.average_walking_distance ?? 0,
        spaceUtilization: comparisonData.random?.space_utilization ?? 0,
        allocationTime: comparisonData.random?.allocation_time ?? 0,
        vehicleTypeOptimization: 0,
        overallScore: comparisonData.random?.overall_score ?? 0,
      },
      sequential: {
        algorithm: "sequential",
        totalAllocations:
          comparisonData.sequential?.successful_allocations ?? 0,
        averageWalkingDistance:
          comparisonData.sequential?.average_walking_distance ?? 0,
        spaceUtilization: comparisonData.sequential?.space_utilization ?? 0,
        allocationTime: comparisonData.sequential?.allocation_time ?? 0,
        vehicleTypeOptimization: 0,
        overallScore: comparisonData.sequential?.overall_score ?? 0,
      },
    };
  } catch (error) {
    // Return mock data if API fails
    return getMockAlgorithmComparison();
  }
}

/**
 * Processes vehicle exit by license plate
 */
export async function processVehicleExit(
  licensePlate: string
): Promise<{ success: boolean; parking_fee: number }> {
  try {
    // Find the active allocation for the given license plate
    const allocations = await getAllocations(true, licensePlate);
    // Assuming ApiAllocationsResponse is an object with a property 'allocations' which is an array
    if (
      !allocations ||
      !Array.isArray(allocations.allocations) ||
      allocations.allocations.length === 0 ||
      !allocations.allocations[0]?.allocation_id
    ) {
      return { success: false, parking_fee: 0 };
    }
    const activeAllocation = allocations.allocations[0];
    // End the allocation using the allocation ID
    const endAllocationResult = await endAllocation(
      activeAllocation.allocation_id
    );
    if (!endAllocationResult.success) {
      return { success: false, parking_fee: 0 };
    }
    // Fetch the vehicle history to get the parking fee
    const history = await getVehicleHistory(licensePlate);
    if (!history || !history.history || history.history.length === 0) {
      return { success: true, parking_fee: 0 };
    }
    // Assuming the last entry in history is the most recent one
    const latestHistoryEntry = history.history[0];
    return { success: true, parking_fee: latestHistoryEntry.parking_fee };
  } catch (error) {
    throw error;
  }
}

// Helper functions

/**
 * Transforms API parking status to frontend model
 */
function transformApiStatusToFrontend(apiData: ApiParkingStatus): ParkingData {
  // Adjust this transformation based on your backend's /api/parking/status response
  // Example assumes a structure with bays and slots
  const spots: any[] = [];
  // Replace 'bays' with the correct property name from ApiParkingStatus, e.g., 'levels', 'floors', or 'parkingBays'
  // For example, if the property is 'levels', update as follows:
  if ((apiData as any).levels) {
    (apiData as any).levels.forEach((bay: any, bayIdx: number) => {
      bay.slots.forEach((slot: any, slotIdx: number) => {
        spots.push({
          id: `${bay.bay_number ?? bay.level_number}-${slot.slot_number}`,
          floor: (bay.bay_number ?? bay.level_number) - 1,
          isOccupied: slot.is_occupied,
          vehicleType: slot.allocation
            ? mapVehicleTypeFromApi(slot.allocation.vehicle_plate_type)
            : "private",
          licensePlate: slot.allocation?.vehicle_plate_num || "",
          arrivalTime: slot.allocation?.allocation_time
            ? new Date(slot.allocation.allocation_time).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "",
          expectedDeparture: slot.allocation?.departure_time
            ? new Date(slot.allocation.departure_time).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "",
          allocatedBy: "algorithm",
        });
      });
    });
  }
  return { spots };
}

/**
 * Maps vehicle type from API to frontend model
 */
export function mapVehicleTypeFromApi(apiVehicleType: number): VehicleType {
  switch (apiVehicleType) {
    case 2:
      return "government";
    case 1:
      return "public";
    case 0:
    default:
      return "private";
  }
}

/**
 * Maps vehicle type from frontend to API model
 */
export function mapVehicleTypeToApi(vehicleType: VehicleType): number {
  switch (vehicleType) {
    case "government":
      return 2;
    case "public":
      return 1;
    case "private":
    default:
      return 0;
  }
}

/**
 * Gets vehicle type number for API
 */
function getVehicleTypeNumber(vehicleType: VehicleType): number {
  // Default mapping: private/government -> Car (0), public -> Truck (1)
  switch (vehicleType) {
    case "public":
      return 1; // Truck
    case "government":
    case "private":
    default:
      return 0; // Car
  }
}

/**
 * Calculates priority level based on vehicle type and optional override
 */
function calculatePriorityLevel(
  vehicleType: VehicleType,
  override?: number
): number {
  if (override !== undefined) return Math.min(Math.max(override, 0), 3);
  switch (vehicleType) {
    case "government":
      return 3;
    case "public":
      return 2;
    case "private":
    default:
      return 1;
  }
}

/**
 * Mock algorithm comparison data for fallback
 */
function getMockAlgorithmComparison(): AlgorithmComparison {
  return {
    algorithm: {
      algorithm: "algorithm",
      totalAllocations: 0,
      averageWalkingDistance: 0,
      spaceUtilization: 0,
      allocationTime: 0,
      vehicleTypeOptimization: 0,
      overallScore: 0,
    },
    random: {
      algorithm: "random",
      totalAllocations: 0,
      averageWalkingDistance: 0,
      spaceUtilization: 0,
      allocationTime: 0,
      vehicleTypeOptimization: 0,
      overallScore: 0,
    },
    sequential: {
      algorithm: "sequential",
      totalAllocations: 0,
      averageWalkingDistance: 0,
      spaceUtilization: 0,
      allocationTime: 0,
      vehicleTypeOptimization: 0,
      overallScore: 0,
    },
  };
}
