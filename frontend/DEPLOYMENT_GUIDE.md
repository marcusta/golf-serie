# Golf Serie Frontend - Deployment Guide

This guide explains how to deploy the Golf Serie frontend application behind a reverse proxy.

## Overview

The application is configured to work in both development and production environments:

- **Development**: Uses Vite proxy to forward `/api` requests to `localhost:3000`
- **Production**: Dynamically detects the deployment path and adjusts API calls accordingly

## Deployment Configurations

### 1. Production Build for Reverse Proxy

The application is configured to be deployed under the `/golf-serie` path. When you run:

```bash
npm run build
```

The built files will have the correct base path (`/golf-serie/`) for:
- Static assets (CSS, JS, images)
- API requests

### 2. Generated Assets

After building, the `dist/index.html` will contain:
```html
<script type="module" crossorigin src="/golf-serie/assets/index-[hash].js"></script>
<link rel="stylesheet" crossorigin href="/golf-serie/assets/index-[hash].css">
```

### 3. API Request Handling

The application uses a smart API configuration that adapts to the deployment environment:

- **Development**: API calls go to `/api` (proxied by Vite)
- **Production under `/golf-serie`**: API calls go to `/golf-serie/api`
- **Production at root**: API calls go to `/api`

## Reverse Proxy Configuration

### Nginx Example

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Serve the frontend under /golf-serie
    location /golf-serie/ {
        alias /path/to/your/dist/;
        try_files $uri $uri/ /golf-serie/index.html;
        
        # Handle SPA routing
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Proxy API requests
    location /golf-serie/api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Apache Example

```apache
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /path/to/your/dist

    # Serve the frontend under /golf-serie
    Alias /golf-serie /path/to/your/dist
    <Directory "/path/to/your/dist">
        AllowOverride All
        Require all granted
        
        # Handle SPA routing
        RewriteEngine On
        RewriteBase /golf-serie/
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /golf-serie/index.html [L]
    </Directory>

    # Proxy API requests
    ProxyPreserveHost On
    ProxyPass /golf-serie/api/ http://localhost:3000/api/
    ProxyPassReverse /golf-serie/api/ http://localhost:3000/api/
</VirtualHost>
```

## Testing the Deployment

### Local Testing

1. Build the application:
   ```bash
   npm run build
   ```

2. Test the production build locally:
   ```bash
   npm run preview:prod
   ```
   This will serve the app at `http://localhost:4173/golf-serie/`

### Backend Requirements

Ensure your backend API server:
1. Is running on the expected port (default: 3000)
2. Handles CORS properly for your domain
3. Serves API endpoints under `/api/`

## Environment-Specific Configuration

The application automatically detects its deployment context:

- **`import.meta.env.DEV`**: Development mode (uses Vite proxy)
- **Production**: Checks `window.location.pathname` to determine the base path

### Key Files

1. **`vite.config.ts`**: Sets build-time base path
2. **`src/api/config.ts`**: Runtime API URL detection and base path utilities
3. **`src/router.tsx`**: TanStack Router configuration with dynamic base path
4. **All API files**: Use shared `API_BASE_URL` configuration

## What's Fixed

The application now correctly handles:

1. **Static Assets**: Build artifacts (JS/CSS) use correct paths with `/golf-serie/` prefix
2. **API Requests**: Dynamically adapt to deployment context (dev vs prod, root vs sub-path)
3. **Client-Side Routing**: TanStack Router uses correct base path for route resolution
4. **SPA Navigation**: Direct URL access and browser refresh work correctly
5. **Redirects**: Index route redirects work with base path

## Troubleshooting

### Asset Loading Issues
- Verify the reverse proxy serves static files correctly
- Check that the base path in `vite.config.ts` matches your deployment path

### API Request Issues
- Ensure the backend is accessible at the expected URL
- Check reverse proxy configuration for API endpoint forwarding
- Verify CORS settings on the backend

### SPA Routing Issues
- Configure the web server to serve `index.html` for all unmatched routes
- Ensure the base path is correctly configured in your router

## Alternative Deployment Paths

To deploy under a different path (e.g., `/my-golf-app/`):

1. Update `vite.config.ts`:
   ```typescript
   const base = mode === 'production' ? '/my-golf-app/' : '/';
   ```

2. Update `src/api/config.ts`:
   ```typescript
   if (currentPath.startsWith('/my-golf-app')) {
     return '/my-golf-app/api';
   }
   ```

3. Update your reverse proxy configuration accordingly.

## Root Deployment

To deploy at the root path (`/`):

1. Update `vite.config.ts`:
   ```typescript
   const base = '/'; // Same for both dev and prod
   ```

2. The API configuration will automatically use `/api` for root deployments. 