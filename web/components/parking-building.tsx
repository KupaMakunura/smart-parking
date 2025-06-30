"use client"

import { useState, useEffect } from "react"
import { Text, Html } from "@react-three/drei"
import type { ParkingData } from "@/types/parking"
import * as THREE from "three"

interface ParkingBuildingProps {
  floors: number
  onFloorSelect: (floor: number) => void
  parkingData: ParkingData
  entryVehicle?: boolean
  exitVehicle?: boolean
  entryImage?: string | null
  exitImage?: string | null
}

export default function ParkingBuilding({
  floors,
  onFloorSelect,
  parkingData,
  entryVehicle = false,
  exitVehicle = false,
  entryImage = null,
  exitImage = null,
}: ParkingBuildingProps) {
  const [hoveredFloor, setHoveredFloor] = useState<number | null>(null)
  const [hoveredEntry, setHoveredEntry] = useState(false)
  const [hoveredExit, setHoveredExit] = useState(false)
  const [entryTexture, setEntryTexture] = useState<THREE.Texture | null>(null)
  const [exitTexture, setExitTexture] = useState<THREE.Texture | null>(null)

  const floorHeight = 3
  const buildingWidth = 10
  const buildingDepth = 15

  // Load textures when images change
  useEffect(() => {
    if (entryImage) {
      const loader = new THREE.TextureLoader()
      loader.load(entryImage, (texture) => {
        setEntryTexture(texture)
      })
    } else {
      setEntryTexture(null)
    }
  }, [entryImage])

  useEffect(() => {
    if (exitImage) {
      const loader = new THREE.TextureLoader()
      loader.load(exitImage, (texture) => {
        setExitTexture(texture)
      })
    } else {
      setExitTexture(null)
    }
  }, [exitImage])

  return (
    <group>
      {/* Base/Ground */}
      <mesh position={[0, -0.5, 0]} receiveShadow>
        <boxGeometry args={[buildingWidth + 15, 0.5, buildingDepth + 15]} />
        <meshStandardMaterial color="#aaaaaa" />
      </mesh>

      {/* Entry Tray */}
      <group position={[-buildingWidth / 2 - 4, 0, -buildingDepth / 4]}>
        {/* Entry platform */}
        <mesh
          position={[0, 0, 0]}
          receiveShadow
          onPointerOver={() => setHoveredEntry(true)}
          onPointerOut={() => setHoveredEntry(false)}
        >
          <boxGeometry args={[5, 0.2, 6]} />
          <meshStandardMaterial
            color={hoveredEntry ? "#22c55e" : "#4ade80"}
            emissive={hoveredEntry ? "#22c55e" : "#000000"}
            emissiveIntensity={hoveredEntry ? 0.3 : 0}
          />
        </mesh>

        {/* Entry sign */}
        <mesh position={[0, 2, 0]}>
          <boxGeometry args={[3, 0.5, 0.2]} />
          <meshStandardMaterial color="#1e40af" />
        </mesh>

        <Text
          position={[0, 2, 0.2]}
          rotation={[0, 0, 0]}
          fontSize={0.6}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          ENTRY
        </Text>

        <Text
          position={[0, 1, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.4}
          color="#1e40af"
          anchorX="center"
          anchorY="middle"
        >
          AI License Plate Scanner
        </Text>

        {/* Camera post */}
        <mesh position={[1.5, 1, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.1, 2, 8]} />
          <meshStandardMaterial color="#64748b" />
        </mesh>

        {/* Camera */}
        <mesh position={[1.5, 1.8, 0.3]} castShadow>
          <boxGeometry args={[0.3, 0.3, 0.5]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>

        {/* Arrow indicating direction */}
        <mesh position={[0, 0.3, -2]} rotation={[0, 0, 0]}>
          <coneGeometry args={[0.5, 1, 8]} />
          <meshStandardMaterial color="#4ade80" />
        </mesh>

        {/* Vehicle at entry (conditionally rendered) */}
        {entryVehicle && (
          <group position={[0, 0.5, 0]}>
            {/* Car body */}
            <mesh position={[0, 0.3, 0]} castShadow>
              <boxGeometry args={[2, 0.8, 4]} />
              <meshStandardMaterial color="#3b82f6" map={entryTexture || undefined} />
            </mesh>

            {/* Car top */}
            <mesh position={[0, 0.9, -0.5]} castShadow>
              <boxGeometry args={[1.8, 0.6, 2]} />
              <meshStandardMaterial color="#2563eb" />
            </mesh>

            {/* Wheels */}
            {[
              [-0.8, -0.2, -1.2],
              [0.8, -0.2, -1.2],
              [-0.8, -0.2, 1.2],
              [0.8, -0.2, 1.2],
            ].map((position, index) => (
              <mesh key={index} position={position} castShadow>
                <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} rotation={[Math.PI / 2, 0, 0]} />
                <meshStandardMaterial color="#1e293b" />
              </mesh>
            ))}

            {/* License plate */}
            <mesh position={[0, 0.3, 2.01]} castShadow>
              <boxGeometry args={[1, 0.3, 0.05]} />
              <meshStandardMaterial color="white" />
            </mesh>

            <Html position={[0, 0.3, 2.05]}>
              <div className="bg-white px-2 py-1 text-xs font-bold border border-gray-300">ABC 123</div>
            </Html>

            {/* Scanning effect */}
            <mesh position={[0, 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[2.2, 4.2]} />
              <meshStandardMaterial color="green" transparent opacity={0.2} />
            </mesh>
          </group>
        )}
      </group>

      {/* Exit Tray */}
      <group position={[buildingWidth / 2 + 4, 0, buildingDepth / 4]}>
        {/* Exit platform */}
        <mesh
          position={[0, 0, 0]}
          receiveShadow
          onPointerOver={() => setHoveredExit(true)}
          onPointerOut={() => setHoveredExit(false)}
        >
          <boxGeometry args={[5, 0.2, 6]} />
          <meshStandardMaterial
            color={hoveredExit ? "#dc2626" : "#f87171"}
            emissive={hoveredExit ? "#dc2626" : "#000000"}
            emissiveIntensity={hoveredExit ? 0.3 : 0}
          />
        </mesh>

        {/* Exit sign */}
        <mesh position={[0, 2, 0]}>
          <boxGeometry args={[3, 0.5, 0.2]} />
          <meshStandardMaterial color="#b91c1c" />
        </mesh>

        <Text
          position={[0, 2, 0.2]}
          rotation={[0, 0, 0]}
          fontSize={0.6}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          EXIT
        </Text>

        <Text
          position={[0, 1, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.4}
          color="#b91c1c"
          anchorX="center"
          anchorY="middle"
        >
          Departure Processing
        </Text>

        {/* Barrier arm */}
        <mesh position={[-1.5, 0.8, 0]} rotation={[0, 0, exitVehicle ? 0 : Math.PI / 4]}>
          <boxGeometry args={[3, 0.1, 0.1]} />
          <meshStandardMaterial color="#ef4444" />
        </mesh>

        {/* Barrier post */}
        <mesh position={[-1.5, 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.1, 1, 8]} />
          <meshStandardMaterial color="#64748b" />
        </mesh>

        {/* Arrow indicating direction */}
        <mesh position={[0, 0.3, 2]} rotation={[0, Math.PI, 0]}>
          <coneGeometry args={[0.5, 1, 8]} />
          <meshStandardMaterial color="#f87171" />
        </mesh>

        {/* Vehicle at exit (conditionally rendered) */}
        {exitVehicle && (
          <group position={[0, 0.5, 0]}>
            {/* Car body */}
            <mesh position={[0, 0.3, 0]} castShadow>
              <boxGeometry args={[2, 0.8, 4]} />
              <meshStandardMaterial color="#a855f7" map={exitTexture || undefined} />
            </mesh>

            {/* Car top */}
            <mesh position={[0, 0.9, 0.5]} castShadow>
              <boxGeometry args={[1.8, 0.6, 2]} />
              <meshStandardMaterial color="#9333ea" />
            </mesh>

            {/* Wheels */}
            {[
              [-0.8, -0.2, -1.2],
              [0.8, -0.2, -1.2],
              [-0.8, -0.2, 1.2],
              [0.8, -0.2, 1.2],
            ].map((position, index) => (
              <mesh key={index} position={position} castShadow>
                <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} rotation={[Math.PI / 2, 0, 0]} />
                <meshStandardMaterial color="#1e293b" />
              </mesh>
            ))}

            {/* License plate */}
            <mesh position={[0, 0.3, -2.01]} castShadow>
              <boxGeometry args={[1, 0.3, 0.05]} />
              <meshStandardMaterial color="white" />
            </mesh>

            <Html position={[0, 0.3, -2.05]}>
              <div className="bg-white px-2 py-1 text-xs font-bold border border-gray-300">XYZ 789</div>
            </Html>

            {/* Payment processing effect */}
            <Html position={[2, 1.5, 0]}>
              <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-red-300">
                <div className="text-xs font-bold text-red-600">Payment Processed</div>
                <div className="text-xs">Duration: 3h 15m</div>
                <div className="text-xs">Amount: $12.50</div>
              </div>
            </Html>
          </group>
        )}
      </group>

      {/* Floors */}
      {Array.from({ length: floors }).map((_, index) => {
        const floorNumber = index
        const yPosition = floorNumber * floorHeight
        const isHovered = hoveredFloor === floorNumber

        // Calculate occupancy for this floor
        const floorSpots = parkingData.spots.filter((spot) => spot.floor === floorNumber)
        const occupiedCount = floorSpots.filter((spot) => spot.isOccupied).length
        const occupancyRate = floorSpots.length > 0 ? (occupiedCount / floorSpots.length) * 100 : 0

        return (
          <group key={floorNumber} position={[0, yPosition, 0]}>
            {/* Floor slab */}
            <mesh
              position={[0, 0, 0]}
              onPointerOver={() => setHoveredFloor(floorNumber)}
              onPointerOut={() => setHoveredFloor(null)}
              onClick={() => onFloorSelect(floorNumber)}
            >
              <boxGeometry args={[buildingWidth, 0.5, buildingDepth]} />
              <meshStandardMaterial color={isHovered ? "#90cdf4" : "#e2e8f0"} transparent opacity={0.9} />
            </mesh>

            {/* Columns at corners */}
            {[
              [-buildingWidth / 2 + 0.5, floorHeight / 2, -buildingDepth / 2 + 0.5],
              [buildingWidth / 2 - 0.5, floorHeight / 2, -buildingDepth / 2 + 0.5],
              [-buildingWidth / 2 + 0.5, floorHeight / 2, buildingDepth / 2 - 0.5],
              [buildingWidth / 2 - 0.5, floorHeight / 2, buildingDepth / 2 - 0.5],
            ].map((position, colIndex) => (
              <mesh key={colIndex} position={position} castShadow>
                <boxGeometry args={[1, floorHeight, 1]} />
                <meshStandardMaterial color="#718096" />
              </mesh>
            ))}

            {/* Floor label */}
            <Text
              position={[-buildingWidth / 2 - 2, 1, 0]}
              rotation={[0, 0, 0]}
              fontSize={1}
              color="black"
              anchorX="right"
              anchorY="middle"
            >
              {`Floor ${floorNumber + 1}`}
            </Text>

            {/* Occupancy indicator */}
            <Html position={[0, 2, buildingDepth / 2 + 0.5]}>
              <div className="bg-white px-2 py-1 rounded shadow text-sm">
                <div className="font-semibold">Occupancy: {occupancyRate.toFixed(0)}%</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: `${occupancyRate}%` }}></div>
                </div>
              </div>
            </Html>

            {/* Simplified parking spots visualization */}
            <group position={[0, 0.5, 0]}>
              {floorSpots.map((spot, spotIndex) => {
                // Calculate position in a grid layout
                const row = Math.floor(spotIndex / 5)
                const col = spotIndex % 5
                const xPos = -buildingWidth / 2 + 1.5 + col * 2
                const zPos = -buildingDepth / 2 + 2 + row * 3

                let spotColor = spot.isOccupied ? "red" : "green"
                if (spot.isOccupied) {
                  if (spot.vehicleType === "government") spotColor = "blue"
                  else if (spot.vehicleType === "public") spotColor = "purple"
                }

                return (
                  <mesh key={spotIndex} position={[xPos, 0.25, zPos]} rotation={[0, 0, 0]}>
                    <boxGeometry args={[1.5, 0.1, 2.5]} />
                    <meshStandardMaterial color={spotColor} />
                  </mesh>
                )
              })}
            </group>
          </group>
        )
      })}
    </group>
  )
}
