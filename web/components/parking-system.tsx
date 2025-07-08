"use client";

import { useState } from "react";
import { BarChart3, Car, Home, LayoutDashboard, Settings } from "lucide-react";
import ParkingVisualization from "./parking-visualization";
import VehicleEntryForm from "./vehicle-entry-form";
import ParkingStats from "./parking-stats";
import { ParkingProvider } from "@/context/parking-context";

export default function ParkingSystem() {
  const [activeView, setActiveView] = useState("dashboard");

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r shadow-sm">
          <div className="p-4 border-b">
            <h1 className="text-xl font-bold">Smart Parking</h1>
            <p className="text-xs text-muted-foreground"></p>
          </div>

          <div className="p-2">
            <nav className="space-y-1">
              <button
                onClick={() => setActiveView("dashboard")}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md ${
                  activeView === "dashboard"
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => setActiveView("entry")}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md ${
                  activeView === "entry"
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Car className="h-4 w-4" />
                <span>Vehicle Entry</span>
              </button>

              <button
                onClick={() => setActiveView("stats")}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md ${
                  activeView === "stats"
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                <span>Parking Statistics</span>
              </button>

              {/* Algorithm Selection Section */}
              <div className="mt-4 pt-4 border-t">
                <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Allocation Algorithms
                </h3>
                <div className="mt-2 space-y-1">
                  <button
                    onClick={() => setActiveView("gradientboost")}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md ${
                      activeView === "gradientboost"
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <span>GradientBoost</span>
                  </button>
                  <button
                    onClick={() => setActiveView("qlearning")}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md ${
                      activeView === "qlearning"
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <span>Q-Learning</span>
                  </button>
                  <button
                    onClick={() => setActiveView("random")}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md ${
                      activeView === "random"
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <span>Random Allocation</span>
                  </button>
                  <button
                    onClick={() => setActiveView("sequential")}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md ${
                      activeView === "sequential"
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <span>Sequential Allocation</span>
                  </button>
                </div>
              </div>
            </nav>

            <div className="mt-6 pt-6 border-t">
              <nav className="space-y-1">
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md text-gray-700 hover:bg-gray-100">
                  <Home className="h-4 w-4" />
                  <span>Home</span>
                </button>

                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md text-gray-700 hover:bg-gray-100">
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </button>
              </nav>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold tracking-tight">
                Smart Parking
              </h1>
            </div>

            <ParkingProvider>
              {activeView === "dashboard" && (
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <ParkingVisualization />
                </div>
              )}

              {activeView === "entry" && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <VehicleEntryForm
                    onComplete={() => setActiveView("dashboard")}
                  />
                </div>
              )}

              {activeView === "stats" && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <ParkingStats />
                </div>
              )}

              {/* Algorithm Code Snippets */}
              {activeView === "gradientboost" && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-2xl font-bold mb-4">
                    GradientBoost Allocation Algorithm
                  </h2>
                  <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto">
                    <pre className="text-sm">
                      <code>{`# Create pipeline with scaling and GradientBoostingRegressor
score_pipeline = Pipeline([
    ('scaler', StandardScaler()),
    ('gb_regressor', GradientBoostingRegressor(
        n_estimators=200, 
        max_depth=5, 
        learning_rate=0.1, 
        random_state=42
    ))
])

# Train the allocation score model
score_pipeline.fit(X_train, y_train)
score_pred = score_pipeline.predict(X_test)`}</code>
                    </pre>
                  </div>
                </div>
              )}

              {activeView === "qlearning" && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-2xl font-bold mb-4">
                    Q-Learning Optimization
                  </h2>
                  <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto">
                    <pre className="text-sm">
                      <code>{`# Q-learning parameters
learning_rate = 0.1
discount_factor = 0.95
epsilon = 1.0
epsilon_decay = 0.995
min_epsilon = 0.01

# Q-learning update
if not done and len(env.get_available_spaces()) > 0:
    next_available_spaces = env.get_available_spaces()
    next_available_q_values = [
        env.q_table[priority, current_hour, action] 
        for action in next_available_spaces
    ]
    best_next_idx = np.argmax(next_available_q_values)
    best_next_action = next_available_spaces[best_next_idx]
    
    # Q-value update
    td_target = reward + discount_factor * env.q_table[
        priority, current_hour, best_next_action
    ]`}</code>
                    </pre>
                  </div>
                </div>
              )}

              {activeView === "random" && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-2xl font-bold mb-4">
                    Random Allocation Strategy
                  </h2>
                  <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto">
                    <pre className="text-sm">
                      <code>{`# Random allocation strategy
def allocate_random(available_spaces):
    if len(available_spaces) == 0:
        return None
    # Randomly select any available space
    return np.random.choice(available_spaces)

# Usage in parking system
available_spaces = env.get_available_spaces()
if len(available_spaces) > 0:
    selected_space = allocate_random(available_spaces)
    bay, slot = env.get_bay_slot(selected_space)`}</code>
                    </pre>
                  </div>
                </div>
              )}

              {activeView === "sequential" && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-2xl font-bold mb-4">
                    Sequential Allocation Strategy
                  </h2>
                  <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto">
                    <pre className="text-sm">
                      <code>{`# Sequential allocation strategy
def allocate_sequential(available_spaces):
    if len(available_spaces) == 0:
        return None
    # Take the first available space
    return available_spaces[0]

# Usage in parking system
available_spaces = env.get_available_spaces()
if len(available_spaces) > 0:
    selected_space = allocate_sequential(available_spaces)
    bay, slot = env.get_bay_slot(selected_space)`}</code>
                    </pre>
                  </div>
                </div>
              )}
            </ParkingProvider>
          </div>
        </div>
      </div>
    </div>
  );
}
