"""
SecureVault Relational Database Schema & Session Manager.
Models for User, Case, CaseAccessRule, MatterBranch, and Document.
Supports pgvector for AI semantic search embeddings over legal repositories.
"""

import enum
import os
import uuid
from typing import Generator

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Boolean,
    Column,
    Enum as SQLEnum,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    Uuid,
    create_engine,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import (
    DeclarativeBase,
    Session,
    relationship,
    sessionmaker,
)


class Base(DeclarativeBase):
    """Base declarative class for all SecureVault models."""
    pass


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class RoleType(str, enum.Enum):
    IO = "IO"
    SHO = "SHO"
    FSL = "FSL"
    JUDGE = "JUDGE"


class CaseStatus(str, enum.Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"


class PermissionLevel(str, enum.Enum):
    READ = "READ"
    WRITE = "WRITE"
    APPROVE = "APPROVE"


class BranchName(str, enum.Enum):
    FIR = "FIR"
    FORENSICS = "FORENSICS"
    WITNESS_STATEMENTS = "WITNESS_STATEMENTS"
    CHARGESHEET = "CHARGESHEET"


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    badge_number = Column(String(64), unique=True, nullable=False, index=True)
    role_type = Column(SQLEnum(RoleType), nullable=False)
    station_code = Column(String(32), nullable=False, index=True)
    clearance_tier = Column(Integer, nullable=False, default=1)

    # Relationships
    access_rules = relationship("CaseAccessRule", back_populates="user", cascade="all, delete-orphan")


class Case(Base):
    __tablename__ = "cases"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    case_number = Column(String(64), unique=True, nullable=False, index=True)
    title = Column(String(256), nullable=True)
    origin_station = Column(String(32), nullable=False, index=True)
    classification_tier = Column(Integer, nullable=False, default=1)
    status = Column(SQLEnum(CaseStatus), nullable=False, default=CaseStatus.OPEN)
    
    # Phase 8.1 GitHub-style README & Metadata (Supports both PostgreSQL JSONB and SQLite in unit tests)
    summary = Column(Text, nullable=True)
    tags = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True, default=list)
    semantic_embedding = Column(Vector(384), nullable=True)

    # Relationships
    access_rules = relationship("CaseAccessRule", back_populates="case", cascade="all, delete-orphan")
    branches = relationship("MatterBranch", back_populates="case", cascade="all, delete-orphan")


class CaseAccessRule(Base):
    __tablename__ = "case_access_rules"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    case_id = Column(Uuid, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    permission_level = Column(SQLEnum(PermissionLevel), nullable=False)

    # Relationships
    case = relationship("Case", back_populates="access_rules")
    user = relationship("User", back_populates="access_rules")


class MatterBranch(Base):
    __tablename__ = "matter_branches"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    case_id = Column(Uuid, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    branch_name = Column(SQLEnum(BranchName), nullable=False)
    min_clearance = Column(Integer, nullable=False, default=1)

    # Relationships
    case = relationship("Case", back_populates="branches")
    documents = relationship("Document", back_populates="branch", cascade="all, delete-orphan")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    branch_id = Column(Uuid, ForeignKey("matter_branches.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(256), nullable=True)
    storage_key = Column(String(256), nullable=False, unique=True, index=True)
    file_hash = Column(String(64), nullable=False)
    is_sealed = Column(Boolean, nullable=False, default=False)
    
    # Phase 8.1 Vector Embeddings for Semantic Search
    semantic_embedding = Column(Vector(384), nullable=True)

    # Relationships
    branch = relationship("MatterBranch", back_populates="documents")


# ---------------------------------------------------------------------------
# Database Session Generator & Engine
# ---------------------------------------------------------------------------

DEFAULT_DATABASE_URL = "postgresql://legal_admin:legal_secure_vault_2024@postgres:5432/legal_dms"


def get_database_url() -> str:
    """Retrieve database URL from environment or fallback default."""
    return os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)


def create_db_engine(database_url: str = None):
    """Create a SQLAlchemy engine."""
    url = database_url or get_database_url()
    return create_engine(url, pool_pre_ping=True)


def init_db(engine=None):
    """Initializes the database schema and pgvector extension."""
    eng = engine or create_db_engine()
    if eng.dialect.name == "postgresql":
        with eng.connect() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            conn.commit()
    Base.metadata.create_all(bind=eng)


def get_db_session(engine=None) -> Generator[Session, None, None]:
    """
    Dependency generator for database sessions.
    Usage:
        with next(get_db_session()) as session:
            ...
    Or in FastAPI:
        db: Session = Depends(get_db_session)
    """
    eng = engine or create_db_engine()
    session_factory = sessionmaker(bind=eng, autoflush=False, autocommit=False)
    session: Session = session_factory()
    try:
        yield session
    finally:
        session.close()
