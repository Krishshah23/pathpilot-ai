"""
Master training script — trains all 7 ML models sequentially.
Run: python -m ml.training.train_all
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

    print("\n" + "=" * 60)
    print("  All 7 models trained and saved successfully!")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
