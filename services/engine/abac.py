"""
Attribute-Based Access Control (ABAC) Engine for SecureVault.
Enforces statutory multi-authority zero-trust authorization policies.
"""

from typing import Optional, Union

try:
    from .database import (
        Case,
        CaseAccessRule,
        MatterBranch,
        PermissionLevel,
        RoleType,
        User,
    )
except ImportError:
    from database import (
        Case,
        CaseAccessRule,
        MatterBranch,
        PermissionLevel,
        RoleType,
        User,
    )


class AccessControlEngine:
    """
    ABAC Engine evaluating access requests based on:
    - Subject attributes: role_type, station_code, clearance_tier
    - Object attributes: origin_station, classification_tier, branch min_clearance
    - Action attributes: READ, WRITE, APPROVE
    - Contextual relationship: CaseAccessRule assignments
    """

    PERMISSION_HIERARCHY = {
        "READ": {"READ", "WRITE", "APPROVE"},
        "WRITE": {"WRITE", "APPROVE"},
        "APPROVE": {"APPROVE"},
    }

    @classmethod
    def evaluate_access(
        cls,
        user: Optional[User],
        case: Optional[Case],
        target_branch: Optional[MatterBranch] = None,
        action: Union[str, PermissionLevel] = "READ",
    ) -> bool:
        """
        Evaluate whether a user has access to a case / target branch for a specific action.

        Policy Evaluation Order:
        1. Base validation & action normalization.
        2. Rule 1 (Supervisory): SHO in jurisdiction receives supervisory authorization for READ/APPROVE.
        3. Rule 2 (Direct Assignment): CaseAccessRule grants requested action level.
        4. Rule 3 (Clearance Tier Gate): If targeting a specific MatterBranch,
           user.clearance_tier MUST >= target_branch.min_clearance.
        5. Zero-Trust Fallback: Default Deny (returns False).
        """
        if user is None or case is None:
            return False

        # Normalize action and role
        action_str = action.value if isinstance(action, PermissionLevel) else str(action).upper()
        role_str = user.role_type.value if isinstance(user.role_type, RoleType) else str(user.role_type).upper()

        authorized = False

        # Rule 1 (Supervisory): SHO originating from the case's station
        if role_str == RoleType.SHO.value and user.station_code == case.origin_station:
            if action_str in ("READ", "APPROVE", "WRITE"):
                authorized = True

        # Rule 2 (Direct Assignment): Check case access rules if not already authorized
        if not authorized:
            # Check user or case access rules relationship
            access_rules = getattr(case, "access_rules", []) or getattr(user, "access_rules", [])
            allowed_levels = cls.PERMISSION_HIERARCHY.get(action_str, {action_str})

            for rule in access_rules:
                rule_perm = (
                    rule.permission_level.value
                    if isinstance(rule.permission_level, PermissionLevel)
                    else str(rule.permission_level).upper()
                )
                if rule.user_id == user.id and rule.case_id == case.id and rule_perm in allowed_levels:
                    authorized = True
                    break

        if not authorized:
            return False

        # Rule 3 (Clearance Tier Gate): Evaluated whenever target_branch is specified
        if target_branch is not None:
            if target_branch.case_id != case.id:
                return False
            if user.clearance_tier < target_branch.min_clearance:
                return False

        return True
