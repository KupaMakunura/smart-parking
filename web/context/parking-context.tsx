"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { ParkingData, VehicleEntry, ApiAllocationResponse, ParkingAlgorithm } from "@/types/parking"
import { fetchParkingStatus, allocateParking as apiAllocateParking } from "@/services/api"

// Initial empty parking data structure
const emptyParkingData: ParkingData = {
  spots: [],
}

interface ParkingContextType {
  parkingData: ParkingData
  allocateParking: (
    entry: VehicleEntry,
    algorithm?: ParkingAlgorithm,
  ) => Promise<{
    success: boolean
    floor?: number
    spot?: number
    message: string
    algorithmUsed?: string
    metrics?: { [key: string]: number }
  }>
  refreshParkingStatus: () => Promise<void>
  isLoading: boolean
}

const ParkingContext = createContext<ParkingContextType | undefined>(undefined)

export function ParkingProvider({ children }: { children: ReactNode }) {
  const [parkingData, setParkingData] = useState<ParkingData>(emptyParkingData)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  // Fetch parking status from the API
  const refreshParkingStatus = async () => {
    setIsLoading(true)
    try {
      const data = await fetchParkingStatus()
      setParkingData(data)
    } catch (error) {
      console.error("Error fetching parking status:", error)
      // Fallback to empty data if API fails
      setParkingData(emptyParkingData)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch parking status on component mount
  useEffect(() => {
    refreshParkingStatus()
  }, [])

  // Allocate parking using the API with algorithm selection
  const allocateParking = async (entry: VehicleEntry, algorithm?: ParkingAlgorithm) => {
    setIsLoading(true)
    try {
      const result: ApiAllocationResponse = await apiAllocateParking(entry, algorithm || "ai")

      // Refresh parking status after allocation
      await refreshParkingStatus()

      return {
        success: result.success,
        floor: result.floor,
        spot: result.spot_id,
        message: result.message,
        algorithmUsed: result.algorithm_used,
        metrics: result.allocation_metrics,
      }
    } catch (error) {
      console.error("Error allocating parking:", error)
      return {
        success: false,
        message: "Failed to allocate parking. Please try again.",
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ParkingContext.Provider value={{ parkingData, allocateParking, refreshParkingStatus, isLoading }}>
      {children}
    </ParkingContext.Provider>
  )
}

export function useParkingContext() {
  const context = useContext(ParkingContext)
  if (context === undefined) {
    throw new Error("useParkingContext must be used within a ParkingProvider")
  }
  return context
}
