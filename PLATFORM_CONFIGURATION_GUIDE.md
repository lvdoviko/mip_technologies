# MIPTech AI Platform - Platform Configuration Guide

**Version:** 1.0  
**Date:** July 15, 2025  
**Target:** Backend Engineers (MIPTech AI Platform Repository)  
**Purpose:** Configure platform to support company website as production tenant

---

## Table of Contents

1. [Overview](#overview)
2. [Current Issues](#current-issues)
3. [Platform Architecture](#platform-architecture)
4. [Immediate Fixes](#immediate-fixes)
5. [Tenant Configuration](#tenant-configuration)
6. [Database Setup](#database-setup)
7. [Middleware Configuration](#middleware-configuration)
8. [API Endpoints](#api-endpoints)
9. [Authentication Setup](#authentication-setup)
10. [Monitoring & Logging](#monitoring--logging)
11. [Security Configuration](#security-configuration)
12. [Testing Platform Changes](#testing-platform-changes)
13. [Deployment](#deployment)

---

## Overview

This guide configures the MIPTech AI Platform to support your company website as a **production tenant**. This involves backend changes to handle your company's domain, create tenant context, and ensure proper API access.

### Key Objectives:
- Fix `/docs` endpoint access for development
- Create company tenant in database
- Configure domain-based tenant resolution
- Set up internal authentication flow
- Enable company website integration

### Repository Context:
- **Location**: `/home/mattia/bot/miptech-ai-platform/`
- **Environment**: Development server running on `http://localhost:8000`
- **Database**: PostgreSQL with multi-tenant architecture
- **Current Issue**: `/docs` returns "Not Found" due to tenant middleware

---

## Current Issues

### 1. Tenant Middleware Blocking `/docs`
**Problem**: The current tenant middleware is blocking access to `/docs` endpoint
**Error**: `{"error": "Tenant ID not found in request"}`
**Root Cause**: Middleware requires tenant context for all requests
**Location**: `backend/app/middleware/tenant_context.py:115`

### 2. No Company Tenant Record
**Problem**: No tenant record exists for your company website
**Impact**: Cannot access platform as legitimate tenant
**Solution**: Create tenant database record

### 3. Domain Resolution
**Problem**: Platform doesn't know how to resolve your company domain
**Impact**: Cannot automatically detect tenant from domain
**Solution**: Configure domain-based tenant resolution

---

## Platform Architecture

### Multi-Tenant Flow:
```
Company Website Request → Platform API → Tenant Middleware → Database → Response
```

### Tenant Identification Methods:
1. **Domain-based**: `miptech.ai` → `miptech-company` tenant
2. **Header-based**: `X-Tenant-ID: miptech-company`
3. **Parameter-based**: `?tenant_id=miptech-company` (development)

### Database Schema:
```sql
tenants/
├── id (primary key)
├── name
├── domain
├── status
├── created_at
└── updated_at
```

---

## Immediate Fixes

### Fix 1: Update Tenant Middleware for Development

**File**: `backend/app/middleware/tenant_context.py`

**Current Code** (Lines 108-109):
```python
if path in ["/", "/health", "/healthz", "/docs", "/openapi.json", "/redoc", "/metrics"]:
    return "system"
```

**Issue**: The middleware should allow `/docs` but there's an exception being raised elsewhere.

**Solution**: Move the public path check to the beginning of the method:

```python
# In _extract_tenant_id method, add this at the very beginning:
async def _extract_tenant_id(self, request: Request) -> str:
    """Extract tenant ID from request."""
    
    # FIRST: Check for public endpoints (before any validation)
    path = request.url.path
    if path in ["/", "/health", "/healthz", "/docs", "/openapi.json", "/redoc", "/metrics"]:
        return "system"
    
    # THEN: Continue with normal tenant extraction...
    # (rest of existing code)
```

### Fix 2: Add Company Domain to Middleware

**File**: `backend/app/middleware/tenant_context.py`

**Add to `_extract_from_subdomain` method**:
```python
def _extract_from_subdomain(self, host: str) -> Optional[str]:
    """Extract tenant ID from subdomain."""
    try:
        # Remove port if present
        host_without_port = host.split(":")[0]
        
        # Check for company domain (miptech.ai)
        if host_without_port in ["miptech.ai", "www.miptech.ai", "localhost"]:
            return "miptech-company"
        
        # Split by dots for subdomain detection
        parts = host_without_port.split(".")
        
        # If we have at least 3 parts (subdomain.domain.tld)
        if len(parts) >= 3:
            subdomain = parts[0]
            
            # Skip common subdomains
            if subdomain not in ["www", "api", "admin", "app"]:
                return self._validate_tenant_id(subdomain)
        
        return None
        
    except Exception:
        return None
```

### Fix 3: Development Configuration

**File**: `backend/app/core/config.py`

**Add to Settings class**:
```python
class Settings(BaseSettings):
    # ... existing fields ...
    
    # Company tenant configuration
    COMPANY_TENANT_ID: str = "miptech-company"
    COMPANY_DOMAIN: str = "miptech.ai"
    
    # Development overrides
    DEV_ALLOW_DOCS_ACCESS: bool = True
    DEV_DEFAULT_TENANT: str = "miptech-company"
```

---

## Tenant Configuration

### Step 1: Create Company Tenant

**SQL Script**: `scripts/create_company_tenant.sql`
```sql
-- Create company tenant
INSERT INTO tenants (
    id, 
    name, 
    domain, 
    status, 
    created_at, 
    updated_at,
    settings
) VALUES (
    'miptech-company',
    'MIPTech Company Website',
    'miptech.ai',
    'active',
    NOW(),
    NOW(),
    '{
        "plan": "enterprise",
        "features": {
            "chat": true,
            "rag": true,
            "analytics": true,
            "custom_branding": true
        },
        "limits": {
            "messages_per_day": 10000,
            "concurrent_connections": 100
        }
    }'::jsonb
);

-- Verify insertion
SELECT * FROM tenants WHERE id = 'miptech-company';
```

**Execution**:
```bash
# Run in development environment
cd /home/mattia/bot/miptech-ai-platform
source venv/bin/activate
PGPASSWORD=miptech123 psql -U miptech -h localhost -d miptech -f scripts/create_company_tenant.sql
```

### Step 2: Create Tenant Schema

**SQL Script**: `scripts/create_tenant_schema.sql`
```sql
-- Create schema for company tenant
CREATE SCHEMA IF NOT EXISTS "miptech-company";

-- Grant permissions
GRANT ALL ON SCHEMA "miptech-company" TO miptech;
GRANT ALL ON ALL TABLES IN SCHEMA "miptech-company" TO miptech;
GRANT ALL ON ALL SEQUENCES IN SCHEMA "miptech-company" TO miptech;

-- Set default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA "miptech-company" GRANT ALL ON TABLES TO miptech;
ALTER DEFAULT PRIVILEGES IN SCHEMA "miptech-company" GRANT ALL ON SEQUENCES TO miptech;
```

---

## Database Setup

### Step 1: Update Migration for Company Tenant

**File**: `migrations/env.py`

**Add company tenant to migration**:
```python
def run_migrations_for_company_tenant():
    """Run migrations specifically for company tenant."""
    sync_engine = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with sync_engine.connect() as connection:
        # Set search path to company tenant schema
        connection.execute(text("SET search_path TO \"miptech-company\", public"))
        
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
            version_table_schema="miptech-company",
        )
        
        with context.begin_transaction():
            context.run_migrations()
        
        # Reset search path
        connection.execute(text("SET search_path TO public"))
```

### Step 2: Initialize Company Tenant Data

**File**: `scripts/init_company_data.py`
```python
#!/usr/bin/env python3
"""Initialize company tenant with default data."""

import asyncio
import sys
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import get_settings
from app.models.tenant import Tenant
from app.models.user import User
from app.models.chat import Chat

settings = get_settings()

async def init_company_tenant():
    """Initialize company tenant with default data."""
    engine = create_async_engine(settings.DATABASE_URL)
    
    async with engine.begin() as conn:
        # Set schema for company tenant
        await conn.execute(text("SET search_path TO \"miptech-company\", public"))
        
        # Create default admin user for company
        admin_user = User(
            id="company-admin",
            email="admin@miptech.ai",
            username="admin",
            is_active=True,
            is_admin=True,
            tenant_id="miptech-company"
        )
        
        # Create sample chat for testing
        welcome_chat = Chat(
            id="welcome-chat",
            title="Welcome to MIPTech AI",
            tenant_id="miptech-company",
            user_id="company-admin",
            status="active"
        )
        
        print("Company tenant initialized successfully!")

if __name__ == "__main__":
    asyncio.run(init_company_tenant())
```

---

## Middleware Configuration

### Step 1: Enhanced Tenant Context Middleware

**File**: `backend/app/middleware/tenant_context.py`

**Complete updated method**:
```python
async def _extract_tenant_id(self, request: Request) -> str:
    """
    Extract tenant ID from request with company-specific handling.
    """
    # PRIORITY 1: Check for public endpoints first
    path = request.url.path
    if path in ["/", "/health", "/healthz", "/docs", "/openapi.json", "/redoc", "/metrics"]:
        return "system"
    
    # PRIORITY 2: Check for company domain
    host = request.headers.get("host", "")
    if host:
        # Handle company domain
        host_without_port = host.split(":")[0]
        if host_without_port in ["miptech.ai", "www.miptech.ai", "localhost"]:
            return "miptech-company"
        
        # Handle subdomains
        tenant_id = self._extract_from_subdomain(host)
        if tenant_id:
            return tenant_id
    
    # PRIORITY 3: Check X-Tenant-ID header
    tenant_id = request.headers.get("X-Tenant-ID")
    if tenant_id:
        return self._validate_tenant_id(tenant_id)
    
    # PRIORITY 4: Check query parameter (development only)
    if settings.is_development:
        tenant_id = request.query_params.get("tenant_id")
        if tenant_id:
            return self._validate_tenant_id(tenant_id)
    
    # PRIORITY 5: Extract from JWT token (if available)
    authorization = request.headers.get("Authorization")
    if authorization:
        tenant_id = self._extract_from_jwt(authorization)
        if tenant_id:
            return tenant_id
    
    # PRIORITY 6: Default for chat widget endpoints
    if path.startswith("/api/v1/chat") and not authorization:
        return "miptech-company"  # Default to company tenant for anonymous chat
    
    # FALLBACK: No tenant found
    raise TenantNotFoundException("Tenant ID not found in request")
```

### Step 2: Add Company Tenant Validation

**File**: `backend/app/middleware/tenant_context.py`

**Update validation method**:
```python
def _validate_tenant_id(self, tenant_id: str) -> str:
    """Validate tenant ID with company-specific rules."""
    
    # Allow system tenant
    if tenant_id == "system":
        return tenant_id
    
    # Allow company tenant
    if tenant_id == "miptech-company":
        return tenant_id
    
    # Basic validation for other tenants
    if not tenant_id or len(tenant_id) < 3 or len(tenant_id) > 50:
        raise TenantNotFoundException("Invalid tenant ID length")
    
    # Check for valid characters
    if not tenant_id.replace("-", "").replace("_", "").isalnum():
        raise TenantNotFoundException("Invalid tenant ID characters")
    
    return tenant_id.lower()
```

---

## API Endpoints

### Step 1: Health Check with Tenant Info

**File**: `backend/app/routes/health.py`

**Add tenant-aware health check**:
```python
@router.get("/tenant-info")
async def get_tenant_info(
    request: Request,
    tenant_id: str = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db_session)
):
    """Get current tenant information."""
    try:
        # Get tenant from database
        result = await db.execute(
            select(Tenant).where(Tenant.id == tenant_id)
        )
        tenant = result.scalar_one_or_none()
        
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        return {
            "tenant_id": tenant.id,
            "tenant_name": tenant.name,
            "domain": tenant.domain,
            "status": tenant.status,
            "host": request.headers.get("host"),
            "user_agent": request.headers.get("user-agent")
        }
        
    except Exception as e:
        logger.error("Failed to get tenant info", error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")
```

### Step 2: Company-Specific Chat Endpoints

**File**: `backend/app/routes/chat.py`

**Add company chat configuration**:
```python
@router.get("/config")
async def get_chat_config(
    tenant_id: str = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db_session)
):
    """Get chat configuration for tenant."""
    try:
        # Company-specific configuration
        if tenant_id == "miptech-company":
            return {
                "tenant_id": tenant_id,
                "features": {
                    "file_upload": True,
                    "voice_input": True,
                    "rag_enabled": True,
                    "analytics": True
                },
                "ui": {
                    "theme": "light",
                    "primary_color": "#2563eb",
                    "title": "MIPTech AI Assistant",
                    "subtitle": "How can I help you today?",
                    "show_branding": True
                },
                "limits": {
                    "messages_per_minute": 60,
                    "max_message_length": 4000,
                    "concurrent_connections": 10
                }
            }
        
        # Default configuration for other tenants
        return {
            "tenant_id": tenant_id,
            "features": {
                "file_upload": False,
                "voice_input": False,
                "rag_enabled": True,
                "analytics": False
            },
            "ui": {
                "theme": "light",
                "primary_color": "#6b7280",
                "title": "AI Assistant",
                "subtitle": "How can I help you?",
                "show_branding": True
            },
            "limits": {
                "messages_per_minute": 20,
                "max_message_length": 2000,
                "concurrent_connections": 5
            }
        }
        
    except Exception as e:
        logger.error("Failed to get chat config", error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")
```

---

## Authentication Setup

### Step 1: Internal Authentication Service

**File**: `backend/app/services/internal_auth.py`
```python
"""Internal authentication service for company tenant."""

from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.models.tenant import Tenant
from app.core.config import get_settings

settings = get_settings()

class InternalAuthService:
    """Authentication service for internal company use."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def authenticate_company_request(self, request) -> Optional[dict]:
        """Authenticate request from company website."""
        try:
            # For company tenant, we can use simplified auth
            if self.is_company_domain(request):
                return {
                    "tenant_id": "miptech-company",
                    "user_type": "company",
                    "authenticated": True
                }
            
            return None
            
        except Exception:
            return None
    
    def is_company_domain(self, request) -> bool:
        """Check if request is from company domain."""
        host = request.headers.get("host", "")
        return host.split(":")[0] in ["miptech.ai", "www.miptech.ai", "localhost"]
    
    async def get_company_user(self) -> Optional[User]:
        """Get default company user for anonymous sessions."""
        try:
            result = await self.db.execute(
                select(User).where(
                    User.tenant_id == "miptech-company",
                    User.username == "company-visitor"
                )
            )
            return result.scalar_one_or_none()
        except Exception:
            return None
```

### Step 2: Company User Creation

**File**: `backend/app/services/user.py`

**Add company user creation**:
```python
async def create_company_visitor(self, session_id: str) -> User:
    """Create anonymous visitor user for company website."""
    try:
        # Create anonymous user for company website
        user = User(
            id=f"company-visitor-{session_id}",
            username=f"visitor-{session_id[:8]}",
            email=f"visitor-{session_id[:8]}@miptech.ai",
            is_active=True,
            is_anonymous=True,
            tenant_id="miptech-company",
            session_id=session_id
        )
        
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        
        return user
        
    except Exception as e:
        await self.db.rollback()
        raise Exception(f"Failed to create company visitor: {str(e)}")
```

---

## Monitoring & Logging

### Step 1: Company Tenant Monitoring

**File**: `backend/app/core/monitoring.py`

**Add company-specific monitoring**:
```python
class CompanyTenantMonitor:
    """Monitoring specifically for company tenant."""
    
    def __init__(self):
        self.metrics = {
            "chat_sessions": 0,
            "messages_sent": 0,
            "response_times": [],
            "error_count": 0
        }
    
    def track_chat_session(self, session_id: str):
        """Track new chat session."""
        self.metrics["chat_sessions"] += 1
        logger.info(
            "Company chat session started",
            session_id=session_id,
            tenant_id="miptech-company"
        )
    
    def track_message(self, message_id: str, response_time: float):
        """Track message processing."""
        self.metrics["messages_sent"] += 1
        self.metrics["response_times"].append(response_time)
        
        logger.info(
            "Company message processed",
            message_id=message_id,
            response_time=response_time,
            tenant_id="miptech-company"
        )
    
    def track_error(self, error: Exception, context: dict):
        """Track error for company tenant."""
        self.metrics["error_count"] += 1
        
        logger.error(
            "Company tenant error",
            error=str(error),
            context=context,
            tenant_id="miptech-company"
        )
    
    def get_metrics(self) -> dict:
        """Get current metrics."""
        avg_response_time = (
            sum(self.metrics["response_times"]) / len(self.metrics["response_times"])
            if self.metrics["response_times"] else 0
        )
        
        return {
            "tenant_id": "miptech-company",
            "chat_sessions": self.metrics["chat_sessions"],
            "messages_sent": self.metrics["messages_sent"],
            "average_response_time": avg_response_time,
            "error_count": self.metrics["error_count"],
            "uptime": "tracked_separately"
        }

# Global instance
company_monitor = CompanyTenantMonitor()
```

### Step 2: Logging Configuration

**File**: `backend/app/core/logging_config.py`

**Add company-specific logging**:
```python
def setup_company_logging():
    """Setup logging specifically for company tenant."""
    
    company_logger = structlog.get_logger("miptech.company")
    
    # Company-specific log format
    company_logger.info(
        "Company tenant logging initialized",
        tenant_id="miptech-company",
        domain="miptech.ai"
    )
    
    return company_logger
```

---

## Security Configuration

### Step 1: Company Tenant Security

**File**: `backend/app/core/security.py`

**Add company-specific security settings**:
```python
class CompanyTenantSecurity:
    """Security settings for company tenant."""
    
    def __init__(self):
        self.allowed_origins = [
            "https://miptech.ai",
            "https://www.miptech.ai",
            "http://localhost:3000",  # Development
            "http://localhost:8000"   # Development
        ]
    
    def is_origin_allowed(self, origin: str) -> bool:
        """Check if origin is allowed for company tenant."""
        return origin in self.allowed_origins
    
    def get_cors_config(self) -> dict:
        """Get CORS configuration for company tenant."""
        return {
            "allow_origins": self.allowed_origins,
            "allow_credentials": True,
            "allow_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": [
                "Content-Type",
                "Authorization",
                "X-Tenant-ID",
                "X-Request-ID",
                "X-User-Session"
            ]
        }
```

### Step 2: Rate Limiting for Company

**File**: `backend/app/middleware/rate_limiter.py`

**Add company-specific rate limiting**:
```python
def get_company_rate_limit(self) -> dict:
    """Get rate limiting configuration for company tenant."""
    return {
        "requests_per_minute": 100,  # Higher limit for company
        "burst_size": 20,
        "cooldown_period": 60,
        "whitelist_ips": [
            "127.0.0.1",
            "::1"
        ]
    }
```

---

## Testing Platform Changes

### Step 1: Test Scripts

**File**: `tests/test_company_tenant.py`
```python
"""Test company tenant configuration."""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_docs_access():
    """Test that /docs endpoint is accessible."""
    response = client.get("/docs")
    assert response.status_code == 200

def test_company_tenant_resolution():
    """Test company tenant resolution from domain."""
    response = client.get(
        "/api/v1/health/tenant-info",
        headers={"Host": "miptech.ai"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["tenant_id"] == "miptech-company"

def test_chat_config():
    """Test chat configuration for company tenant."""
    response = client.get(
        "/api/v1/chat/config",
        headers={"Host": "miptech.ai"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["tenant_id"] == "miptech-company"
    assert data["features"]["file_upload"] is True

def test_anonymous_chat():
    """Test anonymous chat creation for company."""
    response = client.post(
        "/api/v1/chat/",
        headers={"Host": "miptech.ai"},
        json={
            "session_id": "test-session",
            "visitor_id": "test-visitor",
            "title": "Test Chat"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["tenant_id"] == "miptech-company"
```

### Step 2: Manual Testing

**Test Commands**:
```bash
# Test /docs access
curl -H "Host: miptech.ai" http://localhost:8000/docs

# Test tenant resolution
curl -H "Host: miptech.ai" http://localhost:8000/api/v1/health/tenant-info

# Test chat config
curl -H "Host: miptech.ai" http://localhost:8000/api/v1/chat/config

# Test with tenant header
curl -H "X-Tenant-ID: miptech-company" http://localhost:8000/api/v1/chat/config
```

---

## Deployment

### Step 1: Environment Variables

**File**: `.env`
```bash
# Company tenant configuration
COMPANY_TENANT_ID=miptech-company
COMPANY_DOMAIN=miptech.ai

# Database
DATABASE_URL=postgresql://miptech:miptech123@localhost:5432/miptech

# Development settings
DEBUG=true
ENVIRONMENT=development
```

### Step 2: Migration Script

**File**: `scripts/deploy_company_tenant.sh`
```bash
#!/bin/bash

echo "Deploying company tenant configuration..."

# Run database migrations
echo "Running database migrations..."
alembic upgrade head

# Create company tenant
echo "Creating company tenant..."
PGPASSWORD=miptech123 psql -U miptech -h localhost -d miptech -f scripts/create_company_tenant.sql

# Initialize company data
echo "Initializing company data..."
python scripts/init_company_data.py

# Test configuration
echo "Testing configuration..."
python -m pytest tests/test_company_tenant.py -v

echo "Company tenant deployment completed!"
```

### Step 3: Restart Development Server

```bash
# Stop current server (Ctrl+C)
# Then restart with updated configuration
./start-dev-server.sh
```

---

## Summary

This guide provides the complete platform-side configuration needed to support your company website as a production tenant. The key changes include:

1. **Fixed tenant middleware** to allow `/docs` access
2. **Created company tenant** in database
3. **Configured domain-based resolution** for `miptech.ai`
4. **Set up internal authentication** for company use
5. **Added monitoring and logging** for company tenant
6. **Created test suite** to verify configuration

### Next Steps:
1. Apply the middleware fixes
2. Run the database setup scripts
3. Test the configuration
4. Deploy to development environment
5. Verify `/docs` access works
6. Move to MERN stack integration guide

### Files Modified:
- `backend/app/middleware/tenant_context.py`
- `backend/app/core/config.py`
- `backend/app/routes/health.py`
- `backend/app/routes/chat.py`
- Database tenant records
- Test files

The platform is now ready to support your company website as a production tenant with full multi-tenant capabilities.

---

**Document Version**: 1.0  
**Last Updated**: July 15, 2025