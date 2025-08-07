#!/usr/bin/env python3
"""
Test script for Wix Webhook with actual payload structure
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8001"  # Updated to port 8001
API_BASE = f"{BASE_URL}/api/v1"

def test_wix_webhook_payload():
    """Test the webhook with the actual Wix payload structure"""
    print("🧪 Testing Wix Webhook with Actual Payload Structure...")
    
    # Simulate the actual Wix webhook payload you provided
    webhook_data = {
        "string_field": "order-12345",
        "uuid_field": "807a6ffb-2a85-4a0e-8dee-45195a759372",
        "number_field": 42,
        "dateTime_field": "2024-11-20T12:34:56Z",
        "date_field": "2024-01-01",
        "time_field": "14:30:00",
        "uri_field": "https://www.example.com",
        "boolean_field": True,
        "email_field": "customer@example.com",
        "object_field": {
            "string_field": "pro",
            "number_field": 100
        },
        "array_field": [
            "item_1",
            "item_2"
        ]
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/invitation/webhook/wix/",
            json=webhook_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Response Status: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
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

def test_email_sending():
    """Test email sending functionality"""
    print("\n🧪 Testing Email Sending...")
    
    test_email = "allyviateam@gmail.com"  # Replace with your actual email
    
    try:
        response = requests.post(
            f"{API_BASE}/invitation/test-email/",
            json={"email": test_email},
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            print("✅ Test email sent successfully")
            result = response.json()
            print(f"   Message: {result.get('message')}")
            return True
        else:
            print(f"❌ Email test failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Email test failed: {str(e)}")
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

def main():
    """Run all tests"""
    print("🚀 Starting Wix Webhook Tests with Actual Payload")
    print("=" * 60)
    
    tests = [
        ("Wix Webhook Processing", test_wix_webhook_payload),
        ("Email Sending", test_email_sending),
        ("Webhook Logs", test_webhook_logs),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            success = test_func()
            results.append((test_name, success))
        except Exception as e:
            print(f"❌ {test_name} test crashed: {str(e)}")
            results.append((test_name, False))
    
    print("\n" + "=" * 60)
    print("📊 Test Results Summary")
    print("=" * 60)
    
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
    print("1. Update the test email address in the script")
    print("2. Configure your email settings in Django")
    print("3. Set up the webhook URL in your Wix dashboard")
    print("4. Test with real Wix payments")

if __name__ == "__main__":
    main() 