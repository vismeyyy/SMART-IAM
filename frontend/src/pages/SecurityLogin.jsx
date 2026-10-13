import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./SecurityLogin.css";
import SecurityPortal from "./SecurityPortal";

function ShieldIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3 19 6v5.5c0 4.3-2.9 7.7-7 9.5-4.1-1.8-7-5.2-7-9.5V6l7-3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

async function readJsonResponse(response) {
  const body = await response.text();
  if (!body.trim()) {
    throw new Error("SmartIAM returned an empty response. Make sure the backend is running, then try again.");
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new Error("SmartIAM returned an invalid response. Make sure the backend is running, then try again.");
  }
}

function SecurityLogin({ portal = false }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(portal);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!portal) return;

    fetch("/api/security/auth/me", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Please sign in to access the Security Team portal.");
        const data = await response.json();
        setUser(data.user);
      })
      .catch((requestError) => {
        setError(requestError.message);
        navigate("/security/login", { replace: true });
      })
      .finally(() => setLoading(false));
  }, [navigate, portal]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/security/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.message || "Unable to sign in. Please try again.");
      navigate("/security/portal", { replace: true });
    } catch (requestError) {
      setError(requestError instanceof TypeError
        ? "Unable to connect to SmartIAM. Start the backend server and try again."
        : requestError.message || "Unable to connect to SmartIAM. Check that the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/security/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
    navigate("/security/login", { replace: true });
  }

  if (portal && loading) {
    return <main className="security-loading"><span className="security-spinner" />Verifying your secure session…</main>;
  }

  if (portal && user) {
    return <SecurityPortal user={user} onLogout={handleLogout} />;
  }

  return (
    <main className="security-auth">
      <aside className="security-aside">
        <a className="security-brand" href="/"><span className="brand-mark"><ShieldIcon size={20} /></span><span>SmartIAM <small>ACCESS GOVERNANCE</small></span></a>
        <div className="aside-content">
          <div className="aside-badge"><span className="online-dot" />SECURITY OPERATIONS</div>
          <h1>Access with<br /><span>confidence.</span></h1>
          <p>One secure workspace to review requests, manage risk, and protect every cloud identity.</p>
          <div className="security-feature"><span><ShieldIcon size={19} /></span><div><strong>Protected workspace</strong><small>Restricted to authorized Security Team members</small></div></div>
          <div className="security-feature"><span className="feature-check">✓</span><div><strong>Temporary access control</strong><small>Keep permissions scoped and time-bound</small></div></div>
        </div>
        <div className="aside-bottom"><span>SMARTIAM SECURITY</span><span>IDENTITY · ACCESS · TRUST</span></div>
        <div className="aside-orb orb-one" /><div className="aside-orb orb-two" />
      </aside>

      <section className="security-form-side">
        <div className="mobile-brand security-brand"><span className="brand-mark"><ShieldIcon size={20} /></span><span>SmartIAM <small>ACCESS GOVERNANCE</small></span></div>
        <div className="security-form-wrap">
          <div className="form-heading"><div className="form-icon"><ShieldIcon size={24} /></div><div className="form-kicker">SECURITY TEAM PORTAL</div><h2>Welcome back</h2><p>Sign in with your authorized team credentials.</p></div>
          <form className="security-login-form" onSubmit={handleSubmit}>
            <label htmlFor="security-email">Work email</label>
            <div className="input-shell"><span className="input-icon">✉</span><input id="security-email" type="email" autoComplete="username" placeholder="you@company.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
            <div className="password-label"><label htmlFor="security-password">Password</label><span>Authorized team only</span></div>
            <div className="input-shell"><span className="input-icon">⌑</span><input id="security-password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required /><button className="show-password" type="button" onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? "Hide" : "Show"}</button></div>
            {error && <div className="security-error" role="alert">{error}</div>}
            <button className="security-submit" type="submit" disabled={loading}>{loading ? <><span className="button-spinner" />Signing in…</> : <>Sign in securely <span>→</span></>}</button>
          </form>
          <div className="secure-note"><span>▣</span> Protected sign-in · Your session is encrypted and monitored</div>
          <button className="back-link" type="button" onClick={() => navigate("/")}>← Back to SmartIAM home</button>
        </div>
        <footer className="security-footer"><span>© 2026 SmartIAM</span><span>Secure access for authorized personnel</span></footer>
      </section>
    </main>
  );
}

export default SecurityLogin;
