"""
Simple regression test for synthetic dataset feature directions.
Run this after regenerating `datasets/resume_dataset.csv` in CI.
"""
import pandas as pd
import sys

path = './ml/datasets/resume_dataset.csv'
try:
    df = pd.read_csv(path)
except Exception as e:
    print(f"Could not read dataset at {path}: {e}")
    sys.exit(2)

features = ['cgpa', 'certifications', 'achievements', 'action_verbs', 'projects', 'experience']
failed = False
for f in features:
    if f not in df.columns:
        print(f"Missing feature column: {f}")
        failed = True
        continue
    corr = df[f].corr(df['resume_score'])
    print(f"{f}: correlation with resume_score = {corr:.3f}")
    if corr <= 0.0:
        print(f"ERROR: Expected positive correlation for {f}, got {corr}")
        failed = True

if failed:
    sys.exit(1)
print("All key feature directions positive — synthetic data sanity check passed.")
sys.exit(0)