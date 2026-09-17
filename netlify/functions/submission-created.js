// submission-created — runs automatically on every verified Netlify form submission.
// Only the "site-check" form is handled; every other form (e.g. "intake") is ignored.
// Job: validate the submission and hand it to the audit scan runner, fast.
// The scan itself takes minutes and runs elsewhere (Netlify functions time out in seconds).
//
// Environment variables (Netlify → Site configuration → Environment variables):
//   AUDIT_RUNNER_URL     — the scan runner's endpoint that accepts new jobs
//   AUDIT_RUNNER_SECRET  — shared secret, sent as the X-Audit-Secret header

const FORM_NAME = 'site-check';
const HANDOFF_TIMEOUT_MS = 8000;

function cleanText(value, max) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanEmail(value) {
  const v = cleanText(value, 254).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? v : '';
}

// Accept a bare domain or a full URL; return the hostname, or '' if it isn't one.
function cleanWebsite(value) {
  let v = cleanText(value, 500);
  if (!v) return '';
  if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
  try {
    const host = new URL(v).hostname.toLowerCase();
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host)) return '';
    if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return '';
    return host;
  } catch (e) {
    return '';
  }
}

const done = (note) => {
  console.log(`[site-check] ${note}`);
  return { statusCode: 200, body: note };
};

exports.handler = async (event) => {
  let payload;
  try {
    payload = JSON.parse(event.body || '{}').payload || {};
  } catch (e) {
    return done('skipped: unreadable event body');
  }

  if (payload.form_name !== FORM_NAME) {
    return done(`ignored form "${payload.form_name}"`);
  }

  const data = payload.data || {};
  const job = {
    submission_id: payload.id || null,
    submitted_at: payload.created_at || new Date().toISOString(),
    name: cleanText(data.name, 100),
    email: cleanEmail(data.email),
    website: cleanWebsite(data.website),
  };

  const missing = ['name', 'email', 'website'].filter((k) => !job[k]);
  if (missing.length) {
    return done(`rejected submission ${job.submission_id}: invalid ${missing.join(', ')}`);
  }

  const url = process.env.AUDIT_RUNNER_URL;
  const secret = process.env.AUDIT_RUNNER_SECRET;
  if (!url || !secret) {
    return done(`NOT HANDED OFF ${job.website}: AUDIT_RUNNER_URL or AUDIT_RUNNER_SECRET not set`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HANDOFF_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Audit-Secret': secret },
      body: JSON.stringify(job),
      signal: controller.signal,
    });
    if (!res.ok) {
      return done(`HANDOFF FAILED ${job.website} (${job.email}): runner returned ${res.status}`);
    }
    return done(`handed off ${job.website} for ${job.email}`);
  } catch (e) {
    return done(`HANDOFF FAILED ${job.website} (${job.email}): ${e.name === 'AbortError' ? 'timed out' : e.message}`);
  } finally {
    clearTimeout(timer);
  }
};
