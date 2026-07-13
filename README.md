# Nuvanta Energy website

An Astro marketing site with a Netlify Function that saves contact requests to Google Sheets and sends a Telegram notification.

## Project structure

- `src/pages/index.astro` composes the homepage sections.
- `src/components/` contains reusable page sections, header, footer, and browser scripts.
- `src/layouts/BaseLayout.astro` owns document metadata, fonts, and shared page chrome.
- `src/styles/global.css` contains the shared site styling.
- `netlify/functions/contact.mjs` receives and delivers contact form submissions.

## Local development

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and replace every placeholder.
3. Run `npm run dev` for the website. Use `netlify dev` when testing the contact form locally, since it runs the Netlify Function.

## Configure integrations

### Google Sheets

1. Create a Google Cloud service account and enable the Google Sheets API.
2. Create a spreadsheet with a `Leads` tab and share it with the service-account email as **Editor**.
3. Copy the service account email, private key, spreadsheet ID, and tab name into environment variables.

The function adds rows in this order: timestamp, name, organisation, email, phone, area of interest, project details, source.

### Telegram

1. Create a bot through BotFather and obtain its token.
2. Add the bot to the destination chat or channel and send it one message.
3. Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`.

## Deploy to GitHub Pages

1. Push this folder to a GitHub repository.
2. In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push to `main`. The included `.github/workflows/deploy.yml` builds and deploys the website automatically.
4. Name the repository `Nuvanta-Energy.github.io` to deploy the organization site at `https://nuvanta-energy.github.io/`.

GitHub Pages only hosts static files. It cannot run `netlify/functions/contact.mjs`, so the contact form needs a separately hosted API. Set its public URL as the repository variable `PUBLIC_CONTACT_API_URL` under **Settings → Secrets and variables → Actions → Variables**. The deployed API—not GitHub Pages—must keep the Google and Telegram secrets.

## Alternative Netlify deployment

The included `netlify.toml` and `netlify/functions/contact.mjs` remain available if you deploy the site through Netlify instead. That option can run the Google Sheets and Telegram integration directly.

Never commit `.env` or expose Google or Telegram credentials through an Astro `PUBLIC_` variable. `PUBLIC_CONTACT_API_URL` is safe to expose because it is only the URL of the contact API.
