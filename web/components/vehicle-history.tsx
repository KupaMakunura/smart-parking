"use client"

import { useState } from "react"
import { getVehicleHistory } from "@/services/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, RefreshCw } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { mapVehicleTypeFromApi } from "@/services/api"
import type { ApiVehicleHistory, ApiVehicleHistoryEntry } from "@/types/parking"

export default function VehicleHistory() {
  const [searchPlate, setSearchPlate] = useState("")
  const [vehicleHistory, setVehicleHistory] = useState<ApiVehicleHistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchHistory = async (plate: string) => {
    if (!plate) return

    setIsLoading(true)
    try {
      const data: ApiVehicleHistory = await getVehicleHistory(plate)
      setVehicleHistory(data.history)
    } catch (error) {
      console.error("Error fetching vehicle history:", error)
      setVehicleHistory([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = () => {
    fetchHistory(searchPlate)
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  // Map vehicle type number to string
  const getVehicleTypeString = (type: number) => {
    switch (type) {
      case 0:
        return "Car"
      case 1:
        return "Truck"
      case 2:
        return "Motorcycle"
      default:
        return "Unknown"
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Vehicle History</h2>

      <Card>
        <CardHeader>
          <CardTitle>Search Vehicle Records</CardTitle>
          <CardDescription>Enter a license plate to view parking history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="License plate (e.g., ABC123)"
              value={searchPlate}
              onChange={(e) => setSearchPlate(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={isLoading || !searchPlate}>
              {isLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {vehicleHistory.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Parking History for {vehicleHistory[0].vehicle_plate_num}</CardTitle>
            <CardDescription>
              Vehicle Type: {getVehicleTypeString(vehicleHistory[0].vehicle_type)}, Category:{" "}
              {mapVehicleTypeFromApi(vehicleHistory[0].vehicle_plate_type)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Fee</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicleHistory.map((entry, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div>{formatDate(entry.arrival_time)}</div>
                      <div className="text-xs text-gray-500">to {formatDate(entry.departure_time)}</div>
                    </TableCell>
                    <TableCell>{entry.parking_duration}</TableCell>
                    <TableCell>
                      Floor {entry.floor + 1}, Spot {entry.spot_id}
                    </TableCell>
                    <TableCell className="text-right">${entry.parking_fee.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : searchPlate && !isLoading ? (
        <Card>
          <CardContent className="py-4">
            <p className="text-center text-gray-500">No history found for this vehicle</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
