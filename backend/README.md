# Backend setup

## Admin authentication configuration

Add these settings to the existing `backend/.env` file. Do not replace the
existing database setting or commit the real secret:

```dotenv
JWT_SECRET_KEY=your-random-secret-at-least-32-bytes-long
AUTH_COOKIE_SECURE=false
```

In PowerShell, generate a secret and append it without displaying its value:

```powershell
$secret = & '.\venv\Scripts\python.exe' -c "import secrets; print(secrets.token_urlsafe(48))"
Add-Content .env "JWT_SECRET_KEY=$secret"
Remove-Variable secret
```

Use `AUTH_COOKIE_SECURE=false` for local HTTP development. Set it to `true`
when serving the API over HTTPS.
Restart the FastAPI process after editing `.env` so the new settings are loaded.

Create an admin account from this directory:

```powershell
.\venv\Scripts\python.exe .\create_admin.py
```

The script prompts for the admin email/name and reads the password without
displaying it. It stores only an Argon2 password hash.

Admin login uses a short-lived JWT in an HttpOnly, SameSite=Strict cookie. The
cookie is not readable by frontend JavaScript and is verified by FastAPI.
