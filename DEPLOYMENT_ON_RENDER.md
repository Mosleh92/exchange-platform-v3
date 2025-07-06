# Deploying to Render

This document outlines the settings required to deploy the frontend and backend services to Render.

## General Notes

*   Connect your GitHub repository to Render.
*   Render will automatically trigger new deployments on pushes to the main branch.

## 1. Database Service (PostgreSQL)

*   **Service Type**: PostgreSQL
*   **Creation**: Create this service first via the Render dashboard.
*   **Internal Database URL**: Once created, copy the "Internal Database URL". This will be used as the `DATABASE_URL` environment variable for the backend service.

## 2. Backend Service

*   **Service Type**: Web Service
*   **Environment**: Node
*   **Root Directory**: `backend`
*   **Build Command**: `npm install`
*   **Start Command**: `npm run start:prod`
*   **Environment Variables**:
    *   `DATABASE_URL`: The Internal Database URL obtained from the Render PostgreSQL service.
    *   `JWT_SECRET`: A long, random string for signing JWTs. Generate a secure secret for this.
    *   `NODE_ENV`: `production` (Render typically sets this by default for Web Services, but good to be aware)
    *   `PORT`: Render sets this automatically. The application reads it from `process.env.PORT`.
    *   `ALLOWED_ORIGINS`: Comma-separated list of allowed frontend URLs (e.g., `https://your-frontend-service.onrender.com`).

## 3. Frontend Service

*   **Service Type**: Static Site
*   **Root Directory**: `frontend`
*   **Build Command**: `npm install && npm run build`
*   **Publish Directory**: `dist` (This is the default for Vite projects and is configured in `frontend/vite.config.js`)
*   **Environment Variables (Optional - can also be in `.env.production`)**:
    *   `VITE_API_BASE_URL`: The public URL of your backend service on Render (e.g., `https://your-backend-service-name.onrender.com`). This is defined in `frontend/.env.production` but can be overridden/set in Render's UI if preferred for different environments.
*   **Dependency Management**: Ensure all necessary frontend libraries (e.g., `jspdf`, `xlsx`) are listed in `frontend/package.json` to be installed during the build process.

## Workflow Summary

1.  **Develop Locally**:
    *   Use `npm workspaces` (if configured, otherwise manage separately).
    *   Set local `.env` files in `frontend` and `backend` directories (e.g., `backend/.env` with `DATABASE_URL=mongodb://localhost:27017/yourlocaldb`, `frontend/.env.development` with `VITE_API_BASE_URL=http://localhost:5000`).
2.  **Push to GitHub**:
    *   Commit changes to the `main` branch.
3.  **Render Deployment**:
    *   Render automatically detects changes.
    *   Backend service builds and starts using its specific settings from the `backend` directory.
    *   Frontend service builds and publishes using its specific settings from the `frontend` directory.
    *   Services communicate via their Render URLs.
