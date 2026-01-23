# Deployment Guide

## 1. Environment Variables
Ensure the following variables are set in your deployment environment (e.g., Vercel Project Settings):

```bash
# Firebase Admin SDK (Service Account)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

```

## 2. Build Commands
The project uses Next.js.
- **Build Command:** `npm run build`
- **Output Directory:** `.next` (Next.js default)
- **Install Command:** `npm install`


## 3. Local Production Test
To run the production build locally:
```bash
npm run build
npm start
```
