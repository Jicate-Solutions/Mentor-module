#!/usr/bin/env python3
"""
MyJKKN Auth Flow Test Script

Tests the OAuth 2.0 authentication flow with the MyJKKN auth server.
Useful for debugging authentication issues.

Usage:
    python test-auth-flow.py --auth-url https://sso.jkkn.ai --app-id YOUR_APP_ID --api-key YOUR_API_KEY

Requirements:
    pip install requests
"""

import argparse
import json
import sys
from datetime import datetime

try:
    import requests
except ImportError:
    print("Error: requests library not installed")
    print("Run: pip install requests")
    sys.exit(1)


def test_auth_server_connectivity(auth_url: str) -> bool:
    """Test if auth server is reachable."""
    print(f"\n1. Testing auth server connectivity...")
    print(f"   URL: {auth_url}")
    
    try:
        response = requests.get(auth_url, timeout=10)
        print(f"   Status: {response.status_code}")
        print(f"   Result: ✓ Auth server is reachable")
        return True
    except requests.exceptions.Timeout:
        print(f"   Result: ✗ Request timed out")
        return False
    except requests.exceptions.ConnectionError as e:
        print(f"   Result: ✗ Connection error: {e}")
        return False
    except Exception as e:
        print(f"   Result: ✗ Error: {e}")
        return False


def test_token_validation(auth_url: str, app_id: str, access_token: str) -> dict:
    """Test token validation endpoint."""
    print(f"\n2. Testing token validation...")
    
    validate_url = f"{auth_url}/api/auth/validate"
    print(f"   URL: {validate_url}")
    
    payload = {
        "access_token": access_token,
        "child_app_id": app_id
    }
    
    try:
        response = requests.post(
            validate_url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"   Status: {response.status_code}")
        
        if response.ok:
            data = response.json()
            if data.get("valid"):
                print(f"   Result: ✓ Token is valid")
                print(f"   User: {data.get('user', {}).get('email', 'N/A')}")
            else:
                print(f"   Result: ✗ Token is invalid")
                print(f"   Error: {data.get('error', 'Unknown')}")
            return data
        else:
            print(f"   Result: ✗ Validation failed")
            return {"valid": False, "error": f"HTTP {response.status_code}"}
            
    except Exception as e:
        print(f"   Result: ✗ Error: {e}")
        return {"valid": False, "error": str(e)}


def test_token_exchange(auth_url: str, app_id: str, api_key: str, code: str, redirect_uri: str) -> dict:
    """Test token exchange endpoint."""
    print(f"\n3. Testing token exchange...")
    
    token_url = f"{auth_url}/api/auth/token"
    print(f"   URL: {token_url}")
    
    payload = {
        "grant_type": "authorization_code",
        "code": code,
        "app_id": app_id,
        "api_key": api_key,
        "redirect_uri": redirect_uri
    }
    
    try:
        response = requests.post(
            token_url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"   Status: {response.status_code}")
        
        if response.ok:
            data = response.json()
            print(f"   Result: ✓ Token exchange successful")
            print(f"   Access Token: {data.get('access_token', 'N/A')[:20]}...")
            print(f"   Expires In: {data.get('expires_in', 'N/A')} seconds")
            if data.get('user'):
                print(f"   User: {data['user'].get('email', 'N/A')}")
                print(f"   Role: {data['user'].get('role', 'N/A')}")
            return data
        else:
            error_data = response.json() if response.text else {}
            print(f"   Result: ✗ Token exchange failed")
            print(f"   Error: {error_data.get('error', 'Unknown')}")
            print(f"   Description: {error_data.get('error_description', 'N/A')}")
            return error_data
            
    except Exception as e:
        print(f"   Result: ✗ Error: {e}")
        return {"error": str(e)}


def generate_login_url(auth_url: str, app_id: str, redirect_uri: str) -> str:
    """Generate the login URL for manual testing."""
    from urllib.parse import urlencode
    
    params = {
        "app_id": app_id,
        "redirect_uri": redirect_uri
    }
    
    return f"{auth_url}/login?{urlencode(params)}"


def main():
    parser = argparse.ArgumentParser(description="Test MyJKKN Auth Flow")
    parser.add_argument("--auth-url", required=True, help="MyJKKN auth server URL")
    parser.add_argument("--app-id", required=True, help="Your application ID")
    parser.add_argument("--api-key", help="Your API key (for token exchange)")
    parser.add_argument("--redirect-uri", default="http://localhost:3000/callback", help="Redirect URI")
    parser.add_argument("--access-token", help="Access token to validate")
    parser.add_argument("--code", help="Authorization code to exchange")
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("MyJKKN Auth Flow Test")
    print("=" * 60)
    print(f"Timestamp: {datetime.now().isoformat()}")
    print(f"Auth Server: {args.auth_url}")
    print(f"App ID: {args.app_id}")
    print(f"Redirect URI: {args.redirect_uri}")
    
    # Test 1: Connectivity
    if not test_auth_server_connectivity(args.auth_url):
        print("\n✗ Auth server not reachable. Cannot continue.")
        sys.exit(1)
    
    # Test 2: Token Validation (if token provided)
    if args.access_token:
        test_token_validation(args.auth_url, args.app_id, args.access_token)
    
    # Test 3: Token Exchange (if code and api-key provided)
    if args.code and args.api_key:
        test_token_exchange(
            args.auth_url, 
            args.app_id, 
            args.api_key, 
            args.code,
            args.redirect_uri
        )
    
    # Generate login URL for manual testing
    print("\n" + "=" * 60)
    print("Manual Testing")
    print("=" * 60)
    login_url = generate_login_url(args.auth_url, args.app_id, args.redirect_uri)
    print(f"\nTo test login manually, open this URL in your browser:")
    print(f"\n{login_url}\n")
    print("After login, you'll be redirected with a 'code' parameter.")
    print("Use that code with --code flag to test token exchange.")
    
    print("\n" + "=" * 60)
    print("Test Complete")
    print("=" * 60)


if __name__ == "__main__":
    main()
