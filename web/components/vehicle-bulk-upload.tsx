"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AllocationStrategy } from "@/types/parking";
import { AlertCircle, CheckCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const strategyOptions: { label: string; value: AllocationStrategy }[] = [
  { label: "AI Algorithm", value: "algorithm" },
  { label: "Sequential", value: "sequential" },
  { label: "Random", value: "random" },
];

interface VehicleBulkData {
  licensePlate: string;
  vehicleType: "government" | "private" | "public";
  stayDuration: string;
  priorityLevel?: number;
}

export function VehicleBulkAllocation() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [allocationStrategy, setAllocationStrategy] =
    useState<AllocationStrategy>("algorithm");
  const [results, setResults] = useState<
    Array<{ success: boolean; message: string }>
  >([]);

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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
    }
  };

  const handleAllocate = async () => {
    if (!file) {
      toast.error("Please select a file to upload.");
      return;
    }

    setIsLoading(true);
    setResults([]);

    try {
      const fileContent = await file.text();
      const vehiclesData: VehicleBulkData[] = JSON.parse(fileContent);

      if (!Array.isArray(vehiclesData)) {
        throw new Error(
          "Invalid file format. Expected an array of vehicle data."
        );
      }

      const now = new Date();

      // Format all vehicles for a single bulk request
      const formattedVehiclesData = vehiclesData.map((vehicle) => {
        const arrivalTime = now.toISOString();
        const departureTime = new Date(
          now.getTime() + parseInt(vehicle.stayDuration) * 60 * 60 * 1000
        ).toISOString();

        return {
          vehicle_plate_num: vehicle.licensePlate,
          vehicle_plate_type: mapVehicleTypeToApi(vehicle.vehicleType),
          vehicle_type: 0, // Default to Car
          arrival_time: arrivalTime,
          departure_time: departureTime,
          priority_level:
            vehicle.priorityLevel ||
            (vehicle.vehicleType === "government" ? 2 : 1),
        };
      });

      // Make a single bulk request with all vehicles
      const response = await fetch(
        `http://localhost:8000/api/parking/allocate/bulk?strategy=${allocationStrategy}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formattedVehiclesData),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to allocate parking: ${response.status} ${response.statusText}. ${errorText}`
        );
      }

      const data = await response.json();

      // Process results
      const allocationResults = data.map((result: any, index: number) => {
        const vehicle = vehiclesData[index];
        if (result && result.bay_assigned) {
          return {
            success: true,
            message: `Allocated ${vehicle.licensePlate} to Bay ${result.bay_assigned}, Slot ${result.slot_assigned}`,
          };
        } else {
          return {
            success: false,
            message: `Failed to allocate ${vehicle.licensePlate}`,
          };
        }
      });

      setResults(allocationResults);
      toast.success(
        `Allocation complete. ${
          allocationResults.filter((r: any) => r.success).length
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
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Bulk Vehicle Allocation</CardTitle>
        <CardDescription>
          Upload a JSON file with vehicle data to allocate parking slots in
          bulk.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="json-upload">Vehicle Data (JSON)</Label>
          <Input
            id="json-upload"
            type="file"
            accept=".json"
            onChange={handleFileChange}
            disabled={isLoading}
          />
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Upload a JSON file with an array of vehicle objects. Example
              format:
            </p>
            <pre className="mt-2 p-2 bg-muted rounded text-xs">
              {`[
  {
    "licensePlate": "ABC123",
    "vehicleType": "private",
    "stayDuration": "2",
    "priorityLevel": 1
  },
  ...
]`}
            </pre>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Allocation Strategy</Label>
          <div className="flex gap-4">
            {strategyOptions.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <input
                  type="radio"
                  id={option.value}
                  name="strategy"
                  value={option.value}
                  checked={allocationStrategy === option.value}
                  onChange={() => setAllocationStrategy(option.value)}
                  className="h-4 w-4 text-primary"
                  disabled={isLoading}
                />
                <Label htmlFor={option.value} className="text-sm font-normal">
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Button
          onClick={handleAllocate}
          disabled={isLoading || !file}
          className="w-full"
        >
          {isLoading ? "Allocating..." : "Allocate Parking"}
        </Button>

        {results.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Allocation Results:</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {results.map((result, index) => (
                <Alert
                  key={index}
                  variant={result.success ? "default" : "destructive"}
                  className="flex items-start"
                >
                  {result.success ? (
                    <CheckCircle className="h-4 w-4 mt-0.5 mr-2" />
                  ) : (
                    <AlertCircle className="h-4 w-4 mt-0.5 mr-2" />
                  )}
                  <AlertDescription>{result.message}</AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
