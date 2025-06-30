"use client"

import { useState } from "react"
import { BarChart3, Car, History, LayoutDashboard, Settings, Brain, TrendingUp } from "lucide-react"
import ParkingVisualization from "./parking-visualization"
import VehicleEntryForm from "./vehicle-entry-form"
import ParkingStats from "./parking-stats"
import VehicleHistory from "./vehicle-history"
import { ParkingProvider } from "@/context/parking-context"
import AlgorithmSettings from "./algorithm-settings"
import AlgorithmComparison from "./algorithm-comparison"
import { AlgorithmProvider, useAlgorithmContext } from "@/context/algorithm-context"

// Create a new inner component that uses the algorithm context
function ParkingSystemContent() {
  const [activeView, setActiveView] = useState("dashboard")
  const {
    isComparisonMode,
    setIsComparisonMode,
    resetComparison,
    selectedAlgorithm,
    setSelectedAlgorithm,
    comparisonData,
    refreshComparisonData,
    isLoading,
  } = useAlgorithmContext()

  const handleStartComparison = () => {
    setIsComparisonMode(true)
    setActiveView("comparison")
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r shadow-sm">
          <div className="p-4 border-b">
            <h1 className="text-xl font-bold">Smart Parking</h1>
            <p className="text-xs text-muted-foreground">AI-powered management</p>
            {isLoading && <div className="text-xs text-blue-600 mt-1">Syncing with server...</div>}
          </div>

          <div className="p-2">
            <nav className="space-y-1">
              <button
                onClick={() => setActiveView("dashboard")}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md ${
                  activeView === "dashboard"
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => setActiveView("entry")}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md ${
                  activeView === "entry" ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Car className="h-4 w-4" />
                <span>Vehicle Entry</span>
              </button>

              <button
                onClick={() => setActiveView("stats")}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md ${
                  activeView === "stats" ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                <span>Parking Statistics</span>
              </button>

              <button
                onClick={() => setActiveView("history")}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md ${
                  activeView === "history" ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <History className="h-4 w-4" />
                <span>Vehicle History</span>
              </button>

              <button
                onClick={() => setActiveView("algorithms")}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md ${
                  activeView === "algorithms"
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Brain className="h-4 w-4" />
                <span>Algorithm Settings</span>
              </button>

              <button
                onClick={() => setActiveView("comparison")}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md ${
                  activeView === "comparison"
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                <span>Algorithm Comparison</span>
                {isComparisonMode && <div className="w-2 h-2 bg-green-500 rounded-full ml-auto"></div>}
              </button>
            </nav>

            <div className="mt-6 pt-6 border-t">
              <nav className="space-y-1">
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md text-gray-700 hover:bg-gray-100">
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </button>
              </nav>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold tracking-tight">Smart Parking Management System</h1>
              <p className="text-muted-foreground mt-2">AI-powered multi-story parking allocation</p>
            </div>

            <ParkingProvider>
              {activeView === "dashboard" && (
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <ParkingVisualization />
                </div>
              )}

              {activeView === "entry" && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <VehicleEntryForm onComplete={() => setActiveView("dashboard")} />
                </div>
              )}

              {activeView === "stats" && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <ParkingStats />
                </div>
              )}

              {activeView === "history" && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <VehicleHistory />
                </div>
              )}

              {activeView === "algorithms" && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <AlgorithmSettings
                    selectedAlgorithm={selectedAlgorithm}
                    onAlgorithmChange={setSelectedAlgorithm}
                    onStartComparison={handleStartComparison}
                    isComparisonMode={isComparisonMode}
                    isLoading={isLoading}
                  />
                </div>
              )}

              {activeView === "comparison" && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <AlgorithmComparison
                    comparisonData={comparisonData}
                    isActive={isComparisonMode}
                    onReset={resetComparison}
                    onRefresh={refreshComparisonData}
                    isLoading={isLoading}
                  />
                </div>
              )}
            </ParkingProvider>
          </div>
        </div>
      </div>
    </div>
  )
}

// Update the main component to wrap with AlgorithmProvider
export default function ParkingSystem() {
  return (
    <AlgorithmProvider>
      <ParkingSystemContent />
    </AlgorithmProvider>
  )
}
