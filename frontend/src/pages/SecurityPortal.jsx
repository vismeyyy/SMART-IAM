import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, Check,
  CheckCheck, ChevronDown, Clock3, Cloud, FileClock, HelpCircle,
  KeyRound, LayoutDashboard, LockKeyhole, LogOut, Mail, Menu, MessageSquare, MoreHorizontal,
  Copy, Search, Send, Settings, Shield, ShieldCheck, ShieldAlert, SlidersHorizontal,
  UserPlus, UserRound, Users, X, XCircle,
} from "lucide-react";
import "./SecurityPortal.css";
import "./AddUsers.css";
import "./SecurityProfile.css";

const navigation = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "requests", label: "Requests", icon: FileClock, badge: true },
  { id: "active", label: "Active access", icon: LockKeyhole },
  { id: "audit", label: "Audit log", icon: Activity },
  { id: "addUsers", label: "Add users", icon: UserPlus },
];

const sectionTitles = {
  overview: ["Security overview", "Monitor access activity and keep your cloud environment protected."],
  requests: ["Access requests", "Review, approve, and document access requests from your organization."],
  active: ["Active access", "Track temporary cloud access and upcoming expirations."],
  audit: ["Audit log", "A clear record of security decisions and access changes."],
  addUsers: ["Add users", "Provision Root User accounts in the connected user/admin application."],
  settings: ["Settings", "Manage security workspace preferences."],
  help: ["Help & support", "Guidance for managing access securely."],
  messages: ["Messages", "Communicate securely with Root Users and Main Admins."],
};

function RiskBadge({ risk }) {
  return <span className={`risk-badge risk-${risk.toLowerCase()}`}><span />{risk} risk</span>;
}

function StatusBadge({ status }) {
  return <span className={`status-badge status-${status.toLowerCase()}`}><span />{status}</span>;
}

