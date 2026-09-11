"""Explainability boundary for validated models.

SHAP is optional. If it is not installed or no validated model exists, this
module returns unavailable rather than fabricating feature contributions.
"""
from .predict import MODEL_DIR


def explain(features: dict) -> dict:
    if not (MODEL_DIR / "model_metadata.json").exists():
        return {"status": "UNAVAILABLE", "reason": "Validated model unavailable; SHAP explanation cannot be produced"}
    try:
        import shap  # noqa: F401
    except ImportError:
        return {"status": "UNAVAILABLE", "reason": "SHAP dependency is not installed"}
    return {"status": "PENDING", "reason": "SHAP explainer will be enabled after validated model deployment"}
