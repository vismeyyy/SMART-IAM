import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

const requiredEnv = ['SECURITY_TEAM_EMAIL', 'SECURITY_TEAM_PASSWORD', 'JWT_SECRET'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length) {
  console.error(`Missing required environment variables: ${missingEnv.join(', ')}. Copy .env.example to .env and configure it.`);
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be at least 32 characters long.');
  process.exit(1);
}
if (process.env.NODE_ENV === 'production' && process.env.SECURITY_TEAM_PASSWORD.length < 12) {
  console.error('SECURITY_TEAM_PASSWORD must be at least 12 characters long in production.');
  process.exit(1);
}

const app = express();
const port = Number(process.env.PORT || 4000);
const sessionCookieName = 'smartiam_security_session';
const rootSessionCookieName = 'smartiam_root_session';
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const configuredEmail = process.env.SECURITY_TEAM_EMAIL.trim().toLowerCase();
let configuredPasswordHash = await bcrypt.hash(process.env.SECURITY_TEAM_PASSWORD, 12);
const securityProfile = {
  name: process.env.SECURITY_TEAM_NAME || 'Security Team',
  phone: process.env.SECURITY_TEAM_PHONE || '',
  country: process.env.SECURITY_TEAM_COUNTRY || '',
};
const isProduction = process.env.NODE_ENV === 'production';
const smtpReady = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
const mailer = smtpReady ? nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 465),
  secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : Number(process.env.SMTP_PORT || 465) === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
}) : null;

const requests = [
  { id: 'IAM-2408', requester: 'Priya Nair', email: 'priya.nair@abc-tech.demo', company: 'ABC Technologies', resource: 'Production S3 · abc-prod-data', permission: 'Read only', risk: 'Medium', duration: '7 days', reason: 'Prepare the weekly production analytics report for the finance team.', status: 'Pending', submittedAt: 'Oct 12, 2026 · 10:42 AM', timeAgo: '12 min ago' },
  { id: 'IAM-2407', requester: 'Arun Kumar', email: 'arun.kumar@abc-tech.demo', company: 'ABC Technologies', resource: 'Lambda · invoice-reconciler', permission: 'Deploy', risk: 'High', duration: '4 hours', reason: 'Deploy the approved invoice reconciliation hotfix (release CHG-4812).', status: 'Pending', submittedAt: 'Oct 12, 2026 · 10:18 AM', timeAgo: '36 min ago' },
  { id: 'IAM-2406', requester: 'Meera Shah', email: 'meera.shah@northwind.demo', company: 'Northwind Labs', resource: 'CloudWatch · payments-api', permission: 'Read only', risk: 'Low', duration: '1 day', reason: 'Investigate elevated API latency reported by the on-call team.', status: 'Approved', submittedAt: 'Oct 12, 2026 · 09:04 AM', timeAgo: '1 hr ago', comment: 'Approved for incident investigation.' },
  { id: 'IAM-2405', requester: 'Ravi Menon', email: 'ravi.menon@northwind.demo', company: 'Northwind Labs', resource: 'IAM · shared-admin', permission: 'Administrator', risk: 'High', duration: '30 days', reason: 'Need broad permissions for routine operations.', status: 'Rejected', submittedAt: 'Oct 11, 2026 · 04:28 PM', timeAgo: 'Yesterday', comment: 'Please request only the specific services and actions required.' },
];

const grants = [
  { id: 'GR-1032', user: 'Kavya Iyer', company: 'ABC Technologies', resource: 'S3 · abc-prod-logs', permission: 'Read only', grantedBy: 'Security Team', expiresAt: Date.now() + 19 * 60 * 60 * 1000, status: 'Active' },
  { id: 'GR-1031', user: 'Meera Shah', company: 'Northwind Labs', resource: 'CloudWatch · payments-api', permission: 'Read only', grantedBy: 'Security Team', expiresAt: Date.now() + 22 * 60 * 60 * 1000, status: 'Active' },
  { id: 'GR-1029', user: 'Dev Patel', company: 'ABC Technologies', resource: 'S3 · abc-prod-data', permission: 'Read only', grantedBy: 'Security Team', expiresAt: Date.now() + 4 * 24 * 60 * 60 * 1000, status: 'Active' },
];

