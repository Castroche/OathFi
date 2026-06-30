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
                    connection.exec_driver_sql(statement)
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
                    connection.exec_driver_sql(statement)
    if "backtest_results" in inspector.get_table_names():
        columns = {column["name"] for column in inspector.get_columns("backtest_results")}
        additions = {
            "sharpe_ratio": "ALTER TABLE backtest_results ADD COLUMN sharpe_ratio FLOAT NOT NULL DEFAULT 0",
            "drawdown_curve_json": "ALTER TABLE backtest_results ADD COLUMN drawdown_curve_json JSON NOT NULL DEFAULT '[]'",
            "trade_distribution_json": "ALTER TABLE backtest_results ADD COLUMN trade_distribution_json JSON NOT NULL DEFAULT '[]'",
            "verdict_json": "ALTER TABLE backtest_results ADD COLUMN verdict_json JSON NOT NULL DEFAULT '{}'",
            "strategy_rule_json": "ALTER TABLE backtest_results ADD COLUMN strategy_rule_json JSON NOT NULL DEFAULT '{}'",
            "report_json": "ALTER TABLE backtest_results ADD COLUMN report_json JSON NOT NULL DEFAULT '{}'",
        }
        with engine.begin() as connection:
            for column, statement in additions.items():
                if column not in columns:
                    connection.execute(text(statement))
    if "paper_orders" in inspector.get_table_names():
        columns = {column["name"] for column in inspector.get_columns("paper_orders")}
        additions = {
            "position_size": "ALTER TABLE paper_orders ADD COLUMN position_size FLOAT",
            "risk_amount": "ALTER TABLE paper_orders ADD COLUMN risk_amount FLOAT",
            "mode": "ALTER TABLE paper_orders ADD COLUMN mode VARCHAR NOT NULL DEFAULT 'paper'",
            "risk_status": "ALTER TABLE paper_orders ADD COLUMN risk_status VARCHAR",
            "submitted_at": "ALTER TABLE paper_orders ADD COLUMN submitted_at DATETIME",
            "filled_at": "ALTER TABLE paper_orders ADD COLUMN filled_at DATETIME",
            "cancelled_at": "ALTER TABLE paper_orders ADD COLUMN cancelled_at DATETIME",
        }
        with engine.begin() as connection:
            for column, statement in additions.items():
                if column not in columns:
                    connection.execute(text(statement))
    if "paper_fills" in inspector.get_table_names():
        columns = {column["name"] for column in inspector.get_columns("paper_fills")}
        if "slippage" not in columns:
            with engine.begin() as connection:
                connection.execute(text("ALTER TABLE paper_fills ADD COLUMN slippage FLOAT NOT NULL DEFAULT 0"))
    if "audit_reports" in inspector.get_table_names():
        columns = {column["name"] for column in inspector.get_columns("audit_reports")}
        additions = {
            "event_type": "ALTER TABLE audit_reports ADD COLUMN event_type VARCHAR NOT NULL DEFAULT 'unknown'",
            "market_event_id": "ALTER TABLE audit_reports ADD COLUMN market_event_id VARCHAR",
            "decision": "ALTER TABLE audit_reports ADD COLUMN decision VARCHAR NOT NULL DEFAULT 'INCOMPLETE'",
            "risk_level": "ALTER TABLE audit_reports ADD COLUMN risk_level VARCHAR NOT NULL DEFAULT 'unknown'",
            "result": "ALTER TABLE audit_reports ADD COLUMN result VARCHAR NOT NULL DEFAULT 'pending'",
            "outcome": "ALTER TABLE audit_reports ADD COLUMN outcome TEXT NOT NULL DEFAULT ''",
            "audit_hash": "ALTER TABLE audit_reports ADD COLUMN audit_hash VARCHAR NOT NULL DEFAULT ''",
            "report_json": "ALTER TABLE audit_reports ADD COLUMN report_json JSON NOT NULL DEFAULT '{}'",
        }
        with engine.begin() as connection:
            for column, statement in additions.items():
                if column not in columns:
                    connection.execute(text(statement))
    if "user_settings" in inspector.get_table_names():
        columns = {column["name"] for column in inspector.get_columns("user_settings")}
        additions = {
            "primary_data_source": "ALTER TABLE user_settings ADD COLUMN primary_data_source VARCHAR NOT NULL DEFAULT 'HTX'",
            "connection_type": "ALTER TABLE user_settings ADD COLUMN connection_type VARCHAR NOT NULL DEFAULT 'Hybrid'",
            "fallback_method": "ALTER TABLE user_settings ADD COLUMN fallback_method VARCHAR NOT NULL DEFAULT 'REST fallback'",
            "latency_monitor_enabled": "ALTER TABLE user_settings ADD COLUMN latency_monitor_enabled BOOLEAN NOT NULL DEFAULT 1",
            "latency_warning_ms": "ALTER TABLE user_settings ADD COLUMN latency_warning_ms INTEGER NOT NULL DEFAULT 800",
            "latency_critical_ms": "ALTER TABLE user_settings ADD COLUMN latency_critical_ms INTEGER NOT NULL DEFAULT 2000",
            "auto_reconnect_enabled": "ALTER TABLE user_settings ADD COLUMN auto_reconnect_enabled BOOLEAN NOT NULL DEFAULT 1",
            "model_provider": "ALTER TABLE user_settings ADD COLUMN model_provider VARCHAR NOT NULL DEFAULT 'deepseek'",
            "model_name": "ALTER TABLE user_settings ADD COLUMN model_name VARCHAR NOT NULL DEFAULT 'deepseek-v4-flash'",
            "output_mode": "ALTER TABLE user_settings ADD COLUMN output_mode VARCHAR NOT NULL DEFAULT 'Structured'",
            "confidence_calibration": "ALTER TABLE user_settings ADD COLUMN confidence_calibration VARCHAR NOT NULL DEFAULT 'Balanced'",
            "structured_hypothesis_enabled": "ALTER TABLE user_settings ADD COLUMN structured_hypothesis_enabled BOOLEAN NOT NULL DEFAULT 1",
            "default_confidence_bands": "ALTER TABLE user_settings ADD COLUMN default_confidence_bands JSON NOT NULL DEFAULT '{\"low\":35,\"medium\":65,\"high\":85}'",
            "max_risk_per_trade": "ALTER TABLE user_settings ADD COLUMN max_risk_per_trade FLOAT NOT NULL DEFAULT 0.01",
            "max_daily_loss": "ALTER TABLE user_settings ADD COLUMN max_daily_loss FLOAT NOT NULL DEFAULT 0.03",
            "max_consecutive_losses": "ALTER TABLE user_settings ADD COLUMN max_consecutive_losses INTEGER NOT NULL DEFAULT 3",
            "position_size_mode": "ALTER TABLE user_settings ADD COLUMN position_size_mode VARCHAR NOT NULL DEFAULT 'Risk Based'",
            "stop_loss_enforcement": "ALTER TABLE user_settings ADD COLUMN stop_loss_enforcement BOOLEAN NOT NULL DEFAULT 1",
            "live_trading_enabled": "ALTER TABLE user_settings ADD COLUMN live_trading_enabled BOOLEAN NOT NULL DEFAULT 0",
            "demo_mode_enabled": "ALTER TABLE user_settings ADD COLUMN demo_mode_enabled BOOLEAN NOT NULL DEFAULT 1",
            "use_sample_account": "ALTER TABLE user_settings ADD COLUMN use_sample_account BOOLEAN NOT NULL DEFAULT 1",
            "paper_execution_only": "ALTER TABLE user_settings ADD COLUMN paper_execution_only BOOLEAN NOT NULL DEFAULT 1",
            "guided_demo_flow": "ALTER TABLE user_settings ADD COLUMN guided_demo_flow BOOLEAN NOT NULL DEFAULT 1",
            "demo_scenario": "ALTER TABLE user_settings ADD COLUMN demo_scenario VARCHAR NOT NULL DEFAULT 'pass'",
        }
        with engine.begin() as connection:
            for column, statement in additions.items():
                if column not in columns:
                    connection.exec_driver_sql(statement)
    if "user_api_credentials" in inspector.get_table_names():
        columns = {column["name"] for column in inspector.get_columns("user_api_credentials")}
        additions = {
            "metadata_json": "ALTER TABLE user_api_credentials ADD COLUMN metadata_json JSON NOT NULL DEFAULT '{}'",
        }
        with engine.begin() as connection:
            for column, statement in additions.items():
                if column not in columns:
                    connection.exec_driver_sql(statement)


def init_db() -> None:
    assert_real_trading_disabled()
    Base.metadata.create_all(bind=engine)
    ensure_sqlite_schema_compatibility()
