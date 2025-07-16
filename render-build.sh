#!/bin/bash

# Exit on error
set -e

# Build the frontend
echo "Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Build the backend
echo "Building backend..."
cd backend
npm install
cd ..