function SecurityPortal({ user, onLogout }) {
  const [section, setSection] = useState("overview");
  const [data, setData] = useState({ requests: [], grants: [], audit: [], notifications: [], users: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [messagesData, setMessagesData] = useState({ contacts: [], messages: [] });
  const [selectedContact, setSelectedContact] = useState(null);
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [messageSending, setMessageSending] = useState(false);
  const [messageSearch, setMessageSearch] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [decision, setDecision] = useState(null);
  const [decisionComment, setDecisionComment] = useState("");
  const [working, setWorking] = useState(false);
  const [toast, setToast] = useState("");
  const [mailNotice, setMailNotice] = useState(null);
  const [newUser, setNewUser] = useState({ name: "", email: "", company: "", mainAdminEmail: "" });
  const [addingUser, setAddingUser] = useState(false);
  const [createdCredential, setCreatedCredential] = useState(null);
  const [credentialCopied, setCredentialCopied] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: user.name || "Security Team", email: user.email, phone: "", country: "" });
  const [profileCurrentPassword, setProfileCurrentPassword] = useState("");
  const [profileNewPassword, setProfileNewPassword] = useState("");
  const [profileWorking, setProfileWorking] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  const refreshDashboard = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/security/dashboard", { credentials: "include" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to load security dashboard.");
      setData(result);
    } catch (requestError) {
      setError(requestError.message || "Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { Promise.resolve().then(refreshDashboard); }, [refreshDashboard]);

  const refreshMessages = useCallback(async () => {
    try {
      const response = await fetch("/api/security/messages", { credentials: "include" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to load messages.");
      setMessagesData(result);
      setSelectedContact((current) => current || result.contacts[0]?.email || null);
    } catch (requestError) {
      setError(requestError.message || "Unable to load messages.");
    }
  }, []);

  useEffect(() => {
    if (section === "messages") Promise.resolve().then(refreshMessages);
  }, [section, refreshMessages]);
  useEffect(() => { Promise.resolve().then(refreshMessages); }, [refreshMessages]);

  const pendingRequests = data.requests.filter((request) => request.status === "Pending");
  const activeGrants = data.grants.filter((grant) => grant.status === "Active");
  const expiringSoon = activeGrants.filter((grant) => grant.hoursRemaining <= 24).length;
  const filteredRequests = useMemo(() => data.requests.filter((request) =>
    [request.requester, request.company, request.resource, request.permission, request.id].join(" ").toLowerCase().includes(search.toLowerCase())), [data.requests, search]);
  const filteredGrants = useMemo(() => data.grants.filter((grant) =>
    [grant.user, grant.company, grant.resource, grant.permission].join(" ").toLowerCase().includes(search.toLowerCase())), [data.grants, search]);
  const filteredAudit = useMemo(() => data.audit.filter((entry) =>
    [entry.actor, entry.action, entry.target, entry.company].join(" ").toLowerCase().includes(search.toLowerCase())), [data.audit, search]);

  async function submitDecision() {
    if (!decision) return;
    setWorking(true);
    setError("");
    try {
      const response = await fetch(`/api/security/requests/${decision.request.id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ decision: decision.action, comment: decisionComment }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not update request.");
      setMailNotice(result.email);
      setDecision(null);
      setDecisionComment("");
      setToast(`${decision.action === "approve" ? "Request approved" : "Request rejected"} for ${result.request.requester}.`);
      await refreshDashboard();
      await refreshMessages();
      window.setTimeout(() => setToast(""), 4800);
    } catch (requestError) {
      setError(requestError.message || "Could not save your decision.");
    } finally {
      setWorking(false);
    }
  }

  function openDecision(request, action) {
    setDecision({ request, action });
    setDecisionComment("");
  }

  function switchSection(id) {
    setSection(id);
    setSearch("");
    setMobileNavOpen(false);
  }

  async function sendMessage(event) {
    event.preventDefault();
    if (!selectedContact || !messageSubject.trim() || !messageBody.trim()) return;
    setMessageSending(true);
    setError("");
    try {
      const response = await fetch("/api/security/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ to: selectedContact, subject: messageSubject.trim(), body: messageBody.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Message could not be sent.");
      setMessageSubject("");
      setMessageBody("");
      await refreshMessages();
      setToast(result.delivery?.message || "Message sent securely.");
      window.setTimeout(() => setToast(""), 4000);
    } catch (requestError) {
      setError(requestError.message || "Message could not be sent.");
    } finally {
      setMessageSending(false);
    }
  }

  async function submitAddUser(event) {
    event.preventDefault();
    setAddingUser(true);
    setError("");
    setMailNotice(null);
    setCreatedCredential(null);
    try {
      const response = await fetch("/api/security/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newUser),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Root User account could not be created.");
      setCreatedCredential(result.temporaryCredential || null);
      setCredentialCopied("");
      setMailNotice({ kind: "user", status: result.emailDelivery.status, message: result.emailDelivery.message });
      setNewUser({ name: "", email: "", company: "", mainAdminEmail: "" });
      setToast(`Root User login created for ${result.user.name}.`);
      await refreshDashboard();
      await refreshMessages();
      window.setTimeout(() => setToast(""), 5000);
    } catch (requestError) {
      setError(requestError.message || "Root User account could not be created.");
    } finally {
      setAddingUser(false);
    }
  }

  async function copyRootCredential(value, field) {
    try {
      await navigator.clipboard.writeText(value);
      setCredentialCopied(field);
      window.setTimeout(() => setCredentialCopied(""), 2200);
    } catch {
      setError("Clipboard access is unavailable. Select and copy the credential manually.");
    }
  }

  async function openSecurityProfile() {
    setProfileOpen(true);
    setProfileError("");
    setProfileSuccess("");
    try {
      const response = await fetch("/api/security/profile", { credentials: "include" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not load your profile.");
      setProfileForm(result.profile);
    } catch (requestError) {
      setProfileError(requestError.message || "Could not load your profile.");
    }
  }

  async function saveSecurityProfile(event) {
    event.preventDefault();
    setProfileWorking(true);
    setProfileError("");
    setProfileSuccess("");
    try {
      const response = await fetch("/api/security/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(profileForm),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Profile could not be saved.");
      setProfileForm(result.profile);
      setProfileSuccess("Profile details saved.");
      await refreshDashboard();
    } catch (requestError) {
      setProfileError(requestError.message || "Profile could not be saved.");
    } finally {
      setProfileWorking(false);
    }
  }

  async function changeSecurityPassword(event) {
    event.preventDefault();
    setProfileWorking(true);
    setProfileError("");
    setProfileSuccess("");
    try {
      const response = await fetch("/api/security/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword: profileCurrentPassword, newPassword: profileNewPassword }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Password could not be changed.");
      setProfileCurrentPassword("");
      setProfileNewPassword("");
      setProfileSuccess(result.message || "Password updated.");
    } catch (requestError) {
      setProfileError(requestError.message || "Password could not be changed.");
    } finally {
      setProfileWorking(false);
    }
  }

  const activeContact = messagesData.contacts.find((contact) => contact.email === selectedContact);
  const activeThread = messagesData.messages.filter((message) => message.threadWith === selectedContact);
  const visibleContacts = messagesData.contacts.filter((contact) => `${contact.name} ${contact.email} ${contact.role} ${contact.company}`.toLowerCase().includes(messageSearch.toLowerCase()));

  async function openConversation(email) {
    setSelectedContact(email);
    try {
      await fetch("/api/security/messages/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ threadWith: email }),
      });
      await refreshMessages();
    } catch {
      // Keep the conversation available if marking it read fails.
    }
  }

  function renderRequests(requests, compact = false) {
    if (!requests.length) return <div className="empty-state"><CheckCheck size={22} /><strong>All caught up</strong><span>No requests match this view.</span></div>;
    return <div className="table-scroll"><table className="security-table"><thead><tr><th>REQUESTER</th><th>RESOURCE & PERMISSION</th><th>RISK</th><th>DURATION</th><th>STATUS</th><th>{compact ? "" : "SUBMITTED"}</th><th /></tr></thead><tbody>{requests.map((request) => <tr key={request.id}>
      <td><div className="person-cell"><span className="avatar avatar-blue">{request.requester.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><span><strong>{request.requester}</strong><small>{request.company}</small></span></div></td>
      <td><span className="resource-name">{request.resource}</span><small className="cell-subtext">{request.permission}</small></td>
      <td><RiskBadge risk={request.risk} /></td><td className="duration-cell">{request.duration}</td><td><StatusBadge status={request.status} /></td>
      <td className="date-cell">{compact ? request.timeAgo : request.submittedAt}</td>
      <td><div className="row-actions">{request.status === "Pending" ? <><button className="icon-action approve-action" aria-label={`Approve ${request.requester}'s request`} onClick={() => openDecision(request, "approve")}><Check size={15} /></button><button className="icon-action reject-action" aria-label={`Reject ${request.requester}'s request`} onClick={() => openDecision(request, "reject")}><X size={15} /></button></> : <button className="icon-action" aria-label="View request details" onClick={() => { setDecision({ request, action: "view" }); setDecisionComment(""); }}><MoreHorizontal size={16} /></button>}</div></td>
    </tr>)}</tbody></table></div>;
  }

  function renderGrants(grants) {
    if (!grants.length) return <div className="empty-state"><LockKeyhole size={22} /><strong>No active access found</strong><span>Active grants will appear here after approval.</span></div>;
    return <div className="table-scroll"><table className="security-table"><thead><tr><th>USER</th><th>RESOURCE</th><th>PERMISSION</th><th>GRANTED BY</th><th>EXPIRES IN</th><th>STATUS</th></tr></thead><tbody>{grants.map((grant) => <tr key={grant.id}><td><div className="person-cell"><span className="avatar avatar-purple">{grant.user.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><span><strong>{grant.user}</strong><small>{grant.company}</small></span></div></td><td><span className="resource-name">{grant.resource}</span></td><td>{grant.permission}</td><td>{grant.grantedBy}</td><td><span className={grant.hoursRemaining <= 24 ? "expiry-warning" : "duration-cell"}>{grant.expiresIn}</span></td><td><StatusBadge status={grant.status} /></td></tr>)}</tbody></table></div>;
  }

  function renderAudit(entries) {
    if (!entries.length) return <div className="empty-state"><Activity size={22} /><strong>No audit events</strong><span>Security activity will be recorded here.</span></div>;
    return <div className="audit-list">{entries.map((entry) => {
      const Icon = entry.tone === "approved" ? Check : entry.tone === "rejected" ? XCircle : entry.tone === "expiry" ? Clock3 : ShieldCheck;
      return <article className="audit-row" key={entry.id}><span className={`audit-icon audit-${entry.tone}`}><Icon size={16} /></span><div className="audit-description"><strong>{entry.action}</strong><span>{entry.actor} · {entry.target}{entry.company ? ` · ${entry.company}` : ""}</span></div><time>{entry.time}</time></article>;
    })}</div>;
  }

  return (
    <main className="dashboard-shell">
      {mobileNavOpen && <button className="mobile-scrim" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation" />}
      <aside className={`dashboard-sidebar ${mobileNavOpen ? "sidebar-open" : ""}`}>
        <a className="dashboard-brand" href="/security/portal"><span className="dashboard-brand-mark"><ShieldCheck size={21} /></span><span>SmartIAM<small>SECURITY OPERATIONS</small></span></a>
        <div className="workspace-chip"><span className="workspace-symbol"><Shield size={15} /></span><span><strong>Security workspace</strong><small>Organization controls</small></span><ChevronDown size={14} /></div>
        <div className="nav-group-label">WORKSPACE</div>
        <nav className="dashboard-nav" aria-label="Security dashboard">
          {navigation.map(({ id, label, icon: Icon, badge }) => <button key={id} className={`nav-item ${section === id ? "nav-active" : ""}`} onClick={() => switchSection(id)}><Icon size={17} /><span>{label}</span>{badge && pendingRequests.length > 0 && <b>{pendingRequests.length}</b>}</button>)}
        </nav>
        <div className="nav-group-label tools-label">PREFERENCES</div>
        <nav className="dashboard-nav"><button className={`nav-item ${section === "settings" ? "nav-active" : ""}`} onClick={() => switchSection("settings")}><Settings size={17} /><span>Settings</span></button><button className={`nav-item ${section === "help" ? "nav-active" : ""}`} onClick={() => switchSection("help")}><HelpCircle size={17} /><span>Help & support</span></button></nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-security"><span><ShieldCheck size={17} /></span><div><strong>Security protected</strong><small>Workspace monitoring is on</small></div><span className="online-dot" /></div>
        <button className="sidebar-account" onClick={onLogout}><span className="account-avatar">{user.email?.slice(0, 1).toUpperCase() ?? "S"}</span><span className="account-info"><strong>Security Team</strong><small>{user.email}</small></span><LogOut size={15} /></button>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-topbar">
          <button className="mobile-menu-button" onClick={() => setMobileNavOpen(true)} aria-label="Open menu"><Menu size={19} /></button>
          <div className="breadcrumbs"><span>Security Team</span><ArrowRight size={13} /><strong>{sectionTitles[section][0]}</strong></div>
          <div className="topbar-tools"><label className="global-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search anything..." /><kbd>⌘ K</kbd></label><button className={`messages-shortcut ${section === "messages" ? "shortcut-active" : ""}`} onClick={() => { setNotificationOpen(false); switchSection("messages"); }} aria-label="Open messages"><MessageSquare size={17} /><span>Messages</span>{messagesData.messages.some((item) => item.unread) && <i />}</button><div className="notification-wrap"><button className={`notification-button ${notificationOpen ? "notification-active" : ""}`} onClick={() => setNotificationOpen((open) => !open)} aria-label="Notifications"><Bell size={18} />{data.notifications.filter((item) => !item.read).length > 0 && <i />}</button>{notificationOpen && <div className="notification-popover"><div className="popover-title"><span>Notifications</span><button onClick={() => setNotificationOpen(false)} aria-label="Close"><X size={15} /></button></div>{data.notifications.length ? data.notifications.map((item) => <div className="notification-item" key={item.id}><span className={`notification-dot dot-${item.tone}`} /><span><strong>{item.title}</strong><small>{item.message}</small><time>{item.time}</time></span></div>) : <p className="no-notifications">You're all caught up.</p>}</div>}</div><button className="topbar-avatar" title="My Profile" aria-label="My Profile" onClick={openSecurityProfile}><UserRound size={16} /></button></div>
        </header>

        <div className="dashboard-content">
          <div className="page-heading"><div><div className="page-eyebrow"><span className="online-dot" />SECURITY CENTER</div><h1>{sectionTitles[section][0]}</h1><p>{sectionTitles[section][1]}</p></div><div className="heading-actions"><span className="date-pill"><Clock3 size={14} /> Updated just now</span>{section === "requests" && <button className="filter-button" onClick={() => setSearch("")}><SlidersHorizontal size={15} /> Clear filters</button>}</div></div>

          {error && <div className="dashboard-error" role="alert"><AlertTriangle size={16} />{error}<button onClick={refreshDashboard}>Retry</button></div>}
          {mailNotice && <div className={`email-notice ${mailNotice.status === "sent" ? "email-sent" : "email-preview"}`}><span className="email-notice-icon">{mailNotice.status === "sent" ? <Check size={16} /> : <Bell size={16} />}</span><span><strong>{mailNotice.kind === "user" ? mailNotice.status === "sent" ? "Root User login emailed to Main Admin" : mailNotice.status === "failed" ? "Root User created; email delivery failed" : "No email sent (demo mode)" : mailNotice.status === "sent" ? "Decision email sent" : mailNotice.status === "failed" ? "Decision saved; email could not be sent" : "Decision notification generated (demo preview)"}</strong><small>{mailNotice.message}</small></span><button onClick={() => setMailNotice(null)} aria-label="Dismiss"><X size={15} /></button></div>}

          {loading ? <div className="dashboard-loading"><span className="security-spinner" />Loading security workspace…</div> : <>
            {section === "overview" && <>
              <div className="metric-grid">
                <article className="metric-card"><span className="metric-icon icon-requests"><FileClock size={18} /></span><span className="metric-label">Pending requests</span><div className="metric-value">{pendingRequests.length}<span className="metric-trend trend-warm"><ArrowUpRight size={13} /> Needs review</span></div><small>Access requests waiting for your decision</small></article>
                <article className="metric-card"><span className="metric-icon icon-grants"><LockKeyhole size={18} /></span><span className="metric-label">Active access grants</span><div className="metric-value">{activeGrants.length}<span className="metric-trend trend-good"><ArrowDownRight size={13} /> Monitored</span></div><small>Temporary permissions currently active</small></article>
                <article className="metric-card"><span className="metric-icon icon-expiry"><Clock3 size={18} /></span><span className="metric-label">Expiring in 24 hours</span><div className="metric-value">{expiringSoon}<span className="metric-trend trend-neutral">Requires attention</span></div><small>Access grants nearing expiration</small></article>
                <article className="metric-card score-card"><span className="metric-icon icon-score"><ShieldCheck size={18} /></span><span className="metric-label">Security score</span><div className="score-content"><div className="score-ring"><div><strong>92</strong><small>/100</small></div></div><span className="score-copy"><strong>Excellent</strong><small><span className="score-dot" />Controls are healthy</small></span></div><small>Based on access hygiene and review activity</small></article>
              </div>
              <div className="dashboard-panels"><section className="panel-card request-panel"><div className="panel-heading"><div><h2>Requests requiring review</h2><p>Review access requests from your organization</p></div><button className="text-link" onClick={() => switchSection("requests")}>View all <ArrowRight size={14} /></button></div>{renderRequests(filteredRequests.filter((request) => request.status === "Pending").slice(0, 4), true)}</section>
                <section className="panel-card posture-panel"><div className="panel-heading"><div><h2>Security posture</h2><p>Current access control health</p></div><button className="more-button" aria-label="More security posture options"><MoreHorizontal size={18} /></button></div><div className="posture-score"><div className="posture-track"><span /></div><div><strong>Strong protection</strong><span>92% of recommended controls are in place</span></div></div><div className="posture-checks"><div><span className="check-circle"><Check size={12} /></span><span>Temporary access is enforced</span><b>On</b></div><div><span className="check-circle"><Check size={12} /></span><span>Approval separation of duties</span><b>On</b></div><div><span className="check-circle"><Check size={12} /></span><span>Audit trail enabled</span><b>On</b></div><div><span className="check-circle check-attention"><AlertTriangle size={12} /></span><span>Multi-factor authentication</span><b className="attention-text">Review</b></div></div></section></div>
              <section className="panel-card activity-panel"><div className="panel-heading"><div><h2>Recent activity</h2><p>Latest events across your security workspace</p></div><button className="text-link" onClick={() => switchSection("audit")}>View audit log <ArrowRight size={14} /></button></div>{renderAudit(filteredAudit.slice(0, 4))}</section>
            </>}

            {section === "requests" && <section className="panel-card full-panel"><div className="panel-heading"><div><h2>All access requests <span className="count-chip">{filteredRequests.length}</span></h2><p>Search and review employee access requests</p></div><button className="filter-button" onClick={() => setSearch("")}><SlidersHorizontal size={15} /> Reset</button></div>{renderRequests(filteredRequests)}</section>}
            {section === "active" && <section className="panel-card full-panel"><div className="panel-heading"><div><h2>Current grants <span className="count-chip">{filteredGrants.length}</span></h2><p>Permissions currently provisioned and expiry monitored</p></div><span className="live-pill"><span className="online-dot" /> Live monitoring</span></div>{renderGrants(filteredGrants)}</section>}
            {section === "audit" && <section className="panel-card full-panel"><div className="panel-heading"><div><h2>Security activity <span className="count-chip">{filteredAudit.length}</span></h2><p>Immutable-style demo record of access decisions and changes</p></div><button className="filter-button" onClick={() => setSearch("")}><SlidersHorizontal size={15} /> Reset</button></div>{renderAudit(filteredAudit)}</section>}
            {section === "addUsers" && <div className="add-users-layout">
              <section className="add-user-card"><div className="add-user-heading"><span><UserPlus size={19} /></span><div><h2>Add Root User to user portal</h2><p>Security Team only · employee role, not an AWS account root user</p></div></div><form className="add-user-form" onSubmit={submitAddUser}>
<label>Employee full name<input value={newUser.name} onChange={(event) => setNewUser({ ...newUser, name: event.target.value })} placeholder="e.g. Priya Nair" autoComplete="name" required maxLength={100} /></label>
<label>Work email / login ID<input type="email" value={newUser.email} onChange={(event) => setNewUser({ ...newUser, email: event.target.value })} placeholder="name@company.com" autoComplete="email" required /></label>
<label>Company / institution<input value={newUser.company} onChange={(event) => setNewUser({ ...newUser, company: event.target.value })} placeholder="Company name" required maxLength={120} /></label>
<label>Main Admin email<input type="email" value={newUser.mainAdminEmail} onChange={(event) => setNewUser({ ...newUser, mainAdminEmail: event.target.value })} placeholder="admin@company.com" required /></label>
<div className="add-user-security-note"><LockKeyhole size={15} /><span>A random one-time password is generated. The employee must set a new password on first sign-in.</span></div>
<button className="add-user-submit" type="submit" disabled={addingUser}>{addingUser ? <><span className="button-spinner" />Creating account…</> : <><UserPlus size={15} />Generate login & email Main Admin</>}</button></form>
<p className="add-user-footer"><ShieldCheck size={13} /> The password is stored as a hash and shown only once if email delivery is not available.</p></section>
              <section className="add-users-side"><div className="panel-card added-users-card"><div className="panel-heading"><div><h2>Root User accounts <span className="count-chip">{data.users?.length || 0}</span></h2><p>Created by the Security Team</p></div><Users size={17} /></div>{data.users?.length ? <div className="added-user-list">{data.users.map((rootUser) => <article key={rootUser.email}><span className="added-user-avatar">{rootUser.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><span className="added-user-meta"><strong>{rootUser.name}</strong><small>{rootUser.email}</small><span>{rootUser.company} · Admin: {rootUser.mainAdminEmail}</span></span><span className="status-badge status-active"><span />Active</span></article>)}</div> : <div className="add-users-empty"><Users size={21} /><strong>No employee logins yet</strong><span>New Root User accounts will be listed here.</span></div>}</div><div className="add-user-help"><ShieldAlert size={16} /><span><strong>Account scope</strong><small>Root User is the SmartIAM employee role. It does not grant AWS account-root permissions. AWS access remains controlled by approved temporary grants.</small></span></div></section>
              {createdCredential && <section className="generated-credential-card"><div className="generated-credential-title"><span><KeyRound size={17} /></span><div><strong>One-time Root User credentials</strong><small>Share only with the Main Admin: {createdCredential.mainAdminEmail}</small></div><button onClick={() => setCreatedCredential(null)} aria-label="Dismiss credentials"><X size={15} /></button></div><div className="generated-credential-grid"><div><span>LOGIN ID</span><strong>{createdCredential.loginId}</strong><button onClick={() => copyRootCredential(createdCredential.loginId, "login")}>{credentialCopied === "login" ? <Check size={13} /> : <Copy size={13} />}{credentialCopied === "login" ? "Copied" : "Copy ID"}</button></div><div><span>ONE-TIME PASSWORD</span><strong>{createdCredential.password}</strong><button onClick={() => copyRootCredential(createdCredential.password, "password")}>{credentialCopied === "password" ? <Check size={13} /> : <Copy size={13} />}{credentialCopied === "password" ? "Copied" : "Copy password"}</button></div><div><span>ROOT USER PORTAL</span><strong>{createdCredential.portalUrl}</strong><button onClick={() => copyRootCredential(createdCredential.portalUrl, "portal")}>{credentialCopied === "portal" ? <Check size={13} /> : <Copy size={13} />}{credentialCopied === "portal" ? "Copied" : "Copy link"}</button></div></div><p><LockKeyhole size={13} /> Demo mode: SMTP is not configured, so no email was sent. Deliver these details to the Main Admin through a trusted channel.</p></section>}
            </div>}
            {section === "messages" && <section className="messages-workspace">
              <aside className="messages-inbox"><div className="inbox-heading"><div><h2>Secure inbox</h2><p>Direct conversations</p></div><span className="inbox-lock"><LockKeyhole size={14} /></span></div><label className="inbox-search"><Search size={14} /><input value={messageSearch} onChange={(event) => setMessageSearch(event.target.value)} placeholder="Find a person..." /></label><div className="contact-list">{visibleContacts.map((contact) => { const last = messagesData.messages.filter((message) => message.threadWith === contact.email).at(-1); const unread = messagesData.messages.filter((message) => message.threadWith === contact.email && message.unread).length; return <button key={contact.email} className={`contact-item ${selectedContact === contact.email ? "contact-selected" : ""}`} onClick={() => openConversation(contact.email)}><span className={`contact-avatar ${contact.role === "Main Admin" ? "contact-admin" : ""}`}>{contact.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><span className="contact-meta"><strong>{contact.name}</strong><small>{contact.role} · {contact.company}</small><span>{last?.subject || "Start a secure conversation"}</span></span><span className="contact-side"><time>{last?.time || ""}</time>{unread > 0 && <b>{unread}</b>}</span></button>; })}{visibleContacts.length === 0 && <div className="inbox-empty">No matching people.</div>}</div><div className="inbox-footnote"><ShieldCheck size={13} /> Messages stay within this workspace</div></aside>
              <section className="conversation-panel">{activeContact ? <><header className="conversation-header"><span className={`contact-avatar ${activeContact.role === "Main Admin" ? "contact-admin" : ""}`}>{activeContact.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><span className="conversation-person"><strong>{activeContact.name}</strong><small>{activeContact.role} · {activeContact.company}</small></span><span className="secure-conversation"><LockKeyhole size={12} /> Secure conversation</span></header><div className="conversation-thread">{activeThread.length ? activeThread.map((message) => <article key={message.id} className={`mail-message ${message.fromRole === "Security Team" ? "message-outgoing" : "message-incoming"}`}><div className="mail-message-top"><span>{message.fromName} <small>({message.fromRole})</small></span><time>{message.time}</time></div><div className="mail-subject"><Mail size={13} /><strong>{message.subject}</strong></div><p>{message.body}</p>{message.requestId && <span className="message-request-tag">Access request · {message.requestId}</span>}</article>) : <div className="conversation-empty"><span><MessageSquare size={22} /></span><strong>Start a secure conversation</strong><p>Send a message to {activeContact.name}, or discuss an access request with their team.</p></div>}</div><form className="message-composer" onSubmit={sendMessage}><div className="composer-recipient"><span>TO</span><strong>{activeContact.name}</strong><span className="recipient-role">{activeContact.role}</span><span className="recipient-email">{activeContact.email}</span></div><label className="composer-subject"><span>SUBJECT</span><input value={messageSubject} onChange={(event) => setMessageSubject(event.target.value)} placeholder="Add an email subject..." required /></label><textarea value={messageBody} onChange={(event) => setMessageBody(event.target.value)} placeholder={`Write a secure message to ${activeContact.name}...`} rows="3" required /><div className="composer-actions"><span><LockKeyhole size={12} /> Sent securely · SmartIAM internal messaging</span><button type="submit" disabled={messageSending || !messageSubject.trim() || !messageBody.trim()}><Send size={14} />{messageSending ? "Sending..." : "Send message"}</button></div></form></> : <div className="conversation-empty"><span><Users size={22} /></span><strong>Choose a conversation</strong><p>Select a Root User or Main Admin to begin a secure message.</p></div>}</section>
            </section>}
            {section === "settings" && <div className="settings-grid"><section className="panel-card settings-card"><div className="panel-heading"><div><h2>Workspace settings</h2><p>Security team profile and preferences</p></div><Settings size={18} /></div><div className="settings-row"><span><strong>Workspace</strong><small>Company security operations</small></span><b>SmartIAM Security</b></div><div className="settings-row"><span><strong>Signed in as</strong><small>Authenticated security account</small></span><b>{user.email}</b></div><div className="settings-row"><span><strong>Session protection</strong><small>HttpOnly secure session cookie</small></span><StatusBadge status="Active" /></div></section><section className="panel-card settings-card"><div className="panel-heading"><div><h2>Notification preferences</h2><p>Security alerts are enabled for this demo</p></div><Bell size={18} /></div><div className="preference-row"><span><strong>Access approval emails</strong><small>Notify requester after an approval decision</small></span><span className="toggle-on">ON</span></div><div className="preference-row"><span><strong>Expiry reminders</strong><small>Alert for grants expiring in 24 hours</small></span><span className="toggle-on">ON</span></div></section></div>}
            {section === "help" && <section className="panel-card help-panel"><div className="help-icon"><HelpCircle size={25} /></div><h2>How can we help?</h2><p>Use these guidelines to keep your organization's AWS access safe and auditable.</p><div className="help-topics"><article><ShieldAlert size={18} /><strong>Review high-risk requests</strong><span>Check resource sensitivity, permission scope, and business justification before approval.</span></article><article><Clock3 size={18} /><strong>Keep access time-bound</strong><span>Grant only the duration needed and verify upcoming expirations in Active access.</span></article><article><Users size={18} /><strong>Separation of duties</strong><span>Requesters must not approve their own requests. Decisions are recorded in the audit log.</span></article><article><Cloud size={18} /><strong>Email configuration</strong><span>Approval email uses SMTP when configured on the backend; otherwise a demo preview is generated.</span></article></div><div className="support-note"><strong>Need technical support?</strong><span>Contact your SmartIAM administrator or email support@smartiam.demo.</span></div></section>}
          </>}
        </div>
      </section>

      {profileOpen && <div className="modal-backdrop security-profile-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !profileWorking) setProfileOpen(false); }}><section className="security-profile-modal" role="dialog" aria-modal="true" aria-labelledby="security-profile-title"><header className="security-profile-heading"><span><UserRound size={18} /></span><div><h2 id="security-profile-title">My Profile</h2><p>Security Team account details and password</p></div><button onClick={() => setProfileOpen(false)} aria-label="Close profile" disabled={profileWorking}><X size={17} /></button></header>{profileError && <div className="root-error" role="alert">{profileError}</div>}{profileSuccess && <div className="root-success" role="status"><Check size={14} />{profileSuccess}</div>}<section className="security-profile-section"><h3>Personal information</h3><form className="security-profile-form" onSubmit={saveSecurityProfile}><label>Full name<input value={profileForm.name} onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })} autoComplete="name" required maxLength={100} /></label><label>Email / Login ID<input type="email" value={profileForm.email || user.email} readOnly aria-readonly="true" /><small>Managed through Security Team sign-in configuration.</small></label><label>Phone number<input type="tel" value={profileForm.phone} onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })} autoComplete="tel" placeholder="Add phone number" required maxLength={30} /></label><label>Country<input value={profileForm.country} onChange={(event) => setProfileForm({ ...profileForm, country: event.target.value })} autoComplete="country-name" placeholder="Add country" required maxLength={80} /></label><button className="profile-save-button" type="submit" disabled={profileWorking}>{profileWorking ? "Saving…" : <>Save profile <Check size={14} /></>}</button></form></section><section className="security-profile-section password-profile-section"><div className="security-password-title"><span><KeyRound size={16} /></span><div><h3>Password</h3><p>Use at least 12 characters with uppercase, lowercase, a number, and a symbol.</p></div></div><form className="security-profile-form" onSubmit={changeSecurityPassword}><label>Current password<input type="password" autoComplete="current-password" value={profileCurrentPassword} onChange={(event) => setProfileCurrentPassword(event.target.value)} required /></label><label>New password<input type="password" autoComplete="new-password" value={profileNewPassword} onChange={(event) => setProfileNewPassword(event.target.value)} required minLength={12} /></label><button className="profile-save-button" type="submit" disabled={profileWorking}>{profileWorking ? "Updating…" : "Change password"}</button></form></section><p className="security-profile-footnote"><LockKeyhole size={12} /> Your email stays as your login ID. Profile and password changes are authenticated.</p></section></div>}

      {decision && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !working) setDecision(null); }}><section className="decision-modal" role="dialog" aria-modal="true" aria-labelledby="decision-title"><button className="modal-close" onClick={() => setDecision(null)} aria-label="Close dialog"><X size={17} /></button><div className={`modal-icon ${decision.action === "approve" ? "modal-approve" : decision.action === "reject" ? "modal-reject" : "modal-view"}`}>{decision.action === "approve" ? <Check size={20} /> : decision.action === "reject" ? <XCircle size={20} /> : <FileClock size={20} />}</div><span className="modal-kicker">ACCESS REQUEST · {decision.request.id}</span><h2 id="decision-title">{decision.action === "approve" ? "Approve this request?" : decision.action === "reject" ? "Reject this request?" : "Request details"}</h2><p className="modal-description">{decision.action === "approve" ? "The requester will receive an email notification. Approval records are added to the audit log." : decision.action === "reject" ? "A rejection notification with your comment will be generated for the requester." : "This request has already been reviewed. Decision details are shown below."}</p><div className="modal-request-summary"><div><span>REQUESTER</span><strong>{decision.request.requester}</strong></div><div><span>RESOURCE</span><strong>{decision.request.resource} · {decision.request.permission}</strong></div><div><span>BUSINESS JUSTIFICATION</span><strong>{decision.request.reason}</strong></div><div><span>RISK & DURATION</span><strong><RiskBadge risk={decision.request.risk} /> <i>{decision.request.duration}</i></strong></div>{decision.request.comment && <div><span>REVIEW COMMENT</span><strong>{decision.request.comment}</strong></div>}</div>{decision.action !== "view" && <label className="comment-field">{decision.action === "approve" ? "Approval comment (optional)" : "Rejection reason"}<textarea value={decisionComment} onChange={(event) => setDecisionComment(event.target.value)} placeholder={decision.action === "approve" ? "Add context for the requester..." : "Explain why this request is rejected..."} rows="3" required={decision.action === "reject"} /></label>}{decision.action !== "view" && <div className="modal-actions"><button className="cancel-button" onClick={() => setDecision(null)} disabled={working}>Cancel</button><button className={`confirm-button ${decision.action === "reject" ? "confirm-reject" : ""}`} onClick={submitDecision} disabled={working || (decision.action === "reject" && !decisionComment.trim())}>{working ? "Saving..." : decision.action === "approve" ? "Approve & notify" : "Reject request"}</button></div>}</section></div>}
      {toast && <div className="dashboard-toast"><CheckCircleMark />{toast}<button onClick={() => setToast("")}><X size={14} /></button></div>}
    </main>
  );
}

function CheckCircleMark() { return <span className="toast-check"><Check size={13} /></span>; }

export default SecurityPortal;
