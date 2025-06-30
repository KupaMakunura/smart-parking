"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Brain, Shuffle, List, Info, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import type { ParkingAlgorithm } from "@/types/parking"

interface AlgorithmSettingsProps {
  selectedAlgorithm: ParkingAlgorithm
  onAlgorithmChange: (algorithm: ParkingAlgorithm) => void
  onStartComparison?: () => void
  isComparisonMode?: boolean
  isLoading?: boolean
}

export default function AlgorithmSettings({
  selectedAlgorithm,
  onAlgorithmChange,
  onStartComparison,
  isComparisonMode = false,
  isLoading = false,
}: AlgorithmSettingsProps) {
  const [showDetails, setShowDetails] = useState(false)
  const { toast } = useToast()

  const algorithms = [
    {
      id: "algorithm" as ParkingAlgorithm, // Updated to match backend
      name: "AI Algorithm",
      icon: Brain,
      description: "Smart allocation using machine learning",
      features: [
        "Optimizes walking distance",
        "Considers vehicle type priority",
        "Predicts future occupancy",
        "Minimizes congestion",
        "Dynamic space utilization",
      ],
      efficiency: "95%",
      color: "bg-blue-500",
    },
    {
      id: "random" as ParkingAlgorithm,
      name: "Random Allocation",
      icon: Shuffle,
      description: "Randomly assigns available spots",
      features: [
        "Simple random selection",
        "No optimization",
        "Equal probability for all spots",
        "Fast allocation",
        "No learning capability",
      ],
      efficiency: "60%",
      color: "bg-orange-500",
    },
    {
      id: "sequential" as ParkingAlgorithm,
      name: "Sequential Allocation",
      icon: List,
      description: "Fills spots in order from first to last",
      features: [
        "First-come, first-served",
        "Predictable allocation pattern",
        "Simple implementation",
        "No vehicle type consideration",
        "May cause congestion",
      ],
      efficiency: "70%",
      color: "bg-purple-500",
    },
  ]

  const handleAlgorithmChange = async (algorithm: ParkingAlgorithm) => {
    try {
      onAlgorithmChange(algorithm)
      toast({
        title: "Algorithm Updated",
        description: `Switched to ${algorithms.find((a) => a.id === algorithm)?.name}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update algorithm. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Parking Algorithm Settings</h2>
          <p className="text-muted-foreground">Choose the allocation algorithm for comparison</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowDetails(!showDetails)}>
            <Info className="h-4 w-4 mr-2" />
            {showDetails ? "Hide" : "Show"} Details
          </Button>
          {onStartComparison && (
            <Button onClick={onStartComparison} className="bg-green-600 hover:bg-green-700" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Start Comparison Mode
            </Button>
          )}
        </div>
      </div>

      {isComparisonMode && (
        <Alert className="bg-green-50 border-green-200">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Comparison mode is active. Use the simulation and comparison endpoints to analyze different allocation
            strategies.
          </AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <Alert className="bg-blue-50 border-blue-200">
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>Loading algorithm data...</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {algorithms.map((algorithm) => {
          const Icon = algorithm.icon
          const isSelected = selectedAlgorithm === algorithm.id

          return (
            <Card
              key={algorithm.id}
              className={`cursor-pointer transition-all duration-200 ${
                isSelected ? "ring-2 ring-blue-500 bg-blue-50" : "hover:shadow-md"
              } ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
              onClick={() => !isLoading && handleAlgorithmChange(algorithm.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${algorithm.color} text-white`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{algorithm.name}</CardTitle>
                      <Badge variant="outline" className="mt-1">
                        Efficiency: {algorithm.efficiency}
                      </Badge>
                    </div>
                  </div>
                  <RadioGroup value={selectedAlgorithm} onValueChange={handleAlgorithmChange}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value={algorithm.id} id={algorithm.id} disabled={isLoading} />
                    </div>
                  </RadioGroup>
                </div>
                <CardDescription>{algorithm.description}</CardDescription>
              </CardHeader>

              {showDetails && (
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Key Features:</h4>
                    <ul className="space-y-1">
                      {algorithm.features.map((feature, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Current Selection: {algorithms.find((a) => a.id === selectedAlgorithm)?.name}
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          </CardTitle>
          <CardDescription>
            This algorithm preference will be used for allocations. The backend manages the actual strategy selection.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${algorithms.find((a) => a.id === selectedAlgorithm)?.color} text-white`}>
              {(() => {
                const Icon = algorithms.find((a) => a.id === selectedAlgorithm)?.icon || Brain
                return <Icon className="h-6 w-6" />
              })()}
            </div>
            <div>
              <p className="font-medium">{algorithms.find((a) => a.id === selectedAlgorithm)?.description}</p>
              <p className="text-sm text-gray-600 mt-1">
                Expected efficiency: {algorithms.find((a) => a.id === selectedAlgorithm)?.efficiency}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
