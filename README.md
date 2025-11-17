# Base44 App


This app was created automatically by Base44.
It's a Vite+React app that communicates with the Base44 API.

## Running the app

```bash
npm install
npm run dev
```

## Building the app

```bash
npm run build
```

## Backend Setup (ophtalmo-backend)

### Prerequisites
- Node.js >= 16.0.0
- PostgreSQL database
- npm >= 8.0.0

### Initial Setup

1. **Install backend dependencies:**
   ```bash
   cd ophtalmo-backend
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and configure the required variables:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `JWT_SECRET`: **REQUIRED** - Generate a secure secret (see below)
   - `PORT`: Server port (default: 3001)
   - `NODE_ENV`: Environment (development/production)

3. **Generate a secure JWT_SECRET:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Copy the generated string and set it as your `JWT_SECRET` in `.env`

4. **Initialize the database:**
   ```bash
   # Run the schema to create tables
   psql $DATABASE_URL -f schema.sql
   ```

5. **Create an admin user:**
   ```bash
   node create-admin.js
   ```
   This will create an admin user with:
   - Username: admin
   - Password: admin
   - **IMPORTANT:** Change the password immediately after first login!

6. **Start the backend server:**
   ```bash
   npm start
   # or for development with auto-reload:
   npm run dev
   ```

### Security Best Practices

⚠️ **CRITICAL SECURITY REQUIREMENTS:**

1. **JWT_SECRET is REQUIRED:**
   - The server will refuse to start without a configured JWT_SECRET
   - Never use default or weak secrets in production
   - Generate strong random secrets using the command above
   - Keep JWT_SECRET confidential and never commit it to version control

2. **Password Security:**
   - All users must have a hashed password (`password_hash`)
   - Login will fail if a user account lacks a proper password hash
   - Use the `create-admin.js` script to create users with hashed passwords
   - Change default admin password immediately

3. **Environment Variables:**
   - Never commit `.env` files to version control
   - Use strong, unique secrets for each environment
   - Rotate secrets regularly in production

4. **Database Security:**
   - The `password_hash` column is required (NOT NULL constraint)
   - Always use parameterized queries (already implemented)
   - Enable SSL for production database connections

5. **Production Checklist:**
   - [ ] Set strong JWT_SECRET (minimum 32 characters)
   - [ ] Change default admin password
   - [ ] Set NODE_ENV=production
   - [ ] Enable database SSL
   - [ ] Configure proper CORS origins
   - [ ] Set up proper logging and monitoring
   - [ ] Implement rate limiting (already configured)

### Running Tests

```bash
cd ophtalmo-backend
npm test
```

For more information and support, please contact Base44 support at app@base44.com.
