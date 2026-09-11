# Landslide model pipeline

The repository currently contains 27 environmental observations but no historical landslide-event table or observed binary event labels. The training command therefore refuses to train:

```powershell
python -m ml.data_inspection --database-url sqlite:///./landslide.db
python -m ml.train --database landslide.db
```

Expected result: `TRAINING BLOCKED` until a validated `historical_landslides` table is added with `latitude`, `longitude`, and `timestamp`.

The pipeline does not use existing alert `risk_score` values as labels. Once event data exists, it performs cleaning, forward-window label generation, chronological splitting, class weighting, XGBoost training, calibration, evaluation, and model metadata persistence.
