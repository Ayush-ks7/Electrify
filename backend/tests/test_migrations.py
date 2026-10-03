from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect


def test_initial_migration_and_schema_match(tmp_path, monkeypatch):
    url = f"sqlite:///{(tmp_path / 'migration.db').as_posix()}"
    monkeypatch.setenv("DATABASE_URL", url)
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    command.upgrade(config, "head")
    engine = create_engine(url)
    try:
        assert set(inspect(engine).get_table_names()) == {"alembic_version", "consumers", "daily_readings", "predictions",
                                                        "simulation_streams", "meter_readings", "investigations"}
        command.check(config)
    finally:
        engine.dispose()
    command.downgrade(config, "base")
