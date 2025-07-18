"use client";

import { useState } from "react";
import Papa from "papaparse";
import { useParkingContext } from "@/context/parking-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { VehicleEntry } from "@/types/parking";

export function VehicleBulkUpload() {
  const [file, setFile] = useState<File | null>(null);
  const { compareStrategies, isLoadingComparison } = useParkingContext();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  const mapVehicleTypeToApi = (
    vehicleType: string
  ): number => {
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

  const handleUpload = () => {
    if (!file) {
      toast.error("Please select a file to upload.");
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const vehicles: any[] = results.data.map((row: any) => {
            const arrivalTime = new Date().toISOString();
            const departureTime = new Date(
              new Date().getTime() + parseInt(row.stayDuration) * 60 * 60 * 1000
            ).toISOString();

            return {
              vehicle_plate_num: row.licensePlate,
              vehicle_plate_type: mapVehicleTypeToApi(row.vehicleType),
              vehicle_type: 0, // Defaulting to Car
              arrival_time: arrivalTime,
              departure_time: departureTime,
              priority_level: row.vehicleType === "government" ? 2 : 1,
            };
        });

        toast.info(`Uploading ${vehicles.length} vehicles for comparison...`);
        compareStrategies(vehicles as VehicleEntry[]);
      },
      error: (error) => {
        toast.error(`Error parsing CSV file: ${error.message}`);
      },
    });
  };

  return (
    <div className="p-4 border rounded-lg space-y-4">
      <h3 className="text-lg font-semibold">Bulk Vehicle Upload for Comparison</h3>
      <div className="grid w-full max-w-sm items-center gap-1.5">
        <Label htmlFor="csv-upload">Upload CSV</Label>
        <Input id="csv-upload" type="file" accept=".csv" onChange={handleFileChange} />
      </div>
      <Button onClick={handleUpload} disabled={isLoadingComparison || !file}>
        {isLoadingComparison ? "Comparing..." : "Compare Allocation Strategies"}
      </Button>
    </div>
  );
}
