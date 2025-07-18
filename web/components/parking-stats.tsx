"use client";

import { useParkingContext } from "@/context/parking-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { AllocationStrategy } from "@/types/parking";

export default function ParkingStats() {
  const {
    parkingData,
    fetchParkingStatus,
    isLoading,
    comparisonResults,
    isLoadingComparison,
    allocationStrategy,
    setAllocationStrategy,
  } = useParkingContext();

  const chartData = comparisonResults
    ? Object.entries(comparisonResults)
        .filter(([, result]) => result)
        .map(([strategy, result]) => ({
          name: strategy,
          "Success Rate": result!.success_rate,
          "Avg. Allocation Score": result!.average_allocation_score,
          "Processing Time (ms)": result!.total_processing_time * 1000,
        }))
    : [];

  if (isLoading) {
    return <div>Loading stats...</div>;
  }

  // Add strategy options
  const strategyOptions = [
    { label: "AI Algorithm", value: "algorithm" },
    { label: "Sequential", value: "sequential" },
    { label: "Random", value: "random" },
  ];

  // Use API-provided total counts if available, otherwise calculate
  const totalSpots = parkingData.totalSlots || parkingData.spots.length;
  const occupiedSpots =
    parkingData.occupiedSlots ||
    parkingData.spots.filter((spot) => spot.isOccupied).length;
  const availableSpots =
    parkingData.availableSlots || totalSpots - occupiedSpots;
  const occupancyRate =
    parkingData.occupancyPercentage ||
    (totalSpots > 0 ? (occupiedSpots / totalSpots) * 100 : 0);

  // Vehicle type distribution
  const governmentVehicles = parkingData.spots.filter(
    (spot) => spot.isOccupied && spot.vehicleType === "government"
  ).length;

  const privateVehicles = parkingData.spots.filter(
    (spot) => spot.isOccupied && spot.vehicleType === "private"
  ).length;

  const publicVehicles = parkingData.spots.filter(
    (spot) => spot.isOccupied && spot.vehicleType === "public"
  ).length;

  // Floor occupancy data
  const floorData = Array.from({ length: 4 }).map((_, index) => {
    const floorSpots = parkingData.spots.filter((spot) => spot.floor === index);
    const floorOccupied = floorSpots.filter((spot) => spot.isOccupied).length;
    const floorTotal = floorSpots.length;
    const floorOccupancyRate =
      floorTotal > 0 ? (floorOccupied / floorTotal) * 100 : 0;

    return {
      name: `Floor ${index + 1}`,
      occupied: floorOccupied,
      available: floorTotal - floorOccupied,
      occupancyRate: floorOccupancyRate,
    };
  });

  // Pie chart data
  const occupancyData = [
    { name: "Occupied", value: occupiedSpots, color: "#ef4444" },
    { name: "Available", value: availableSpots, color: "#22c55e" },
  ];

  const vehicleTypeData = [
    { name: "Government", value: governmentVehicles, color: "#3b82f6" },
    { name: "Private", value: privateVehicles, color: "#f97316" },
    { name: "Public", value: publicVehicles, color: "#a855f7" },
  ];

  const handleRefresh = async () => {
    await fetchParkingStatus();
  };

  const handleStrategyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setAllocationStrategy(e.target.value as AllocationStrategy);
  };

  const formatLastUpdated = () => {
    if (!parkingData.lastUpdated) return "";
    return new Date(parkingData.lastUpdated).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Parking Statistics</h2>
          {parkingData.lastUpdated && (
            <p className="text-xs text-gray-500">
              Last updated: {formatLastUpdated()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            className="border rounded px-2 py-1 text-sm"
            value={allocationStrategy}
            onChange={handleStrategyChange}
            disabled={isLoading}
          >
            {strategyOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchParkingStatus()}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh Data
          </Button>
        </div>
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
            <div className="text-3xl font-bold">
              {occupancyRate.toFixed(1)}%
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
              <div
                className="bg-green-600 h-2.5 rounded-full"
                style={{ width: `${occupancyRate}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Available Spots</CardTitle>
            <CardDescription>Ready for allocation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {availableSpots}
            </div>
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
              <CardDescription>
                Current distribution of parking spots and vehicle types
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-sm font-medium mb-4 text-center">
                    Spot Occupancy
                  </h4>
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
                        label={({ name, percent }: { name: string; percent: number }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
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
                  <h4 className="text-sm font-medium mb-4 text-center">
                    Vehicle Types
                  </h4>
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
                        label={({ name, percent }: { name: string; percent: number }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
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
              <CardDescription>
                Occupancy distribution across different floors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={floorData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar
                    dataKey="occupied"
                    stackId="a"
                    fill="#ef4444"
                    name="Occupied"
                  />
                  <Bar
                    dataKey="available"
                    stackId="a"
                    fill="#22c55e"
                    name="Available"
                  />
                </BarChart>
              </ResponsiveContainer>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                {floorData.map((floor, index) => (
                  <div key={index} className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm text-gray-500">{floor.name}</div>
                    <div className="text-lg font-semibold">
                      {floor.occupancyRate.toFixed(0)}% Full
                    </div>
                    <div className="text-xs text-gray-500">
                      {floor.occupied} / {floor.occupied + floor.available}{" "}
                      spots
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {isLoadingComparison && <div>Loading comparison results...</div>}

      {comparisonResults && (
        <div className="mt-8">
          <h3 className="text-2xl font-bold mb-4">Strategy Comparison</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Success Rate (%)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="Success Rate" stroke="#8884d8" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Average Allocation Score</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="Avg. Allocation Score" stroke="#82ca9d" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Processing Time (ms)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="Processing Time (ms)" stroke="#ffc658" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
