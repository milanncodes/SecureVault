"""
Unit tests for ABAC Policy Engine and Relational Schema.
Uses an in-memory SQLite session for fast, isolated verification.
"""

import uuid
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import (
    Base,
    User,
    Case,
    CaseAccessRule,
    MatterBranch,
    Document,
    RoleType,
    CaseStatus,
    PermissionLevel,
    BranchName,
)
from abac import AccessControlEngine


@pytest.fixture
def db_session():
    """Create an isolated in-memory SQLite database session for testing."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(bind=engine)
    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = session_factory()
    try:
        yield session
    finally:
        session.close()


def test_sho_jurisdiction_access(db_session):
    """
    Test Rule 1: SHO Supervisory Jurisdiction.
    - SHO from Station 'ST-DELHI-01' can read an FIR from Station 'ST-DELHI-01'.
    - SHO from Station 'ST-DELHI-01' is DENIED access to a Case/FIR from Station 'ST-MUMBAI-02'.
    """
    sho_delhi = User(
        id=uuid.uuid4(),
        badge_number="SHO-DEL-101",
        role_type=RoleType.SHO,
        station_code="ST-DELHI-01",
        clearance_tier=3,
    )

    # Case originating in Station A (Delhi)
    case_delhi = Case(
        id=uuid.uuid4(),
        case_number="FIR/DEL/2026/001",
        origin_station="ST-DELHI-01",
        classification_tier=1,
        status=CaseStatus.OPEN,
    )
    fir_branch_delhi = MatterBranch(
        id=uuid.uuid4(),
        case_id=case_delhi.id,
        branch_name=BranchName.FIR,
        min_clearance=1,
    )

    # Case originating in Station B (Mumbai)
    case_mumbai = Case(
        id=uuid.uuid4(),
        case_number="FIR/MUM/2026/099",
        origin_station="ST-MUMBAI-02",
        classification_tier=1,
        status=CaseStatus.OPEN,
    )
    fir_branch_mumbai = MatterBranch(
        id=uuid.uuid4(),
        case_id=case_mumbai.id,
        branch_name=BranchName.FIR,
        min_clearance=1,
    )

    db_session.add_all([sho_delhi, case_delhi, fir_branch_delhi, case_mumbai, fir_branch_mumbai])
    db_session.commit()

    # SHO Delhi -> Delhi Case (Jurisdiction match) -> Should GRANT
    assert AccessControlEngine.evaluate_access(
        user=sho_delhi,
        case=case_delhi,
        target_branch=fir_branch_delhi,
        action="READ",
    ) is True

    # SHO Delhi -> Delhi Case (Approve action) -> Should GRANT
    assert AccessControlEngine.evaluate_access(
        user=sho_delhi,
        case=case_delhi,
        target_branch=fir_branch_delhi,
        action="APPROVE",
    ) is True

    # SHO Delhi -> Mumbai Case (Jurisdiction mismatch) -> Should DENY
    assert AccessControlEngine.evaluate_access(
        user=sho_delhi,
        case=case_mumbai,
        target_branch=fir_branch_mumbai,
        action="READ",
    ) is False


def test_io_branch_clearance(db_session):
    """
    Test Rule 2 + Rule 3: Direct Assignment with Branch Clearance Tier Gate.
    - Investigating Officer (Clearance 2) assigned to Case A.
    - IO can access FIR branch (Min Clearance 1).
    - IO is MATHEMATICALLY DENIED access to FORENSICS branch (Min Clearance 3).
    """
    io_user = User(
        id=uuid.uuid4(),
        badge_number="IO-DEL-402",
        role_type=RoleType.IO,
        station_code="ST-DELHI-01",
        clearance_tier=2,
    )

    case = Case(
        id=uuid.uuid4(),
        case_number="FIR/DEL/2026/042",
        origin_station="ST-DELHI-01",
        classification_tier=2,
        status=CaseStatus.OPEN,
    )

    # Assign IO to Case with READ/WRITE permission
    access_rule = CaseAccessRule(
        id=uuid.uuid4(),
        case_id=case.id,
        user_id=io_user.id,
        permission_level=PermissionLevel.WRITE,
    )

    fir_branch = MatterBranch(
        id=uuid.uuid4(),
        case_id=case.id,
        branch_name=BranchName.FIR,
        min_clearance=1,
    )

    forensics_branch = MatterBranch(
        id=uuid.uuid4(),
        case_id=case.id,
        branch_name=BranchName.FORENSICS,
        min_clearance=3,
    )

    db_session.add_all([io_user, case, access_rule, fir_branch, forensics_branch])
    db_session.commit()
    db_session.refresh(case)

    # Clearance 2 >= Min Clearance 1 (FIR) -> GRANTED
    assert AccessControlEngine.evaluate_access(
        user=io_user,
        case=case,
        target_branch=fir_branch,
        action="READ",
    ) is True

    assert AccessControlEngine.evaluate_access(
        user=io_user,
        case=case,
        target_branch=fir_branch,
        action="WRITE",
    ) is True

    # Clearance 2 < Min Clearance 3 (FORENSICS) -> DENIED (mathematical clearance gate)
    assert AccessControlEngine.evaluate_access(
        user=io_user,
        case=case,
        target_branch=forensics_branch,
        action="READ",
    ) is False


def test_default_deny(db_session):
    """
    Test Zero-Trust Fallback: Default Deny.
    - Unassigned IO from the same station is DENIED access to the case.
    """
    unassigned_io = User(
        id=uuid.uuid4(),
        badge_number="IO-DEL-999",
        role_type=RoleType.IO,
        station_code="ST-DELHI-01",
        clearance_tier=3,
    )

    case = Case(
        id=uuid.uuid4(),
        case_number="FIR/DEL/2026/777",
        origin_station="ST-DELHI-01",
        classification_tier=1,
        status=CaseStatus.OPEN,
    )

    fir_branch = MatterBranch(
        id=uuid.uuid4(),
        case_id=case.id,
        branch_name=BranchName.FIR,
        min_clearance=1,
    )

    db_session.add_all([unassigned_io, case, fir_branch])
    db_session.commit()
    db_session.refresh(case)

    # Unassigned IO -> Even with Station match and high clearance -> DENIED
    assert AccessControlEngine.evaluate_access(
        user=unassigned_io,
        case=case,
        target_branch=fir_branch,
        action="READ",
    ) is False
