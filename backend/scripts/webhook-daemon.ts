import fs from 'node:fs/promises';
import { join } from 'node:path';
import { cwd, env } from 'node:process';

// --- CONFIGURATION ---
// Adjust these to match your exact setup
// FUTURE: to be a config. param.
const API_DEFAULT_PORT = '3000';
const WEBHOOK_URL = `http://localhost:${API_DEFAULT_PORT}/campaigns/webhooks/email-status`;
const HISTORY_DIR = join(cwd(), 'data', 'history');

// Simulation Parameters
const MIN_DELIVERY_DELAY = 1000; // in msec
const MAX_DELIVERY_DELAY = 4000; // in msec
const FAKE_EMAIL_BOUNCE_RATE = 0.05; // 5% chance of a bounced email
const NO_EMAIL_BOUNCE_RATE = 0.0; // no bounced email
// No fake failled email in production mode AND in staging mode
const EMAIL_BOUNCE_RATE = env.NODE_ENV?.startsWith('dev') ? FAKE_EMAIL_BOUNCE_RATE : NO_EMAIL_BOUNCE_RATE;
const DAEMON_POLL_INTERVAL = 3000; // in ms, how often the daemon checks for files

// Keep track of webhooks we've already fired in memory so we don't spam the server
// const firedWebhooks = new Set<string>();

const inFlightWebhooks = new Set<string>();

console.log('🤖 Auto-Webhook Simulator Daemon is running in the background...');
// Run the check every 3 seconds
setInterval(processPendingWebhooks, DAEMON_POLL_INTERVAL);

/**
 * Main loop: Scans the history directory and processes unfinished campaigns.
 */
async function processPendingWebhooks() {
  try {
    const files = await fs.readdir(HISTORY_DIR);

    for (const file of files) {
      if (!file.endsWith('.json')) {
        continue;
      }

      await processCampaignFile(file);
    }
  } catch (err) {
    // Silently ignore if the history directory doesn't exist yet
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('🤖 [Daemon] Error reading history directory', err);
    }
  }
}

/**
 * Handles the reading and parsing of a single campaign file.
 * Extracted to reduce cognitive complexity of the main loop.
 */
async function processCampaignFile(file: string) {
  const filePath = join(HISTORY_DIR, file);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    if (!content) {
      return;
    }

    const data = JSON.parse(content);
    // Only bother with campaigns that aren't finished
    if (data.status !== 'PARTIAL') {
      return;
    }

    for (const email of data.emails) {
      if (email.status === 'PENDING') {
        scheduleWebhookForEmail(data.id, email);
      }
    }
  } catch {
    // This happens if we read the file while the backend is writing to it (Empty/Partial JSON)
    // Just skip this file this tick and try again in 3 seconds.
  }
}

/**
 * Checks an individual email's status, calculates the delay, and schedules the webhook.
 */
function scheduleWebhookForEmail(campaignId: string, email: { address: string; status: string }) {
  const trackingKey = `${campaignId}_${email.address}`;

  // Only schedule if we aren't already waiting for a timeout or fetch for this specific email
  if (!inFlightWebhooks.has(trackingKey)) {
    inFlightWebhooks.add(trackingKey);

    // Calculate the delay using our constants
    const randomDelayRange = MAX_DELIVERY_DELAY - MIN_DELIVERY_DELAY;
    const delay = Math.floor(Math.random() * randomDelayRange) + MIN_DELIVERY_DELAY;
    // Schedule the network execution
    setTimeout(() => {
      const isBounce = Math.random() < EMAIL_BOUNCE_RATE;
      fireWebhook(campaignId, email.address, trackingKey, isBounce);
    }, delay);
  }
}

/**
 * Executes the actual HTTP POST request to the backend.
 */
async function fireWebhook(campaignId: string, emailAddress: string, trackingKey: string, isBounce: boolean) {
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId: campaignId,
        email: emailAddress,
        event: isBounce ? 'bounce' : 'delivered',
        reason: isBounce ? 'Simulated hard bounce' : undefined
      })
    });

    if (response.ok) {
      const icon = isBounce ? '🔴' : '🟢';
      console.log(`🤖 [Daemon] ${icon} Auto-fired webhook for ${emailAddress}`);
      // Keep it in inFlightWebhooks for one more cycle to allow the Backend time to write the JSON
      setTimeout(() => inFlightWebhooks.delete(trackingKey), DAEMON_POLL_INTERVAL);
    } else {
      throw new Error(`Server returned ${response.status}`);
    }
  } catch {
    // If it failed, remove from in-flight so scheduleWebhookForEmail can try again next tick
    inFlightWebhooks.delete(trackingKey);

    // Optional: Clean, single-line warning without the full stack trace
    console.warn(`⚠️ [Daemon] Backend unreachable. Retrying ${emailAddress} next tick...`);
  }
}
