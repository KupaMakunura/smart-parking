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

  const strategies = ["algorithm", "sequential", "random"] as const;

  const fetchMetricsData = async () => {
    setIsLoading(true);
    try {
      const newData: ParkingMetricsData = {};

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

      setMetricsData((prev) => ({
        ...prev,
        ...newData,
      }));
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

  // Chart configuration
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="occupancy">Occupancy</TabsTrigger>
            <TabsTrigger value="available">Available</TabsTrigger>
            <TabsTrigger value="rate">Occupancy Rate</TabsTrigger>
          </TabsList>

          <TabsContent value="occupancy" className="mt-4">
            <div className="h-screen">
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={formatXAxis}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      label={{
                        value: "Spots",
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
                                {entry.name}: {entry.value?.toLocaleString()}
                              </p>
                            ))}
                          </ChartTooltipContent>
                        );
                      }}
                    />
                    <ChartLegend
                      content={({ payload }) => (
                        <ChartLegendContent>
                          {payload?.map((entry, index) => (
                            <div
                              key={`legend-${index}`}
                              className="flex items-center text-sm"
                              style={{ color: entry.color }}
                            >
                              <div
                                className="w-3 h-3 mr-2 rounded-full"
                                style={{ backgroundColor: entry.color }}
                              />
                              {entry.value}
                            </div>
                          ))}
                        </ChartLegendContent>
                      )}
                    />
                    {strategies.map((strategy) => (
                      <Line
                        key={strategy}
                        type="monotone"
                        dataKey="occupied"
                        data={filterDataByTimeRange(
                          metricsData[strategy] || []
                        )}
                        name={chartConfig[strategy].label}
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

          <TabsContent value="available" className="mt-4">
            <div className="h-80">
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={formatXAxis}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      label={{
                        value: "Spots",
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
                                {entry.name}: {entry.value?.toLocaleString()}
                              </p>
                            ))}
                          </ChartTooltipContent>
                        );
                      }}
                    />
                    {strategies.map((strategy) => (
                      <Line
                        key={strategy}
                        type="monotone"
                        dataKey="available"
                        data={filterDataByTimeRange(
                          metricsData[strategy] || []
                        )}
                        name={chartConfig[strategy].label}
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

          <TabsContent value="rate" className="mt-4">
            <div className="h-80">
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={formatXAxis}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      label={{
                        value: "Rate (%)",
                        angle: -90,
                        position: "insideLeft",
                      }}
                      tick={{ fontSize: 12 }}
                      domain={[0, 100]}
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
                                {entry.name}
                              </p>
                            ))}
                          </ChartTooltipContent>
                        );
                      }}
                    />
                    {strategies.map((strategy) => (
                      <Line
                        key={strategy}
                        type="monotone"
                        dataKey="occupancyRate"
                        data={filterDataByTimeRange(
                          metricsData[strategy] || []
                        )}
                        name={chartConfig[strategy].label}
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
