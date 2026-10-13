# SmartIAM

SmartIAM is a frontend demo for an intelligent AWS access request and management portal. It demonstrates a company workspace with role-oriented experiences for a Security Team, Main Admin, and Root User (employee).

## Demo features

- Demo sign-in and registration screens for Main Admin and invited Root User (employee) accounts; no identity documents are collected.
- Security Team access is modeled as an internal, pre-provisioned account. It is not available through public registration and no Security Team demo login ID/password is displayed.
- Role-based portal navigation and ABC Technologies sample workspace.
- Security request queue with risk context, review comments, approve/reject actions, and a requester self-approval guard.
- Employee access dashboard, access request creation, request history, and temporary-grant examples.
- Organization overview, employee activation/deactivation, CSV import, AWS account mockups, and audit view.
- Main Admin can add Root User employee profiles with name, work email, login ID, temporary password, organization, and role. The password is used for the demo form only and is never retained.
- Request changes saved in browser local storage.

## Run locally

Dependencies are installed. Start the Vite development server with `npm run dev`, then open the local URL printed in the terminal. Use `npm run build` to create a production build and `npm run lint` to run Oxlint.

## Demo walkthrough

1. Sign in as Main Admin or Root User using the public mock account choices, or open **Create account**.
2. Main Admin registration represents creating the company workspace. Root User registration represents joining with a company invitation code.
3. Submit an access request, inspect the review queue, and try the Main Admin employee screens.
4. To reset request demo state, clear the browser local storage key `smartiam-requests`.

The public role selection demonstrates Main Admin and employee account flows only. Security Team users are already provisioned separately and receive internal access. Role selection is not authentication or authorization.

## Security and integration scope

This project currently contains frontend mock data only. It has no backend, real login, tenant isolation, PostgreSQL, email delivery, verified identity provider, AWS account connection, permission provisioning, or automatic revocation. Local storage and demo audit records are not secure or tamper-proof. Do not use real credentials, personal identity numbers, company secrets, or production AWS data. Real deployments need server-enforced authentication, tenant-scoped authorization, audited APIs, and AWS-side temporary grants/revocation before this UI can manage access.
