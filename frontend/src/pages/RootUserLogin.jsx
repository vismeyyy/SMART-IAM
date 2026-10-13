import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, Clock3, KeyRound, LockKeyhole, LogOut, ShieldCheck, UserRound } from "lucide-react";
import "./RootUserLogin.css";

export default function RootUserLogin({ portal = false }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [user, setUser] = useState(null);
  const [dashboard, setDashboard] = useState({ requests: [], grants: [] });
  const [loading, setLoading] = useState(portal);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!portal) return;
    Promise.resolve().then(async () => {
      try {
        const sessionResponse = await fetch("/api/root/auth/me", { credentials: "include" });
        const session = await sessionResponse.json();
        if (!sessionResponse.ok) throw new Error(session.message || "Sign in to view your employee portal.");
        setUser(session.user);
        if (!session.user.mustChangePassword) {
          const response = await fetch("/api/root/portal", { credentials: "include" });
          const result = await response.json();
          if (!response.ok) throw new Error(result.message || "Unable to load your employee portal.");
          setDashboard(result);
        }
      } catch (requestError) {
        setError(requestError.message);
        navigate("/root/login", { replace: true });
      } finally {
        setLoading(false);
      }
    });
  }, [navigate, portal]);

  async function handleLogin(event) {
    event.preventDefault();
    setWorking(true);
    setError("");
    try {
      const response = await fetch("/api/root/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to sign in.");
      navigate("/root/portal", { replace: true });
    } catch (requestError) {
      setError(requestError.message || "Unable to connect to SmartIAM.");
    } finally {
      setWorking(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    setWorking(true);
    setError("");
    try {
      const response = await fetch("/api/root/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: newPassword }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Password could not be updated.");
      setUser(result.user);
      setNewPassword("");
      setSuccess("Password updated. Your employee access portal is ready.");
      const portalResponse = await fetch("/api/root/portal", { credentials: "include" });
      if (portalResponse.ok) setDashboard(await portalResponse.json());
    } catch (requestError) {
      setError(requestError.message || "Password could not be updated.");
    } finally {
      setWorking(false);
    }
  }

  async function logout() {
    await fetch("/api/root/auth/logout", { method: "POST", credentials: "include" });
    navigate("/root/login", { replace: true });
  }

  if (portal && loading) return <main className="root-loading"><span className="root-spinner" />Verifying your secure employee session…</main>;

  if (portal && user?.mustChangePassword) {
    return <main className="root-auth"><section className="root-auth-card"><a className="root-brand" href="/"><span><ShieldCheck size={20} /></span>SmartIAM<small>EMPLOYEE ACCESS PORTAL</small></a><div className="root-auth-icon"><KeyRound size={22} /></div><div className="root-kicker">FIRST-SIGN-IN SECURITY</div><h1>Create your password</h1><p>Your temporary password worked. Replace it with a personal password before continuing.</p><div className="root-warning"><LockKeyhole size={15} />At least 12 characters, including uppercase, lowercase, a number, and a symbol.</div><form className="root-form" onSubmit={changePassword}><label htmlFor="root-new-password">New password</label><input id="root-new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Create a personal password" required minLength={12} />{error && <div className="root-error" role="alert">{error}</div>}{success && <div className="root-success"><Check size={14} />{success}</div>}<button className="root-submit" type="submit" disabled={working}>{working ? "Saving…" : <>Save password <ArrowRight size={15} /></>}</button></form><button className="root-text-button" onClick={logout}>Sign out</button></section></main>;
  }

  if (portal && user) {
    const pending = dashboard.requests.filter((item) => item.status === "Pending").length;
    return <main className="root-dashboard"><header className="root-topbar"><a className="root-brand" href="/root/portal"><span><ShieldCheck size={20} /></span>SmartIAM<small>EMPLOYEE ACCESS PORTAL</small></a><div className="root-account"><span className="root-online" />{user.email}<button onClick={logout}><LogOut size={14} />Sign out</button></div></header><section className="root-dashboard-body"><div className="root-eyebrow"><span className="root-online" />MY SECURE WORKSPACE</div><h1>Hello, {user.name}</h1><p className="root-subtitle">View your own temporary AWS access and request history.</p><div className="root-profile"><UserRound size={17} /><span><strong>{user.email}</strong><small>{user.company} · Root User employee role</small></span></div>{success && <div className="root-success"><Check size={14} />{success}</div>}<div className="root-stats"><article><span>ACTIVE ACCESS</span><strong>{dashboard.grants.length}</strong><small>Current temporary grants</small></article><article><span>PENDING REQUESTS</span><strong>{pending}</strong><small>Waiting for Security Team</small></article><article><span>REQUEST HISTORY</span><strong>{dashboard.requests.length}</strong><small>Your requests only</small></article></div><section className="root-data-card"><div className="root-card-heading"><div><h2>My active access</h2><p>Permissions granted to your account</p></div><LockKeyhole size={17} /></div>{dashboard.grants.length ? dashboard.grants.map((grant) => <article className="root-list-row" key={grant.id}><span className="root-list-icon"><ShieldCheck size={17} /></span><span><strong>{grant.resource}</strong><small>{grant.permission} · Expires {grant.expiresIn}</small></span><b>ACTIVE</b></article>) : <div className="root-empty"><LockKeyhole size={20} /><strong>No active grants</strong><span>Approved temporary AWS access will appear here.</span></div>}</section><section className="root-data-card"><div className="root-card-heading"><div><h2>My request history</h2><p>Status and Security Team feedback</p></div><Clock3 size={17} /></div>{dashboard.requests.length ? dashboard.requests.map((request) => <article className="root-list-row" key={request.id}><span className="root-list-icon"><Clock3 size={16} /></span><span><strong>{request.resource}</strong><small>{request.permission} · {request.duration} · {request.id}{request.comment ? ` · ${request.comment}` : ""}</small></span><b className={`root-status root-status-${request.status.toLowerCase()}`}>{request.status}</b></article>) : <div className="root-empty"><Clock3 size={20} /><strong>No requests yet</strong></div>}</section><p className="root-disclaimer">“Root User” is the SmartIAM employee role, not an AWS account root user.</p></section></main>;
  }

  return <main className="root-auth"><section className="root-auth-card"><a className="root-brand" href="/"><span><ShieldCheck size={20} /></span>SmartIAM<small>EMPLOYEE ACCESS PORTAL</small></a><div className="root-auth-icon"><UserRound size={22} /></div><div className="root-kicker">ROOT USER · EMPLOYEE ACCOUNT</div><h1>Sign in to your workspace</h1><p>Use the login ID and one-time password provided by your company Main Admin.</p><form className="root-form" onSubmit={handleLogin}><label htmlFor="root-email">Work email / Login ID</label><input id="root-email" type="email" autoComplete="username" placeholder="you@company.com" value={email} onChange={(event) => setEmail(event.target.value)} required /><label htmlFor="root-password">One-time password</label><input id="root-password" type="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required />{error && <div className="root-error" role="alert">{error}</div>}<button className="root-submit" type="submit" disabled={working}>{working ? "Signing in…" : <>Sign in securely <ArrowRight size={15} /></>}</button></form><div className="root-login-note"><LockKeyhole size={13} />A new password is required at first sign-in.</div><a className="root-back-link" href="/">← Back to SmartIAM</a></section><footer className="root-footer">SmartIAM employee access · Security Team managed</footer></main>;
}
