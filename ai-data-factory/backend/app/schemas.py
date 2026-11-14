from pydantic import BaseModel, EmailStr, Field
from typing import Literal

class OrganizationCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    org_type: Literal["internal", "client"] = "client"
class OrganizationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
class InvitationCreate(BaseModel):
    email: EmailStr
    role: Literal["admin", "member"] = "member"
class InvitationAccept(BaseModel):
    token: str = Field(min_length=32, max_length=256)
class MemberRoleUpdate(BaseModel):
    role: Literal["admin", "member"]
class ProjectCreate(BaseModel):
    name: str = Field(min_length=2, max_length=140)
    description: str = Field(default="", max_length=5000)
    platform: str = Field(default="Microsoft Fabric", max_length=60)
class ProjectMemberUpsert(BaseModel):
    role: Literal["project_owner", "architect", "data_engineer", "bi_developer", "qa_engineer", "viewer"]
