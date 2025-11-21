"""
IP Whitelist Middleware for Skills Server
Only allows requests from trusted IP addresses/networks
"""
from fastapi import Request
from fastapi.responses import JSONResponse
from ipaddress import ip_address, ip_network
import os
import logging

logger = logging.getLogger(__name__)

# Load allowed IPs from environment (supports CIDR notation)
ALLOWED_IPS = os.getenv(
    'ALLOWED_IPS',
    '127.0.0.1,::1,172.16.0.0/12,192.168.0.0/16,10.0.0.0/8'  # Docker default ranges
).split(',')

ENABLE_IP_WHITELIST = os.getenv('ENABLE_IP_WHITELIST', 'true').lower() == 'true'


def is_ip_allowed(client_ip: str) -> bool:
    """
    Check if IP is in whitelist
    Supports both individual IPs and CIDR notation

    Args:
        client_ip: Client IP address to check

    Returns:
        True if IP is allowed, False otherwise
    """
    if not ENABLE_IP_WHITELIST:
        logger.debug("IP whitelist disabled, allowing all IPs")
        return True

    try:
        client = ip_address(client_ip)

        for allowed in ALLOWED_IPS:
            allowed = allowed.strip()

            if not allowed:
                continue

            # Check CIDR range (e.g., 10.0.0.0/8)
            if '/' in allowed:
                network = ip_network(allowed, strict=False)
                if client in network:
                    logger.debug(f"IP {client_ip} allowed (matches network {allowed})")
                    return True

            # Check exact IP match
            else:
                try:
                    if client == ip_address(allowed):
                        logger.debug(f"IP {client_ip} allowed (exact match)")
                        return True
                except ValueError:
                    logger.warning(f"Invalid IP in whitelist: {allowed}")
                    continue

        logger.warning(f"IP {client_ip} denied (not in whitelist)")
        return False

    except ValueError as e:
        logger.error(f"Invalid IP address: {client_ip} - {e}")
        return False


async def ip_whitelist_middleware(request: Request, call_next):
    """
    Middleware to enforce IP whitelist

    Checks client IP against whitelist before processing request.
    Handles proxy headers (X-Forwarded-For, X-Real-IP).

    Args:
        request: FastAPI request object
        call_next: Next middleware/handler in chain

    Returns:
        Response from next handler or 403 Forbidden
    """
    # Get client IP (handle proxy headers)
    client_ip = request.client.host

    # Check X-Forwarded-For if behind proxy (Coolify/nginx)
    forwarded = request.headers.get('X-Forwarded-For')
    if forwarded:
        # Take the first IP (original client)
        client_ip = forwarded.split(',')[0].strip()

    # Check X-Real-IP (nginx proxy alternative)
    real_ip = request.headers.get('X-Real-IP')
    if real_ip:
        client_ip = real_ip.strip()

    # Validate IP
    if not is_ip_allowed(client_ip):
        logger.warning(
            f"Access denied from {client_ip} to {request.url.path}",
            extra={
                'client_ip': client_ip,
                'path': request.url.path,
                'method': request.method,
                'user_agent': request.headers.get('user-agent'),
                'forwarded_for': forwarded,
                'real_ip': real_ip
            }
        )

        # Return 403 Forbidden
        return JSONResponse(
            status_code=403,
            content={
                "success": False,
                "error": {
                    "code": "FORBIDDEN",
                    "message": "Access denied from your IP address",
                    # Only show IP in debug mode
                    "client_ip": client_ip if os.getenv('DEBUG', 'false').lower() == 'true' else None
                }
            }
        )

    # IP is allowed, proceed with request
    logger.debug(f"IP {client_ip} allowed, processing request to {request.url.path}")
    response = await call_next(request)
    return response
