#!/usr/bin/env python3
"""
Test script for Wix Payment Integration
This script tests the complete flow from webhook to signup link creation
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api/v1"

def test_webhook_processing():
    """Test the webhook processing flow"""
    print("🧪 Testing Wix Webhook Processing...")
    
    # Simulate a Wix payment succeeded webhook
    webhook_data = {
        "eventType": "payment.succeeded",
        "orderId": f"test-order-{int(time.time())}",
        "paymentId": f"test-payment-{int(time.time())}",
        "customerEmail": "test@example.com",
        "plan": "pro",
        "amount": 99.99,
        "currency": "USD"
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/invitation/webhook/wix/",
            json=webhook_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            print("✅ Webhook processed successfully")
            result = response.json()
            print(f"   Message: {result.get('message')}")
            print(f"   Signup Link ID: {result.get('signup_link_id')}")
            return True
        else:
            print(f"❌ Webhook failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Webhook test failed: {str(e)}")
        return False

def test_signup_link_creation():
    """Test manual signup link creation"""
    print("\n🧪 Testing Manual Signup Link Creation...")
    
    signup_data = {
        "email": "manual-test@example.com",
        "plan": "basic",
        "wix_order_id": f"manual-order-{int(time.time())}",
        "wix_payment_id": f"manual-payment-{int(time.time())}"
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/invitation/create/",
            json=signup_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 201:
            print("✅ Signup link created successfully")
            result = response.json()
            print(f"   Email: {result.get('email')}")
            print(f"   Plan: {result.get('plan')}")
            print(f"   Token: {result.get('token')[:20]}...")
            print(f"   Signup URL: {result.get('signup_url')}")
            return result.get('token')
        else:
            print(f"❌ Signup link creation failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Signup link test failed: {str(e)}")
        return None

def test_token_validation(token):
    """Test token validation"""
    print(f"\n🧪 Testing Token Validation...")
    
    try:
        response = requests.get(f"{API_BASE}/invitation/validate/{token}/")
        
        if response.status_code == 200:
            print("✅ Token validation successful")
            result = response.json()
            print(f"   Email: {result.get('email')}")
            print(f"   Plan: {result.get('plan')}")
            print(f"   Is Used: {result.get('is_used')}")
            return True
        else:
            print(f"❌ Token validation failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Token validation test failed: {str(e)}")
        return False

def test_webhook_logs():
    """Test webhook logs endpoint"""
    print("\n🧪 Testing Webhook Logs...")
    
    try:
        response = requests.get(f"{API_BASE}/invitation/webhook/logs/")
        
        if response.status_code == 200:
            logs = response.json()
            print(f"✅ Retrieved {len(logs)} webhook logs")
            for log in logs[:3]:  # Show first 3 logs
                print(f"   - {log.get('event_type')} - {log.get('wix_order_id')} - {log.get('processed')}")
            return True
        else:
            print(f"❌ Webhook logs failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Webhook logs test failed: {str(e)}")
        return False

def test_email_configuration():
    """Test email configuration"""
    print("\n🧪 Testing Email Configuration...")
    
    # This would require actual email sending, so we'll just check if the endpoint exists
    try:
        response = requests.get(f"{BASE_URL}/admin/")
        if response.status_code == 200:
            print("✅ Django admin accessible (email config can be checked there)")
            return True
        else:
            print("⚠️  Django admin not accessible")
            return False
    except Exception as e:
        print(f"❌ Email config test failed: {str(e)}")
        return False

def main():
    """Run all tests"""
    print("🚀 Starting Wix Payment Integration Tests")
    print("=" * 50)
    
    tests = [
        ("Webhook Processing", test_webhook_processing),
        ("Signup Link Creation", test_signup_link_creation),
        ("Webhook Logs", test_webhook_logs),
        ("Email Configuration", test_email_configuration),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            if test_name == "Signup Link Creation":
                token = test_func()
                results.append((test_name, token is not None))
                
                # Test token validation if creation was successful
                if token:
                    results.append(("Token Validation", test_token_validation(token)))
            else:
                success = test_func()
                results.append((test_name, success))
        except Exception as e:
            print(f"❌ {test_name} test crashed: {str(e)}")
            results.append((test_name, False))
    
    print("\n" + "=" * 50)
    print("📊 Test Results Summary")
    print("=" * 50)
    
    passed = 0
    total = len(results)
    
    for test_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}")
        if success:
            passed += 1
    
    print(f"\n🎯 Overall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! The Wix integration is working correctly.")
    else:
        print("⚠️  Some tests failed. Please check the configuration and try again.")
    
    print("\n📝 Next Steps:")
    print("1. Configure email settings in Django admin")
    print("2. Set up Wix webhook URL in your Wix dashboard")
    print("3. Test with real Wix payments")
    print("4. Deploy to production")

if __name__ == "__main__":
    main() 