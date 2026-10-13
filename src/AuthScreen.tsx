import { useState } from 'react'
import { ArrowRight, Check, Fingerprint, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react'
import type { FormEvent } from 'react'

type PublicRole = 'Main Admin' | 'Root User'
type PortalRole = PublicRole | 'Security Team'

const demoAccounts: Record<PublicRole, { email: string; password: string }> = {
  'Main Admin': { email: 'admin@abc-tech.demo', password: 'AdminDemo2026!' },
  'Root User': { email: 'priya.sharma@abc-tech.demo', password: 'EmployeeDemo2026!' },
}

export default function AuthScreen({ onEnter }: { onEnter: (role: PortalRole) => void }) {
  const [register, setRegister] = useState(false)
  const [role, setRole] = useState<PublicRole>('Main Admin')
  const [internalSignIn, setInternalSignIn] = useState(false)
  const [verified, setVerified] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState(demoAccounts['Main Admin'].email)
  const [password, setPassword] = useState(demoAccounts['Main Admin'].password)
  const selectDemoAccount = (selectedRole: PublicRole) => {
    setRole(selectedRole)
    setEmail(demoAccounts[selectedRole].email)
    setPassword(demoAccounts[selectedRole].password)
  }
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); onEnter(internalSignIn ? 'Security Team' : role) }

  return <main className="auth-screen">
    <section className="auth-story"><div className="auth-brand"><span className="brand-mark"><ShieldCheck size={21} /></span><span className="brand-name">smart<span>iam</span><i>✳</i></span></div><div className="auth-story-content"><div className="auth-glow"><span><LockKeyhole size={35} /></span><i /><i /><i /></div><span className="eyebrow">CLOUD ACCESS, SIMPLIFIED</span><h1>Secure access.<br /><em>Without the wait.</em></h1><p>One trusted place to request, review, and manage AWS access across your organization.</p><div className="auth-feature"><span><Check size={14} /></span>Temporary access with automatic expiry</div><div className="auth-feature"><span><Check size={14} /></span>Every request reviewed by your security team</div><div className="auth-feature"><span><Check size={14} /></span>Built for least privilege</div></div><div className="auth-story-footer"><span>✳</span> Identity-first cloud access management</div></section>
    <section className="auth-form-area"><div className="auth-form-wrap"><span className="eyebrow">{internalSignIn ? 'INTERNAL SECURITY ACCESS' : register ? 'CREATE AN ORGANIZATION ACCOUNT' : 'WELCOME BACK'}</span><h2>{internalSignIn ? 'Security Team sign in' : register ? 'Get started with SmartIAM' : 'Sign in to your account'}</h2><p>{internalSignIn ? 'Use your organization-provisioned Security Team account.' : register ? (role === 'Main Admin' ? 'Create your company workspace as its Main Admin.' : 'Join your company workspace as an employee.') : 'Use the account issued for your workspace role.'}</p>
      {!internalSignIn && <div className="auth-switch"><button className={!register ? 'selected' : ''} onClick={() => { setRegister(false); selectDemoAccount(role) }}>Sign in</button><button className={register ? 'selected' : ''} onClick={() => { setRegister(true); setInternalSignIn(false); setEmail(''); setPassword('') }}>Create account</button></div>}
      {!register && !internalSignIn && <div className="demo-accounts"><div className="demo-accounts-heading"><span>PUBLIC DEMO ACCOUNTS</span><small>Mock credentials</small></div><div className="demo-account-options">{(['Main Admin', 'Root User'] as PublicRole[]).map((accountRole) => <button key={accountRole} type="button" className={`demo-account-option ${role === accountRole ? 'selected' : ''}`} onClick={() => { setInternalSignIn(false); selectDemoAccount(accountRole) }}><span className="demo-account-check">{role === accountRole && <Check size={11} />}</span><span><b>{accountRole === 'Root User' ? 'Root User · Employee' : accountRole}</b><small>{demoAccounts[accountRole].email}</small></span></button>)}</div></div>}
      <form onSubmit={handleSubmit} className="auth-fields">
        {register && <label>Full name<input required placeholder="Your full name" /></label>}
        <label>{register ? 'Work email' : 'Login ID / work email'}<input required type="email" placeholder={internalSignIn ? 'your-security-team@company.com' : 'you@company.com'} value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Password<input required type={showPassword ? 'text' : 'password'} minLength={6} placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {!register && !internalSignIn && <button type="button" className="password-reveal" onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? 'Hide demo password' : 'Show demo password'}</button>}
        {register && <><label>Company or institution<input required placeholder="Your organization name" /></label><div className="auth-row"><label>Country<select defaultValue="India"><option>India</option><option>United States</option><option>United Kingdom</option><option>Other</option></select></label><label>Phone number<input type="tel" placeholder="+91 98765 43210" /></label></div>{role === 'Root User' && <label>Company invitation code<input required placeholder="Ask your Main Admin for an invite code" /></label>}<button type="button" className={`verification-box ${verified ? 'verified' : ''}`} onClick={() => setVerified(!verified)}><span>{verified ? <Check size={14} /> : <Fingerprint size={16} />}</span><span><b>Identity verification</b><small>{verified ? 'Demo verification complete' : 'Provider verification status simulation'}</small></span><span className="verification-action">{verified ? 'Verified' : 'Simulate'}</span></button></>}
        {register && <label className="demo-role-label">Account type<select value={role} onChange={(event) => setRole(event.target.value as PublicRole)}><option value="Main Admin">Main Admin · Create company workspace</option><option value="Root User">Root User · Employee account</option></select></label>}
        {!register && !internalSignIn && <div className="auth-help-row"><label><input type="checkbox" defaultChecked /> Remember me</label><span>Demo credentials are prefilled</span></div>}
        {internalSignIn && <div className="internal-access-note"><LockKeyhole size={14} /><span>Private staff portal. Security Team credentials are issued internally and are not available through public registration.</span></div>}
        <button className="auth-submit">{register ? 'Create demo account' : internalSignIn ? 'Continue to security portal' : 'Sign in'} <ArrowRight size={16} /></button>
      </form><div className="auth-safe"><LockKeyhole size={13} /> Demo authentication only. No real accounts are created.</div>{!register && <button type="button" className="internal-portal-link" onClick={() => { setInternalSignIn((current) => !current); setEmail(''); setPassword('') }}>{internalSignIn ? '← Return to organization sign in' : 'Security Team? Open internal sign in'}</button>}<div className="auth-demo-hint"><Sparkles size={14} /><span><b>{internalSignIn ? 'Internal access flow' : 'Workspace invitation flow'}</b> {internalSignIn ? 'This separate screen demonstrates the Security Team entry point; production must validate credentials on a protected backend.' : 'Security Team provisions the Main Admin workspace; Main Admin invites Root Users. Public sign-up never creates Security Team accounts.'}</span></div>
    </div><footer className="auth-footer">© 2026 SmartIAM <span>·</span> Security-first access management</footer></section>
  </main>
}