const audit = [
  { id: 'AU-201', actor: 'Security Team', action: 'Access request approved', target: 'Meera Shah · CloudWatch payments-api', company: 'Northwind Labs', time: '1 hr ago', tone: 'approved' },
  { id: 'AU-200', actor: 'Security Team', action: 'Access request rejected', target: 'Ravi Menon · IAM shared-admin', company: 'Northwind Labs', time: 'Yesterday', tone: 'rejected' },
  { id: 'AU-199', actor: 'System', action: 'Access expiry reminder created', target: 'Dev Patel · S3 abc-prod-data', company: 'ABC Technologies', time: 'Yesterday', tone: 'expiry' },
  { id: 'AU-198', actor: 'Security Team', action: 'Security workspace sign-in', target: configuredEmail, company: 'SmartIAM', time: 'Today', tone: 'default' },
];

const notifications = [
  { id: 'NT-1', title: 'High-risk request needs review', message: 'Arun Kumar requested deploy access to a production Lambda function.', time: '36 min ago', tone: 'amber', read: false },
  { id: 'NT-2', title: 'Access expires soon', message: 'Kavya Iyer’s S3 grant expires in 19 hours.', time: '1 hr ago', tone: 'blue', read: false },
  { id: 'NT-3', title: 'Request approved', message: 'Meera Shah was granted temporary CloudWatch read access.', time: '1 hr ago', tone: 'green', read: true },
];

const contacts = [
  { name: 'Priya Nair', email: 'priya.nair@abc-tech.demo', role: 'Root User', company: 'ABC Technologies' },
  { name: 'Arun Kumar', email: 'arun.kumar@abc-tech.demo', role: 'Root User', company: 'ABC Technologies' },
  { name: 'Meera Shah', email: 'meera.shah@northwind.demo', role: 'Root User', company: 'Northwind Labs' },
  { name: 'Vismitha R', email: 'admin@abc-tech.demo', role: 'Main Admin', company: 'ABC Technologies' },
  { name: 'Northwind Admin', email: 'admin@northwind.demo', role: 'Main Admin', company: 'Northwind Labs' },
];

const messages = [
  { id: 'MSG-1001', threadWith: 'priya.nair@abc-tech.demo', fromName: 'Priya Nair', fromRole: 'Root User', fromEmail: 'priya.nair@abc-tech.demo', subject: 'Production S3 read access · IAM-2408', body: 'I submitted a request for read-only access to the production analytics bucket. Please let me know if you need any additional information.', time: 'Today · 10:42 AM', requestId: 'IAM-2408', unread: true },
  { id: 'MSG-1002', threadWith: 'admin@abc-tech.demo', fromName: 'Vismitha R', fromRole: 'Main Admin', fromEmail: 'admin@abc-tech.demo', subject: 'Security team coordination', body: 'Please let me know if your team needs any additional employee details for the current access reviews.', time: 'Today · 9:30 AM', unread: false },
];

const rootUsers = new Map();

