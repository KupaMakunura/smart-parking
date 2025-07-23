"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useParkingContext } from "@/context/parking-context";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

type TimeSeriesData = {
  timestamp: string;
  occupied: number;
  available: number;
  occupancyRate: number;
};

type ParkingMetricsData = {
  [strategy: string]: TimeSeriesData[];
};

export default function ParkingMetrics() {
  const { allocationStrategy, setAllocationStrategy } = useParkingContext();
  const [metricsData, setMetricsData] = useState<ParkingMetricsData>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [timeRange, setTimeRange] = useState<"1h" | "6h" | "24h">("1h");
  const [activeTab, setActiveTab] = useState<string>("occupancy");
  type Strategy = (typeof strategies)[number];

  const [selectedStrategies, setSelectedStrategies] = useState<Strategy[]>([
    "algorithm",
  ]);
  const [efficiencyData, setEfficiencyData] = useState<{
    [key: string]: any[];
  }>({});

  const strategies = ["algorithm", "sequential", "random"] as const;

  const fetchMetricsData = async () => {
    setIsLoading(true);
    try {
      const newData: ParkingMetricsData = {};
      const efficiencyMetrics: { [key: string]: any[] } = {};

      // Fetch data for each strategy
      for (const strategy of strategies) {
        const response = await fetch(
          `http://localhost:8000/api/parking/status/${strategy}`
        );
        if (!response.ok) continue;

        const data = await response.json();
        const timestamp = new Date().toISOString();
        const occupied = data.bays.reduce(
          (total: number, bay: any) =>
            total + bay.slots.filter((s: any) => s.is_occupied).length,
          0
        );
        const total = data.bays.reduce(
          (total: number, bay: any) => total + bay.slots.length,
          0
        );

        const timeData: TimeSeriesData = {
          timestamp,
          occupied,
          available: total - occupied,
          occupancyRate: total > 0 ? (occupied / total) * 100 : 0,
        };

        newData[strategy] = [
          ...(metricsData[strategy] || []).slice(-59), // Keep last 60 data points (1 per minute)
          timeData,
        ];
      }

      // Fetch efficiency data for each strategy
      for (const strategy of strategies) {
        const efficiencyResponse = await fetch(
          `/api/parking/metrics/${strategy}`
        );
        const efficiencyData = await efficiencyResponse.json();

        // Process allocations to calculate efficiency metrics
        const processedData = efficiencyData.allocations.map(
          (allocation: any) => ({
            vehicle_plate_num: allocation.vehicle_plate_num,
            bay_assigned: allocation.bay_assigned,
            slot_assigned: allocation.slot_assigned,
            allocation_time: new Date(allocation.allocation_time),
            departure_time: new Date(allocation.departure_time),
            allocation_score: allocation.allocation_score,
            waiting_time:
              new Date(allocation.departure_time).getTime() -
              new Date(allocation.allocation_time).getTime(),
          })
        );

        efficiencyMetrics[strategy] = processedData;
      }

      setMetricsData(newData);
      setEfficiencyData(efficiencyMetrics);
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
  }, [timeRange]);

  // Filter data based on selected time range
  const filterDataByTimeRange = (data: TimeSeriesData[]) => {
    const now = new Date();
    let cutoffTime = new Date(now);

    switch (timeRange) {
      case "1h":
        cutoffTime.setHours(now.getHours() - 1);
        break;
      case "6h":
        cutoffTime.setHours(now.getHours() - 6);
        break;
      case "24h":
        cutoffTime.setDate(now.getDate() - 1);
        break;
    }

    return data.filter((entry) => new Date(entry.timestamp) >= cutoffTime);
  };

  // Format time for X-axis
  const formatXAxis = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
          <div className="flex items-center space-x-2">
            {strategies.map((strategy) => (
              <label
                key={strategy}
                className="flex items-center space-x-1 text-xs"
              >
                <input
                  type="checkbox"
                  checked={selectedStrategies.includes(strategy)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedStrategies([...selectedStrategies, strategy]);
                    } else {
                      setSelectedStrategies(
                        selectedStrategies.filter((s) => s !== strategy)
                      );
                    }
                  }}
                  className="form-checkbox h-3 w-3"
                />
                <span className="capitalize">{strategy}</span>
              </label>
            ))}
          </div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="text-xs border rounded px-2 py-1"
          >
            <option value="1h">Last hour</option>
            <option value="6h">Last 6 hours</option>
            <option value="24h">Last 24 hours</option>
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
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="efficiency">Allocation Efficiency</TabsTrigger>
          </TabsList>

          <TabsContent value="efficiency" className="mt-4">
            <div className="h-80">
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="allocation_time"
                      tickFormatter={(time) =>
                        new Date(time).toLocaleTimeString()
                      }
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      label={{
                        value: "Time (minutes)",
                        angle: -90,
                        position: "insideLeft",
                      }}
                      tick={{ fontSize: 12 }}
                    />
                    <ChartTooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <ChartTooltipContent>
                            <p className="text-sm font-medium">
                              {new Date(label).toLocaleTimeString()}
                            </p>
                            {payload.map((entry) => (
                              <p key={entry.name} className="text-sm">
                                <span
                                  className="inline-block w-3 h-3 mr-1 rounded-full"
                                  style={{ backgroundColor: entry.color }}
                                />
                                {entry.name}:{" "}
                                {((entry.value as any) / (1000 * 60)).toFixed(
                                  2
                                )}{" "}
                                min
                              </p>
                            ))}
                          </ChartTooltipContent>
                        );
                      }}
                    />
                    {selectedStrategies.map((strategy: Strategy) => (
                      <Line
                        key={strategy}
                        type="monotone"
                        dataKey="waiting_time"
                        data={efficiencyData[strategy] || []}
                        name={`${chartConfig[strategy].label} Waiting Time`}
                        stroke={chartConfig[strategy].color}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
