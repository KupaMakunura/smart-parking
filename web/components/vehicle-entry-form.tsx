"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { useParkingContext } from "@/context/parking-context"
import { useAlgorithmContext } from "@/context/algorithm-context"
import { Brain, Shuffle, List } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle } from "lucide-react"

const formSchema = z.object({
  licensePlate: z.string().min(4, { message: "License plate is required" }),
  vehicleType: z.enum(["government", "private", "public"]),
  vehicleCategory: z.enum(["car", "truck", "motorcycle"]),
  stayDuration: z.string().min(1, { message: "Stay duration is required" }),
  arrivalTime: z.string().min(1, { message: "Arrival time is required" }),
  priorityLevel: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface VehicleEntryFormProps {
  onComplete: () => void
}

type ParkingAlgorithm = "algorithm" | "random" | "sequential"

export default function VehicleEntryForm({ onComplete }: VehicleEntryFormProps) {
  const { allocateParking } = useParkingContext()
  const { selectedAlgorithm } = useAlgorithmContext()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [allocationResult, setAllocationResult] = useState<{
    success: boolean
    floor?: number
    spot?: number
    message: string
    allocation_id?: number
  } | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicleType: "private",
      vehicleCategory: "car",
      stayDuration: "1",
      arrivalTime: format(new Date(), "HH:mm"),
    },
  })

  const watchedVehicleType = watch("vehicleType")

  const getAlgorithmInfo = (algorithm: ParkingAlgorithm) => {
    switch (algorithm) {
      case "algorithm":
        return { icon: Brain, color: "bg-blue-500", name: "AI Algorithm", description: "Smart optimization" }
      case "random":
        return { icon: Shuffle, color: "bg-orange-500", name: "Random Allocation", description: "Random selection" }
      case "sequential":
        return { icon: List, color: "bg-purple-500", name: "Sequential Allocation", description: "First available" }
    }
  }

  const getDefaultPriorityLevel = (vehicleType: string): number => {
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

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true)

    try {
      // Calculate expected departure time
      const arrivalTimeParts = data.arrivalTime.split(":")
      const arrivalHour = Number.parseInt(arrivalTimeParts[0])
      const arrivalMinute = Number.parseInt(arrivalTimeParts[1])

      const departureDate = new Date()
      departureDate.setHours(arrivalHour)
      departureDate.setMinutes(arrivalMinute)
      departureDate.setHours(departureDate.getHours() + Number.parseInt(data.stayDuration))

      const expectedDeparture = format(departureDate, "HH:mm")

      // Allocate parking using the API
      const result = await allocateParking(
        {
          licensePlate: data.licensePlate,
          vehicleType: data.vehicleType,
          arrivalTime: data.arrivalTime,
          expectedDeparture,
          stayDuration: Number.parseInt(data.stayDuration),
          priorityLevel: data.priorityLevel
            ? Number.parseInt(data.priorityLevel)
            : getDefaultPriorityLevel(data.vehicleType),
        },
        selectedAlgorithm,
      )

      setAllocationResult({
        success: result.success,
        floor: result.floor,
        spot: result.spot_id,
        message: result.message,
        allocation_id: result.allocation_id,
      })

      if (result.success) {
        reset()
      }
    } catch (error) {
      setAllocationResult({
        success: false,
        message: "An error occurred during allocation. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Vehicle Entry</h2>

      <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Current Allocation Algorithm</h3>
        <div className="flex items-center gap-3">
          {(() => {
            const { icon: Icon, color, name, description } = getAlgorithmInfo(selectedAlgorithm)
            return (
              <>
                <div className={`p-2 rounded-lg ${color} text-white`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-medium text-sm">{name}</div>
                  <div className="text-xs text-gray-500">{description}</div>
                </div>
              </>
            )
          })()}
        </div>
      </div>

      {allocationResult && (
        <Alert className={`mb-6 ${allocationResult.success ? "bg-green-50" : "bg-red-50"}`}>
          {allocationResult.success && <CheckCircle className="h-4 w-4 text-green-600" />}
          <AlertTitle>{allocationResult.success ? "Parking Allocated Successfully" : "Allocation Failed"}</AlertTitle>
          <AlertDescription>
            {allocationResult.message}
            {allocationResult.success && allocationResult.allocation_id && (
              <div className="mt-2 text-sm">
                <div>Allocation ID: {allocationResult.allocation_id}</div>
                {allocationResult.floor !== undefined && allocationResult.spot !== undefined && (
                  <div>
                    Location: Floor {allocationResult.floor + 1}, Spot {allocationResult.spot}
                  </div>
                )}
                <Button onClick={onComplete} variant="outline" size="sm" className="mt-2 bg-transparent">
                  View in 3D Map
                </Button>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Enter Vehicle Details</CardTitle>
            <CardDescription>
              The system will allocate the best parking spot based on the selected algorithm
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="licensePlate">License Plate Number</Label>
              <Input id="licensePlate" placeholder="e.g., ABC123" {...register("licensePlate")} />
              {errors.licensePlate && <p className="text-sm text-red-500">{errors.licensePlate.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Vehicle Type</Label>
              <RadioGroup defaultValue="private" className="flex space-x-4" {...register("vehicleType")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="government" id="government" />
                  <Label htmlFor="government">Government (Priority: 3)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="public" id="public" />
                  <Label htmlFor="public">Public (Priority: 2)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="private" id="private" />
                  <Label htmlFor="private">Private (Priority: 1)</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Vehicle Category</Label>
              <RadioGroup defaultValue="car" className="flex space-x-4" {...register("vehicleCategory")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="car" id="car" />
                  <Label htmlFor="car">Car</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="truck" id="truck" />
                  <Label htmlFor="truck">Truck</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="motorcycle" id="motorcycle" />
                  <Label htmlFor="motorcycle">Motorcycle</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priorityLevel">Priority Level (Optional)</Label>
              <Select {...register("priorityLevel")}>
                <SelectTrigger>
                  <SelectValue placeholder={`Default: ${getDefaultPriorityLevel(watchedVehicleType)}`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0 - Lowest Priority</SelectItem>
                  <SelectItem value="1">1 - Normal Priority</SelectItem>
                  <SelectItem value="2">2 - High Priority</SelectItem>
                  <SelectItem value="3">3 - Highest Priority</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Default priority for {watchedVehicleType}: {getDefaultPriorityLevel(watchedVehicleType)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="arrivalTime">Arrival Time</Label>
              <Input id="arrivalTime" type="time" {...register("arrivalTime")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stayDuration">Expected Stay Duration (hours)</Label>
              <Select defaultValue="1" {...register("stayDuration")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 8, 12, 24].map((hours) => (
                    <SelectItem key={hours} value={hours.toString()}>
                      {hours} {hours === 1 ? "hour" : "hours"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>

          <CardFooter>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Processing..." : "Allocate Parking"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
