import json
import os
import pickle
from datetime import datetime, timedelta, date
from typing import Any, Dict, List, Optional, Union
import time

import numpy as np
from fastapi import FastAPI, HTTPException, Query, Body
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

# Custom modules
from db import ParkingDatabase
from models.models import (
    BayStatus,
    ParkingAllocation,
    ParkingStatus,
    VehicleData,
    SimulationVehicleData,
    SimulationResults,
    AllocationResult,
)
from utils.simulation_strategies import SimulationManager


# Initialize FastAPI
app = FastAPI(
    title="Smart Parking API",
    description="API for smart parking allocation using machine learning",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Custom JSON encoder to handle NumPy types
class NumpyJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        return super().default(obj)


# Initialize database
db = ParkingDatabase(encoder_class=NumpyJSONEncoder)

# Initialize separate databases for simulation strategies
db_sequential = ParkingDatabase(
    db_path="./parking_db_sequential.json", encoder_class=NumpyJSONEncoder
)
db_random = ParkingDatabase(
    db_path="./parking_db_random.json", encoder_class=NumpyJSONEncoder
)
db_algorithm = ParkingDatabase(
    db_path="./parking_db_algorithm.json", encoder_class=NumpyJSONEncoder
)


# Utility function to handle datetime strings consistently
def parse_datetime(dt_str):
    if dt_str is None:
        return None
    if isinstance(dt_str, str):
        if "Z" in dt_str or "+" in dt_str:
            return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        try:
            # Try full datetime first
            return datetime.fromisoformat(dt_str)
        except ValueError:
            # Handle time-only string (e.g., '12:16')
            try:
                today = date(2025, 6, 30)  # Use current date
                t = datetime.strptime(dt_str, "%H:%M").time()
                return datetime.combine(today, t)
            except Exception:
                raise ValueError(f"Invalid datetime or time format: {dt_str}")
    return dt_str  # Already a datetime object


# Load trained models
MODEL_DIR = os.path.join(os.path.dirname(__file__), "ai_models")


def load_models():
    try:
        with open(os.path.join(MODEL_DIR, "score_model.pkl"), "rb") as f:
            score_model = pickle.load(f)
        with open(os.path.join(MODEL_DIR, "bay_model.pkl"), "rb") as f:
            bay_model = pickle.load(f)
        with open(os.path.join(MODEL_DIR, "slot_model.pkl"), "rb") as f:
            slot_model = pickle.load(f)

        q_table = np.load(os.path.join(MODEL_DIR, "q_table_time_aware.npy"))

        # Import ParkingEnvironment and SmartParkingSystem from the trained model
        from utils.parking_system import ParkingEnvironment, SmartParkingSystem

        # Initialize environment
        env = ParkingEnvironment(num_bays=4, slots_per_bay=10)
        env.q_table = q_table

        # Initialize smart parking system instance
        smart_parking = SmartParkingSystem(score_model, bay_model, slot_model, env)

        return smart_parking
    except Exception as e:
        print(f"Error loading models: {e}")
        return None


smart_parking = load_models()


# Root endpoint
@app.get("/")
async def read_root():
    return {"message": "Smart Parking API is running"}


# Get all parking status
@app.get("/api/parking/status", response_model=ParkingStatus)
async def get_parking_status():
    if not smart_parking:
        raise HTTPException(
            status_code=500, detail="Smart parking system not initialized"
        )

    # Reset environment to get current state
    smart_parking.env.reset(occupancy_rate=0.0)  # Start with empty lot

    # Load all allocated slots from database
    allocations = db.get_all_allocations()

    # Update environment state with current allocations
    for allocation in allocations:
        bay = allocation["bay_assigned"] - 1  # Convert to 0-based indexing
        slot = allocation["slot_assigned"] - 1  # Convert to 0-based indexing

        # Mark slot as occupied if it's still within the parking duration
        arrival_time = parse_datetime(allocation["allocation_time"])
        departure_time = parse_datetime(allocation["departure_time"])

        # Make current_time timezone-aware for comparison
        current_time = datetime.now().astimezone()
        if current_time < departure_time:
            # Mark as occupied in the environment
            action = bay * smart_parking.env.slots_per_bay + slot
            smart_parking.env.state[action] = 1
            smart_parking.env.parking_lot[bay, slot] = 1

    # Get bay status
    bays = []
    for bay in range(smart_parking.env.num_bays):
        slots = []
        for slot in range(smart_parking.env.slots_per_bay):
            is_occupied = smart_parking.env.parking_lot[bay, slot] == 1
            # Get allocation for this bay and slot if occupied
            allocation = None
            if is_occupied:
                for a in allocations:
                    if a["bay_assigned"] == bay + 1 and a["slot_assigned"] == slot + 1:
                        # Only include if not expired
                        departure_time = parse_datetime(a["departure_time"])
                        current_time = datetime.now().astimezone()
                        if current_time < departure_time:
                            allocation = a
                            break

            slots.append(
                {
                    "slot_number": slot + 1,
                    "is_occupied": is_occupied,
                    "allocation": allocation,
                }
            )

        bays.append(BayStatus(bay_number=bay + 1, slots=slots))

    # Calculate summary statistics
    total_slots = smart_parking.env.num_bays * smart_parking.env.slots_per_bay
    occupied_slots = sum(slot.is_occupied for bay in bays for slot in bay.slots)

    return ParkingStatus(
        bays=bays,
        total_slots=total_slots,
        occupied_slots=occupied_slots,
        available_slots=total_slots - occupied_slots,
        occupancy_percentage=(
            round((occupied_slots / total_slots) * 100, 1) if total_slots > 0 else 0
        ),
        updated_at=datetime.now().isoformat(),
    )


# Allocate parking slot
@app.post("/api/parking/allocate", response_model=ParkingAllocation)
async def allocate_parking(
    vehicle_data: VehicleData,
    strategy: Optional[str] = Query(
        None, description="Allocation strategy: algorithm, sequential, random"
    ),
):
    if not smart_parking:
        raise HTTPException(
            status_code=500, detail="Smart parking system not initialized"
        )

    # Use strategy from query or default to 'algorithm'
    selected_strategy = (strategy or "algorithm").lower()
    if selected_strategy not in ["algorithm", "sequential", "random"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid strategy. Must be 'algorithm', 'sequential', or 'random'",
        )

    # Prepare data for the model
    vehicle_input = {
        "vehicle_plate_num": vehicle_data.vehicle_plate_num,
        "vehicle_plate_type": vehicle_data.vehicle_plate_type,
        "vehicle_type": vehicle_data.vehicle_type,
        "arrival_time": vehicle_data.arrival_time,
        "departure_time": vehicle_data.departure_time,
        "priority_level": vehicle_data.priority_level,
    }
    arrival_time = parse_datetime(vehicle_data.arrival_time)
    departure_time = parse_datetime(vehicle_data.departure_time)
    duration_hours = (departure_time - arrival_time).total_seconds() / 3600
    vehicle_input["duration_hours"] = duration_hours
    vehicle_input["day_of_week"] = arrival_time.weekday()
    vehicle_input["hour_of_day"] = arrival_time.hour

    if selected_strategy == "algorithm":
        # Use the smart parking system's default allocation
        allocation = smart_parking.allocate_parking(vehicle_input)
        if allocation["status"] != "Allocated":
            raise HTTPException(status_code=400, detail=allocation["status"])
        allocation_record = {
            "vehicle_plate_num": vehicle_data.vehicle_plate_num,
            "vehicle_plate_type": vehicle_data.vehicle_plate_type,
            "vehicle_type": vehicle_data.vehicle_type,
            "bay_assigned": int(allocation["bay_assigned"]),
            "slot_assigned": int(allocation["slot_assigned"]),
            "allocation_score": float(allocation["allocation_score"]),
            "allocation_time": allocation["allocation_time"],
            "departure_time": vehicle_data.departure_time,
            "priority_level": vehicle_data.priority_level,
            "is_active": True,
        }

        # Save to the appropriate database based on strategy
        if selected_strategy == "algorithm":
            strategy_db = db_algorithm
        elif selected_strategy == "sequential":
            strategy_db = db_sequential
        elif selected_strategy == "random":
            strategy_db = db_random
        else:
            strategy_db = db

        allocation_id = strategy_db.create_allocation(allocation_record)
        allocation_record["id"] = allocation_id
        return ParkingAllocation(**allocation_record)
    else:
        # Use simulation manager for sequential/random
        simulation_manager = SimulationManager(smart_parking)
        vehicles_list = [vehicle_input]
        sim_results = simulation_manager.run_simulation(
            vehicles_list, selected_strategy
        )
        alloc_result = sim_results["allocation_results"][0]
        if alloc_result["status"] != "success":
            raise HTTPException(
                status_code=400,
                detail=alloc_result.get("error_message") or "Allocation failed.",
            )
        allocation_record = {
            "vehicle_plate_num": vehicle_data.vehicle_plate_num,
            "vehicle_plate_type": vehicle_data.vehicle_plate_type,
            "vehicle_type": vehicle_data.vehicle_type,
            "bay_assigned": int(alloc_result["bay_assigned"]),
            "slot_assigned": int(alloc_result["slot_assigned"]),
            "allocation_score": float(alloc_result["allocation_score"]),
            "allocation_time": alloc_result["allocation_time"],
            "departure_time": vehicle_data.departure_time,
            "priority_level": vehicle_data.priority_level,
            "is_active": True,
        }

        # Save to the appropriate database based on strategy
        if selected_strategy == "algorithm":
            strategy_db = db_algorithm
        elif selected_strategy == "sequential":
            strategy_db = db_sequential
        elif selected_strategy == "random":
            strategy_db = db_random
        else:
            strategy_db = db

        allocation_id = strategy_db.create_allocation(allocation_record)
        allocation_record["id"] = allocation_id
        return ParkingAllocation(**allocation_record)


# Bulk allocate parking slots
@app.post(
    "/api/parking/allocate/bulk", response_model=List[Union[ParkingAllocation, None]]
)
async def bulk_allocate_parking(
    vehicles_data: List[VehicleData],
    strategy: Optional[str] = Query(
        None, description="Allocation strategy: algorithm, sequential, random"
    ),
):
    if not smart_parking:
        raise HTTPException(
            status_code=500, detail="Smart parking system not initialized"
        )

    # Use strategy from query or default to 'algorithm'
    selected_strategy = (strategy or "algorithm").lower()
    if selected_strategy not in ["algorithm", "sequential", "random"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid strategy. Must be 'algorithm', 'sequential', or 'random'",
        )

    # Select the appropriate database based on strategy
    if selected_strategy == "algorithm":
        strategy_db = db_algorithm
    elif selected_strategy == "sequential":
        strategy_db = db_sequential
    elif selected_strategy == "random":
        strategy_db = db_random
    else:
        strategy_db = db

    results = []

    if selected_strategy == "algorithm":
        # Process each vehicle individually using the smart parking system
        for vehicle_data in vehicles_data:
            try:
                # Prepare data for the model
                vehicle_input = {
                    "vehicle_plate_num": vehicle_data.vehicle_plate_num,
                    "vehicle_plate_type": vehicle_data.vehicle_plate_type,
                    "vehicle_type": vehicle_data.vehicle_type,
                    "arrival_time": vehicle_data.arrival_time,
                    "departure_time": vehicle_data.departure_time,
                    "priority_level": vehicle_data.priority_level,
                }
                arrival_time = parse_datetime(vehicle_data.arrival_time)
                departure_time = parse_datetime(vehicle_data.departure_time)
                duration_hours = (departure_time - arrival_time).total_seconds() / 3600
                vehicle_input["duration_hours"] = duration_hours
                vehicle_input["day_of_week"] = arrival_time.weekday()
                vehicle_input["hour_of_day"] = arrival_time.hour

                # Allocate parking
                allocation = smart_parking.allocate_parking(vehicle_input)
                if allocation["status"] == "Allocated":
                    allocation_record = {
                        "vehicle_plate_num": vehicle_data.vehicle_plate_num,
                        "vehicle_plate_type": vehicle_data.vehicle_plate_type,
                        "vehicle_type": vehicle_data.vehicle_type,
                        "bay_assigned": int(allocation["bay_assigned"]),
                        "slot_assigned": int(allocation["slot_assigned"]),
                        "allocation_score": float(allocation["allocation_score"]),
                        "allocation_time": allocation["allocation_time"],
                        "departure_time": vehicle_data.departure_time,
                        "priority_level": vehicle_data.priority_level,
                        "is_active": True,
                    }
                    # Save to strategy-specific database
                    allocation_id = strategy_db.create_allocation(allocation_record)
                    allocation_record["id"] = allocation_id
                    results.append(ParkingAllocation(**allocation_record))
                else:
                    # If allocation fails, add None to results to maintain order
                    results.append(None)
            except Exception as e:
                # Log the error and continue with next vehicle
                print(
                    f"Error processing vehicle {vehicle_data.vehicle_plate_num}: {str(e)}"
                )
                results.append(None)
    else:
        # Use simulation manager for sequential/random with all vehicles at once
        try:
            # Prepare all vehicles data
            vehicles_list = []
            for vehicle_data in vehicles_data:
                vehicle_input = {
                    "vehicle_plate_num": vehicle_data.vehicle_plate_num,
                    "vehicle_plate_type": vehicle_data.vehicle_plate_type,
                    "vehicle_type": vehicle_data.vehicle_type,
                    "arrival_time": vehicle_data.arrival_time,
                    "departure_time": vehicle_data.departure_time,
                    "priority_level": vehicle_data.priority_level,
                }
                arrival_time = parse_datetime(vehicle_data.arrival_time)
                departure_time = parse_datetime(vehicle_data.departure_time)
                duration_hours = (departure_time - arrival_time).total_seconds() / 3600
                vehicle_input["duration_hours"] = duration_hours
                vehicle_input["day_of_week"] = arrival_time.weekday()
                vehicle_input["hour_of_day"] = arrival_time.hour
                vehicles_list.append(vehicle_input)

            # Run simulation with all vehicles
            simulation_manager = SimulationManager(smart_parking)
            sim_results = simulation_manager.run_simulation(
                vehicles_list, selected_strategy
            )

            # Process results
            for i, alloc_result in enumerate(sim_results["allocation_results"]):
                if i >= len(vehicles_data):
                    break

                if alloc_result["status"] == "success":
                    vehicle_data = vehicles_data[i]
                    allocation_record = {
                        "vehicle_plate_num": vehicle_data.vehicle_plate_num,
                        "vehicle_plate_type": vehicle_data.vehicle_plate_type,
                        "vehicle_type": vehicle_data.vehicle_type,
                        "bay_assigned": int(alloc_result["bay_assigned"]),
                        "slot_assigned": int(alloc_result["slot_assigned"]),
                        "allocation_score": float(alloc_result["allocation_score"]),
                        "allocation_time": alloc_result["allocation_time"],
                        "departure_time": vehicle_data.departure_time,
                        "priority_level": vehicle_data.priority_level,
                        "is_active": True,
                    }
                    # Save to strategy-specific database
                    allocation_id = strategy_db.create_allocation(allocation_record)
                    allocation_record["id"] = allocation_id
                    results.append(ParkingAllocation(**allocation_record))
                else:
                    results.append(None)
        except Exception as e:
            # If there's an error in the simulation, return what we have so far
            print(f"Error in bulk allocation: {str(e)}")
            # Fill remaining results with None if needed
            while len(results) < len(vehicles_data):
                results.append(None)

    return results


# Get allocation by ID
@app.get("/api/parking/allocation/{allocation_id}", response_model=ParkingAllocation)
async def get_allocation(allocation_id: int):
    allocation = db.get_allocation(allocation_id)
    if not allocation:
        raise HTTPException(
            status_code=404, detail=f"Allocation with ID {allocation_id} not found"
        )
    return ParkingAllocation(**allocation)


# Update allocation (e.g., extend parking time)
@app.put("/api/parking/allocation/{allocation_id}", response_model=ParkingAllocation)
async def update_allocation(allocation_id: int, update_data: Dict[str, Any]):
    allocation = db.get_allocation(allocation_id)
    if not allocation:
        raise HTTPException(
            status_code=404, detail=f"Allocation with ID {allocation_id} not found"
        )

    # Update allocation
    updated_allocation = db.update_allocation(allocation_id, update_data)
    return ParkingAllocation(**updated_allocation)


# Delete/end allocation
@app.delete("/api/parking/allocation/{allocation_id}")
async def delete_allocation(allocation_id: int):
    allocation = db.get_allocation(allocation_id)
    if not allocation:
        raise HTTPException(
            status_code=404, detail=f"Allocation with ID {allocation_id} not found"
        )

    # End allocation by marking it as inactive
    db.update_allocation(allocation_id, {"is_active": False})
    return {
        "message": f"Allocation with ID {allocation_id} has been ended",
    }


# Get all allocations with filtering
@app.get("/api/parking/allocations", response_model=List[ParkingAllocation])
async def get_allocations(
    active_only: bool = Query(True, description="Get only active allocations"),
    vehicle_plate_num: Optional[str] = Query(
        None, description="Filter by vehicle plate number"
    ),
):
    filters = {}
    if active_only:
        filters["is_active"] = True
    if vehicle_plate_num:
        filters["vehicle_plate_num"] = vehicle_plate_num

    allocations = db.get_filtered_allocations(filters)
    return [ParkingAllocation(**allocation) for allocation in allocations]


# Simulate parking allocations
@app.post("/api/parking/simulate", response_model=SimulationResults)
async def simulate_parking_allocation(
    simulation_data: SimulationVehicleData,
):
    if not smart_parking:
        raise HTTPException(
            status_code=500, detail="Smart parking system not initialized"
        )

    # Prepare data for the simulation
    vehicles_list = [vehicle.dict() for vehicle in simulation_data.vehicles]
    strategy = simulation_data.allocation_strategy.lower()

    # Validate strategy
    if strategy not in ["sequential", "random", "algorithm"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid strategy. Must be 'sequential', 'random', or 'algorithm'",
        )

    # Get the appropriate database
    strategy_db_map = {
        "sequential": db_sequential,
        "random": db_random,
        "algorithm": db_algorithm,
    }

    strategy_db = strategy_db_map[strategy]

    # Clear the strategy database for fresh simulation
    strategy_db.allocations.truncate()

    # Run simulation
    simulation_manager = SimulationManager(smart_parking)
    simulation_results = simulation_manager.run_simulation(vehicles_list, strategy)

    # Save successful allocations to the appropriate database
    allocation_results = []
    for result in simulation_results["allocation_results"]:
        if result["status"] == "success":
            # Create allocation record for database
            allocation_record = {
                "vehicle_plate_num": result["vehicle_plate_num"],
                "vehicle_plate_type": next(
                    v["vehicle_plate_type"]
                    for v in vehicles_list
                    if v["vehicle_plate_num"] == result["vehicle_plate_num"]
                ),
                "vehicle_type": next(
                    v["vehicle_type"]
                    for v in vehicles_list
                    if v["vehicle_plate_num"] == result["vehicle_plate_num"]
                ),
                "bay_assigned": result["bay_assigned"],
                "slot_assigned": result["slot_assigned"],
                "allocation_score": result["allocation_score"],
                "allocation_time": result["allocation_time"],
                "departure_time": next(
                    v["departure_time"]
                    for v in vehicles_list
                    if v["vehicle_plate_num"] == result["vehicle_plate_num"]
                ),
                "priority_level": next(
                    v["priority_level"]
                    for v in vehicles_list
                    if v["vehicle_plate_num"] == result["vehicle_plate_num"]
                ),
                "is_active": True,
            }

            # Save to strategy database
            allocation_id = strategy_db.create_allocation(allocation_record)
            allocation_record["id"] = allocation_id

        # Convert to AllocationResult model
        allocation_results.append(
            AllocationResult(
                vehicle_plate_num=result["vehicle_plate_num"],
                status=result["status"],
                bay_assigned=result.get("bay_assigned"),
                slot_assigned=result.get("slot_assigned"),
                allocation_score=result.get("allocation_score"),
                allocation_time=result.get("allocation_time"),
                error_message=result.get("error_message"),
            )
        )

    # Generate final parking status based on simulation results
    final_parking_status = await generate_parking_status_from_simulation(
        simulation_results, strategy_db
    )

    return SimulationResults(
        strategy=simulation_results["strategy"],
        total_vehicles=simulation_results["total_vehicles"],
        successful_allocations=simulation_results["successful_allocations"],
        failed_allocations=simulation_results["failed_allocations"],
        success_rate=simulation_results["success_rate"],
        average_allocation_score=simulation_results["average_allocation_score"],
        total_processing_time=simulation_results["total_processing_time"],
        allocation_results=allocation_results,
        final_parking_status=final_parking_status,
        database_file=f"parking_db_{strategy}.json",
    )


# Get parking status for a specific strategy
@app.get("/api/parking/status/{strategy}", response_model=ParkingStatus)
async def get_parking_status_by_strategy(strategy: str):
    strategy = strategy.lower()

    if strategy not in ["sequential", "random", "algorithm", "main"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid strategy. Must be 'sequential', 'random', 'algorithm', or 'main'",
        )

    # Get the appropriate database
    if strategy == "main":
        strategy_db = db
    else:
        strategy_db_map = {
            "sequential": db_sequential,
            "random": db_random,
            "algorithm": db_algorithm,
        }
        strategy_db = strategy_db_map[strategy]

    # For non-main strategies, we need to reconstruct the parking state
    if strategy != "main":
        return await generate_parking_status_from_db(strategy_db)
    else:
        return await get_parking_status()


@app.get("/api/parking/metrics/{strategy}", response_model=ParkingStatus)
async def get_parking_metrics_by_strategy(strategy: str):
    strategy = strategy.lower()

    if strategy not in ["sequential", "random", "algorithm", "main"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid strategy. Must be 'sequential', 'random', 'algorithm', or 'main'",
        )

    # Get the appropriate database
    if strategy == "main":
        strategy_db = db
    else:
        strategy_db_map = {
            "sequential": db_sequential,
            "random": db_random,
            "algorithm": db_algorithm,
        }
        strategy_db = strategy_db_map[strategy]

        response = {
            "strategy": strategy,
            "allocations": strategy_db.get_all_allocations(),
        }

        return JSONResponse(content=response)


# Compare all allocation strategies
@app.post("/api/parking/compare", response_model=Dict[str, SimulationResults])
async def compare_allocation_strategies(vehicles: List[VehicleData]):
    if not smart_parking:
        raise HTTPException(
            status_code=500, detail="Smart parking system not initialized"
        )

    vehicles_list = [vehicle.dict() for vehicle in vehicles]
    strategies = ["sequential", "random", "algorithm"]
    results = {}

    for strategy in strategies:
        # Create simulation data for this strategy
        simulation_data = SimulationVehicleData(
            vehicles=vehicles, allocation_strategy=strategy
        )

        # Run simulation
        try:
            strategy_result = await simulate_parking_allocation(simulation_data)
            results[strategy] = strategy_result
        except Exception as e:
            # If a strategy fails, continue with others
            results[strategy] = {"error": str(e), "strategy": strategy}

    return results


# Clear strategy database
@app.delete("/api/parking/clear/{strategy}")
async def clear_strategy_database(strategy: str):
    strategy = strategy.lower()

    if strategy not in ["sequential", "random", "algorithm", "all"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid strategy. Must be 'sequential', 'random', 'algorithm', or 'all'",
        )

    if strategy == "all":
        db_sequential.allocations.truncate()
        db_random.allocations.truncate()
        db_algorithm.allocations.truncate()
        return {"message": "All strategy databases cleared"}
    else:
        strategy_db_map = {
            "sequential": db_sequential,
            "random": db_random,
            "algorithm": db_algorithm,
        }
        strategy_db_map[strategy].allocations.truncate()
        return {"message": f"{strategy.capitalize()} database cleared"}


# Helper function to generate parking status from simulation results
async def generate_parking_status_from_simulation(
    simulation_results: Dict, strategy_db: ParkingDatabase
) -> ParkingStatus:
    if not smart_parking:
        raise HTTPException(
            status_code=500, detail="Smart parking system not initialized"
        )

    # Reset environment
    smart_parking.env.reset(occupancy_rate=0.0)

    # Load allocations from strategy database
    allocations = strategy_db.get_all_allocations()

    # Update environment state with allocations
    for allocation in allocations:
        bay = allocation["bay_assigned"] - 1
        slot = allocation["slot_assigned"] - 1

        # Mark as occupied in the environment
        action = bay * smart_parking.env.slots_per_bay + slot
        smart_parking.env.state[action] = 1
        smart_parking.env.parking_lot[bay, slot] = 1

    # Generate bay status
    bays = []
    for bay in range(smart_parking.env.num_bays):
        slots = []
        for slot in range(smart_parking.env.slots_per_bay):
            is_occupied = smart_parking.env.parking_lot[bay, slot] == 1

            # Get allocation for this bay and slot if occupied
            allocation = None
            if is_occupied:
                for a in allocations:
                    if a["bay_assigned"] == bay + 1 and a["slot_assigned"] == slot + 1:
                        allocation = a
                        break

            slots.append(
                {
                    "slot_number": slot + 1,
                    "is_occupied": is_occupied,
                    "allocation": allocation,
                }
            )

        bays.append(BayStatus(bay_number=bay + 1, slots=slots))

    # Calculate summary statistics
    total_slots = smart_parking.env.num_bays * smart_parking.env.slots_per_bay
    occupied_slots = sum(slot.is_occupied for bay in bays for slot in bay.slots)

    return ParkingStatus(
        bays=bays,
        total_slots=total_slots,
        occupied_slots=occupied_slots,
        available_slots=total_slots - occupied_slots,
        occupancy_percentage=(
            round((occupied_slots / total_slots) * 100, 1) if total_slots > 0 else 0
        ),
        updated_at=datetime.now().isoformat(),
    )


# Helper function to generate parking status from database
async def generate_parking_status_from_db(
    strategy_db: ParkingDatabase,
) -> ParkingStatus:
    if not smart_parking:
        raise HTTPException(
            status_code=500, detail="Smart parking system not initialized"
        )

    # Reset environment
    smart_parking.env.reset(occupancy_rate=0.0)

    # Load allocations from strategy database
    allocations = strategy_db.get_all_allocations()

    # Update environment state with current allocations
    for allocation in allocations:
        bay = allocation["bay_assigned"] - 1
        slot = allocation["slot_assigned"] - 1

        # Check if allocation is still active (not expired)
        departure_time = parse_datetime(allocation["departure_time"])
        current_time = datetime.now().astimezone()

        if current_time < departure_time and allocation.get("is_active", True):
            # Mark as occupied in the environment
            action = bay * smart_parking.env.slots_per_bay + slot
            smart_parking.env.state[action] = 1
            smart_parking.env.parking_lot[bay, slot] = 1

    # Generate bay status
    bays = []
    for bay in range(smart_parking.env.num_bays):
        slots = []
        for slot in range(smart_parking.env.slots_per_bay):
            is_occupied = smart_parking.env.parking_lot[bay, slot] == 1

            # Get allocation for this bay and slot if occupied
            allocation = None
            if is_occupied:
                for a in allocations:
                    if a["bay_assigned"] == bay + 1 and a["slot_assigned"] == slot + 1:
                        # Only include if not expired
                        departure_time = parse_datetime(a["departure_time"])
                        current_time = datetime.now().astimezone()
                        if current_time < departure_time and a.get("is_active", True):
                            allocation = a
                            break

            slots.append(
                {
                    "slot_number": slot + 1,
                    "is_occupied": is_occupied,
                    "allocation": allocation,
                }
            )

        bays.append(BayStatus(bay_number=bay + 1, slots=slots))

    # Calculate summary statistics
    total_slots = smart_parking.env.num_bays * smart_parking.env.slots_per_bay
    occupied_slots = sum(slot.is_occupied for bay in bays for slot in bay.slots)

    return ParkingStatus(
        bays=bays,
        total_slots=total_slots,
        occupied_slots=occupied_slots,
        available_slots=total_slots - occupied_slots,
        occupancy_percentage=(
            round((occupied_slots / total_slots) * 100, 1) if total_slots > 0 else 0
        ),
        updated_at=datetime.now().isoformat(),
    )
