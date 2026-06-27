from app.core.security import assert_real_trading_disabled
from app.db.base import Base
from app.db.session import engine
from sqlalchemy import inspect, text


def ensure_sqlite_schema_compatibility() -> None:
    if engine.dialect.name != "sqlite":
        return
    inspector = inspect(engine)
    if "market_events" in inspector.get_table_names():
        columns = {column["name"] for column in inspector.get_columns("market_events")}
        if "detected_at" not in columns:
            with engine.begin() as connection:
                connection.execute(text("ALTER TABLE market_events ADD COLUMN detected_at DATETIME"))
    if "agent_runs" in inspector.get_table_names():
        columns = {column["name"] for column in inspector.get_columns("agent_runs")}
        additions = {
            "provider": "ALTER TABLE agent_runs ADD COLUMN provider VARCHAR",
            "model": "ALTER TABLE agent_runs ADD COLUMN model VARCHAR",
            "provider_configured": "ALTER TABLE agent_runs ADD COLUMN provider_configured BOOLEAN NOT NULL DEFAULT 0",
            "provider_healthy": "ALTER TABLE agent_runs ADD COLUMN provider_healthy BOOLEAN NOT NULL DEFAULT 0",
            "analysis_mode": "ALTER TABLE agent_runs ADD COLUMN analysis_mode VARCHAR NOT NULL DEFAULT 'ai'",
            "raw_output_preview": "ALTER TABLE agent_runs ADD COLUMN raw_output_preview TEXT",
            "error_type": "ALTER TABLE agent_runs ADD COLUMN error_type VARCHAR",
            "error_message": "ALTER TABLE agent_runs ADD COLUMN error_message TEXT",
            "context_loaded": "ALTER TABLE agent_runs ADD COLUMN context_loaded BOOLEAN NOT NULL DEFAULT 0",
            "is_mock_context": "ALTER TABLE agent_runs ADD COLUMN is_mock_context BOOLEAN NOT NULL DEFAULT 0",
        }
        with engine.begin() as connection:
            for column, statement in additions.items():
                if column not in columns:
                    connection.execute(text(statement))
    if "hypotheses" in inspector.get_table_names():
        columns = {column["name"] for column in inspector.get_columns("hypotheses")}
        additions = {
            "provider": "ALTER TABLE hypotheses ADD COLUMN provider VARCHAR",
            "model": "ALTER TABLE hypotheses ADD COLUMN model VARCHAR",
            "is_ai_generated": "ALTER TABLE hypotheses ADD COLUMN is_ai_generated BOOLEAN NOT NULL DEFAULT 1",
            "analysis_mode": "ALTER TABLE hypotheses ADD COLUMN analysis_mode VARCHAR NOT NULL DEFAULT 'ai'",
            "bias": "ALTER TABLE hypotheses ADD COLUMN bias VARCHAR",
            "suggested_rule_json": "ALTER TABLE hypotheses ADD COLUMN suggested_rule_json JSON",
        }
        with engine.begin() as connection:
            for column, statement in additions.items():
                if column not in columns:
                    connection.execute(text(statement))


def init_db() -> None:
    assert_real_trading_disabled()
    Base.metadata.create_all(bind=engine)
    ensure_sqlite_schema_compatibility()
