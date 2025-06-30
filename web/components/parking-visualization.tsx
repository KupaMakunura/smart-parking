"use client"

import type React from "react"
import type { ParkingAlgorithm } from "@/types/parking-algorithm" // Declare the ParkingAlgorithm variable

import { useState, useRef, Suspense } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, Environment } from "@react-three/drei"
import { useParkingContext } from "@/context/parking-context"
import ParkingBuilding from "./parking-building"
import ParkingFloorDetails from "./parking-floor-details"
import { Button } from "@/components/ui/button"
import { Upload, X, RefreshCw } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { processVehicleExit } from "@/services/api"
import { useAlgorithmContext } from "@/context/algorithm-context"
import { Brain, Shuffle, List } from "lucide-react"

export default function ParkingVisualization() {
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null)
  const [entryVehicle, setEntryVehicle] = useState<boolean>(false)
  const [exitVehicle, setExitVehicle] = useState<boolean>(false)
  const [entryImage, setEntryImage] = useState<string | null>(null)
  const [exitImage, setExitImage] = useState<string | null>(null)
  const [showEntryModal, setShowEntryModal] = useState<boolean>(false)
  const [showExitModal, setShowExitModal] = useState<boolean>(false)
  const [licensePlate, setLicensePlate] = useState<string>("")
  const [vehicleType, setVehicleType] = useState<"government" | "private" | "public">("private")
  const [processingImage, setProcessingImage] = useState<boolean>(false)
  const [exitDetails, setExitDetails] = useState<{ duration: string; fee: number } | null>(null)

  const entryInputRef = useRef<HTMLInputElement>(null)
  const exitInputRef = useRef<HTMLInputElement>(null)
  const controlsRef = useRef(null)
  const { parkingData, allocateParking, refreshParkingStatus, isLoading } = useParkingContext()
  const { selectedAlgorithm } = useAlgorithmContext()

  // Function to simulate license plate extraction from image
  const simulateLicensePlateExtraction = (
    file: File,
  ): Promise<{ licensePlate: string; vehicleType: "government" | "private" | "public" }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Generate a random license plate
        const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"
        const numbers = "0123456789"
        const randomLicensePlate =
          letters.charAt(Math.floor(Math.random() * letters.length)) +
          letters.charAt(Math.floor(Math.random() * letters.length)) +
          letters.charAt(Math.floor(Math.random() * letters.length)) +
          " " +
          numbers.charAt(Math.floor(Math.random() * numbers.length)) +
          numbers.charAt(Math.floor(Math.random() * numbers.length)) +
          numbers.charAt(Math.floor(Math.random() * numbers.length))

        // Randomly determine vehicle type
        const types: ["government", "private", "public"] = ["government", "private", "public"]
        const vehicleType = types[Math.floor(Math.random() * types.length)]

        resolve({ licensePlate: randomLicensePlate, vehicleType })
      }, 1500)
    })
  }

  const handleEntryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setProcessingImage(true)

      // Create a URL for the image
      const imageUrl = URL.createObjectURL(file)
      setEntryImage(imageUrl)

      try {
        // Simulate AI processing to extract license plate
        const { licensePlate: extractedPlate, vehicleType: extractedType } = await simulateLicensePlateExtraction(file)

        setLicensePlate(extractedPlate)
        setVehicleType(extractedType)
        setShowEntryModal(true)
      } catch (error) {
        console.error("Error processing image:", error)
        alert("Failed to process the image. Please try again.")
      } finally {
        setProcessingImage(false)
      }
    }
  }

  const handleExitImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setProcessingImage(true)

      // Create a URL for the image
      const imageUrl = URL.createObjectURL(file)
      setExitImage(imageUrl)

      try {
        // Find a random occupied spot for simulation
        const occupiedSpots = parkingData.spots.filter((spot) => spot.isOccupied)

        if (occupiedSpots.length > 0) {
          const randomSpot = occupiedSpots[Math.floor(Math.random() * occupiedSpots.length)]
          setLicensePlate(randomSpot.licensePlate)
          setVehicleType(randomSpot.vehicleType)

          // Set simulated exit details
          setExitDetails({
            duration: "2h 15m",
            fee: 10.5,
          })
        } else {
          // Fallback if no occupied spots
          const { licensePlate: extractedPlate, vehicleType: extractedType } =
            await simulateLicensePlateExtraction(file)
          setLicensePlate(extractedPlate)
          setVehicleType(extractedType)
          setExitDetails({
            duration: "1h 30m",
            fee: 7.5,
          })
        }

        setShowExitModal(true)
      } catch (error) {
        console.error("Error processing image:", error)
        alert("Failed to process the image. Please try again.")
      } finally {
        setProcessingImage(false)
      }
    }
  }

  const confirmEntry = async () => {
    // Calculate expected departure time (2 hours from now)
    const now = new Date()
    const departureTime = new Date(now.getTime() + 2 * 60 * 60 * 1000)
    const arrivalTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`
    const expectedDeparture = `${departureTime.getHours().toString().padStart(2, "0")}:${departureTime.getMinutes().toString().padStart(2, "0")}`

    try {
      // Allocate parking using the selected algorithm
      const result = await allocateParking(
        {
          licensePlate,
          vehicleType,
          arrivalTime,
          expectedDeparture,
          stayDuration: 2,
        },
        selectedAlgorithm,
      ) // Pass the selected algorithm

      if (result.success) {
        // Show the vehicle in the 3D view
        setEntryVehicle(true)
        setTimeout(() => setEntryVehicle(false), 5000)

        // Close the modal
        setShowEntryModal(false)

        // Show success message
        alert(`Parking allocated successfully! ${result.message}`)
      } else {
        alert(`Failed to allocate parking: ${result.message}`)
      }
    } catch (error) {
      console.error("Error during parking allocation:", error)
      alert("An error occurred during parking allocation. Please try again.")
    }
  }

  const confirmExit = async () => {
    try {
      // Process vehicle exit using the API
      const result = await processVehicleExit(licensePlate)

      // Show the vehicle in the 3D view
      setExitVehicle(true)
      setTimeout(() => setExitVehicle(false), 5000)

      // Close the modal
      setShowExitModal(false)

      // Refresh parking data after exit
      await refreshParkingStatus()

      // Show success message
      if (result.success) {
        alert(`Vehicle exit processed successfully! Fee: $${result.parking_fee.toFixed(2)}`)
      } else {
        alert("Vehicle exit processed.")
      }
    } catch (error) {
      console.error("Error during exit processing:", error)
      alert("An error occurred during exit processing. Please try again.")
    }
  }

  // Function to refresh parking data
  const refreshParkingData = async () => {
    try {
      await refreshParkingStatus()
    } catch (error) {
      console.error("Error refreshing parking data:", error)
      alert("Failed to refresh parking data. Please try again.")
    }
  }

  const getAlgorithmInfo = (algorithm: ParkingAlgorithm) => {
    switch (algorithm) {
      case "algorithm":
        return { icon: Brain, color: "bg-blue-500", name: "AI Algorithm" }
      case "random":
        return { icon: Shuffle, color: "bg-orange-500", name: "Random" }
      case "sequential":
        return { icon: List, color: "bg-purple-500", name: "Sequential" }
      default:
        return { icon: Brain, color: "bg-blue-500", name: "Algorithm" } // fallback – never undefined
    }
  }

  return (
    <div className="relative w-full h-[80vh]">
      {selectedFloor !== null && (
        <div className="absolute top-0 right-0 z-10 p-4 bg-white/90 rounded-bl-lg shadow-md">
          <button
            onClick={() => setSelectedFloor(null)}
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          >
            <span className="sr-only">Close</span>×
          </button>
          <ParkingFloorDetails floorNumber={selectedFloor} />
        </div>
      )}

      <div className="absolute top-4 left-4 z-10 bg-white/90 p-3 rounded-lg shadow-md">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-sm">Vehicle Simulation</h3>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={refreshParkingData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            <span className="sr-only">Refresh</span>
          </Button>
        </div>
        <div className="space-y-2">
          <Button
            onClick={() => entryInputRef.current?.click()}
            className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
            size="sm"
            disabled={processingImage || isLoading}
          >
            {processingImage ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Upload Entry Image
          </Button>
          <input
            type="file"
            ref={entryInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleEntryImageUpload}
          />

          <Button
            onClick={() => exitInputRef.current?.click()}
            className="w-full bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
            size="sm"
            disabled={processingImage || isLoading}
          >
            {processingImage ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Upload Exit Image
          </Button>
          <input type="file" ref={exitInputRef} className="hidden" accept="image/*" onChange={handleExitImageUpload} />
        </div>
      </div>

      <Canvas camera={{ position: [15, 15, 15], fov: 50 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <ParkingBuilding
            floors={4}
            onFloorSelect={setSelectedFloor}
            parkingData={parkingData}
            entryVehicle={entryVehicle}
            exitVehicle={exitVehicle}
            entryImage={entryImage}
            exitImage={exitImage}
          />
          <OrbitControls
            ref={controlsRef}
            minDistance={10}
            maxDistance={50}
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
          />
          <Environment preset="city" />
        </Suspense>
      </Canvas>

      <div className="absolute bottom-4 left-4 z-10 bg-white/90 p-3 rounded-lg shadow-md">
        <h3 className="font-medium text-sm mb-2">Current Algorithm</h3>
        <div className="flex items-center gap-2 mb-3">
          {(() => {
            const { icon: Icon, color, name } = getAlgorithmInfo(selectedAlgorithm)
            return (
              <>
                <div className={`p-2 rounded-lg ${color} text-white`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium">{name}</span>
              </>
            )
          })()}
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-sm">Entry: License plate scanning & allocation</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-sm">Exit: Departure processing & billing</span>
          </div>
        </div>
      </div>

      {/* Entry Confirmation Modal */}
      <Dialog open={showEntryModal} onOpenChange={setShowEntryModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Vehicle Entry Detection</DialogTitle>
            <DialogDescription>The AI system has detected the following vehicle at the entrance.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-start gap-4">
              <div className="col-span-1">
                {entryImage && (
                  <div className="relative h-20 w-20 rounded-md overflow-hidden border">
                    <img src={entryImage || "/placeholder.svg"} alt="Vehicle" className="h-full w-full object-cover" />
                  </div>
                )}
              </div>

              <div className="col-span-3 space-y-2">
                <div>
                  <Label htmlFor="license-plate" className="text-sm font-medium">
                    Detected License Plate
                  </Label>
                  <div className="flex items-center mt-1">
                    <div className="bg-blue-100 border border-blue-300 rounded px-3 py-1 font-mono font-bold text-blue-800">
                      {licensePlate}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2 h-7 w-7 p-0"
                      onClick={() => setShowEntryModal(false)}
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Close</span>
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Detected Vehicle Type</Label>
                  <div className="mt-1">
                    <RadioGroup defaultValue={vehicleType} className="flex space-x-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="government"
                          id="government"
                          checked={vehicleType === "government"}
                          onChange={() => setVehicleType("government")}
                        />
                        <Label htmlFor="government">Government</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="private"
                          id="private"
                          checked={vehicleType === "private"}
                          onChange={() => setVehicleType("private")}
                        />
                        <Label htmlFor="private">Private</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="public"
                          id="public"
                          checked={vehicleType === "public"}
                          onChange={() => setVehicleType("public")}
                        />
                        <Label htmlFor="public">Public</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowEntryModal(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmEntry}
              className="bg-green-600 hover:bg-green-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Processing...
                </>
              ) : (
                "Confirm & Allocate Parking"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exit Confirmation Modal */}
      <Dialog open={showExitModal} onOpenChange={setShowExitModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Vehicle Exit Detection</DialogTitle>
            <DialogDescription>The AI system has detected the following vehicle at the exit.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-start gap-4">
              <div className="col-span-1">
                {exitImage && (
                  <div className="relative h-20 w-20 rounded-md overflow-hidden border">
                    <img src={exitImage || "/placeholder.svg"} alt="Vehicle" className="h-full w-full object-cover" />
                  </div>
                )}
              </div>

              <div className="col-span-3 space-y-2">
                <div>
                  <Label htmlFor="license-plate" className="text-sm font-medium">
                    Detected License Plate
                  </Label>
                  <div className="flex items-center mt-1">
                    <div className="bg-blue-100 border border-blue-300 rounded px-3 py-1 font-mono font-bold text-blue-800">
                      {licensePlate}
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Parking Information</Label>
                  <div className="mt-1 text-sm">
                    <p>Duration: {exitDetails?.duration || "2h 15m"}</p>
                    <p>Amount Due: ${exitDetails?.fee.toFixed(2) || "10.50"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowExitModal(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={confirmExit} className="bg-red-600 hover:bg-red-700" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Processing...
                </>
              ) : (
                "Confirm Payment & Exit"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
