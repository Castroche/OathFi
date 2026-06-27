from fastapi import HTTPException, status


def risk_blocked_error(risk_check_id: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail={
            "ok": False,
            "error": {
                "code": "RISK_BLOCKED",
                "message": "Risk decision is BLOCK. Paper order creation is not allowed.",
                "details": {"risk_check_id": risk_check_id},
            },
        },
    )
