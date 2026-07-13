import { google } from 'googleapis';

const MAX_FIELD_LENGTH = 2_000;
const REQUIRED_FIELDS = ['fname', 'org', 'email'];

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body)
  };
}

function clean(value) {
  return typeof value === 'string' ? value.trim().slice(0, MAX_FIELD_LENGTH) : '';
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getConfig() {
  const config = {
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    serviceAccountPrivateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    sheetId: process.env.GOOGLE_SHEET_ID,
    sheetName: process.env.GOOGLE_SHEET_NAME || 'Leads',
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    telegramChatId: process.env.TELEGRAM_CHAT_ID
  };

  if (Object.values(config).some((value) => !value)) {
    throw new Error('Contact integration environment variables are not fully configured.');
  }

  return config;
}

async function appendToSheet(config, submission) {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: config.serviceAccountEmail,
      private_key: config.serviceAccountPrivateKey
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  const sheets = google.sheets({ version: 'v4', auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId: config.sheetId,
    range: `${config.sheetName}!A:H`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        new Date().toISOString(),
        submission.fname,
        submission.org,
        submission.email,
        submission.phone,
        submission.service,
        submission.message,
        'Website contact form'
      ]]
    }
  });
}

async function sendTelegramNotification(config, submission) {
  const text = [
    'New Nuvanta consultation request',
    '',
    `Name: ${submission.fname}`,
    `Organisation: ${submission.org}`,
    `Email: ${submission.email}`,
    `Phone: ${submission.phone || 'Not provided'}`,
    `Interest: ${submission.service || 'Not provided'}`,
    '',
    `Project details: ${submission.message || 'Not provided'}`
  ].join('\n');
  const response = await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: config.telegramChatId, text })
  });

  if (!response.ok) {
    throw new Error(`Telegram API returned ${response.status}.`);
  }
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed.' });
  }

  let requestBody;
  try {
    requestBody = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid request body.' });
  }

  if (clean(requestBody.website)) {
    return json(200, { ok: true });
  }

  const submission = {
    fname: clean(requestBody.fname),
    org: clean(requestBody.org),
    email: clean(requestBody.email),
    phone: clean(requestBody.phone),
    service: clean(requestBody.service),
    message: clean(requestBody.message)
  };

  if (REQUIRED_FIELDS.some((field) => !submission[field]) || !isValidEmail(submission.email)) {
    return json(400, { error: 'Please provide a name, organisation, and valid email address.' });
  }

  try {
    const config = getConfig();
    await Promise.all([
      appendToSheet(config, submission),
      sendTelegramNotification(config, submission)
    ]);
    return json(200, { ok: true });
  } catch (error) {
    console.error('Contact submission failed:', error);
    return json(500, { error: 'Unable to send your request.' });
  }
}
