#!/usr/bin/env python3
"""
Load testing script for Exchange Platform v3
Real-world scenarios with comprehensive metrics
"""

import json
import random
import time
from locust import HttpUser, task, between, events
from datetime import datetime, timedelta

class ExchangeUser(HttpUser):
    """Simulates a real exchange platform user"""
    
    host = "http://localhost:3000"
    wait_time = between(1, 3)  # Random wait between requests
    
    def on_start(self):
        """Initialize user session"""
        self.tenant_id = f"tenant_{random.randint(1, 10)}"
        self.user_id = f"user_{random.randint(1000, 9999)}"
        self.auth_token = None
        self.session_data = {}
        
        # Login to get auth token
        self.login()
    
    def login(self):
        """Simulate user login"""
        login_data = {
            "email": f"user{random.randint(1, 1000)}@example.com",
            "password": "testpassword123",
            "tenant_id": self.tenant_id
        }
        
        headers = {
            "Content-Type": "application/json",
            "Tenant-ID": self.tenant_id
        }
        
        with self.client.post("/api/auth/login", 
                            json=login_data, 
                            headers=headers, 
                            catch_response=True) as response:
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get("token")
                self.session_data = data
                response.success()
            else:
                response.failure(f"Login failed: {response.status_code}")
    
    @task(3)
    def view_dashboard(self):
        """View user dashboard - high frequency"""
        headers = {
            "Authorization": f"Bearer {self.auth_token}",
            "Tenant-ID": self.tenant_id
        }
        
        with self.client.get("/api/dashboard", 
                           headers=headers, 
                           catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Dashboard failed: {response.status_code}")
    
    @task(2)
    def view_transactions(self):
        """View transaction history - medium frequency"""
        headers = {
            "Authorization": f"Bearer {self.auth_token}",
            "Tenant-ID": self.tenant_id
        }
        
        params = {
            "page": random.randint(1, 10),
            "limit": 20,
            "status": random.choice(["PENDING", "COMPLETED", "FAILED", None])
        }
        
        with self.client.get("/api/transactions", 
                           headers=headers, 
                           params=params, 
                           catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Transactions failed: {response.status_code}")
    
    @task(1)
    def create_transaction(self):
        """Create new transaction - low frequency but high impact"""
        headers = {
            "Authorization": f"Bearer {self.auth_token}",
            "Tenant-ID": self.tenant_id,
            "Content-Type": "application/json"
        }
        
        transaction_data = {
            "amount": random.randint(100, 10000),
            "currency": random.choice(["USD", "EUR", "GBP", "JPY"]),
            "type": random.choice(["BUY", "SELL"]),
            "description": f"Test transaction {random.randint(1, 1000)}"
        }
        
        with self.client.post("/api/transactions", 
                            json=transaction_data, 
                            headers=headers, 
                            catch_response=True) as response:
            if response.status_code in [200, 201]:
                response.success()
            else:
                response.failure(f"Create transaction failed: {response.status_code}")
    
    @task(2)
    def view_p2p_orders(self):
        """View P2P marketplace - medium frequency"""
        headers = {
            "Authorization": f"Bearer {self.auth_token}",
            "Tenant-ID": self.tenant_id
        }
        
        params = {
            "currency_pair": random.choice(["USD/EUR", "EUR/USD", "GBP/USD"]),
            "status": random.choice(["ACTIVE", "PENDING", None])
        }
        
        with self.client.get("/api/p2p/orders", 
                           headers=headers, 
                           params=params, 
                           catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"P2P orders failed: {response.status_code}")
    
    @task(1)
    def create_p2p_order(self):
        """Create P2P order - low frequency"""
        headers = {
            "Authorization": f"Bearer {self.auth_token}",
            "Tenant-ID": self.tenant_id,
            "Content-Type": "application/json"
        }
        
        order_data = {
            "currency_pair": random.choice(["USD/EUR", "EUR/USD", "GBP/USD"]),
            "amount": random.randint(500, 5000),
            "price": round(random.uniform(0.8, 1.2), 4),
            "type": random.choice(["BUY", "SELL"]),
            "description": f"P2P order {random.randint(1, 1000)}"
        }
        
        with self.client.post("/api/p2p/orders", 
                            json=order_data, 
                            headers=headers, 
                            catch_response=True) as response:
            if response.status_code in [200, 201]:
                response.success()
            else:
                response.failure(f"Create P2P order failed: {response.status_code}")
    
    @task(1)
    def view_reports(self):
        """View financial reports - low frequency but heavy"""
        headers = {
            "Authorization": f"Bearer {self.auth_token}",
            "Tenant-ID": self.tenant_id
        }
        
        report_type = random.choice(["daily", "weekly", "monthly"])
        params = {
            "type": report_type,
            "start_date": (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d"),
            "end_date": datetime.now().strftime("%Y-%m-%d")
        }
        
        with self.client.get("/api/reports/financial", 
                           headers=headers, 
                           params=params, 
                           catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Reports failed: {response.status_code}")
    
    @task(1)
    def view_user_profile(self):
        """View user profile - low frequency"""
        headers = {
            "Authorization": f"Bearer {self.auth_token}",
            "Tenant-ID": self.tenant_id
        }
        
        with self.client.get(f"/api/users/{self.user_id}", 
                           headers=headers, 
                           catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Profile failed: {response.status_code}")

class AdminUser(HttpUser):
    """Simulates an admin user with different access patterns"""
    
    wait_time = between(2, 5)
    
    def on_start(self):
        """Initialize admin session"""
        self.tenant_id = f"tenant_{random.randint(1, 5)}"
        self.admin_token = None
        self.login()
    
    def login(self):
        """Admin login"""
        login_data = {
            "email": f"admin{random.randint(1, 10)}@example.com",
            "password": "adminpass123",
            "tenant_id": self.tenant_id
        }
        
        headers = {
            "Content-Type": "application/json",
            "Tenant-ID": self.tenant_id
        }
        
        with self.client.post("/api/auth/login", 
                            json=login_data, 
                            headers=headers, 
                            catch_response=True) as response:
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data.get("token")
                response.success()
            else:
                response.failure(f"Admin login failed: {response.status_code}")
    
    @task(2)
    def view_all_transactions(self):
        """Admin view all transactions"""
        headers = {
            "Authorization": f"Bearer {self.admin_token}",
            "Tenant-ID": self.tenant_id
        }
        
        params = {
            "page": random.randint(1, 5),
            "limit": 50,
            "status": random.choice(["PENDING", "COMPLETED", "FAILED", None])
        }
        
        with self.client.get("/api/admin/transactions", 
                           headers=headers, 
                           params=params, 
                           catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Admin transactions failed: {response.status_code}")
    
    @task(1)
    def view_analytics(self):
        """Admin view analytics dashboard"""
        headers = {
            "Authorization": f"Bearer {self.admin_token}",
            "Tenant-ID": self.tenant_id
        }
        
        with self.client.get("/api/admin/analytics", 
                           headers=headers, 
                           catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Analytics failed: {response.status_code}")
    
    @task(1)
    def view_audit_logs(self):
        """Admin view audit logs"""
        headers = {
            "Authorization": f"Bearer {self.admin_token}",
            "Tenant-ID": self.tenant_id
        }
        
        params = {
            "page": random.randint(1, 3),
            "limit": 100,
            "action": random.choice(["CREATE", "UPDATE", "DELETE", None])
        }
        
        with self.client.get("/api/admin/audit-logs", 
                           headers=headers, 
                           params=params, 
                           catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Audit logs failed: {response.status_code}")

class SuperAdminUser(HttpUser):
    """Simulates a super admin with system-wide access"""
    
    wait_time = between(3, 8)
    
    def on_start(self):
        """Initialize super admin session"""
        self.super_admin_token = None
        self.login()
    
    def login(self):
        """Super admin login"""
        login_data = {
            "email": "superadmin@exchange.com",
            "password": "superadminpass123"
        }
        
        headers = {"Content-Type": "application/json"}
        
        with self.client.post("/api/auth/super-admin/login", 
                            json=login_data, 
                            headers=headers, 
                            catch_response=True) as response:
            if response.status_code == 200:
                data = response.json()
                self.super_admin_token = data.get("token")
                response.success()
            else:
                response.failure(f"Super admin login failed: {response.status_code}")
    
    @task(1)
    def view_all_tenants(self):
        """Super admin view all tenants"""
        headers = {
            "Authorization": f"Bearer {self.super_admin_token}"
        }
        
        params = {
            "page": random.randint(1, 3),
            "limit": 20
        }
        
        with self.client.get("/api/super-admin/tenants", 
                           headers=headers, 
                           params=params, 
                           catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Tenants failed: {response.status_code}")
    
    @task(1)
    def view_system_metrics(self):
        """Super admin view system metrics"""
        headers = {
            "Authorization": f"Bearer {self.super_admin_token}"
        }
        
        with self.client.get("/api/super-admin/metrics", 
                           headers=headers, 
                           catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"System metrics failed: {response.status_code}")

# Custom event listeners for detailed monitoring
@events.request.add_listener
def my_request_handler(request_type, name, response_time, response_length, response, context, exception, start_time, url, **kwargs):
    """Custom request handler for detailed monitoring"""
    if exception:
        print(f"Request failed: {name} - {exception}")
    elif response.status_code >= 400:
        print(f"Request error: {name} - {response.status_code}")

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Called when test starts"""
    print("Load test started")

@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Called when test stops"""
    print("Load test completed") 