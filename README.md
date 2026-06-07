# Discord Bot

This project is a **locally hosted Discord bot** with a **web-based control panel**.  
From the browser you can:

- **See bot information** (ID, tag, creation date, guild list)
- **Change the bot's status** (online / idle / dnd / invisible)
- **Change the bot's activity text & type** (Playing / Listening / Watching / Competing)
- **Optionally change the bot username** (subject to Discord rate limits)

The panel is intended for **local development / self‑hosting**.

---

## 1. Prerequisites

- Node.js 18+ installed
- A Discord bot application & token
  - Create one in the [Discord Developer Portal](https://discord.com/developers/applications)
  - Add a **bot user** and copy its token
  - Invite the bot to a server where you have permissions

---

## 2. Setup

In a terminal in this folder:

```bash
npm install
```

Create a `.env` file (you can copy `.env.example`):

```bash
cp .env.example .env
```

Open `.env` and fill in:

```bash
DISCORD_TOKEN=your_bot_token_here
PANEL_PASSWORD=change_this_panel_password
PORT=3000
```

- **DISCORD_TOKEN**: your bot token from the Developer Portal (keep this secret)
- **PANEL_PASSWORD**: password for the web control panel (sent as a header)
- **PORT**: HTTP port for the control panel (`http://localhost:3000` by default)

> If you do **not** set `PANEL_PASSWORD`, the `/api/settings` endpoint will not be protected.  
> For anything other than local testing, you should **always** set it.

---

## 3. Running the bot and panel

Start the bot + web server:

```bash
npm start
```

You should see logs like:

```text
Control panel running on http://localhost:3000
Logged in as YourBotName#1234
```

Now open the control panel in your browser:

- `http://localhost:3000`

---

## 4. Using the web control panel

### Bot information

The left card shows:

- **Bot username & tag**
- **Bot ID**
- **Account creation date**
- **Current presence** (status + activity type/text)
- **List of guilds** (servers) the bot is in

This data comes from `GET /api/info`.

### Changing presence and name

The right card is owner-only and allows you to:

- Select **status**: `online`, `idle`, `dnd`, `invisible`
- Select **activity type**: `Playing`, `Listening`, `Watching`, `Competing`
- Set **activity description** (what shows as "Playing X", etc.)
- Optionally set a **new bot username**

Flow:

1. Enter the **Owner panel password**  
   - This must match `PANEL_PASSWORD` in your `.env`
2. Adjust the status / activity / username fields
3. Click **Save presence**

The front-end will call:

- `POST /api/settings` with JSON body:

  ```json
  {
    "status": "online",
    "activityType": "Playing",
    "activityText": "with APIs on localhost",
    "username": "MyNewBotName"
  }
  ```

  and a header:

  ```http
  x-panel-token: <PANEL_PASSWORD>
  ```

The backend applies:

- `client.user.setPresence(...)` to update **status & activity**
- `client.user.setUsername(...)` if a new username is provided

> ⚠ **Username changes are heavily rate-limited by Discord**.  
> Only change it occasionally to avoid errors.

---

## 5. File overview

- `index.js` – main entry; starts the Discord bot and Express server, exposes the API
- `public/index.html` – single-page dashboard UI
- `.env.example` – example environment configuration
- `package.json` – dependencies and start script

---

## 6. Notes & customization

- The bot currently uses minimal intents (`Guilds`) since this panel only needs
  basic bot account info. If you later want to react to messages, members, etc.,
  you can add more intents in `index.js`.
- The control panel is intentionally very lightweight (vanilla HTML/CSS/JS).
  You can replace it with React/Vue/etc. later if you prefer.

