import 'dotenv/config';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import express from 'express';
import nodemailer from 'nodemailer';
import { WebSocket, WebSocketServer } from 'ws';
import {
  INITIAL_ACCOUNTS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_CAMPAIGN_CONFIG,
  INITIAL_DOSSIERS,
  INITIAL_NOTIFICATIONS,
  INITIAL_SUBJECTS,
  INITIAL_SUPPORT_TICKETS,
} from './src/data/demoData.ts';
import { reconcileDeadlinesAndReminders } from './src/services/notificationEngine.ts';
import type {
  AuditLogEntry,
  CampaignConfig,
  CandidateDossier,
  EmailServiceStatus,
  NotificationItem,
  PublicAnnouncement,
  SharedPlatformState,
  SupportTicket,
  ThesisSubject,
  UserAccount,
} from './src/types/gcd.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'gcd_usmba.sqlite');

fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS kv_store (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    position INTEGER NOT NULL,
    payload TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY,
    position INTEGER NOT NULL,
    payload TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS dossiers (
    id TEXT PRIMARY KEY,
    position INTEGER NOT NULL,
    payload TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    recipient_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    dedupe_key TEXT,
    payload TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS support_tickets (
    id TEXT PRIMARY KEY,
    position INTEGER NOT NULL,
    payload TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY,
    position INTEGER NOT NULL,
    payload TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    payload TEXT NOT NULL
  );
`);

function buildSeedState(): SharedPlatformState {
  const base: SharedPlatformState = {
    accounts: structuredClone(INITIAL_ACCOUNTS),
    subjects: structuredClone(INITIAL_SUBJECTS),
    dossiers: structuredClone(INITIAL_DOSSIERS),
    notifications: structuredClone(INITIAL_NOTIFICATIONS),
    campaignConfig: structuredClone(INITIAL_CAMPAIGN_CONFIG),
    supportTickets: structuredClone(INITIAL_SUPPORT_TICKETS),
    announcements: structuredClone(INITIAL_ANNOUNCEMENTS),
    auditLogs: structuredClone(INITIAL_AUDIT_LOGS),
  };
  const reconciled = reconcileDeadlinesAndReminders(base);
  return reconciled.state;
}

function saveStateToDb(state: SharedPlatformState, revision: number): void {
  const now = new Date().toISOString();
  db.exec('BEGIN IMMEDIATE');
  try {
    const upsertKv = db.prepare(
      'INSERT INTO kv_store (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
    );
    upsertKv.run('campaignConfig', JSON.stringify(state.campaignConfig), now);
    upsertKv.run('revision', String(revision), now);

    db.exec('DELETE FROM accounts');
    const insAccount = db.prepare('INSERT INTO accounts (id, position, payload) VALUES (?, ?, ?)');
    state.accounts.forEach((item, idx) => {
      insAccount.run(item.id, idx, JSON.stringify(item));
    });

    db.exec('DELETE FROM subjects');
    const insSubject = db.prepare('INSERT INTO subjects (id, position, payload) VALUES (?, ?, ?)');
    state.subjects.forEach((item, idx) => {
      insSubject.run(item.id, idx, JSON.stringify(item));
    });

    db.exec('DELETE FROM dossiers');
    const insDossier = db.prepare('INSERT INTO dossiers (id, position, payload) VALUES (?, ?, ?)');
    state.dossiers.forEach((item, idx) => {
      insDossier.run(item.id, idx, JSON.stringify(item));
    });

    db.exec('DELETE FROM notifications');
    const insNotif = db.prepare(
      'INSERT INTO notifications (id, recipient_id, created_at, dedupe_key, payload) VALUES (?, ?, ?, ?, ?)'
    );
    state.notifications.forEach((item) => {
      insNotif.run(
        item.id,
        item.recipientAccountId,
        item.createdAt,
        item.dedupeKey ?? null,
        JSON.stringify(item)
      );
    });

    db.exec('DELETE FROM support_tickets');
    const insTicket = db.prepare(
      'INSERT INTO support_tickets (id, position, payload) VALUES (?, ?, ?)'
    );
    state.supportTickets.forEach((item, idx) => {
      insTicket.run(item.id, idx, JSON.stringify(item));
    });

    db.exec('DELETE FROM announcements');
    const insAnn = db.prepare(
      'INSERT INTO announcements (id, position, payload) VALUES (?, ?, ?)'
    );
    state.announcements.forEach((item, idx) => {
      insAnn.run(item.id, idx, JSON.stringify(item));
    });

    db.exec('DELETE FROM audit_logs');
    const insAudit = db.prepare('INSERT INTO audit_logs (id, timestamp, payload) VALUES (?, ?, ?)');
    state.auditLogs.slice(0, 250).forEach((item) => {
      insAudit.run(item.id, item.timestamp, JSON.stringify(item));
    });

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

function loadStateFromDb(): { state: SharedPlatformState; revision: number } {
  const cfgRow = db
    .prepare('SELECT value FROM kv_store WHERE key = ?')
    .get('campaignConfig') as { value: string } | undefined;

  if (!cfgRow) {
    const seeded = buildSeedState();
    saveStateToDb(seeded, 1);
    return { state: seeded, revision: 1 };
  }

  const revRow = db
    .prepare('SELECT value FROM kv_store WHERE key = ?')
    .get('revision') as { value: string } | undefined;
  const revision = Number.parseInt(revRow?.value || '1', 10) || 1;

  const parseRows = <T>(sql: string): T[] => {
    const rows = db.prepare(sql).all() as Array<{ payload: string }>;
    return rows.map((r) => JSON.parse(r.payload) as T);
  };

  const rawConfig = JSON.parse(cfgRow.value) as CampaignConfig;
  const campaignConfig: CampaignConfig = {
    ...rawConfig,
    deadlinePolicy: rawConfig.deadlinePolicy || {
      defaultCorrectionDays: 7,
      reminderDaysBefore: [7, 3, 1],
      autoRejectOnExpiredCorrection: false,
    },
  };

  const loaded: SharedPlatformState = {
    accounts: parseRows<UserAccount>('SELECT payload FROM accounts ORDER BY position ASC'),
    subjects: parseRows<ThesisSubject>('SELECT payload FROM subjects ORDER BY position ASC'),
    dossiers: parseRows<CandidateDossier>('SELECT payload FROM dossiers ORDER BY position ASC'),
    notifications: parseRows<NotificationItem>(
      'SELECT payload FROM notifications ORDER BY created_at DESC'
    ),
    campaignConfig,
    supportTickets: parseRows<SupportTicket>(
      'SELECT payload FROM support_tickets ORDER BY position ASC'
    ),
    announcements: parseRows<PublicAnnouncement>(
      'SELECT payload FROM announcements ORDER BY position ASC'
    ),
    auditLogs: parseRows<AuditLogEntry>('SELECT payload FROM audit_logs ORDER BY timestamp DESC'),
  };

  const reconciled = reconcileDeadlinesAndReminders(loaded);
  if (reconciled.changed) {
    const nextRev = revision + 1;
    saveStateToDb(reconciled.state, nextRev);
    return { state: reconciled.state, revision: nextRev };
  }

  return { state: loaded, revision };
}

function getEmailServiceStatus(): EmailServiceStatus {
  const host = process.env.SMTP_HOST?.trim() || '';
  const user = process.env.SMTP_USER?.trim() || '';
  const pass = process.env.SMTP_PASS?.trim() || '';
  const fromAddress = process.env.SMTP_FROM?.trim() || user || null;
  const configured = Boolean(host && user && pass);

  return {
    configured,
    host: configured ? host : null,
    fromAddress: configured ? fromAddress : null,
  };
}

async function dispatchRealEmailsIfConfigured(
  state: SharedPlatformState,
  notificationIds: string[]
): Promise<SharedPlatformState> {
  if (!notificationIds || notificationIds.length === 0) return state;

  const idSet = new Set(notificationIds);
  const emailStatus = getEmailServiceStatus();

  if (!emailStatus.configured) {
    return {
      ...state,
      notifications: state.notifications.map((n) =>
        idSet.has(n.id) ? { ...n, emailChannelStatus: 'skipped_unconfigured' } : n
      ),
    };
  }

  const port = Number.parseInt(process.env.SMTP_PORT || '587', 10) || 587;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST!.trim(),
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER!.trim(),
      pass: process.env.SMTP_PASS!.trim(),
    },
  });

  const updatedNotifications: NotificationItem[] = [];
  for (const notif of state.notifications) {
    if (!idSet.has(notif.id)) {
      updatedNotifications.push(notif);
      continue;
    }

    const account = state.accounts.find((a) => a.id === notif.recipientAccountId);
    if (!account?.email || account.emailNotificationsOptIn === false) {
      updatedNotifications.push({ ...notif, emailChannelStatus: 'not_requested' });
      continue;
    }

    try {
      await transporter.sendMail({
        from: emailStatus.fromAddress || process.env.SMTP_USER!.trim(),
        to: account.email,
        subject: `[GCD USMBA] ${notif.title}`,
        text: `${notif.title}\n\n${notif.message}\n${
          notif.deadline ? `\nDate limite : ${notif.deadline}\n` : ''
        }\n— Plateforme Gestion du Cycle Doctoral (USMBA Fès)`,
      });
      updatedNotifications.push({ ...notif, emailChannelStatus: 'sent' });
    } catch {
      updatedNotifications.push({ ...notif, emailChannelStatus: 'failed' });
    }
  }

  return {
    ...state,
    notifications: updatedNotifications,
  };
}

let { state: currentState, revision: currentRevision } = loadStateFromDb();

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  app.use(express.json({ limit: '5mb' }));

  const wss = new WebSocketServer({ server: httpServer, path: '/api/ws' });

  const broadcastState = (sourceClientId?: string) => {
    const payload = JSON.stringify({
      type: 'state:updated',
      state: currentState,
      emailStatus: getEmailServiceStatus(),
      revision: currentRevision,
      sourceClientId: sourceClientId || null,
    });

    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  };

  wss.on('connection', (socket) => {
    socket.send(
      JSON.stringify({
        type: 'state:init',
        state: currentState,
        emailStatus: getEmailServiceStatus(),
        revision: currentRevision,
      })
    );
  });

  // Periodic server-side deadline & reminder sweep
  setInterval(() => {
    const res = reconcileDeadlinesAndReminders(currentState);
    if (res.changed) {
      currentState = res.state;
      currentRevision += 1;
      saveStateToDb(currentState, currentRevision);
      broadcastState('system-scheduler');
    }
  }, 5 * 60 * 1000).unref();

  app.get('/api/state', (_req, res) => {
    res.json({
      ok: true,
      state: currentState,
      emailStatus: getEmailServiceStatus(),
      revision: currentRevision,
    });
  });

  app.post('/api/sync', async (req, res) => {
    try {
      const body = req.body as {
        state?: SharedPlatformState;
        clientId?: string;
        emailNotificationIds?: string[];
      };

      if (
        !body?.state ||
        !Array.isArray(body.state.accounts) ||
        !Array.isArray(body.state.dossiers) ||
        !Array.isArray(body.state.subjects) ||
        !Array.isArray(body.state.notifications)
      ) {
        res.status(400).json({ ok: false, error: 'Payload d’état invalide.' });
        return;
      }

      const normalizedIncoming: SharedPlatformState = {
        accounts: body.state.accounts,
        subjects: body.state.subjects,
        dossiers: body.state.dossiers,
        notifications: body.state.notifications,
        campaignConfig: {
          ...body.state.campaignConfig,
          deadlinePolicy: body.state.campaignConfig?.deadlinePolicy || {
            defaultCorrectionDays: 7,
            reminderDaysBefore: [7, 3, 1],
            autoRejectOnExpiredCorrection: false,
          },
        },
        supportTickets: body.state.supportTickets || [],
        announcements: body.state.announcements || [],
        auditLogs: body.state.auditLogs || [],
      };

      const reconciled = reconcileDeadlinesAndReminders(normalizedIncoming);
      let nextState = reconciled.state;

      if (Array.isArray(body.emailNotificationIds) && body.emailNotificationIds.length > 0) {
        nextState = await dispatchRealEmailsIfConfigured(nextState, body.emailNotificationIds);
      }

      currentState = nextState;
      currentRevision += 1;
      saveStateToDb(currentState, currentRevision);
      broadcastState(body.clientId);

      res.json({
        ok: true,
        state: currentState,
        emailStatus: getEmailServiceStatus(),
        revision: currentRevision,
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Erreur serveur lors de la synchronisation.',
      });
    }
  });

  app.post('/api/deadlines/check', (req, res) => {
    const { referenceDateISO, clientId } = (req.body || {}) as {
      referenceDateISO?: string;
      clientId?: string;
    };

    const result = reconcileDeadlinesAndReminders(
      currentState,
      typeof referenceDateISO === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(referenceDateISO)
        ? referenceDateISO
        : undefined
    );

    if (result.changed) {
      currentState = result.state;
      currentRevision += 1;
      saveStateToDb(currentState, currentRevision);
      broadcastState(clientId || 'deadline-check');
    }

    res.json({
      ok: true,
      changed: result.changed,
      generatedCount: result.newNotifications.length,
      state: currentState,
      emailStatus: getEmailServiceStatus(),
      revision: currentRevision,
    });
  });

  app.post('/api/reset', (req, res) => {
    const { clientId } = (req.body || {}) as { clientId?: string };
    currentState = buildSeedState();
    currentRevision += 1;
    saveStateToDb(currentState, currentRevision);
    broadcastState(clientId || 'reset');

    res.json({
      ok: true,
      state: currentState,
      emailStatus: getEmailServiceStatus(),
      revision: currentRevision,
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[GCD USMBA] Serveur actif sur http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Échec du démarrage du serveur GCD USMBA:', err);
  process.exit(1);
});
