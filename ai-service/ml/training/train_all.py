"""
ml/training/train_all.py — Master Model Training Pipeline Orchestrator

ARCHITECTURAL ROLE:
Executes the sequential training pipeline across all 7 ML model training modules:
1. `train_resume()`: Trains CatBoost Regressor for resume quality scoring.
2. `train_ats()`: Trains CatBoost Classifier for ATS screening pass probability %.
3. `train_career()`: Trains XGBoost Classifier for career readiness level categorization.
4. `train_role()`: Trains CatBoost Multi-class Classifier for target role match probabilities.
5. `train_interview()`: Trains CatBoost Regressor for mock interview score prediction.
6. `train_salary()`: Trains CatBoost Regressor for salary range projections.
7. `train_learning()`: Trains CatBoost Regressor for learning curve velocity prediction.
8. `generate_benchmarks()`: Computes peer benchmark distribution thresholds.

Execution:
  python -m ml.training.train_all
"""

import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR.parent))


def main():
    print("\n" + "=" * 60)
    print("  PathPilot AI - Full ML Pipeline Training")
    print("=" * 60 + "\n")

    from ml.training.train_resume import train as train_resume
    train_resume()
    print()

    from ml.training.train_ats import train as train_ats
    train_ats()
    print()

    from ml.training.train_career import train as train_career
    train_career()
    print()

    from ml.training.train_role import train as train_role
    train_role()
    print()

    from ml.training.train_interview import train as train_interview
    train_interview()
    print()

    from ml.training.train_salary import train as train_salary
    train_salary()
    print()

    from ml.training.train_learning import train as train_learning
    train_learning()
    print()

    from ml.utils.build_peer_benchmarks import generate_benchmarks
    generate_benchmarks()

    print("\n" + "=" * 60)
    print("  All models and benchmarks generated successfully!")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
