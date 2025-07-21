"use client";

import { useState } from "react";
import { format } from "date-fns";
import { useParkingContext } from "@/context/parking-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload, AlertCircle } from "lucide-react";
import { toast } from "sonner";
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
import { VehicleBulkAllocation } from "./vehicle-bulk-upload";

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

  // Bulk upload state
  const [activeTab, setIsBulkMode] = useState<"single" | "bulk">("single");
  const [file, setFile] = useState<File | null>(null);
  const [bulkResults, setBulkResults] = useState<
    Array<{ success: boolean; message: string }>
  >([]);

  // Bulk upload handlers
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
    }
  };

  const mapVehicleTypeToApi = (vehicleType: string): number => {
    switch (vehicleType.toLowerCase()) {
      case "government":
        return 2;
      case "public":
        return 1;
      case "private":
      default:
        return 0;
    }
  };

  const handleBulkAllocate = async () => {
    if (!file) {
      toast.error("Please select a file to upload.");
      return;
    }

    setIsSubmitting(true);
    setBulkResults([]);

    try {
      const fileContent = await file.text();
      const vehiclesData = JSON.parse(fileContent);

      if (!Array.isArray(vehiclesData)) {
        throw new Error(
          "Invalid file format. Expected an array of vehicle data."
        );
      }

      const allocationResults = [];
      const now = new Date();

      for (const vehicle of vehiclesData) {
        try {
          const arrivalTime = now.toISOString();
          const departureTime = new Date(
            now.getTime() +
              parseInt(vehicle.stayDuration || "1") * 60 * 60 * 1000
          ).toISOString();

          const result = await allocateParking({
            licensePlate: vehicle.licensePlate,
            vehicleType: vehicle.vehicleType || "private",
            arrivalTime: format(new Date(arrivalTime), "HH:mm"),
            expectedDeparture: format(new Date(departureTime), "HH:mm"),
            stayDuration: parseInt(vehicle.stayDuration || "1"),
            allocationStrategy,
          });

          allocationResults.push({
            success: result.success,
            message: result.success
              ? `Allocated ${vehicle.licensePlate} to Floor ${result.floor}, Spot ${result.spot}`
              : `Failed to allocate ${vehicle.licensePlate}: ${result.message}`,
          });
        } catch (error) {
          console.error(`Error allocating ${vehicle.licensePlate}:`, error);
          allocationResults.push({
            success: false,
            message: `Error allocating ${vehicle.licensePlate}: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          });
        }
      }

      setBulkResults(allocationResults);
      toast.success(
        `Allocation complete. ${
          allocationResults.filter((r) => r.success).length
        } of ${vehiclesData.length} vehicles allocated successfully.`
      );
    } catch (error) {
      console.error("Error processing file:", error);
      toast.error(
        `Error processing file: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Vehicle Entry</CardTitle>
        <CardDescription>
          Enter vehicle details to allocate parking slots.
        </CardDescription>
      </CardHeader>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setIsBulkMode(value as "single" | "bulk")}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="single">Single Entry</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
        </TabsList>

        <TabsContent value="single">
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {allocationResult && (
                <Alert
                  variant={allocationResult.success ? "default" : "destructive"}
                  className="flex items-start"
                >
                  {allocationResult.success ? (
                    <CheckCircle className="h-4 w-4 mt-0.5 mr-2" />
                  ) : (
                    <AlertCircle className="h-4 w-4 mt-0.5 mr-2" />
                  )}
                  <div>
                    <AlertTitle>
                      {allocationResult.success
                        ? "Parking Allocated Successfully"
                        : "Allocation Failed"}
                    </AlertTitle>
                    <AlertDescription>
                      {allocationResult.message}
                    </AlertDescription>
                  </div>
                </Alert>
              )}
            </CardContent>
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
                    <div
                      key={opt.value}
                      className="flex items-center space-x-2"
                    >
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
          </form>
        </TabsContent>
        <TabsContent value="bulk">
          <VehicleBulkAllocation />
        </TabsContent>
      </Tabs>
    </Card>
  );
}
