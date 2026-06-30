"""audit evidence chain

Revision ID: 20260628_0009
Revises: 20260628_0008
Create Date: 2026-06-28
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260628_0009"
down_revision: Union[str, None] = "20260628_0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def has_table(table_name: str) -> bool:
    return table_name in sa.inspect(op.get_bind()).get_table_names()


def has_column(table_name: str, column_name: str) -> bool:
    if not has_table(table_name):
        return False
    return column_name in {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table_name)}


def add_column_if_missing(table_name: str, column: sa.Column) -> None:
    if not has_column(table_name, column.name):
        op.add_column(table_name, column)


def upgrade() -> None:
    add_column_if_missing("audit_reports", sa.Column("event_type", sa.String(), nullable=False, server_default="unknown"))
    add_column_if_missing("audit_reports", sa.Column("market_event_id", sa.String(), nullable=True))
    add_column_if_missing("audit_reports", sa.Column("decision", sa.String(), nullable=False, server_default="INCOMPLETE"))
    add_column_if_missing("audit_reports", sa.Column("risk_level", sa.String(), nullable=False, server_default="unknown"))
    add_column_if_missing("audit_reports", sa.Column("result", sa.String(), nullable=False, server_default="pending"))
    add_column_if_missing("audit_reports", sa.Column("outcome", sa.Text(), nullable=False, server_default=""))
    add_column_if_missing("audit_reports", sa.Column("audit_hash", sa.String(), nullable=False, server_default=""))
    add_column_if_missing("audit_reports", sa.Column("report_json", sa.JSON(), nullable=False, server_default="{}"))

    if has_table("audit_reports"):
        inspector = sa.inspect(op.get_bind())
        indexes = {index["name"] for index in inspector.get_indexes("audit_reports")}
        if "ix_audit_reports_market_event_id" not in indexes:
            op.create_index(op.f("ix_audit_reports_market_event_id"), "audit_reports", ["market_event_id"], unique=False)

    if not has_table("audit_events"):
        op.create_table(
            "audit_events",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("audit_report_id", sa.String(), nullable=False),
            sa.Column("workflow_id", sa.String(), nullable=False),
            sa.Column("step_index", sa.Integer(), nullable=False),
            sa.Column("step_key", sa.String(), nullable=False),
            sa.Column("title", sa.String(), nullable=False),
            sa.Column("status", sa.String(), nullable=False),
            sa.Column("actor", sa.String(), nullable=False),
            sa.Column("entity_type", sa.String(), nullable=False),
            sa.Column("entity_id", sa.String(), nullable=True),
            sa.Column("summary", sa.Text(), nullable=False),
            sa.Column("details_json", sa.JSON(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_audit_events_audit_report_id"), "audit_events", ["audit_report_id"], unique=False)
        op.create_index(op.f("ix_audit_events_workflow_id"), "audit_events", ["workflow_id"], unique=False)

    if not has_table("audit_evidence"):
        op.create_table(
            "audit_evidence",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("audit_report_id", sa.String(), nullable=False),
            sa.Column("workflow_id", sa.String(), nullable=False),
            sa.Column("evidence_type", sa.String(), nullable=False),
            sa.Column("entity_type", sa.String(), nullable=False),
            sa.Column("entity_id", sa.String(), nullable=True),
            sa.Column("title", sa.String(), nullable=False),
            sa.Column("summary", sa.Text(), nullable=False),
            sa.Column("payload_json", sa.JSON(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_audit_evidence_audit_report_id"), "audit_evidence", ["audit_report_id"], unique=False)
        op.create_index(op.f("ix_audit_evidence_workflow_id"), "audit_evidence", ["workflow_id"], unique=False)


def downgrade() -> None:
    if has_table("audit_evidence"):
        op.drop_index(op.f("ix_audit_evidence_workflow_id"), table_name="audit_evidence")
        op.drop_index(op.f("ix_audit_evidence_audit_report_id"), table_name="audit_evidence")
        op.drop_table("audit_evidence")
    if has_table("audit_events"):
        op.drop_index(op.f("ix_audit_events_workflow_id"), table_name="audit_events")
        op.drop_index(op.f("ix_audit_events_audit_report_id"), table_name="audit_events")
        op.drop_table("audit_events")
    if has_column("audit_reports", "market_event_id"):
        op.drop_index(op.f("ix_audit_reports_market_event_id"), table_name="audit_reports")
    for column_name in ["report_json", "audit_hash", "outcome", "result", "risk_level", "decision", "market_event_id", "event_type"]:
        if has_column("audit_reports", column_name):
            op.drop_column("audit_reports", column_name)
