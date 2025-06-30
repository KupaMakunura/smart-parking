"use client";

import { useState } from "react";
import { format } from "date-fns";
import { useParkingContext } from "@/context/parking-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle } from "lucide-react";
import type { AllocationStrategy } from "@/types/parking";

const strategyOptions: { label: string; value: AllocationStrategy }[] = [
  { label: "AI Algorithm", value: "algorithm" },
  { label: "Sequential", value: "sequential" },
  { label: "Random", value: "random" },
];

type VehicleEntryFormProps = {
  onComplete: () => void;
};

export default function VehicleEntryForm({
  onComplete,
}: VehicleEntryFormProps) {
  const { allocateParking } = useParkingContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allocationResult, setAllocationResult] = useState<{
    success: boolean;
    floor?: number;
    spot?: number;
    message: string;
  } | null>(null);

  // Simple state for each field
  const [licensePlate, setLicensePlate] = useState("");
  const [vehicleType, setVehicleType] = useState<
    "government" | "private" | "public"
  >("private");
  const [stayDuration, setStayDuration] = useState("1");
  const [arrivalTime, setArrivalTime] = useState(format(new Date(), "HH:mm"));
  const [allocationStrategy, setAllocationStrategy] =
    useState<AllocationStrategy>("algorithm");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = () => {
    const errs: { [key: string]: string } = {};
    if (!licensePlate || licensePlate.length < 4)
      errs.licensePlate = "License plate is required";
    if (!stayDuration) errs.stayDuration = "Stay duration is required";
    if (!arrivalTime) errs.arrivalTime = "Arrival time is required";
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setIsSubmitting(true);
    try {
      // Simulate AI processing and license plate recognition
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Calculate expected departure time
      const arrivalTimeParts = arrivalTime.split(":");
      const arrivalHour = Number.parseInt(arrivalTimeParts[0]);
      const arrivalMinute = Number.parseInt(arrivalTimeParts[1]);

      const departureDate = new Date();
      departureDate.setHours(arrivalHour);
      departureDate.setMinutes(arrivalMinute);
      departureDate.setHours(
        departureDate.getHours() + Number.parseInt(stayDuration)
      );

      const expectedDeparture = format(departureDate, "HH:mm");

      // Allocate parking using the selected strategy
      const result = await allocateParking({
        licensePlate,
        vehicleType,
        arrivalTime,
        expectedDeparture,
        stayDuration: Number.parseInt(stayDuration),
        allocationStrategy,
      });
      setAllocationResult(result);
      if (result.success) {
        setLicensePlate("");
        setVehicleType("private");
        setStayDuration("1");
        setArrivalTime(format(new Date(), "HH:mm"));
        setAllocationStrategy("algorithm");
      }
    } catch (error) {
      setAllocationResult({
        success: false,
        message: "An error occurred during allocation. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Vehicle Entry</h2>

      {allocationResult && (
        <Alert
          className={`mb-6 ${
            allocationResult.success ? "bg-green-50" : "bg-red-50"
          }`}
        >
          {allocationResult.success && (
            <CheckCircle className="h-4 w-4 text-green-600" />
          )}
          <AlertTitle>
            {allocationResult.success
              ? "Parking Allocated Successfully"
              : "Allocation Failed"}
          </AlertTitle>
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

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Enter Vehicle Details</CardTitle>
            <CardDescription>
              Our AI system will scan the license plate and allocate the best
              parking spot
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="licensePlate">License Plate Number</Label>
              <Input
                id="licensePlate"
                placeholder="e.g., ABC123"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
              />
              {errors.licensePlate && (
                <p className="text-sm text-red-500">{errors.licensePlate}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Vehicle Type</Label>
              <RadioGroup
                value={vehicleType}
                onValueChange={(value) =>
                  setVehicleType(value as "government" | "private" | "public")
                }
                className="flex space-x-4"
              >
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
              <Input
                id="arrivalTime"
                type="time"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
              />
              {errors.arrivalTime && (
                <p className="text-sm text-red-500">{errors.arrivalTime}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="stayDuration">
                Expected Stay Duration (hours)
              </Label>
              <Select value={stayDuration} onValueChange={setStayDuration}>
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
              {errors.stayDuration && (
                <p className="text-sm text-red-500">{errors.stayDuration}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Allocation Strategy</Label>
              <RadioGroup
                value={allocationStrategy}
                onValueChange={(value) =>
                  setAllocationStrategy(value as AllocationStrategy)
                }
                className="flex space-x-4"
              >
                {strategyOptions.map((opt) => (
                  <div key={opt.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={opt.value} id={opt.value} />
                    <Label htmlFor={opt.value}>{opt.label}</Label>
                  </div>
                ))}
              </RadioGroup>
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
  );
}
