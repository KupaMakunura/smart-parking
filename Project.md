# Smart Parking System - Technical Documentation

## 📚 Overview
This document explains how our smart parking system works, using actual code snippets from the implementation. The system uses multiple algorithms and approaches to optimize parking allocation.

## 🏗️ System Architecture

### 1. Data Models
From [`models.py`](api/models/models.py):
```python
class VehicleData(BaseModel):
    vehicle_plate_num: str
    vehicle_plate_type: int = Field(..., description="0: Private, 1: Public, 2: Govt")
    vehicle_type: int = Field(..., description="0: Car, 1: Truck, 2: Motorcycle")
    arrival_time: str
    departure_time: str
    priority_level: int = Field(0, description="0-3, with 3 being highest priority")

class ParkingAllocation(BaseModel):
    vehicle_plate_num: str
    bay_assigned: int
    slot_assigned: int
    allocation_score: float
    allocation_time: str
```

### 2. Core Algorithms

#### A. GradientBoost Allocation
From [`train.ipynb`](api/notebooks/train.ipynb):
```python
def train_models(parking_data):
    features = [
        "vehicle_plate_type",
        "vehicle_type",
        "day_of_week",
        "hour_of_day",
        "duration_hours",
        "priority_level",
        "arrival_hour",
        "arrival_minute"
    ]
    
    score_pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('gb_regressor', GradientBoostingRegressor(
            n_estimators=200, 
            max_depth=5, 
            learning_rate=0.1
        ))
    ])
```

#### B. Q-Learning Optimization
```python
class ParkingEnvironment:
    def __init__(self, num_bays=4, slots_per_bay=10):
        self.num_bays = num_bays
        self.slots_per_bay = slots_per_bay
        self.state_size = self.num_bays * self.slots_per_bay
        self.q_table = np.zeros((4, 24, self.action_size))  # 4 priority levels, 24 hours

    def step(self, action, priority):
        if 0 <= action < self.state_size and self.state[action] == 0:
            bay = action // self.slots_per_bay
            slot = action % self.slots_per_bay
            
            # Calculate reward based on multiple factors
            bay_value = 10 - bay  # Bay 0 is most valuable
            slot_value = self.slots_per_bay - slot  # Slot 0 is most valuable
            priority_factor = priority + 1
            
            # Time-aware rewards
            peak_hours = [8, 9, 10, 17, 18, 19]
            time_factor = 1.5 if self.current_hour in peak_hours else 1.0
            
            reward = priority_factor * (bay_value + slot_value) * time_factor
```

### 3. Smart Allocation System
The core allocation logic combines both algorithms:
```python
class SmartParkingSystem:
    def allocate_parking(self, vehicle_data):
        # 1. Predict allocation score using GradientBoost
        predicted_score = self.predict_allocation_score(vehicle_data)
        
        # 2. Get current conditions
        priority = vehicle_data.get('priority_level', 0)
        current_hour = vehicle_data.get('hour_of_day')
        
        # 3. Use Q-learning for optimal space selection
        available_spaces = self.env.get_available_spaces()
        priority_hour_q_values = self.env.q_table[priority, current_hour]
        
        # 4. Make final decision
        available_q_values = [(action, priority_hour_q_values[action]) 
                            for action in available_spaces]
        best_action = sorted(available_q_values, 
                           key=lambda x: x[1], 
                           reverse=True)[0][0]
        
        # 5. Execute allocation
        bay, slot = self.env.get_bay_slot(best_action)
```

## 🔄 How It Works

1. **Vehicle Entry**:
   - System receives vehicle details (plate, type, arrival time)
   - Calculates priority level based on vehicle type and plate type
   - Uses GradientBoost to predict initial allocation score

2. **Space Allocation**:
   - Q-Learning algorithm considers:
     - Current occupancy
     - Time of day (peak vs off-peak)
     - Vehicle priority
     - Historical patterns
   - Selects optimal bay and slot based on combined score

3. **Real-time Adaptation**:
```python
# Occupancy-based adjustment
if current_hour in [8, 9, 17, 18]:  # Peak hours
    occupancy_rate = 0.7
elif current_hour in [7, 10, 16, 19]:  # Near peak
    occupancy_rate = 0.5
else:
    occupancy_rate = 0.3
```

## 📊 Performance Factors

The system considers multiple factors for allocation:
```python
# Score calculation
base_score = 50
location_score = (5 - bay_assigned) * 10 + (11 - slot_assigned) * 5
time_factor = 1.5 if hour in peak_hours else 1.0
priority_factor = 1 + priority_level * 0.5
duration_factor = max(0.8, 1.2 - duration_hours * 0.05)

final_score = base_score + location_score * time_factor * priority_factor * duration_factor
```

## 🎯 Benefits

1. **Optimal Space Utilization**: Combines machine learning with reinforcement learning
2. **Priority Management**: Handles different vehicle types and priority levels
3. **Time-Aware**: Adapts to peak hours and occupancy patterns
4. **Learning System**: Improves allocation strategies over time

## 📈 Example Results
```python
test_vehicle = {
    'vehicle_plate_num': 'GOV1234', 
    'vehicle_plate_type': 2,  # Govt
    'vehicle_type': 0,  # Car
    'hour_of_day': 8,  # Morning peak
    'priority_level': 3,  # Highest priority
}

allocation = smart_parking.allocate_parking(test_vehicle)
# Results in optimal bay/slot assignment with high allocation score
```
