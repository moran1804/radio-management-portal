# Station Manager - Docker Deployment Guide

A white-label radio station management platform that can be deployed as a self-contained Docker application with local Supabase backend.

## Overview

This application provides:
- DJ scheduling and show management
- Streaming configuration (Icecast/Shoutcast)
- User management with role-based access (Admin/DJ)
- Recurring show slots
- First-run setup wizard for easy configuration

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Docker Container                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │   Frontend  │  │  Supabase   │  │ Show Runner │  │
│  │   (React)   │◄─┤  (Postgres) │◄─┤  (Optional) │  │
│  │   :80/443   │  │   :54321    │  │             │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | URL to the Supabase instance | `http://localhost:54321` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key | `eyJhbGciOiJIUzI1NiIs...` |

### Supabase Configuration (for local Supabase)

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_PASSWORD` | Database password | (required) |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | (required) |
| `ANON_KEY` | Anonymous API key | (generate) |
| `SERVICE_ROLE_KEY` | Service role API key | (generate) |

### Optional Streaming Variables

These can be configured via the UI during setup, or pre-configured:

| Variable | Description | Default |
|----------|-------------|---------|
| `ICECAST_HOST` | Streaming server hostname | - |
| `ICECAST_PORT` | Streaming server port | `8000` |
| `ICECAST_MOUNTPOINT` | Stream mountpoint | `/live` |
| `ICECAST_USERNAME` | Source username | `source` |
| `ICECAST_PASSWORD` | Source password | - |

---

## Quick Start

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd station-manager
```

### 2. Create Environment File

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Supabase Configuration
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# For local Supabase (if running in container)
POSTGRES_PASSWORD=your-secure-password
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
```

### 3. Initialize Database

Before first run, you need to set up the database tables. The application provides a SQL script during the setup wizard, or you can run it manually:

1. Start your Supabase instance
2. Access the SQL Editor (Supabase Studio at port 54323 for local)
3. Run the database setup script (see [Database Setup](#database-setup) below)

### 4. Build and Run

```bash
# Build the Docker image
docker build -t station-manager .

# Run the container
docker run -d \
  -p 80:80 \
  -e VITE_SUPABASE_URL=http://localhost:54321 \
  -e VITE_SUPABASE_ANON_KEY=your-anon-key \
  station-manager
```

---

## Database Setup

### Option A: Via Setup Wizard

1. Start the application
2. On first run, the setup wizard will appear
3. In the "Database" step, download or copy the SQL script
4. Run the script in your Supabase SQL Editor
5. Continue with the setup

### Option B: Manual Setup

Run the SQL script located at `docs/database-setup.sql` in your Supabase SQL Editor.

The script creates:
- `profiles` - User profiles with roles
- `user_roles` - Secure role management (Admin/DJ)
- `djs` - DJ-specific information
- `shows` - Scheduled shows
- `recurring_slots` - Recurring show templates
- `schedules` - Show scheduling
- `jobs` / `job_events` - Background job tracking
- `streaming_credentials` - Icecast/Shoutcast config
- `remote_config` - Station settings

Plus all required:
- Row Level Security (RLS) policies
- Database functions
- Triggers for automatic profile creation

---

## Docker Compose Example

```yaml
version: '3.8'

services:
  # Supabase Database
  supabase-db:
    image: supabase/postgres:15.1.0.117
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - supabase-db:/var/lib/postgresql/data
    healthcheck:
      test: pg_isready -U postgres
      interval: 5s
      timeout: 5s
      retries: 10

  # Supabase API
  supabase-api:
    image: supabase/gotrue:v2.99.0
    depends_on:
      supabase-db:
        condition: service_healthy
    environment:
      GOTRUE_API_HOST: 0.0.0.0
      GOTRUE_API_PORT: 9999
      GOTRUE_DB_DRIVER: postgres
      GOTRUE_DB_DATABASE_URL: postgres://postgres:${POSTGRES_PASSWORD}@supabase-db:5432/postgres
      GOTRUE_SITE_URL: ${SITE_URL}
      GOTRUE_JWT_SECRET: ${JWT_SECRET}
      GOTRUE_JWT_EXP: 3600
      GOTRUE_DISABLE_SIGNUP: false

  # Supabase Kong (API Gateway)
  supabase-kong:
    image: kong:2.8.1
    depends_on:
      - supabase-api
    ports:
      - "54321:8000"
    environment:
      KONG_DATABASE: "off"
      KONG_DECLARATIVE_CONFIG: /var/lib/kong/kong.yml
    volumes:
      - ./docker/kong.yml:/var/lib/kong/kong.yml

  # Station Manager Frontend
  station-manager:
    build: .
    ports:
      - "80:80"
    environment:
      VITE_SUPABASE_URL: http://supabase-kong:8000
      VITE_SUPABASE_ANON_KEY: ${ANON_KEY}
    depends_on:
      - supabase-kong

volumes:
  supabase-db:
```

---

## First Run Setup

1. **Access the application** at `http://localhost` (or your configured domain)

2. **Setup Wizard** will guide you through:
   - Database initialization (download/run SQL script)
   - Station name and logo
   - Streaming server configuration
   - Creating the first admin account

3. **First user becomes Admin** - The first account created automatically gets admin privileges

4. **Configure streaming** - Enter your Icecast/Shoutcast server details

---

## White-Label Customization

### Branding

During setup, you can configure:
- Station name
- Station logo (upload image)
- Platform URL

These are stored in localStorage and displayed throughout the application.

### Theming

The application uses CSS custom properties for theming. Modify `src/index.css`:

```css
:root {
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  /* ... other color variables */
}
```

### Logo Replacement

Replace the default logo at `src/assets/logo.png` with your station's logo.

---

## Security Considerations

1. **Change default secrets** - Never use default JWT secrets or passwords in production

2. **Enable HTTPS** - Use a reverse proxy (nginx, Traefik) with SSL certificates

3. **Restrict database access** - Ensure Postgres is not exposed externally

4. **Regular backups** - Set up automated database backups

5. **Email verification** - Configure SMTP in Supabase for email verification

---

## Generating Supabase Keys

Use these commands to generate secure keys:

```bash
# Generate JWT Secret (min 32 characters)
openssl rand -base64 32

# Generate API keys using the Supabase key generator
# Or use: https://supabase.com/docs/guides/self-hosting#api-keys
```

For local development, you can use the default keys from `supabase start`, but **never use these in production**.

---

## Troubleshooting

### Application shows blank page
- Check browser console for errors
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set correctly
- Ensure Supabase is running and accessible

### Database connection errors
- Verify Supabase is running: `curl http://localhost:54321/rest/v1/`
- Check the anon key is valid
- Ensure the database has been initialized with the setup script

### Authentication not working
- Verify JWT secret matches between Supabase and the generated keys
- Check Supabase Auth logs for errors
- Ensure email verification is configured or disabled

### Setup wizard keeps appearing
- Check localStorage in browser dev tools
- Clear `station_config` key to reset
- Verify the setup was completed successfully

---

## Support

For issues and feature requests, please open an issue on the GitHub repository.

---

## License

[Your License Here]
