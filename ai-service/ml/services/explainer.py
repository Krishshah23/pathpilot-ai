"""
SHAP Explanation Service — computes feature contributions for individual predictions.

Uses SHAP (SHapley Additive exPlanations) to explain predictions in real-time,
identifying which features drove a score up or down.
"""

import logging
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# ── SHAP Explainer Cache ──────────────────────────────────────────────

_explainers: dict[str, Any] = {}


def _get_explainer(model_name: str, model: Any, X_train_s: np.ndarray = None) -> Any:
    """Get or initialize a SHAP explainer for a given model."""
    if model_name not in _explainers:
        try:
            # Import SHAP lazily so the service can run without the optional lib.
            try:
                import shap
            except Exception as _exc:
                shap = None
                logger.warning("SHAP library not available: %s", _exc)
                return None

            # Tree-based models (CatBoost, XGBoost, Random Forest)
            if shap is None:
                logger.warning("SHAP is not installed; cannot initialize explainer for %s", model_name)
                return None
            if hasattr(model, "tree_method") or hasattr(model, "estimators_") or "CatBoost" in str(type(model)):
                _explainers[model_name] = shap.TreeExplainer(model)
            else:
                # Fallback to general Explainer (e.g. for Logistic Regression or when TreeExplainer fails)
                if X_train_s is not None:
                    # Use a small background dataset summary for speed
                    background = shap.kmeans(X_train_s, 10)
                    _explainers[model_name] = shap.KernelExplainer(model.predict, background)
                else:
                    _explainers[model_name] = shap.Explainer(model)
            logger.info("Initialized SHAP explainer for %s", model_name)
        except Exception as exc:
            logger.warning("Failed to initialize SHAP explainer for %s: %s", model_name, exc)
            return None
    return _explainers[model_name]


def explain_prediction(model_name: str, features: dict, model: Any, scaler: Any, feature_cols: list) -> dict:
    """
    Compute SHAP values for a single prediction and return feature contributions.
    """
    if not model or not feature_cols:
        return {"error": f"Model or features missing for {model_name}"}

    try:
        # Build single row
        row = {col: features.get(col, 0) for col in feature_cols}
        df_row = pd.DataFrame([row])[feature_cols]

        # Handle scaling
        is_scaled = scaler is not None and model_name not in ("resume_score", "learning")
        X_input = scaler.transform(df_row) if is_scaled else df_row.values

        # Get/create explainer
        explainer = _get_explainer(model_name, model, X_train_s=None)

        if not explainer:
            return {"success": False, "error": f"SHAP explainer unavailable for {model_name}"}

        # Calculate SHAP values
        if isinstance(explainer, shap.KernelExplainer):
            shap_values = explainer.shap_values(X_input)
        else:
            shap_values = explainer(X_input)

        # Extract values
        if hasattr(shap_values, "values"):
            values = shap_values.values[0]
        else:
            values = shap_values[0]

        # For multi-class classification, SHAP returns list of arrays (one per class)
        # We explain the predicted class index
        if isinstance(values, list) or (isinstance(values, np.ndarray) and len(values.shape) > 1):
            # Try to get the prediction index
            try:
                pred_idx = int(model.predict(X_input)[0])
                values = values[pred_idx] if isinstance(values, list) else values[:, pred_idx]
            except Exception:
                values = values[0]

        # Map to feature names
        contributions = []
        for col, val in zip(feature_cols, values):
            contributions.append({
                "feature": col,
                "impact": round(float(val), 4),
                "direction": "positive" if val > 0 else "negative" if val < 0 else "neutral"
            })

        # Sort by absolute impact
        contributions = sorted(contributions, key=lambda x: -abs(x["impact"]))

        return {
            "success": True,
            "contributions": contributions,
            "top_positive": [c for c in contributions if c["direction"] == "positive"][:5],
            "top_negative": [c for c in contributions if c["direction"] == "negative"][:5],
        }

    except Exception as exc:
        logger.exception("Error computing SHAP for %s: %s", model_name, exc)
        return {"error": f"SHAP computation failed: {exc}"}
