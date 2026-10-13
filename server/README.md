# SmartIAM Security Team API

This is a demo authentication backend for the separate Security Team portal. It currently uses one environment-configured Security Team account (not a database-backed user directory).

## Run locally

1. In this workspace, a git-ignored `.env` is already configured for local demo use. For a fresh checkout, copy `.env.example` to `.env` and replace `JWT_SECRET` with a private random value of at least 32 characters. The example email/password are for local demonstration only.
2. Install dependencies with `npm install`.
3. Start the API with `npm run dev` (port 4000).
4. In a second terminal, run `cd ../frontend && npm run dev`.
5. Open the Vite URL and select **Security Team Login**, or visit `/security/login` directly.

Vite proxies `/api` to the backend. Sign-in issues an 8-hour JWT in an `httpOnly`, `sameSite=strict` cookie; the token is not exposed to frontend JavaScript. Password comparison uses bcrypt, and the login endpoint is rate-limited.

The Security Team account's **My Profile** opens from the top-right profile icon. Name, phone, and country can be edited; the login email stays read-only. Password changes verify the current password and hash the new value. Optionally initialize the profile with `SECURITY_TEAM_NAME`, `SECURITY_TEAM_PHONE`, and `SECURITY_TEAM_COUNTRY` in `.env`. For this demo, profile edits and password changes are in-memory and reset when the API restarts; the email/password configured in `.env` become the initial login values again.

## Approval notifications

The dashboard has a Messages shortcut beside Notifications. It opens a mail-style secure inbox with demo Root User and Main Admin contacts. Security Team members can send a subject and message to a selected contact. Approving or rejecting an access request automatically adds a decision message to that Root User's and matching Main Admin's conversations, as well as the audit log and dashboard notification.

The dashboard uses in-memory demo requests and messages. Approving a request adds a temporary demo grant and an audit entry. Without SMTP configuration, messages remain in the SmartIAM demo inbox and the dashboard clearly says that external email has not been sent. To send actual email notifications, set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and optionally `MAIL_FROM` in the ignored `server/.env` file. For Gmail, use a Google App Password rather than your normal account password. Do not commit SMTP credentials. Demo requests, messages, grants, and audit entries reset when the server restarts.

## Add users and Root User login

In the Security Team portal, choose **Add users** (below Audit log) to enter the employee name, work email, company, and Main Admin email. The Security Team-only endpoint creates a Root User employee account, hashes a generated one-time password, and emails the login ID/password to the Main Admin when SMTP is configured. The employee signs in at `/root/login` and must replace the one-time password on first login. If SMTP is not configured, the dashboard shows a demo preview; it does not send email. Set `ROOT_PORTAL_URL` to the deployed login URL when using SMTP. User accounts are in-memory demo data and reset when the API restarts.

## Demo limitations

The Security Team identity, Root User accounts, requests, grants, and messages are demo data held in memory, not a database. The Main Admin receives the temporary Root User password by email when SMTP is active; production should prefer a short-lived activation link over email passwords, then add a persistent user database, MFA, durable audit/message storage, CSRF protection appropriate to deployment, and authorization checks for every action. Never put AWS credentials or privileged AWS permissions in the browser. Provision/revoke AWS access only through a separately secured backend integration.