function addThreadMessage(contact, { fromName = 'Security Team', fromRole = 'Security Team', fromEmail = configuredEmail, subject, body, requestId = null }) {
  const message = {
    id: `MSG-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    threadWith: contact.email,
    fromName,
    fromRole,
    fromEmail,
    subject,
    body,
    time: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
    requestId,
    unread: fromRole !== 'Security Team',
  };
  messages.push(message);
  return message;
}

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: frontendOrigin, credentials: true }));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many sign-in attempts. Try again in 15 minutes.' },
});

const rootLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many sign-in attempts. Try again in 15 minutes.' },
});

function createSessionToken() {
  return jwt.sign(
    { sub: configuredEmail, role: 'security_team' },
    process.env.JWT_SECRET,
    { expiresIn: '8h', issuer: 'smartiam-api', audience: 'smartiam-security-portal' },
  );
}

function requireSecurityTeam(req, res, next) {
  const token = req.cookies[sessionCookieName];
  if (!token) return res.status(401).json({ message: 'Sign-in required.' });

  try {
    const session = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'smartiam-api',
      audience: 'smartiam-security-portal',
    });
    if (session.role !== 'security_team') return res.status(403).json({ message: 'Security Team access required.' });
    req.securityUser = { email: session.sub, role: session.role };
    return next();
  } catch {
    return res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
  }
}

function createRootSession(email) {
  return jwt.sign(
    { sub: email, role: 'root_user' },
    process.env.JWT_SECRET,
    { expiresIn: '8h', issuer: 'smartiam-api', audience: 'smartiam-root-portal' },
  );
}

function requireRootUser(req, res, next) {
  const token = req.cookies[rootSessionCookieName];
  if (!token) return res.status(401).json({ message: 'Root User sign-in required.' });
  try {
    const session = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'smartiam-api',
      audience: 'smartiam-root-portal',
    });
    const account = rootUsers.get(session.sub);
    if (session.role !== 'root_user' || !account || !account.active) {
      return res.status(403).json({ message: 'Root User account is not active.' });
    }
    req.rootUser = { email: account.email, name: account.name, company: account.company, role: 'root_user', mustChangePassword: account.mustChangePassword };
    return next();
  } catch {
    return res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
  }
}

function generateTemporaryPassword() {
  return `${randomBytes(18).toString('base64url')}aA7!`;
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/api/security/auth/login', loginLimiter, async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const validPassword = await bcrypt.compare(password, configuredPasswordHash);

  if (!email || email !== configuredEmail || !validPassword) {
    return res.status(401).json({ message: 'Email or password is incorrect.' });
  }

  res.cookie(sessionCookieName, createSessionToken(), {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/api/security',
    maxAge: 8 * 60 * 60 * 1000,
  });
  return res.json({ user: { email: configuredEmail, role: 'security_team' } });
});

app.get('/api/security/auth/me', requireSecurityTeam, (req, res) => {
  res.json({ user: { ...req.securityUser, ...securityProfile } });
});

app.get('/api/security/profile', requireSecurityTeam, (_req, res) => {
  res.json({ profile: { email: configuredEmail, ...securityProfile } });
});

app.patch('/api/security/profile', requireSecurityTeam, (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 100) : '';
  const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim().slice(0, 30) : '';
  const country = typeof req.body?.country === 'string' ? req.body.country.trim().slice(0, 80) : '';
  if (!name || !phone || !country) {
    return res.status(400).json({ message: 'Name, phone number, and country are required.' });
  }
  Object.assign(securityProfile, { name, phone, country });
  audit.unshift({
    id: `AU-${Date.now()}`,
    actor: configuredEmail,
    action: 'Security Team profile updated',
    target: `${name} · profile details`,
    company: 'SmartIAM',
    time: 'Just now',
    tone: 'default',
  });
  return res.json({ profile: { email: configuredEmail, ...securityProfile } });
});

app.post('/api/security/profile/password', requireSecurityTeam, async (req, res) => {
  const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
  const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
  if (!(await bcrypt.compare(currentPassword, configuredPasswordHash))) {
    return res.status(401).json({ message: 'Current password is incorrect.' });
  }
  if (newPassword.length < 12 || !/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
    return res.status(400).json({ message: 'Use at least 12 characters with uppercase, lowercase, a number, and a symbol.' });
  }
  configuredPasswordHash = await bcrypt.hash(newPassword, 12);
  audit.unshift({
    id: `AU-${Date.now()}`,
    actor: configuredEmail,
    action: 'Security Team password changed',
    target: configuredEmail,
    company: 'SmartIAM',
    time: 'Just now',
    tone: 'default',
  });
  return res.json({ success: true, message: 'Security Team password updated.' });
});

app.post('/api/security/users', requireSecurityTeam, async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 100) : '';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const company = typeof req.body?.company === 'string' ? req.body.company.trim().slice(0, 120) : '';
  const mainAdminEmail = typeof req.body?.mainAdminEmail === 'string' ? req.body.mainAdminEmail.trim().toLowerCase() : '';
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!name || !company || !validEmail.test(email) || !validEmail.test(mainAdminEmail)) {
    return res.status(400).json({ message: 'Enter the Root User name, work email, company, and a valid Main Admin email.' });
  }
  if (rootUsers.has(email)) return res.status(409).json({ message: 'A Root User account already exists for this email.' });

  const temporaryPassword = generateTemporaryPassword();
  const account = {
    email,
    name,
    company,
    mainAdminEmail,
    passwordHash: await bcrypt.hash(temporaryPassword, 12),
    mustChangePassword: true,
    active: true,
    createdAt: new Date().toISOString(),
  };
  rootUsers.set(email, account);
  const contact = { name, email, role: 'Root User', company };
  if (!contacts.some((item) => item.email.toLowerCase() === email)) contacts.unshift(contact);
  let mainAdminContact = contacts.find((item) => item.email.toLowerCase() === mainAdminEmail);
  if (!mainAdminContact) {
    mainAdminContact = { name: `${company} Main Admin`, email: mainAdminEmail, role: 'Main Admin', company };
    contacts.unshift(mainAdminContact);
  }
  const subject = `SmartIAM Root User login details · ${name}`;
  const portalUrl = process.env.ROOT_PORTAL_URL || 'http://localhost:5173/root/login';
  const credentialEmailText = [
    `Hello ${company} Main Admin,`,
    '',
    `A SmartIAM employee account was created for ${name}.`,
    `Company: ${company}`,
    `Root User login ID: ${email}`,
    `One-time password: ${temporaryPassword}`,
    `Sign in: ${portalUrl}`,
    '',
    'The Root User must create a personal password at first sign-in. “Root User” is the SmartIAM employee role, not an AWS account root user.',
  ].join('\n');

  audit.unshift({
    id: `AU-${Date.now()}`,
    actor: req.securityUser.email,
    action: 'Root User login created',
    target: `${name} · ${email}`,
    company,
    time: 'Just now',
    tone: 'default',
  });
  notifications.unshift({
    id: `NT-${Date.now()}`,
    title: 'Root User login created',
    message: `${name} · login details prepared for ${mainAdminEmail}.`,
    time: 'Just now',
    tone: 'blue',
    read: false,
  });
  addThreadMessage(mainAdminContact, {
    subject: 'SmartIAM employee login created',
    body: `A Root User employee account was created for ${name}. Login ID: ${email}. The one-time sign-in details are intended for you, the company Main Admin, to share securely with the employee. The employee must replace the temporary password at first sign-in.`,
  });

  let emailDelivery;
  if (!mailer) {
    emailDelivery = { status: 'preview', to: mainAdminEmail, message: `Demo mode: no email sent. Configure SMTP to deliver the one-time login details to ${mainAdminEmail}.` };
  } else {
    try {
      await mailer.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to: mainAdminEmail, subject, text: credentialEmailText });
      emailDelivery = { status: 'sent', to: mainAdminEmail, message: `One-time login details sent to ${mainAdminEmail}.` };
    } catch (error) {
      console.error('Unable to send Root User credentials to Main Admin:', error.message);
      emailDelivery = { status: 'failed', to: mainAdminEmail, message: `Account created, but email delivery to ${mainAdminEmail} failed. Check the SMTP settings.` };
    }
  }

  const user = { name, email, company, mainAdminEmail, createdAt: account.createdAt, active: true };
  const temporaryCredential = emailDelivery.status === 'sent'
    ? null
    : { loginId: email, password: temporaryPassword, mainAdminEmail, portalUrl };
  return res.status(201).json({ user, emailDelivery, temporaryCredential });
});

app.post('/api/root/auth/login', rootLoginLimiter, async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const account = rootUsers.get(email);
  if (!account || !account.active || !(await bcrypt.compare(password, account.passwordHash))) {
    return res.status(401).json({ message: 'Email or password is incorrect, or your account has not been added by the Security Team.' });
  }
  res.cookie(rootSessionCookieName, jwt.sign(
    { sub: email, role: 'root_user' },
    process.env.JWT_SECRET,
    { expiresIn: '8h', issuer: 'smartiam-api', audience: 'smartiam-root-portal' },
  ), {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/api/root',
    maxAge: 8 * 60 * 60 * 1000,
  });
  return res.json({ user: { email, name: account.name, company: account.company, role: 'root_user', mustChangePassword: account.mustChangePassword } });
});

app.get('/api/root/auth/me', requireRootUser, (req, res) => {
  res.json({ user: req.rootUser });
});

app.post('/api/root/auth/password', requireRootUser, async (req, res) => {
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
  const account = rootUsers.get(req.rootUser.email);
  if (!account.mustChangePassword && !(await bcrypt.compare(currentPassword, account.passwordHash))) {
    return res.status(401).json({ message: 'Current password is incorrect.' });
  }
  if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return res.status(400).json({ message: 'Use at least 12 characters with uppercase, lowercase, a number, and a symbol.' });
  }
  account.passwordHash = await bcrypt.hash(password, 12);
  account.mustChangePassword = false;
  return res.json({ user: { email: account.email, name: account.name, company: account.company, role: 'root_user', mustChangePassword: false } });
});

app.get('/api/root/portal', requireRootUser, (req, res) => {
  if (req.rootUser.mustChangePassword) {
    return res.status(403).json({ message: 'Replace your one-time password before opening the employee portal.' });
  }
  const ownRequests = requests.filter((request) => request.email.toLowerCase() === req.rootUser.email.toLowerCase());
  const ownGrants = grants.filter((grant) => grant.email?.toLowerCase() === req.rootUser.email.toLowerCase() && grant.status === 'Active');
  return res.json({ user: req.rootUser, requests: ownRequests, grants: ownGrants });
});

app.post('/api/root/auth/logout', (_req, res) => {
  res.clearCookie(rootSessionCookieName, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/api/root',
  });
  return res.status(204).end();
});

app.get('/api/security/dashboard', requireSecurityTeam, (_req, res) => {
  const currentTime = Date.now();
  const dashboardGrants = grants.map((grant) => {
    const hoursRemaining = Math.max(0, Math.ceil((grant.expiresAt - currentTime) / (60 * 60 * 1000)));
    const expiresIn = hoursRemaining >= 24
      ? `${Math.ceil(hoursRemaining / 24)} days`
      : `${hoursRemaining} hours`;
    return { ...grant, hoursRemaining, expiresIn };
  });
  const users = Array.from(rootUsers.values()).map(({ name, email, company, mainAdminEmail, createdAt, active }) => ({ name, email, company, mainAdminEmail, createdAt, active }));
  res.json({ requests, grants: dashboardGrants, audit, notifications, users });
});

app.get('/api/security/messages', requireSecurityTeam, (_req, res) => {
  res.json({ contacts, messages });
});

app.post('/api/security/messages', requireSecurityTeam, async (req, res) => {
  const to = typeof req.body?.to === 'string' ? req.body.to.trim().toLowerCase() : '';
  const subject = typeof req.body?.subject === 'string' ? req.body.subject.trim().slice(0, 160) : '';
  const body = typeof req.body?.body === 'string' ? req.body.body.trim().slice(0, 5000) : '';
  const contact = contacts.find((item) => item.email.toLowerCase() === to);
  if (!contact) return res.status(400).json({ message: 'Choose a registered Root User or Main Admin.' });
  if (!subject || !body) return res.status(400).json({ message: 'A subject and message are required.' });

  const message = addThreadMessage(contact, { subject, body });
  let delivery = { status: 'internal', message: 'Message saved to the SmartIAM secure inbox.' };
  if (mailer) {
    try {
      await mailer.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to: contact.email, subject: `[SmartIAM] ${subject}`, text: `From: Security Team (${configuredEmail})\nTo: ${contact.name} (${contact.role})\n\n${body}\n\nReply in your SmartIAM workspace.` });
      delivery = { status: 'sent', message: `Email notification delivered to ${contact.email}.` };
    } catch (error) {
      console.error('Unable to send direct message email:', error.message);
      delivery = { status: 'failed', message: 'Message is saved in the secure inbox, but its email notification could not be delivered.' };
    }
  }
  return res.status(201).json({ message, delivery });
});

app.post('/api/security/messages/read', requireSecurityTeam, (req, res) => {
  const to = typeof req.body?.threadWith === 'string' ? req.body.threadWith.trim().toLowerCase() : '';
  if (!contacts.some((contact) => contact.email.toLowerCase() === to)) {
    return res.status(400).json({ message: 'Choose a registered conversation.' });
  }
  messages.forEach((message) => {
    if (message.threadWith === to && message.fromRole !== 'Security Team') message.unread = false;
  });
  return res.json({ success: true });
});

app.post('/api/security/requests/:id/decision', requireSecurityTeam, async (req, res) => {
  const { decision, comment } = req.body || {};
  const normalizedComment = typeof comment === 'string' ? comment.trim().slice(0, 1000) : '';
  if (!['approve', 'reject'].includes(decision)) {
    return res.status(400).json({ message: 'Choose approve or reject.' });
  }
  if (decision === 'reject' && !normalizedComment) {
    return res.status(400).json({ message: 'A reason is required when rejecting a request.' });
  }

  const request = requests.find((item) => item.id === req.params.id);
  if (!request) return res.status(404).json({ message: 'Access request not found.' });
  if (request.status !== 'Pending') return res.status(409).json({ message: 'This request has already been reviewed.' });
  if (request.email.toLowerCase() === req.securityUser.email.toLowerCase()) {
    return res.status(403).json({ message: 'You cannot approve your own access request.' });
  }

  request.status = decision === 'approve' ? 'Approved' : 'Rejected';
  request.comment = normalizedComment || (decision === 'approve' ? 'Approved by Security Team.' : 'Request rejected.');
  request.reviewedAt = new Date().toISOString();
  const durationMatch = request.duration.match(/(\d+)\s*(hour|day)/i);
  const durationValue = durationMatch ? Number(durationMatch[1]) : 1;
  const durationHours = durationMatch?.[2].toLowerCase().startsWith('day') ? durationValue * 24 : durationValue;
  const expiryDate = decision === 'approve' ? new Date(Date.now() + durationHours * 60 * 60 * 1000) : null;

  if (decision === 'approve') {
    grants.unshift({
      id: `GR-${Date.now().toString().slice(-6)}`,
      user: request.requester,
      email: request.email.toLowerCase(),
      company: request.company,
      resource: request.resource,
      permission: request.permission,
      grantedBy: 'Security Team',
      expiresAt: expiryDate.getTime(),
      status: 'Active',
    });
  }

  const approved = decision === 'approve';
  const actionLabel = approved ? 'approved' : 'rejected';
  audit.unshift({
    id: `AU-${Date.now()}`,
    actor: req.securityUser.email,
    action: `Access request ${actionLabel}`,
    target: `${request.requester} · ${request.resource}`,
    company: request.company,
    time: 'Just now',
    tone: approved ? 'approved' : 'rejected',
  });

  const notification = {
    id: `NT-${Date.now()}`,
    title: `Access request ${actionLabel}`,
    message: `${request.requester} · ${request.resource}. ${request.comment}`,
    time: 'Just now',
    tone: approved ? 'green' : 'amber',
    read: false,
  };
  notifications.unshift(notification);

  const subject = `SmartIAM access request ${actionLabel}: ${request.id}`;
  const requestContact = contacts.find((contact) => contact.email.toLowerCase() === request.email.toLowerCase());
  const mainAdmin = contacts.find((contact) => contact.role === 'Main Admin' && contact.company === request.company);
  const emailText = [
    `Hello ${request.requester},`,
    '',
    `Your SmartIAM access request (${request.id}) has been ${actionLabel}.`,
    `Resource: ${request.resource}`,
    `Permission: ${request.permission}`,
    `Requested duration: ${request.duration}`,
    `Security Team comment: ${request.comment}`,
    ...(expiryDate ? [`Access expiry: ${expiryDate.toUTCString()}`] : []),
    '',
    'This is an automated SmartIAM notification.',
  ].join('\n');

  const internalMessage = [
    `Access request ${request.id} has been ${actionLabel}.`,
    `Requester: ${request.requester} (${request.email})`,
    `Resource: ${request.resource}`,
    `Permission: ${request.permission}`,
    `Duration: ${request.duration}`,
    `Security Team comment: ${request.comment}`,
    ...(expiryDate ? [`Access expiry: ${expiryDate.toUTCString()}`] : []),
  ].join('\n');
  if (requestContact) addThreadMessage(requestContact, { subject, body: internalMessage, requestId: request.id });
  if (mainAdmin) addThreadMessage(mainAdmin, { subject: `Team update · ${request.id} ${actionLabel}`, body: internalMessage, requestId: request.id });

  let email;
  if (!mailer) {
    email = {
      status: 'preview',
      message: `Decision messages are in SmartIAM for ${request.email}${mainAdmin ? ` and ${mainAdmin.email}` : ''}. Configure SMTP_HOST, SMTP_USER, and SMTP_PASS to send email notifications.`,
      to: [request.email, ...(mainAdmin ? [mainAdmin.email] : [])],
      subject,
      text: emailText,
    };
  } else {
    try {
      const recipients = [request.email, ...(mainAdmin ? [mainAdmin.email] : [])];
      await Promise.all(recipients.map((recipient) => mailer.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to: recipient, subject, text: emailText })));
      email = { status: 'sent', message: `Decision notification delivered to ${recipients.join(' and ')}.`, to: recipients, subject };
    } catch (error) {
      console.error('Unable to send access decision email:', error.message);
      email = { status: 'failed', message: `Decision saved, but delivery to ${request.email} failed. Check the backend SMTP settings.`, to: request.email, subject };
    }
  }

  return res.json({ request, email });
});

app.post('/api/security/auth/logout', (_req, res) => {
  res.clearCookie(sessionCookieName, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/api/security',
  });
  return res.status(204).end();
});

app.use((error, _req, res, _next) => {
  console.error('Unhandled API error:', error);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

app.listen(port, () => {
  console.log(`SmartIAM Security API listening on http://localhost:${port}`);
});
