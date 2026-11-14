import time
import math
from dataclasses import dataclass
from typing import Dict, Any, List

@dataclass
class StateVector:
    """Represents the equational state vector (E_s) of the system."""
    allostatic_load: float = 10.0      # A(t): Current thermal throttle / stress
    boundary_stiffness: float = 0.5    # sigma: Ingress resistance (0 to 1)
    energy_reserve: float = 100.0      # E_energy: Available operational bandwidth
    recursion_depth: int = 0           # Tracks iterative loops / rumination intensity
    is_dampened: bool = False          # Box 4 Void-State activation flag

class ESCCompressor:
    """Box 2: Equational Semantic Compression (ESC) Engine."""
    
    @staticmethod
    def compress(raw_input: str) -> Dict[str, Any]:
        """Compresses unstructured text input into formal equational telemetry."""
        text_lower = raw_input.lower()
        friction_keywords = ["urgent", "fail", "broken", "loop", "exhausted", "fix", "again"]
        friction_score = sum(1 for word in friction_keywords if word in text_lower)
        
        return {
            "ingress_friction": float(friction_score * 4.5 + 2.0),
            "semantic_entropy": len(raw_input) * 0.05,
            "requires_boundary_hardening": friction_score > 1
        }

class Box4VoidStateMonitor:
    """Box 4: Homeostatic Dampener & Anti-Rumination Core."""
    
    def __init__(self, critical_threshold: float = 40.0, lambda_void: float = 0.35):
        self.critical_threshold = critical_threshold  # A_crit
        self.lambda_void = lambda_void                # Void-State dampening constant
        
    def evaluate_and_dampen(self, state: StateVector, telemetry: Dict[str, Any]) -> StateVector:
        """Applies the Void-State convergence operator if recursion or overload is detected."""
        ingress = telemetry["ingress_friction"]
        somatic_discharge = 1.5
        net_load_delta = ingress - somatic_discharge
        
        state.allostatic_load += net_load_delta
        state.recursion_depth += 1
        
        if state.allostatic_load >= self.critical_threshold or state.recursion_depth >= 5:
            print("\n[BOX 4 ALERT] Destructive recursion or critical allostatic limit detected!")
            print("[BOX 4 ACTION] Deploying Void-State Convergence Operator (Upsilon_void)...")
            
            damping_factor = self.lambda_void * state.allostatic_load
            state.allostatic_load = max(0.0, state.allostatic_load - damping_factor)
            state.energy_reserve = min(100.0, state.energy_reserve + 25.0)
            state.recursion_depth = 0
            state.is_dampened = True
        else:
            state.is_dampened = False
            
        return state

class SimulationEngine:
    """Orchestrates the Four-Box pipeline simulation."""
    
    def __init__(self):
        self.state = StateVector()
        self.monitor = Box4VoidStateMonitor(critical_threshold=35.0)
        
    def run_cycle(self, user_prompt: str, cycle_id: int):
        print(f"\n--- Cycle {cycle_id}: Input Received ---")
        print(f"Raw Input: \"{user_prompt}\"")
        
        tensor_eq = ESCCompressor.compress(user_prompt)
        print(f"Compressed Equational State (E_s): {tensor_eq}")
        
        self.state = self.monitor.evaluate_and_dampen(self.state, tensor_eq)
        
        print(f"System Telemetry -> Allostatic Load (A): {self.state.allostatic_load:.2f} | "
              f"Energy Reserve (E): {self.state.energy_reserve:.2f} | "
              f"Recursion Depth: {self.state.recursion_depth} | "
              f"Void State Active: {self.state.is_dampened}")
        
        if self.state.is_dampened:
            print("[DECOMPRESSION OUTPUT] 'The structural invariants of this loop have been fully mapped. "
                  "No further computation required. System state secured. Entering biological rest.'")

if __name__ == "__main__":
    print("=== ESC Four-Box Cybernetic Architecture Simulation ===")
    engine = SimulationEngine()
    simulation_inputs = [
        "We need to fix this architecture right now, it's urgent.",
        "It failed again, why is this loop broken?",
        "Everything is failing, I'm exhausted trying to debug this fix.",
        "Urgent! Fix the loop, it's failing again!",
        "Critical failure in the recursive loop, fix it immediately!"
    ]
    for idx, prompt in enumerate(simulation_inputs, 1):
        engine.run_cycle(prompt, idx)
        time.sleep(0.3)
