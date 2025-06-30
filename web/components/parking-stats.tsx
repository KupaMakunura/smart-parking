"use client"

import { useState, useEffect } from "react"
import { useParkingContext } from "@/context/parking-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { getParkingStatistics } from "@/services/api"
import type { ApiParkingStatistics } from "@/types/parking"

export default function ParkingStats() {
  const { parkingData, refreshParkingStatus, isLoading } = useParkingContext()
  const [statistics, setStatistics] = useState<ApiParkingStatistics | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(false)

  // Fetch statistics from API
  const fetchStatistics = async () => {
    setIsLoadingStats(true)
    try {
      const data = await getParkingStatistics()
      setStatistics(data)
    } catch (error) {
      console.error("Error fetching statistics:", error)
    } finally {
      setIsLoadingStats(false)
    }
  }

  // Fetch statistics on component mount
  useEffect(() => {
    fetchStatistics()
  }, [])

  // Calculate overall statistics from context if API fails
  const totalSpots = statistics?.total_spots || parkingData.spots.length
  const occupiedSpots = statistics?.occupied_spots || parkingData.spots.filter((spot) => spot.isOccupied).length
  const availableSpots = statistics?.available_spots || totalSpots - occupiedSpots
  const occupancyRate = statistics?.occupancy_rate || (totalSpots > 0 ? (occupiedSpots / totalSpots) * 100 : 0)

  // Vehicle type distribution
  const governmentVehicles =
    statistics?.vehicle_types.government ||
    parkingData.spots.filter((spot) => spot.isOccupied && spot.vehicleType === "government").length

  const privateVehicles =
    statistics?.vehicle_types.private ||
    parkingData.spots.filter((spot) => spot.isOccupied && spot.vehicleType === "private").length

  const publicVehicles =
    statistics?.vehicle_types.public ||
    parkingData.spots.filter((spot) => spot.isOccupied && spot.vehicleType === "public").length

  // Floor occupancy data
  const floorData =
    statistics?.floor_statistics ||
    Array.from({ length: 4 }).map((_, index) => {
      const floorSpots = parkingData.spots.filter((spot) => spot.floor === index)
      const floorOccupied = floorSpots.filter((spot) => spot.isOccupied).length
      const floorTotal = floorSpots.length
      const floorOccupancyRate = floorTotal > 0 ? (floorOccupied / floorTotal) * 100 : 0

      return {
        name: `Floor ${index + 1}`,
        floor: index,
        occupied: floorOccupied,
        available: floorTotal - floorOccupied,
        total: floorTotal,
        occupancy_rate: floorOccupancyRate,
      }
    })

  // Pie chart data
  const occupancyData = [
    { name: "Occupied", value: occupiedSpots, color: "#ef4444" },
    { name: "Available", value: availableSpots, color: "#22c55e" },
  ]

  const vehicleTypeData = [
    { name: "Government", value: governmentVehicles, color: "#3b82f6" },
    { name: "Private", value: privateVehicles, color: "#f97316" },
    { name: "Public", value: publicVehicles, color: "#a855f7" },
  ]

  const handleRefresh = async () => {
    await Promise.all([refreshParkingStatus(), fetchStatistics()])
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Parking Statistics</h2>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading || isLoadingStats}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading || isLoadingStats ? "animate-spin" : ""}`} />
          Refresh Data
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Total Capacity</CardTitle>
            <CardDescription>All parking spots</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalSpots}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Occupancy Rate</CardTitle>
            <CardDescription>Current utilization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{occupancyRate.toFixed(1)}%</div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
              <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${occupancyRate}%` }}></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Available Spots</CardTitle>
            <CardDescription>Ready for allocation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{availableSpots}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="occupancy">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="occupancy">Occupancy Analysis</TabsTrigger>
          <TabsTrigger value="floors">Floor Distribution</TabsTrigger>
        </TabsList>

        <TabsContent value="occupancy" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Parking Occupancy Analysis</CardTitle>
              <CardDescription>Current distribution of parking spots and vehicle types</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-sm font-medium mb-4 text-center">Spot Occupancy</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={occupancyData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {occupancyData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-4 text-center">Vehicle Types</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={vehicleTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {vehicleTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="floors" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Floor-by-Floor Analysis</CardTitle>
              <CardDescription>Occupancy distribution across different floors</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={floorData.map((floor) => ({
                    name: `Floor ${floor.floor + 1}`,
                    occupied: floor.occupied,
                    available: floor.available,
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="occupied" stackId="a" fill="#ef4444" name="Occupied" />
                  <Bar dataKey="available" stackId="a" fill="#22c55e" name="Available" />
                </BarChart>
              </ResponsiveContainer>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                {floorData.map((floor, index) => (
                  <div key={index} className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm text-gray-500">Floor {floor.floor + 1}</div>
                    <div className="text-lg font-semibold">{floor.occupancy_rate.toFixed(0)}% Full</div>
                    <div className="text-xs text-gray-500">
                      {floor.occupied} / {floor.total} spots
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
