"use client"

import { useParkingContext } from "@/context/parking-context"
import { Badge } from "@/components/ui/badge"

interface ParkingFloorDetailsProps {
  floorNumber: number
}

export default function ParkingFloorDetails({ floorNumber }: ParkingFloorDetailsProps) {
  const { parkingData } = useParkingContext()

  // Filter spots for this floor
  const floorSpots = parkingData.spots.filter((spot) => spot.floor === floorNumber)

  // Calculate statistics
  const totalSpots = floorSpots.length
  const occupiedSpots = floorSpots.filter((spot) => spot.isOccupied).length
  const availableSpots = totalSpots - occupiedSpots

  // Count by vehicle type
  const governmentSpots = floorSpots.filter((spot) => spot.isOccupied && spot.vehicleType === "government").length

  const privateSpots = floorSpots.filter((spot) => spot.isOccupied && spot.vehicleType === "private").length

  const publicSpots = floorSpots.filter((spot) => spot.isOccupied && spot.vehicleType === "public").length

  return (
    <div className="w-72">
      <h3 className="text-lg font-semibold mb-4">Floor {floorNumber + 1} Details</h3>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-gray-100 p-2 rounded">
          <div className="text-sm text-gray-500">Total Spots</div>
          <div className="text-xl font-bold">{totalSpots}</div>
        </div>
        <div className="bg-gray-100 p-2 rounded">
          <div className="text-sm text-gray-500">Available</div>
          <div className="text-xl font-bold text-green-600">{availableSpots}</div>
        </div>
      </div>

      <h4 className="font-medium mb-2">Vehicle Types</h4>
      <div className="flex gap-2 mb-4">
        <Badge variant="outline" className="bg-blue-100">
          Government: {governmentSpots}
        </Badge>
        <Badge variant="outline" className="bg-gray-100">
          Private: {privateSpots}
        </Badge>
        <Badge variant="outline" className="bg-purple-100">
          Public: {publicSpots}
        </Badge>
      </div>

      <h4 className="font-medium mb-2">2D Floor Map</h4>
      <div className="bg-white border rounded p-2">
        <div className="grid grid-cols-5 gap-1">
          {floorSpots.map((spot, index) => {
            let bgColor = "bg-green-500"
            if (spot.isOccupied) {
              bgColor =
                spot.vehicleType === "government"
                  ? "bg-blue-500"
                  : spot.vehicleType === "public"
                    ? "bg-purple-500"
                    : "bg-red-500"
            }

            return (
              <div
                key={index}
                className={`${bgColor} h-8 rounded flex items-center justify-center text-white text-xs`}
                title={`Spot ${spot.id}: ${spot.isOccupied ? "Occupied" : "Available"}`}
              >
                {spot.id}
              </div>
            )
          })}
        </div>
      </div>

      <h4 className="font-medium mt-4 mb-2">Occupied Spots</h4>
      <div className="max-h-40 overflow-y-auto">
        {floorSpots
          .filter((spot) => spot.isOccupied)
          .map((spot) => (
            <div key={spot.id} className="text-sm border-b py-1">
              <div className="flex justify-between">
                <span>Spot {spot.id}</span>
                <span className="font-medium">{spot.licensePlate}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{spot.vehicleType}</span>
                <span>Until {spot.expectedDeparture}</span>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
