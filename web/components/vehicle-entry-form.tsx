"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { useParkingContext } from "@/context/parking-context"
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
  stayDuration: z.string().min(1, { message: "Stay duration is required" }),
  arrivalTime: z.string().min(1, { message: "Arrival time is required" }),
})

type FormValues = z.infer<typeof formSchema>

interface VehicleEntryFormProps {
  onComplete: () => void
}

export default function VehicleEntryForm({ onComplete }: VehicleEntryFormProps) {
  const { allocateParking } = useParkingContext()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [allocationResult, setAllocationResult] = useState<{
    success: boolean
    floor?: number
    spot?: number
    message: string
  } | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicleType: "private",
      stayDuration: "1",
      arrivalTime: format(new Date(), "HH:mm"),
    },
  })

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true)

    try {
      // Simulate AI processing and license plate recognition
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Calculate expected departure time
      const arrivalTimeParts = data.arrivalTime.split(":")
      const arrivalHour = Number.parseInt(arrivalTimeParts[0])
      const arrivalMinute = Number.parseInt(arrivalTimeParts[1])

      const departureDate = new Date()
      departureDate.setHours(arrivalHour)
      departureDate.setMinutes(arrivalMinute)
      departureDate.setHours(departureDate.getHours() + Number.parseInt(data.stayDuration))

      const expectedDeparture = format(departureDate, "HH:mm")

      // Allocate parking using the algorithm
      const result = allocateParking({
        licensePlate: data.licensePlate,
        vehicleType: data.vehicleType,
        arrivalTime: data.arrivalTime,
        expectedDeparture,
        stayDuration: Number.parseInt(data.stayDuration),
      })

      setAllocationResult(result)

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

      {allocationResult && (
        <Alert className={`mb-6 ${allocationResult.success ? "bg-green-50" : "bg-red-50"}`}>
          {allocationResult.success && <CheckCircle className="h-4 w-4 text-green-600" />}
          <AlertTitle>{allocationResult.success ? "Parking Allocated Successfully" : "Allocation Failed"}</AlertTitle>
          <AlertDescription>
            {allocationResult.message}
            {allocationResult.success && (
              <div className="mt-2">
                <Button onClick={onComplete} variant="outline" size="sm">
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
              Our AI system will scan the license plate and allocate the best parking spot
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
                  <Label htmlFor="government">Government</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="private" id="private" />
                  <Label htmlFor="private">Private</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="public" id="public" />
                  <Label htmlFor="public">Public</Label>
                </div>
              </RadioGroup>
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
