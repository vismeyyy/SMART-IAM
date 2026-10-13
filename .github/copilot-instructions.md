# SmartIAM workspace instructions

- This workspace is a React + TypeScript + Vite frontend prototype for a multi-company AWS access request portal.
- Use mock data for all current workflows. Never imply that demo role selection, local storage, approvals, identity verification, or AWS account cards enforce real security.
- Keep the role experiences distinct: Security Team reviews requests; Main Admin manages company employees; Root User is the employee portal role and must not be confused with the actual AWS account root user.
- Do not collect Aadhaar, PAN, or other government identity numbers. The registration page only simulates provider verification status.
- Preserve the separation-of-duties demo guard and clearly mark integration boundaries. No AWS access is provisioned by this frontend.
- Keep layouts responsive and accessible; use the existing lucide-react icon dependency and the SmartIAM styles.
- Verify changes with `npm run build` and `npm run lint`.

## Completed setup

- React + Vite + TypeScript scaffold created.
- SmartIAM role-based mock dashboards, workflow, and README added.
- No extra VS Code extensions required.
- Development server uses the Vite `dev` script. This workspace is a demo only; backend and production security work remain future tasks.
