"use client"

import { useState } from "react"
import { BarChart3, Car, Home, LayoutDashboard, Settings } from "lucide-react"
import ParkingVisualization from "./parking-visualization"
import VehicleEntryForm from "./vehicle-entry-form"
import ParkingStats from "./parking-stats"
import { ParkingProvider } from "@/context/parking-context"

export default function ParkingSystem() {
  const [activeView, setActiveView] = useState("dashboard")

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r shadow-sm">
          <div className="p-4 border-b">
            <h1 className="text-xl font-bold">Smart Parking</h1>
            <p className="text-xs text-muted-foreground">AI-powered management</p>
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
            </nav>

            <div className="mt-6 pt-6 border-t">
              <nav className="space-y-1">
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md text-gray-700 hover:bg-gray-100">
                  <Home className="h-4 w-4" />
                  <span>Home</span>
                </button>

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
            </ParkingProvider>
          </div>
        </div>
      </div>
    </div>
  )
}
