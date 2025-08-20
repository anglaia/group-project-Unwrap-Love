# Unwrap Love Server

This is the backend server for the Unwrap Love application.

## Local Development

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file in the root directory and add:
   ```
   PORT=5001
   MONGODB_URI=mongodb://localhost:27017/unwraplove
   NODE_ENV=development
   XAI_API_KEY=your_xai_api_key
   PHOTOROOM_API_KEY=your_photoroom_api_key
   ```

3. Start development server:
   ```
   npm run dev
   ```

4. Build for production:
   ```
   npm run build
   ```

## Deployment to Railway

### Prerequisites

1. Create a [Railway](https://railway.app/) account
2. Install Railway CLI (optional):
   ```
   npm i -g @railway/cli
   ```

### Deployment Steps

1. Create a new project in Railway
2. Connect your GitHub repository
3. Set up the required environment variables in Railway dashboard:
   - PORT: Will be set automatically by Railway
   - MONGODB_URI: Create a MongoDB service in Railway or use external MongoDB URI
   - NODE_ENV: production
   - XAI_API_KEY: Your XAI API key
   - PHOTOROOM_API_KEY: Your PhotoRoom API key

4. Railway will automatically deploy your application based on the Procfile and railway.toml configuration.

### Manual Deployment via CLI

```bash
# Login to Railway
railway login

# Link to existing project
railway link

# Deploy your app
railway up
```

## Folder Structure

- `src/`: Source code
  - `controllers/`: API route controllers
  - `models/`: MongoDB schemas
  - `routes/`: Express routes
  - `middleware/`: Express middleware
  - `utils/`: Utility functions
  - `types/`: TypeScript type definitions
  - `app.ts`: Express application setup
  - `server.ts`: HTTP server entry point
  - `socket.ts`: WebSocket server setup
- `dist/`: Compiled JavaScript (generated)
- `uploads/`: Temporary file storage
- `public/`: Static files and permanent uploads 