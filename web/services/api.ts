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
} from "@/types/parking"

const API_BASE_URL = "http://localhost:8000/api"

/**
 * Fetches the current parking status from the API
 */
export async function fetchParkingStatus(): Promise<ParkingData> {
  try {
    console.log("Fetching parking status...")
    const response = await fetch(`${API_BASE_URL}/parking/status`)

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data: ApiParkingStatus = await response.json()
    console.log("Parking status response:", data)

    // Transform API data to frontend model
    return transformApiStatusToFrontend(data)
  } catch (error) {
    console.error("Error fetching parking status:", error)
    throw error
  }
}

/**
 * Allocates a parking spot for a vehicle
 */
export async function allocateParking(
  vehicleEntry: VehicleEntry,
  algorithm: ParkingAlgorithm = "algorithm",
): Promise<ApiAllocationResponse> {
  try {
    const payload: ApiAllocationRequest = {
      vehicle_plate_num: vehicleEntry.licensePlate,
      vehicle_plate_type: mapVehicleTypeToApi(vehicleEntry.vehicleType),
      vehicle_type: getVehicleTypeNumber(vehicleEntry.vehicleType),
      arrival_time: new Date().toISOString(),
      departure_time: calculateDepartureTime(vehicleEntry.stayDuration),
      priority_level: calculatePriorityLevel(vehicleEntry.vehicleType, vehicleEntry.priorityLevel),
    }

    console.log("Sending allocation request:", payload)
    console.log("Using allocation strategy:", algorithm)

    // Note: The backend doesn't include strategy in the request body based on the spec
    // The strategy might be set globally or through a separate endpoint
    const response = await fetch(`${API_BASE_URL}/parking/allocate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("API allocation error:", response.status, errorText)
      throw new Error(`API error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log("Allocation response:", result)
    return result
  } catch (error) {
    console.error("Error allocating parking:", error)
    throw error
  }
}

/**
 * Gets all allocations with optional filters
 */
export async function getAllocations(activeOnly = true, vehiclePlateNum?: string): Promise<ApiAllocationsResponse> {
  try {
    const params = new URLSearchParams()
    if (activeOnly) params.append("active_only", "true")
    if (vehiclePlateNum) params.append("vehicle_plate_num", vehiclePlateNum)

    console.log("Fetching allocations with params:", params.toString())
    const response = await fetch(`${API_BASE_URL}/parking/allocations?${params.toString()}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("API allocations error:", response.status, errorText)
      throw new Error(`API error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log("Allocations response:", result)
    return result
  } catch (error) {
    console.error("Error fetching allocations:", error)
    throw error
  }
}

/**
 * Runs a strategy simulation
 */
export async function runSimulation(
  vehicles: VehicleEntry[],
  strategy: ParkingAlgorithm,
): Promise<ApiSimulationResponse> {
  try {
    const payload: ApiSimulationRequest = {
      vehicles: vehicles.map((vehicle) => ({
        vehicle_plate_num: vehicle.licensePlate,
        vehicle_plate_type: mapVehicleTypeToApi(vehicle.vehicleType),
        vehicle_type: getVehicleTypeNumber(vehicle.vehicleType),
        arrival_time: new Date().toISOString(),
        departure_time: calculateDepartureTime(vehicle.stayDuration),
        priority_level: calculatePriorityLevel(vehicle.vehicleType, vehicle.priorityLevel),
      })),
      allocation_strategy: strategy,
    }

    console.log("Running simulation with payload:", payload)
    const response = await fetch(`${API_BASE_URL}/parking/simulate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("API simulation error:", response.status, errorText)
      throw new Error(`API error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log("Simulation response:", result)
    return result
  } catch (error) {
    console.error("Error running simulation:", error)
    throw error
  }
}

/**
 * Compares all allocation strategies
 */
export async function compareAllStrategies(vehicles: VehicleEntry[]): Promise<ApiComparisonResponse> {
  try {
    const payload: ApiComparisonRequest = vehicles.map((vehicle) => ({
      vehicle_plate_num: vehicle.licensePlate,
      vehicle_plate_type: mapVehicleTypeToApi(vehicle.vehicleType),
      vehicle_type: getVehicleTypeNumber(vehicle.vehicleType),
      arrival_time: new Date().toISOString(),
      departure_time: calculateDepartureTime(vehicle.stayDuration),
      priority_level: calculatePriorityLevel(vehicle.vehicleType, vehicle.priorityLevel),
    }))

    console.log("Comparing strategies with payload:", payload)
    const response = await fetch(`${API_BASE_URL}/parking/compare`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("API comparison error:", response.status, errorText)
      throw new Error(`API error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log("Comparison response:", result)
    return result
  } catch (error) {
    console.error("Error comparing strategies:", error)
    throw error
  }
}

/**
 * Updates an existing allocation
 */
export async function updateAllocation(
  allocationId: number,
  departureTime: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const payload: ApiUpdateAllocationRequest = {
      departure_time: departureTime,
    }

    console.log("Updating allocation:", allocationId, payload)
    const response = await fetch(`${API_BASE_URL}/parking/allocation/${allocationId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("API update error:", response.status, errorText)
      throw new Error(`API error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log("Update response:", result)
    return result
  } catch (error) {
    console.error("Error updating allocation:", error)
    throw error
  }
}

/**
 * Ends an allocation (vehicle exit)
 */
export async function endAllocation(allocationId: number): Promise<{ success: boolean; message: string }> {
  try {
    console.log("Ending allocation:", allocationId)
    const response = await fetch(`${API_BASE_URL}/parking/allocation/${allocationId}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("API end allocation error:", response.status, errorText)
      throw new Error(`API error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log("End allocation response:", result)
    return result
  } catch (error) {
    console.error("Error ending allocation:", error)
    throw error
  }
}

/**
 * Gets parking statistics
 */
export async function getParkingStatistics() {
  try {
    console.log("Fetching parking statistics...")
    const response = await fetch(`${API_BASE_URL}/parking/statistics`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("API statistics error:", response.status, errorText)
      throw new Error(`API error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log("Statistics response:", result)
    return result
  } catch (error) {
    console.error("Error fetching parking statistics:", error)
    throw error
  }
}

/**
 * Gets vehicle history by license plate
 */
export async function getVehicleHistory(licensePlate: string) {
  try {
    console.log("Fetching vehicle history for:", licensePlate)
    const response = await fetch(`${API_BASE_URL}/vehicle/history?plate=${encodeURIComponent(licensePlate)}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("API vehicle history error:", response.status, errorText)
      throw new Error(`API error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log("Vehicle history response:", result)
    return result
  } catch (error) {
    console.error("Error fetching vehicle history:", error)
    throw error
  }
}

/**
 * Gets algorithm comparison data using the compare endpoint
 */
export async function getAlgorithmComparison(): Promise<AlgorithmComparison> {
  try {
    console.log("Fetching algorithm comparison data...")

    // Create a sample vehicle for comparison
    const sampleVehicles: VehicleEntry[] = [
      {
        licensePlate: "SAMPLE001",
        vehicleType: "private",
        arrivalTime: new Date().toISOString(),
        expectedDeparture: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        stayDuration: 2,
      },
    ]

    const comparisonData = await compareAllStrategies(sampleVehicles)

    // Transform to frontend format
    return {
      algorithm: {
        algorithm: "algorithm",
        totalAllocations: comparisonData.algorithm.successful_allocations,
        averageWalkingDistance: comparisonData.algorithm.average_walking_distance,
        spaceUtilization: comparisonData.algorithm.space_utilization,
        allocationTime: comparisonData.algorithm.allocation_time,
        vehicleTypeOptimization: 0, // Not provided by backend
        overallScore: comparisonData.algorithm.overall_score,
      },
      random: {
        algorithm: "random",
        totalAllocations: comparisonData.random.successful_allocations,
        averageWalkingDistance: comparisonData.random.average_walking_distance,
        spaceUtilization: comparisonData.random.space_utilization,
        allocationTime: comparisonData.random.allocation_time,
        vehicleTypeOptimization: 0, // Not provided by backend
        overallScore: comparisonData.random.overall_score,
      },
      sequential: {
        algorithm: "sequential",
        totalAllocations: comparisonData.sequential.successful_allocations,
        averageWalkingDistance: comparisonData.sequential.average_walking_distance,
        spaceUtilization: comparisonData.sequential.space_utilization,
        allocationTime: comparisonData.sequential.allocation_time,
        vehicleTypeOptimization: 0, // Not provided by backend
        overallScore: comparisonData.sequential.overall_score,
      },
    }
  } catch (error) {
    console.error("Error fetching algorithm comparison:", error)
    // Return mock data if API fails
    console.log("Falling back to mock data for algorithm comparison")
    return getMockAlgorithmComparison()
  }
}

/**
 * Processes vehicle exit by license plate
 */
export async function processVehicleExit(licensePlate: string): Promise<{ success: boolean; parking_fee: number }> {
  try {
    console.log("Processing vehicle exit for:", licensePlate)

    // First, find the active allocation for the given license plate
    const allocations = await getAllocations(true, licensePlate)

    if (!allocations || allocations.allocations.length === 0) {
      console.log("No active allocation found for license plate:", licensePlate)
      return { success: false, parking_fee: 0 } // Or throw an error, depending on desired behavior
    }

    const activeAllocation = allocations.allocations[0] // Assuming only one active allocation per plate

    // Then, end the allocation using the allocation ID
    const endAllocationResult = await endAllocation(activeAllocation.allocation_id)

    if (!endAllocationResult.success) {
      console.error("Failed to end allocation for license plate:", licensePlate)
      return { success: false, parking_fee: 0 }
    }

    // Finally, fetch the vehicle history to get the parking fee
    const history = await getVehicleHistory(licensePlate)

    if (!history || history.history.length === 0) {
      console.log("No history found for license plate:", licensePlate)
      return { success: true, parking_fee: 0 } // Or throw an error
    }

    // Assuming the last entry in history is the most recent one
    const latestHistoryEntry = history.history[0]
    return { success: true, parking_fee: latestHistoryEntry.parking_fee }
  } catch (error) {
    console.error("Error processing vehicle exit:", error)
    throw error
  }
}

// Helper functions

/**
 * Transforms API parking status to frontend model
 */
function transformApiStatusToFrontend(apiData: ApiParkingStatus): ParkingData {
  return {
    spots: apiData.spots.map((spot) => ({
      id: spot.id,
      floor: spot.floor,
      isOccupied: spot.status === "occupied",
      vehicleType: spot.vehicle_plate_type !== undefined ? mapVehicleTypeFromApi(spot.vehicle_plate_type) : "private",
      licensePlate: spot.vehicle_plate_num || "",
      arrivalTime: spot.arrival_time
        ? new Date(spot.arrival_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "",
      expectedDeparture: spot.departure_time
        ? new Date(spot.departure_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "",
      allocatedBy: spot.allocated_by as ParkingAlgorithm,
    })),
  }
}

/**
 * Maps vehicle type from API to frontend model
 */
export function mapVehicleTypeFromApi(apiVehicleType: number): VehicleType {
  switch (apiVehicleType) {
    case 2:
      return "government"
    case 1:
      return "public"
    case 0:
    default:
      return "private"
  }
}

/**
 * Maps vehicle type from frontend to API model
 */
export function mapVehicleTypeToApi(vehicleType: VehicleType): number {
  switch (vehicleType) {
    case "government":
      return 2
    case "public":
      return 1
    case "private":
    default:
      return 0
  }
}

/**
 * Gets vehicle type number for API
 */
function getVehicleTypeNumber(vehicleType: VehicleType): number {
  // Default mapping: private/government -> Car (0), public -> Truck (1)
  switch (vehicleType) {
    case "public":
      return 1 // Truck
    case "government":
    case "private":
    default:
      return 0 // Car
  }
}

/**
 * Calculates priority level based on vehicle type and optional override
 */
function calculatePriorityLevel(vehicleType: VehicleType, override?: number): number {
  if (override !== undefined) return Math.min(Math.max(override, 0), 3)

  switch (vehicleType) {
    case "government":
      return 3 // Highest priority
    case "public":
      return 2 // High priority
    case "private":
    default:
      return 1 // Normal priority
  }
}

/**
 * Calculates departure time based on stay duration
 */
function calculateDepartureTime(stayDurationHours: number): string {
  const departureTime = new Date()
  departureTime.setHours(departureTime.getHours() + stayDurationHours)
  return departureTime.toISOString()
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
  }
}
