#!/bin/bash

# **اسکریپت برای تولید secrets امن**

# Create secrets directory
mkdir -p secrets

# Generate secure random passwords
echo "$(openssl rand -base64 32)" > secrets/mongo_root_password.txt
echo "$(openssl rand -base64 32)" > secrets/redis_password.txt
echo "$(openssl rand -base64 64)" > secrets/jwt_secret.txt
echo "$(openssl rand -base64 64)" > secrets/jwt_refresh_secret.txt
echo "$(openssl rand -base64 32)" > secrets/session_secret.txt
echo "$(openssl rand -base64 32)" > secrets/grafana_admin_password.txt
echo "$(openssl rand -base64 32)" > secrets/mongo_express_password.txt

# Set usernames
echo "admin" > secrets/mongo_root_username.txt

# Set proper permissions
chmod 600 secrets/*
chmod 700 secrets/

echo "✅ Secrets generated successfully!"
echo "⚠️  Make sure to:"
echo "   1. Add secrets/ to .gitignore"
echo "   2. Store secrets securely in production"
echo "   3. Use proper secrets management in production (e.g., HashiCorp Vault)"

# Add to .gitignore if it doesn't exist
if ! grep -q "secrets/" .gitignore 2>/dev/null; then
    echo "secrets/" >> .gitignore
    echo "✅ Added secrets/ to .gitignore"
fi
