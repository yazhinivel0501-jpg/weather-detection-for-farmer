# AgriWeather — MySQL + Java backend deployment

This package keeps the existing AgriWeather HTML/CSS/JavaScript design and serves it from a Spring Boot Java application. Registration/login are backed by MySQL, passwords are BCrypt-hashed, sessions are held in secure HTTP-only cookies, and weather snapshots are saved for authenticated farmers.

## Requirements for local development
- Java 21
- Maven 3.9+
- MySQL 8.0+

## 1. Create the database
Run in MySQL Workbench or a MySQL client:

```sql
CREATE DATABASE agriweather CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

The application automatically creates `farmers` and `weather_history` tables on startup from `src/main/resources/db/schema.sql`.

## 2. Set database environment variables
Set these in your terminal (do not commit real passwords):

Windows PowerShell:
```powershell
$env:DB_URL="jdbc:mysql://localhost:3306/agriweather?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
$env:DB_USERNAME="root"
$env:DB_PASSWORD="YOUR_MYSQL_PASSWORD"
$env:COOKIE_SECURE="false"
```

macOS/Linux:
```bash
export DB_URL='jdbc:mysql://localhost:3306/agriweather?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC'
export DB_USERNAME='root'
export DB_PASSWORD='YOUR_MYSQL_PASSWORD'
export COOKIE_SECURE='false'
```

## 3. Run locally
From this folder:

```bash
mvn spring-boot:run
```

Open http://localhost:8080. Create an account using **Create a farmer account**, then log in. Weather data comes from the existing Open-Meteo API. When a logged-in farmer loads a forecast or searches a city, a weather snapshot is saved. The `/api/weather/history` endpoint returns that farmer's latest 50 saved snapshots.

## API routes
- `POST /api/auth/register` JSON: `{"name":"Farmer Name","email":"farmer@example.com","password":"at-least-8-characters"}`
- `POST /api/auth/login` JSON: `{"email":"farmer@example.com","password":"..."}`
- `GET /api/auth/me` current session
- `POST /api/auth/logout` end session
- `POST /api/weather/save` save a weather payload (requires login)
- `GET /api/weather/history` current farmer's latest 50 saved reports (requires login)

## 4. Push to GitHub
1. Create a new empty repository at https://github.com/new (for example `agriweather`).
2. Extract this package and open a terminal inside the `agriweather-deploy` folder.
3. Run:

```bash
git init
git add .
git commit -m "Prepare AgriWeather Java and MySQL backend"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/agriweather.git
git push -u origin main
```

Replace `YOUR-USERNAME` with your GitHub username. Do not commit `.env` files or database passwords.

## 5. Deploy on Render with an external MySQL database
This setup deploys the frontend and Java API together on one origin, avoiding cross-origin session-cookie issues.

1. Provision a MySQL 8 database with a provider that allows external connections. Create a database named `agriweather` and a dedicated user. Keep its host, port, database name, username and password private.
2. In https://render.com, choose **New + → Web Service**, connect your GitHub repository, and select Docker as the runtime (Render detects the included `Dockerfile`).
3. Add environment variables in Render:
   - `DB_URL` = `jdbc:mysql://YOUR_DB_HOST:3306/agriweather?useSSL=true&serverTimezone=UTC` (use the exact TLS/CA parameters required by your database provider)
   - `DB_USERNAME` = your database user
   - `DB_PASSWORD` = your database password
   - `COOKIE_SECURE` = `true`
4. Deploy. Wait for the build and startup to complete, then open the Render service URL. On first start, Spring runs `schema.sql` to create the tables.
5. Test account registration, log in, load/search a weather location, and verify `weather_history` has records in MySQL.

**Important:** Render does not provide a built-in MySQL database. Select a MySQL provider separately and check its current pricing, connection limits, backups, TLS settings and free-tier status before using it. Do not use a temporary or sleep-prone database for important farmer data.

## Notes and limitations
- Existing visual layout, translations, icons, and Open-Meteo forecast calls are retained.
- Passwords are never stored in plain text; BCrypt hashes are stored in MySQL.
- Password reset email is intentionally not represented as working: SMTP/reset-token delivery has not been configured.
- Weather snapshots are only saved when a farmer is logged in. The current UI does not yet display a weather-history page; data is available through `GET /api/weather/history`.
- Before production use, add rate limiting, email verification, password reset, CSRF protections appropriate to your session setup, database backups, and monitoring.
