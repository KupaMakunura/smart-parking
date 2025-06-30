"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { ParkingAlgorithm, AlgorithmComparison } from "@/types/parking"
import { getAlgorithmComparison } from "@/services/api"

interface AlgorithmContextType {
  selectedAlgorithm: ParkingAlgorithm
  setSelectedAlgorithm: (algorithm: ParkingAlgorithm) => void
  isComparisonMode: boolean
  setIsComparisonMode: (enabled: boolean) => void
  comparisonData: AlgorithmComparison | null
  setComparisonData: (data: AlgorithmComparison | null) => void
  resetComparison: () => void
  refreshComparisonData: () => Promise<void>
  isLoading: boolean
}

const AlgorithmContext = createContext<AlgorithmContextType | undefined>(undefined)

export function AlgorithmProvider({ children }: { children: ReactNode }) {
  const [selectedAlgorithm, setSelectedAlgorithmState] = useState<ParkingAlgorithm>("algorithm")
  const [isComparisonMode, setIsComparisonMode] = useState(false)
  const [comparisonData, setComparisonData] = useState<AlgorithmComparison | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Load comparison data on mount
  useEffect(() => {
    refreshComparisonData()
  }, [])

  const setSelectedAlgorithm = (algorithm: ParkingAlgorithm) => {
    console.log("Setting algorithm to:", algorithm)
    setSelectedAlgorithmState(algorithm)
  }

  const refreshComparisonData = async () => {
    try {
      setIsLoading(true)
      console.log("Refreshing comparison data...")
      const data = await getAlgorithmComparison()
      setComparisonData(data)
      console.log("Comparison data refreshed:", data)
    } catch (error) {
      console.error("Failed to refresh comparison data:", error)
      // Keep existing data if refresh fails
    } finally {
      setIsLoading(false)
    }
  }

  const resetComparison = () => {
    console.log("Resetting comparison data...")
    setComparisonData(null)
    setIsComparisonMode(false)
  }

  return (
    <AlgorithmContext.Provider
      value={{
        selectedAlgorithm,
        setSelectedAlgorithm,
        isComparisonMode,
        setIsComparisonMode,
        comparisonData,
        setComparisonData,
        resetComparison,
        refreshComparisonData,
        isLoading,
      }}
    >
      {children}
    </AlgorithmContext.Provider>
  )
}

export function useAlgorithmContext() {
  const context = useContext(AlgorithmContext)
  if (context === undefined) {
    throw new Error("useAlgorithmContext must be used within an AlgorithmProvider")
  }
  return context
}
