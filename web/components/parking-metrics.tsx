"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useParkingContext } from "@/context/parking-context";
import { AllocationStrategy } from "@/types/parking";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type AllocationMetrics = {
  vehicle_plate_num: string;
  bay_assigned: number;
  slot_assigned: number;
  allocation_time: Date;
  departure_time: Date;
  allocation_score: number;
  waiting_time: number;
  waiting_minutes: number;
  stay_duration: number;
};

type ParkingMetricsData = {
  [strategy: string]: AllocationMetrics[];
};

export default function ParkingMetrics() {
  const { allocationStrategy, setAllocationStrategy, fetchParkingStatus } =
    useParkingContext();
  const [metricsData, setMetricsData] = useState<ParkingMetricsData>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("efficiency");

  const strategies = ["algorithm", "sequential", "random"] as const;
  type Strategy = (typeof strategies)[number];

  const [selectedStrategy, setSelectedStrategy] = useState<Strategy>(
    allocationStrategy as Strategy
  );

  const fetchMetricsData = async () => {
    setIsLoading(true);
    try {
      // Update parking context data
      await fetchParkingStatus();

      // Fetch efficiency data for the selected strategy
      const efficiencyResponse = await fetch(
        `http://localhost:8000/api/parking/metrics/${selectedStrategy}`
      );

      if (efficiencyResponse.ok) {
        const efficiencyResult = await efficiencyResponse.json();

        // Process allocations to calculate efficiency metrics
        const processedData = efficiencyResult.allocations.map(
          (allocation: any) => {
            const allocationTime = new Date(allocation.allocation_time);
            const departureTime = new Date(allocation.departure_time);
            // Ensure we don't get negative time values by using Math.abs
            // In a real system, departure should always be after allocation
            const waitingTimeMs = Math.abs(
              departureTime.getTime() - allocationTime.getTime()
            );

            return {
              vehicle_plate_num: allocation.vehicle_plate_num,
              bay_assigned: allocation.bay_assigned,
              slot_assigned: allocation.slot_assigned,
              allocation_time: allocationTime,
              departure_time: departureTime,
              allocation_score: allocation.allocation_score,
              waiting_time: waitingTimeMs,
              waiting_minutes: Math.max(0.1, waitingTimeMs / (1000 * 60)), // Convert to minutes, ensure minimum value
              stay_duration: Math.max(
                1,
                Math.round(waitingTimeMs / (1000 * 60))
              ), // Ensure minimum value of 1 minute
            };
          }
        );

        setMetricsData({
          ...metricsData,
          [selectedStrategy]: processedData,
        });
      }
    } catch (error) {
      console.error("Error fetching metrics data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchMetricsData();

    // Set up polling every minute
    const interval = setInterval(fetchMetricsData, 60000);
    return () => clearInterval(interval);
  }, [selectedStrategy]);

  // Format time for X-axis
  const formatXAxis = (time: Date) => {
    return time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Prepare data for bar chart
  const prepareBarChartData = () => {
    const data = metricsData[selectedStrategy] || [];
    // Sort by waiting time to make the chart more readable
    return data
      .map((item) => ({
        vehicle_plate_num: item.vehicle_plate_num,
        waitingTime: parseFloat(item.waiting_minutes.toFixed(2)),
        stayDuration: item.stay_duration,
        allocationScore: item.allocation_score,
        bay_assigned: item.bay_assigned,
        slot_assigned: item.slot_assigned,
        arrivalTime: formatXAxis(item.allocation_time),
        departureTime: formatXAxis(item.departure_time),
      }))
      .sort((a, b) => a.waitingTime - b.waitingTime); // Sort by waiting time
  };

  const chartConfig = {
    algorithm: { label: "Algorithm", color: "#3b82f6" },
    sequential: { label: "Sequential", color: "#10b981" },
    random: { label: "Random", color: "#ef4444" },
  };

  return (
    <Card className="w-full h-screen">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Parking Metrics</CardTitle>
        <div className="flex items-center space-x-2">
          <select
            value={selectedStrategy}
            onChange={(e) => setSelectedStrategy(e.target.value as Strategy)}
            className="text-xs border rounded px-2 py-1"
          >
            {strategies.map((strategy) => (
              <option key={strategy} value={strategy}>
                {strategy.charAt(0).toUpperCase() + strategy.slice(1)}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMetricsData}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="efficiency">Time Efficiency</TabsTrigger>
            <TabsTrigger value="allocation">Allocation Details</TabsTrigger>
          </TabsList>

          <TabsContent value="efficiency" className="mt-4">
            <div className="h-[500px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  width={800}
                  height={500}
                  data={prepareBarChartData()}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="vehicle_plate_num" />
                  <YAxis
                    label={{
                      value: "Minutes",
                      angle: -90,
                      position: "insideLeft",
                    }}
                    domain={[0, "auto"]}
                    allowDecimals={true}
                    scale="linear"
                  />
                  <Tooltip
                    formatter={(value: any, name: string, props: any) => {
                      if (name === "waitingTime") {
                        const item = props.payload;
                        return [
                          `${value} min (Bay ${item.bay_assigned}, Slot ${item.slot_assigned})`,
                          "Stay Duration",
                        ];
                      }
                      return [value, name];
                    }}
                    labelFormatter={(label) => `Vehicle: ${label}`}
                  />
                  <Legend />
                  <Bar
                    dataKey="waitingTime"
                    name="Stay Duration"
                    fill={chartConfig[selectedStrategy].color}
                    radius={[4, 4, 0, 0]}
                    label={(props: any) => {
                      const { x, y, width, height, value } = props;
                      // Check if props.payload exists before accessing its properties
                      return value > 0 && props.payload ? (
                        <text
                          x={x + width / 2}
                          y={y - 10}
                          fill="#666"
                          textAnchor="middle"
                          fontSize={10}
                        >
                          {props.payload.slot_assigned}
                        </text>
                      ) : (
                        <g></g>
                      ); // Return empty SVG group instead of null
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="allocation" className="mt-4">
            <div className="h-[500px] overflow-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left">Vehicle</th>
                    <th className="border p-2 text-left">Bay</th>
                    <th className="border p-2 text-left">Slot</th>
                    <th className="border p-2 text-left">Arrival Time</th>
                    <th className="border p-2 text-left">Departure Time</th>
                    <th className="border p-2 text-left">Duration (min)</th>
                    <th className="border p-2 text-left">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {(metricsData[selectedStrategy] || []).map((item, index) => (
                    <tr
                      key={index}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="border p-2">{item.vehicle_plate_num}</td>
                      <td className="border p-2">{item.bay_assigned}</td>
                      <td className="border p-2">{item.slot_assigned}</td>
                      <td className="border p-2">
                        {formatXAxis(item.allocation_time)}
                      </td>
                      <td className="border p-2">
                        {formatXAxis(item.departure_time)}
                      </td>
                      <td className="border p-2">
                        {Math.max(0, item.waiting_minutes).toFixed(2)}
                      </td>
                      <td className="border p-2">
                        {(item.allocation_score || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
