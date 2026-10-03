def test_backend_package_layout_exists() -> None:
    from pathlib import Path

    root = Path(__file__).resolve().parents[1]
    assert (root / "app" / "main.py").exists()
    assert (root / "app" / "services" / "ai_ml_service.py").exists()
