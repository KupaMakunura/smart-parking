"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts"
import { Brain, Shuffle, List, Trophy, TrendingUp, Clock, MapPin, Target, Loader2, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { ParkingAlgorithm } from "@/types/parking"

interface AlgorithmComparisonProps {
  comparisonData?: any
  isActive: boolean
  onReset: () => void
  onRefresh?: () => Promise<void>
  isLoading?: boolean
}

export default function AlgorithmComparison({
  comparisonData,
  isActive,
  onReset,
  onRefresh,
  isLoading = false,
}: AlgorithmComparisonProps) {
  const [selectedMetric, setSelectedMetric] = useState<string>("overallScore")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { toast } = useToast()

  // Mock data for demonstration when no real data is available
  const mockComparisonData = {
    algorithm: {
      algorithm: "algorithm",
      totalAllocations: 0,
      averageWalkingDistance: 0,
      spaceUtilization: 0,
      allocationTime: 0,
      vehicleTypeOptimization: 0,
      overallScore: 0,
    },
    random: {
      algorithm: "random",
      totalAllocations: 0,
      averageWalkingDistance: 0,
      spaceUtilization: 0,
      allocationTime: 0,
      vehicleTypeOptimization: 0,
      overallScore: 0,
    },
    sequential: {
      algorithm: "sequential",
      totalAllocations: 0,
      averageWalkingDistance: 0,
      spaceUtilization: 0,
      allocationTime: 0,
      vehicleTypeOptimization: 0,
      overallScore: 0,
    },
  }

  const data = comparisonData || mockComparisonData
  const hasData =
    data.algorithm.totalAllocations > 0 || data.random.totalAllocations > 0 || data.sequential.totalAllocations > 0

  const algorithms = [
    { id: "algorithm", name: "AI Algorithm", icon: Brain, color: "#3b82f6" },
    { id: "random", name: "Random", icon: Shuffle, color: "#f97316" },
    { id: "sequential", name: "Sequential", icon: List, color: "#a855f7" },
  ]

  const handleRefresh = async () => {
    if (!onRefresh) return

    try {
      setIsRefreshing(true)
      await onRefresh()
      toast({
        title: "Data Refreshed",
        description: "Algorithm comparison data has been updated from the server.",
      })
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh data from the server.",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleReset = async () => {
    try {
      await onReset()
      toast({
        title: "Data Reset",
        description: "Algorithm comparison data has been reset on the server.",
      })
    } catch (error) {
      toast({
        title: "Reset Failed",
        description: "Failed to reset data on the server.",
        variant: "destructive",
      })
    }
  }

  // Prepare data for charts
  const barChartData = [
    {
      metric: "Overall Score",
      AI: data.algorithm.overallScore,
      Random: data.random.overallScore,
      Sequential: data.sequential.overallScore,
    },
    {
      metric: "Space Utilization",
      AI: data.algorithm.spaceUtilization,
      Random: data.random.spaceUtilization,
      Sequential: data.sequential.spaceUtilization,
    },
    {
      metric: "Vehicle Optimization",
      AI: data.algorithm.vehicleTypeOptimization,
      Random: data.random.vehicleTypeOptimization,
      Sequential: data.sequential.vehicleTypeOptimization,
    },
  ]

  const radarData = [
    {
      metric: "Space Utilization",
      AI: data.algorithm.spaceUtilization,
      Random: data.random.spaceUtilization,
      Sequential: data.sequential.spaceUtilization,
    },
    {
      metric: "Walking Distance",
      AI: Math.max(0, 100 - (data.algorithm.averageWalkingDistance / 100) * 100),
      Random: Math.max(0, 100 - (data.random.averageWalkingDistance / 100) * 100),
      Sequential: Math.max(0, 100 - (data.sequential.averageWalkingDistance / 100) * 100),
    },
    {
      metric: "Allocation Speed",
      AI: Math.max(0, 100 - data.algorithm.allocationTime * 10),
      Random: Math.max(0, 100 - data.random.allocationTime * 10),
      Sequential: Math.max(0, 100 - data.sequential.allocationTime * 10),
    },
    {
      metric: "Vehicle Optimization",
      AI: data.algorithm.vehicleTypeOptimization,
      Random: data.random.vehicleTypeOptimization,
      Sequential: data.sequential.vehicleTypeOptimization,
    },
  ]

  const getWinner = (): { algorithm: ParkingAlgorithm; score: number } => {
    const scores = [
      { algorithm: "algorithm" as ParkingAlgorithm, score: data.algorithm.overallScore },
      { algorithm: "random" as ParkingAlgorithm, score: data.random.overallScore },
      { algorithm: "sequential" as ParkingAlgorithm, score: data.sequential.overallScore },
    ]
    return scores.reduce((prev, current) => (prev.score > current.score ? prev : current))
  }

  const winner = getWinner()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Algorithm Performance Comparison</h2>
          <p className="text-muted-foreground">Real-time analysis from backend server</p>
        </div>
        <div className="flex gap-2">
          <Badge variant={isActive ? "default" : "secondary"} className="px-3 py-1">
            {isActive ? "Active Comparison" : "Comparison Paused"}
          </Badge>
          {onRefresh && (
            <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing || isLoading}>
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
          )}
          <Button variant="outline" onClick={handleReset} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Reset Data
          </Button>
        </div>
      </div>

      {!hasData && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <Target className="h-12 w-12 mx-auto mb-4 text-yellow-600" />
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">No Comparison Data Available</h3>
              <p className="text-yellow-700 mb-4">
                Start allocating vehicles with different algorithms to see performance comparisons.
              </p>
              <p className="text-sm text-yellow-600">
                Data will be automatically collected from the backend server as vehicles are processed.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {hasData && (
        <>
          {/* Winner Card */}
          <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
                Best Performing Algorithm
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-yellow-500 text-white">
                  {(() => {
                    const Icon = algorithms.find((a) => a.id === winner.algorithm)?.icon || Brain
                    return <Icon className="h-6 w-6" />
                  })()}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{algorithms.find((a) => a.id === winner.algorithm)?.name}</h3>
                  <p className="text-yellow-700">Overall Score: {winner.score.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {algorithms.map((algorithm) => {
              const performanceData = data[algorithm.id as keyof any] as any
              const Icon = algorithm.icon

              return (
                <Card key={algorithm.id} className="relative overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: algorithm.color, color: "white" }}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <CardTitle className="text-lg">{algorithm.name}</CardTitle>
                      </div>
                      <Badge variant="outline">{performanceData.overallScore.toFixed(1)}%</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Space Utilization</span>
                        <span>{performanceData.spaceUtilization.toFixed(1)}%</span>
                      </div>
                      <Progress value={performanceData.spaceUtilization} className="h-2" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Vehicle Optimization</span>
                        <span>{performanceData.vehicleTypeOptimization.toFixed(1)}%</span>
                      </div>
                      <Progress value={performanceData.vehicleTypeOptimization} className="h-2" />
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 text-sm">
                      <div>
                        <div className="flex items-center gap-1 text-gray-500">
                          <MapPin className="h-3 w-3" />
                          <span>Avg. Distance</span>
                        </div>
                        <div className="font-medium">{performanceData.averageWalkingDistance.toFixed(1)}m</div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>Alloc. Time</span>
                        </div>
                        <div className="font-medium">{performanceData.allocationTime.toFixed(1)}s</div>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 pt-2 border-t">
                      Total Allocations: {performanceData.totalAllocations}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {/* Detailed Charts */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Performance Overview</TabsTrigger>
          <TabsTrigger value="metrics">Detailed Metrics</TabsTrigger>
          <TabsTrigger value="trends">Backend Status</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {hasData ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Comparison</CardTitle>
                  <CardDescription>Overall scores across all algorithms</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={barChartData}>
                      <XAxis dataKey="metric" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="AI" fill="#3b82f6" name="AI Algorithm" />
                      <Bar dataKey="Random" fill="#f97316" name="Random" />
                      <Bar dataKey="Sequential" fill="#a855f7" name="Sequential" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Algorithm Radar Chart</CardTitle>
                  <CardDescription>Multi-dimensional performance analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} />
                      <Radar name="AI" dataKey="AI" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
                      <Radar name="Random" dataKey="Random" stroke="#f97316" fill="#f97316" fillOpacity={0.1} />
                      <Radar name="Sequential" dataKey="Sequential" stroke="#a855f7" fill="#a855f7" fillOpacity={0.1} />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-gray-500">
                  <BarChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Charts will appear once comparison data is available from the backend.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { key: "totalAllocations", label: "Total Allocations", icon: Target },
              { key: "averageWalkingDistance", label: "Avg. Walking Distance (m)", icon: MapPin },
              { key: "spaceUtilization", label: "Space Utilization (%)", icon: TrendingUp },
              { key: "allocationTime", label: "Allocation Time (s)", icon: Clock },
            ].map((metric) => {
              const Icon = metric.icon
              return (
                <Card key={metric.key}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {metric.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {algorithms.map((algorithm) => {
                      const performanceData = data[algorithm.id as keyof any] as any
                      const value = performanceData[metric.key as keyof any]
                      return (
                        <div key={algorithm.id} className="flex justify-between items-center">
                          <span className="text-sm" style={{ color: algorithm.color }}>
                            {algorithm.name}
                          </span>
                          <span className="font-medium">{typeof value === "number" ? value.toFixed(1) : value}</span>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Backend Connection Status</CardTitle>
              <CardDescription>Real-time connection to the parking management server</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm">Connected to backend server</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm">Algorithm data synchronized</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-sm">Performance metrics tracked in real-time</span>
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Server Endpoints</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div>• POST /api/parking/allocate - Vehicle allocation with algorithm selection</div>
                    <div>• GET /api/parking/algorithm-comparison - Performance comparison data</div>
                    <div>• POST /api/parking/algorithm-comparison/reset - Reset comparison data</div>
                    <div>• POST /api/parking/algorithm/set-active - Set active algorithm</div>
                    <div>• GET /api/parking/algorithm/active - Get current algorithm</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
