// Frontend types
export type VehicleType = "government" | "private" | "public"
export type ParkingAlgorithm = "algorithm" | "random" | "sequential" // Updated to match backend

export interface ParkingSpot {
  id: number
  floor: number
  isOccupied: boolean
  vehicleType: VehicleType
  licensePlate: string
  arrivalTime: string
  expectedDeparture: string
  allocatedBy?: ParkingAlgorithm
}

export interface ParkingData {
  spots: ParkingSpot[]
}

export interface VehicleEntry {
  licensePlate: string
  vehicleType: VehicleType
  arrivalTime: string
  expectedDeparture: string
  stayDuration: number
  algorithm?: ParkingAlgorithm
  priorityLevel?: number
}

export interface AlgorithmPerformance {
  algorithm: ParkingAlgorithm
  totalAllocations: number
  averageWalkingDistance: number
  spaceUtilization: number
  allocationTime: number
  vehicleTypeOptimization: number
  overallScore: number
}

export interface AlgorithmComparison {
  algorithm: AlgorithmPerformance
  random: AlgorithmPerformance
  sequential: AlgorithmPerformance
}

// API types matching backend specification
export interface ApiParkingSpot {
  id: number
  floor: number
  status: "available" | "occupied"
  vehicle_plate_num?: string
  vehicle_plate_type?: number // 0=Private, 1=Public, 2=Govt
  vehicle_type?: number // 0=Car, 1=Truck, 2=Motorcycle
  arrival_time?: string
  departure_time?: string
  allocated_by?: string
}

export interface ApiParkingStatus {
  spots: ApiParkingSpot[]
  timestamp: string
}

// Updated allocation request to match backend spec
export interface ApiAllocationRequest {
  vehicle_plate_num: string
  vehicle_plate_type: number // 0=Private, 1=Public, 2=Govt
  vehicle_type: number // 0=Car, 1=Truck, 2=Motorcycle
  arrival_time: string // ISO datetime
  departure_time: string // ISO datetime
  priority_level: number // 0-3 (0: Lowest, 3: Highest)
}

export interface ApiAllocationResponse {
  success: boolean
  allocation_id?: number
  spot_id?: number
  floor?: number
  message: string
  allocation_strategy?: string
  metrics?: {
    walking_distance?: number
    allocation_time?: number
    space_efficiency?: number
  }
}

// Simulation request for strategy comparison
export interface ApiSimulationRequest {
  vehicles: ApiAllocationRequest[]
  allocation_strategy: "algorithm" | "random" | "sequential"
}

export interface ApiSimulationResponse {
  strategy: string
  results: {
    total_vehicles: number
    successful_allocations: number
    average_walking_distance: number
    space_utilization: number
    allocation_time: number
  }
}

// Strategy comparison request
export interface ApiComparisonRequest extends Array<ApiAllocationRequest> {}

export interface ApiComparisonResponse {
  algorithm: {
    strategy: "algorithm"
    successful_allocations: number
    average_walking_distance: number
    space_utilization: number
    allocation_time: number
    overall_score: number
  }
  random: {
    strategy: "random"
    successful_allocations: number
    average_walking_distance: number
    space_utilization: number
    allocation_time: number
    overall_score: number
  }
  sequential: {
    strategy: "sequential"
    successful_allocations: number
    average_walking_distance: number
    space_utilization: number
    allocation_time: number
    overall_score: number
  }
}

export interface ApiAllocation {
  allocation_id: number
  vehicle_plate_num: string
  vehicle_plate_type: number
  vehicle_type: number
  spot_id: number
  floor: number
  arrival_time: string
  departure_time: string
  priority_level: number
  allocation_strategy: string
  status: "active" | "completed"
}

export interface ApiAllocationsResponse {
  allocations: ApiAllocation[]
  total_count: number
}

// Update allocation request
export interface ApiUpdateAllocationRequest {
  departure_time: string
}

export interface ApiVehicleHistoryEntry {
  allocation_id: number
  vehicle_plate_num: string
  vehicle_plate_type: number
  vehicle_type: number
  arrival_time: string
  departure_time: string
  parking_duration: string
  parking_fee: number
  spot_id: number
  floor: number
  allocation_strategy: string
}

export interface ApiVehicleHistory {
  history: ApiVehicleHistoryEntry[]
}

export interface ApiParkingStatistics {
  total_spots: number
  occupied_spots: number
  available_spots: number
  occupancy_rate: number
  vehicle_types: {
    government: number
    private: number
    public: number
  }
  floor_statistics: {
    floor: number
    total: number
    occupied: number
    available: number
    occupancy_rate: number
  }[]
}
