require('dotenv').config();


const express = require('express');
const cors = require('cors');
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  Partials,
  ActivityType,
} = require('discord.js');
const { EmbedBuilder } = require('discord.js');
const { SlashCommandBuilder, REST, Routes, ChannelType } = require('discord.js');

const fs = require("fs");
const http = require("http");



const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const PANEL_PASSWORD = process.env.PANEL_PASSWORD;
const PORT = process.env.PORT || 3000;
const PUBLIC_STATUS_PORT = Number(process.env.PUBLIC_STATUS_PORT) || 3298;
const PUBLIC_DATA_PORT = Number(process.env.PUBLIC_DATA_PORT) || 3299;
const BOT_OWNER_ID = "1222617763063926938";




if (!DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN is not set in .env');
  process.exit(1);
}

if (!PANEL_PASSWORD) {
  console.warn(
    'PANEL_PASSWORD is not set in .env. The control panel will not be protected.'
  );
}


const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMembers],
  partials: [Partials.GuildMember],
});


const presenceState = {
  status: 'online', // online | idle | dnd | invisible
  activityText: 'not set',
  activityType: 'Playing', // Playing | Listening | Watching | Competing
  username: "-",
};

// Generate session token
  function generateSessionToken(length) {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
     const sessionToken = `${generateSessionToken(50)}-/-${generateSessionToken(12)}`;


     const dmCooldowns = new Map();
     const DM_COOLDOWN = 30000;
     
     

function tempLog(msg) {
  const time = new Date().toISOString();
  const entry = `[${time}] ${msg}\n`;

  fs.appendFile("bot.log", entry, () => {});
}

//logging
async function log(type, message) {
  const time = new Date().toISOString();
  const entry = `[${time}] [${type}] ${message}\n`;

  fs.appendFile("bot.log", entry, () => {});
  
  try {
  if (type.toUpperCase() === "ERROR")  {
    
    const channel = await client.channels.fetch(process.env.ERROR_LOG_CHANNEL);

    const embed = new EmbedBuilder()
        .setTitle(`[${time}] ERROR`)
        .setDescription(message)
        .setColor(0xff0000)
        .addFields(
          { name: "Bot", value: client.user.tag, inline: true },
          { name: "Message", value: message }
        )
        .setTimestamp(time);

        if (channel && channel.isTextBased()) {
          await channel.send({ embeds: [embed] });
          
          log("START", `Successfully sent message to channel and user`);
        } else {
          console.error("Selected Channel isn't a text-based channel");
        }
  }
} catch(err) {
  console.error(`[${time}]  Failed to create Log`);
  tempLog(err);
}
};

const cooldownFile = path.join(__dirname, "promotionCooldowns.json");

  let promotionCooldowns = {};
  
  if (fs.existsSync(cooldownFile)) {
    promotionCooldowns = JSON.parse(fs.readFileSync(cooldownFile, "utf8"));
  }
  
  const COOLDOWN = 48 * 60 * 60 * 1000; // 48h

  const userCooldownFile = path.join(__dirname, "promotionUserCooldowns.json");

  let promotionUserCooldowns = {};
  
  if (fs.existsSync(userCooldownFile)) {
    promotionUserCooldowns = JSON.parse(fs.readFileSync(userCooldownFile, "utf8"));
  }
  
  const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const row = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId("get_role")
    .setLabel("Get promotion ping role")
    .setStyle(ButtonStyle.Primary)
);

const roleButtonChannelId = process.env.ROLE_BUTTON_CHANNEL_ID;

async function sendRoleButtonMessage() {
  if (!roleButtonChannelId) {
    log("WARN", "ROLE_BUTTON_CHANNEL_ID is not set. Skipping role button message.");
    return;
  }

  try {
    const channel = await client.channels.fetch(roleButtonChannelId);
    if (!channel || !channel.isTextBased()) {
      log("WARN", `ROLE_BUTTON_CHANNEL_ID is not a text channel: ${roleButtonChannelId}`);
      return;
    }

    await channel.send({
      content: "Klicke, um für Promotions gepinged zu werden:",
      components: [row],
    });
  } catch (err) {
    if (err && err.code === 10003) {
      log("WARN", `ROLE_BUTTON_CHANNEL_ID not found: ${roleButtonChannelId}`);
      return;
    }

    log("ERROR", `Failed to send role button message: ${err}`);
    logToChannel(`Failed to send role button message: ${err}`, "error");
  }
}

  const USERCOOLDOWN = 12 * 60 * 60 * 1000; // 24h

async function logToChannel(message, type, logChannel) {
  const time = new Date().toISOString();
  const channelID = logChannel || process.env.LOGGING_CHANNEL;

    if (!type) log("ERROR", "Index.js line(95) 'type' is not defined")
  
  try {
      const channel = await client.channels.fetch(channelID);
      if (channel && channel.isTextBased()) {

      if (type.toLowerCase() === "error") {
        

        const embed = new EmbedBuilder()
            .setTitle(`[${time}] ERROR`)
            .setDescription(message)
            .setColor(0xff0000)
            .addFields(
              { name: "Bot", value: client.user ? client.user.tag : "Not ready", inline: true },
              { name: "Message", value: message },
              { name: "Session Token", value: sessionToken }
            )
            .setTimestamp();
    
            
              await channel.send({ embeds: [embed] });
              
      } else if (type.toLowerCase() === "warn") {
        

        const embed = new EmbedBuilder()
            .setTitle(`[${time}] WARN`)
            .setDescription(message)
            .setColor(0xf59e0b)
            .addFields(
              { name: "Bot", value: client.user ? client.user.tag : "Not ready", inline: true },
              { name: "Type", value: type.toUpperCase(), inline: true},
              { name: "Message", value: message }
            )
            .setTimestamp(time);
    
            
              await channel.send({ embeds: [embed] });
              
      } else if (type.toLowerCase() === "info") {
        

        const embed = new EmbedBuilder()
            .setTitle(`[${time}] INFO`)
            .setDescription(message)
            .setColor(0x3b82f6)
            .addFields(
              { name: "Bot", value: client.user ? client.user.tag : "Not ready", inline: true },
              { name: "Type", value: type.toUpperCase(), inline: true},
              { name: "Message", value: message }
            )
            .setTimestamp(time);
    
            
              await channel.send({ embeds: [embed] });
              
      } else {
        

        const embed = new EmbedBuilder()
            .setTitle(`[${time}] LOG`)
            .setDescription(message)
            .setColor(0x6b7280)
            .addFields(
              { name: "Bot", value: client.user ? client.user.tag : "Not ready", inline: true },
              { name: "Type", value: "Log", inline: true},
              { name: "Message", value: message }
            )
            .setTimestamp(time);
    
            
              await channel.send({ embeds: [embed] });
              
      }
    } 
} catch(err) {
  const time = new Date().toISOString();
      console.error(`[${time}]  ${err}`);
    }
  }


function logToFile(message) {
  log("INFO", message);
}



const globalBanFile = path.join(__dirname, "globalbans.json");
const globalBanLimitsFile = path.join(__dirname, "globalbanLimits.json");

let globalBans = fs.existsSync(globalBanFile)
  ? JSON.parse(fs.readFileSync(globalBanFile))
  : {};

let globalBanLimits = fs.existsSync(globalBanLimitsFile)
  ? JSON.parse(fs.readFileSync(globalBanLimitsFile))
  : {};

  const protectedUsers = [
    "928021462386892830",
    process.env.OWNER_ID
  ];

  const commands = [
    new SlashCommandBuilder()
      .setName("ping")
      .setDescription("Antwortet mit Pong!"),

      new SlashCommandBuilder()
      .setName("userinfo")
      .setDescription("Gibt Infos über einen bestimmten Nutzer zurück")
      .addUserOption(option =>
        option
          .setName("user")
          .setDescription("Der Nutzer, über den Infos angezeigt werden sollen")
          .setRequired(true)
      ),

      new SlashCommandBuilder()
      .setName("promote")
      .setDescription("Promote your Server in our official server"),
      



    new SlashCommandBuilder()
      .setName("hello")
      .setDescription("Bot sagt Hallo"),
      new SlashCommandBuilder()
  .setName("newsletter")
  .setDescription("Subscribe or unsubscribe from the bot newsletter")
  .addBooleanOption(option =>
    option
      .setName("subscribe")
      .setDescription("Enable or disable the newsletter")
      .setRequired(true)
  ),
  new SlashCommandBuilder()
    .setName("newsletterchannel")
    .setDescription("Set the channel where bot newsletters are sent")
    .addChannelOption(option =>
      option
        .setName("channel")
        .setDescription("Text channel for newsletters")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true)
    ),
  new SlashCommandBuilder()
  .setName("globalban")
  .setDescription("Bannt einen Nutzer global auf allen Servern")
  .addUserOption(option =>
    option
      .setName("user")
      .setDescription("Der zu bannende Nutzer")
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName("reason")
      .setDescription("Grund für den Ban")
      .setRequired(true)
  )
  .addAttachmentOption(option =>
    option
      .setName("proof")
      .setDescription("Beweis (Screenshot etc.)")
      .setRequired(false)
  ),
  new SlashCommandBuilder() 
  .setName("restartserverscan")
  .setDescription("Only debug command"),
  new SlashCommandBuilder()
  .setName("checkboost")
  .setDescription("checks a user in this guild for their boost lvl")
  .addUserOption(option =>
    option
    .setName("user")
    .setDescription("User to check")
    .setRequired(false)

  ),
  new SlashCommandBuilder()
    .setName("clearuserpromocooldown")
    .setDescription("Owner: remove promotion user cooldown by user ID")
    .addStringOption(option =>
      option
        .setName("userid")
        .setDescription("Discord user ID")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("clearguildpromocooldown")
    .setDescription("Owner: remove promotion guild cooldown by guild ID")
    .addStringOption(option =>
      option
        .setName("guildid")
        .setDescription("Discord guild ID")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("newsletter-send")
    .setDescription("Owner only: broadcast newsletter to subscribed servers")
    .addStringOption(option =>
      option
        .setName("message")
        .setDescription("Newsletter text to send")
        .setRequired(true)
    ),
    new SlashCommandBuilder()
  .setName("listuserpromocooldowns")
  .setDescription("Owner: zeigt alle User Promotion Cooldowns"),

new SlashCommandBuilder()
  .setName("listguildpromocooldowns")
  .setDescription("Owner: zeigt alle Guild Promotion Cooldowns"),
  ].map(cmd => cmd.toJSON());
  
  



const configPath = path.join(__dirname, "config.json");
let config = { sendStartupDMs: true };


if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath, "utf8"));
}


if (process.argv.includes("--no-dms")) {
  config.sendStartupDMs = false;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log("Startup DMs wurden deaktiviert.");
  log("WARN", `Startup Dms wurden deaktiviert`);
} else if (process.argv.includes("--enable-dms")) {
  config.sendStartupDMs = true;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log("Startup DMs wurden aktiviert.");
  log("WARN", `Startup Dms wurden aktiviert`);
}
if (process.argv.includes("--silent")) {
  config.startupSilent = true;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log("Startup mode: SILENT");
  log("WARN", `Startup mode: SILENT`);
} else if (process.argv.includes("--noisy")) {
  config.startupSilent = false;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log("Startup mode: NOISY");
  log("WARN", `Startup mode: NOISY`);
}
if (process.argv.includes("--profile-default")) {
  config.startupSilent = false;
  config.sendStartupDMs = true;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log("Startup mode: DEFAULT");
  log("WARN", `Startup mode: DEFAULT`);
}


global.botConfig = config;

  // On ready (discord.js emits "ready"; keep compatibility just in case)
  let startupInitialized = false;
  const handleClientReady = async () => {
    if (startupInitialized) return;
    startupInitialized = true;

    

    logToFile(`Successfully logged in as ${client.user.tag} with session token: ${sessionToken}`);

    log("INFO", `Logged in as ${client.user.tag}`);
    log("INFO", "Session Token:" + sessionToken);
  
   
    
      
      const embed = new EmbedBuilder()
        .setTitle("🤖 Bot gestartet")
        .setDescription("Der Bot ist jetzt **online und bereit**.")
        .addFields(
          { name: "Sessiontoken", value: sessionToken, inline: true }
          
        )
        .setColor(0x38bdf8)
        .setTimestamp();
    
      try {
        const channel = await client.channels.fetch(process.env.STARTUP_CHANNEL);
        const user = await client.users.fetch(process.env.STARTUPDM_USER);
    
        if (channel && channel.isTextBased() && !global.botConfig.startupSilent) {
          await channel.send({ embeds: [embed] });
    
          
          if (global.botConfig.sendStartupDMs) {
            await user.send({ embeds: [embed] });
          }
        }
      } catch (err) {
        console.error('Failed to send startup message:', err);
        logToChannel(`Failed to send startup message! [${err}]`, "error")
        
      }

      await sendRoleButtonMessage();
      
      try {
        await scanServers();
      } catch (err) {
        console.error("Startup server scan failed:", err);
        log("ERROR", `Startup server scan failed: ${err}`);
        logToChannel(`Startup server scan failed: ${err}`, "error");
      }

      const timedScanTime = 5 * 60 * 1000;
       let scanCounter = 0;

const timedServerScan = setInterval(async () => {

  if (scanCounter >= 1000) {
    clearInterval(timedServerScan);
    return;
  }

  scanCounter++;
  await scanServers();

}, timedScanTime);


      
      
      
    const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

    await rest.put(
    Routes.applicationCommands(client.user.id),
    { body: commands }
    );
    

    applyPresenceFromState().catch((err) => {
      console.error('Failed to apply initial presence:', err);
      log("ERROR", `Failed to apply initial presence: ${err}`);
      logToChannel(`Failed to apply initial presence: ${err}`, "error");
    });

    startPublicStatusAndDataServers();
      
  };

  
  client.once('clientReady', handleClientReady);


  // Apply presence from state
async function applyPresenceFromState() {
  const activities = [];
  if (presenceState.activityText) {
    const type = ActivityType[presenceState.activityType] || ActivityType.Playing;
    activities.push({
      name: presenceState.activityText,
      type,
    });
  }
  // Apply presence
  await client.user.setPresence({
    status: presenceState.status,
    activities,
  });

  if (presenceState.username) {
    try {
      await client.user.setUsername(presenceState.username);
    } catch (err) {
      console.error('Error setting username (rate limited by Discord?):', err);
    }
  }
}





const serversFile = path.join(__dirname, "servers.json");
const announcementsFile = path.join(__dirname, "announcements.json");

function withTimeout(promise, ms, label = "operation") {
  let t;
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}





async function scanServers() {

  let servers = {};

  if (fs.existsSync(serversFile)) {
    try {
      const raw = fs.readFileSync(serversFile, "utf8").trim();
      servers = raw ? JSON.parse(raw) : {};
    } catch (err) {
      console.warn("servers.json is corrupted. Resetting file.");
      servers = {};
    }
  }

  log("INFO", "Starting server scan...");
  // Ensure guild cache is populated (best-effort, don't block forever)
  await withTimeout(client.guilds.fetch().catch(() => {}), 10000, "guilds.fetch()").catch(() => {});

  for (const [guildId, guild] of client.guilds.cache) {

    try {
      await withTimeout(
        (async () => {

      // Fetching *all* members with presences can hang / rate-limit on bigger guilds.
      // For the server index we prefer a fast best-effort online estimate.
      // Never block startup on huge member fetches.
      if ((guild.memberCount || 0) <= 1000) {
        await withTimeout(
          guild.members.fetch({ withPresences: true }).catch(() => {}),
          15000,
          `members.fetch(${guildId})`
        ).catch(() => {});
      }

      let invite = null;
      let vanityCode = null;
      const me =
        guild.members.me ||
        (client.user ? guild.members.cache.get(client.user.id) : null);

try {
  vanityCode = await withTimeout(
    guild.fetchVanityData(),
    5000,
    `fetchVanityData(${guildId})`
  );
} catch {
 
}
      
      try {
        const invites = await withTimeout(
          guild.invites.fetch(),
          8000,
          `invites.fetch(${guildId})`
        );

        invite = invites.find(i => i.maxAge === 0 && i.maxUses === 0);
      } catch {
      
      }
      let inviteCreator = null;

if (vanityCode) {
  inviteCreator = "customLink";
} else if (invite && invite.inviter) {
  inviteCreator = {
    id: invite.inviter.id,
    tag: invite.inviter.tag
  };
}

      
      if (!invite) {

        const channel = guild.channels.cache.find(
          c =>
            c.isTextBased() &&
            me &&
            c.permissionsFor(me).has("CreateInstantInvite")
        );

        if (channel) {
          invite = await withTimeout(
            channel.createInvite({
              maxAge: 0,
              maxUses: 0,
              reason: "Server index invite"
            }),
            8000,
            `createInvite(${guildId})`
          );
        }
      }

     
      const onlineFromPresences =
        guild.presences?.cache?.filter(p => p.status !== "offline").size ?? 0;
      const onlineFromMembers =
        (guild.memberCount || 0) <= 1000
          ? guild.members.cache.filter(
              m => m.presence && m.presence.status !== "offline"
            ).size
          : 0;
      const onlineCount = Math.max(onlineFromPresences, onlineFromMembers);

      servers[guildId] = {
        id: guild.id,
        name: guild.name,
        icon: guild.iconURL({ size: 512 }),
        memberCount: guild.memberCount,
        onlineCount: onlineCount,
      
        invite: vanityCode
          ? `https://discord.gg/${vanityCode.code}`
          : invite
          ? `https://discord.gg/${invite.code}`
          : null,
      
        inviteCreator: inviteCreator,
      
        newsletter: servers[guildId]?.newsletter ?? true,
        newsletterChannelId: servers[guildId]?.newsletterChannelId ?? null,
      
        createdAt: guild.createdAt,
        updatedAt: new Date()
      };

      console.log(`Indexed server: ${guild.name}`);
      log("INFO", `Indexed server: ${guild.name}` );
      

        })(),
        25000,
        `scanGuild(${guildId})`
      );

    } catch (err) {
      console.error(`Failed scanning ${guildId}`, err);
      log("ERROR", `Failed scanning ${guildId}: ${err}`);
    }
  }

  fs.writeFileSync(serversFile, JSON.stringify(servers, null, 2));
  log("INFO", `Server scan complete. Indexed: ${Object.keys(servers).length}`);
}

async function getNewsletterChannel(guild, serverEntry) {
  if (serverEntry?.newsletterChannelId) {
    try {
      const channel = await guild.channels.fetch(serverEntry.newsletterChannelId);
      if (
        channel &&
        channel.isTextBased() &&
        channel.permissionsFor(guild.members.me)?.has("SendMessages")
      ) {
        return channel;
      }
    } catch {
      // fall through to auto-detect
    }
  }

  return guild.channels.cache.find(
    (c) =>
      c.isTextBased() &&
      c.permissionsFor(guild.members.me)?.has("SendMessages")
  );
}

function ensureAnnouncementsFile() {
  if (!fs.existsSync(announcementsFile)) {
    fs.writeFileSync(announcementsFile, "[]\n");
  }
}

function appendNewsletterAnnouncement({ source, message, delivered }) {
  ensureAnnouncementsFile();
  let list = [];
  try {
    const raw = fs.readFileSync(announcementsFile, "utf8").trim();
    list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];
  } catch {
    list = [];
  }
  list.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    at: new Date().toISOString(),
    source,
    message: String(message).slice(0, 4000),
    delivered: Number(delivered) || 0,
  });
  fs.writeFileSync(announcementsFile, JSON.stringify(list, null, 2));
}

async function sendNewsletterToSubscribedGuilds(message) {
  let servers = {};
  if (fs.existsSync(serversFile)) {
    try {
      servers = JSON.parse(fs.readFileSync(serversFile, "utf8"));
    } catch {
      servers = {};
    }
  }

  let sent = 0;
  for (const guildId in servers) {
    if (!servers[guildId].newsletter) continue;

    try {
      const guild = await client.guilds.fetch(guildId);
      const channel = await getNewsletterChannel(guild, servers[guildId]);
      if (!channel) continue;

      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle("📣📬💌 New Newsletter")
            .setDescription(message)
            .setColor(0x38bdf8)
            .setTimestamp(),
        ],
      });
      sent++;
    } catch (err) {
      console.warn("Newsletter failed for", guildId);
      logToChannel(`Failed to send newsletter for ${guildId}: ${err}`, "warn");
      log("WARN", `Failed to send newsletter for ${guildId}: ${err}`);
    }
  }

  return sent;
}

let publicHttpServersStarted = false;
function startPublicStatusAndDataServers() {
  if (publicHttpServersStarted) return;
  publicHttpServersStarted = true;
  ensureAnnouncementsFile();

  const statusServer = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (req.method !== "GET") {
      res.writeHead(405);
      res.end();
      return;
    }
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.writeHead(200);
    res.end(
      JSON.stringify({
        online: true,
        bot: client.user
          ? { id: client.user.id, tag: client.user.tag, username: client.user.username }
          : null,
      })
    );
  });

  statusServer.on("error", (err) => {
    log("ERROR", `Public status server (port ${PUBLIC_STATUS_PORT}): ${err}`);
  });
  statusServer.listen(PUBLIC_STATUS_PORT, () => {
    console.log(`Public bot status: http://0.0.0.0:${PUBLIC_STATUS_PORT}/`);
    log("INFO", `Public bot status HTTP listening on port ${PUBLIC_STATUS_PORT}`);
  });

  const dataServer = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (req.method !== "GET") {
      res.writeHead(405);
      res.end();
      return;
    }

    let pathname = "/";
    try {
      pathname = new URL(req.url || "/", "http://127.0.0.1").pathname;
    } catch {
      pathname = req.url || "/";
    }

    const sendJsonFile = (filePath) => {
      try {
        if (!fs.existsSync(filePath)) {
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.writeHead(404);
          res.end(JSON.stringify({ error: "File not found" }));
          return;
        }
        const body = fs.readFileSync(filePath, "utf8");
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.writeHead(200);
        res.end(body);
      } catch (err) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.writeHead(500);
        res.end(JSON.stringify({ error: String(err) }));
      }
    };

    if (pathname === "/servers.json" || pathname === "/servers") {
      sendJsonFile(serversFile);
      return;
    }
    if (pathname === "/announcements.json" || pathname === "/announcements") {
      ensureAnnouncementsFile();
      sendJsonFile(announcementsFile);
      return;
    }

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.writeHead(404);
    res.end(
      JSON.stringify({
        error: "Not found",
        paths: ["/servers.json", "/announcements.json"],
      })
    );
  });

  dataServer.on("error", (err) => {
    log("ERROR", `Public data server (port ${PUBLIC_DATA_PORT}): ${err}`);
  });
  dataServer.listen(PUBLIC_DATA_PORT, () => {
    console.log(`Public data: http://0.0.0.0:${PUBLIC_DATA_PORT}/servers.json`);
    log("INFO", `Public data HTTP listening on port ${PUBLIC_DATA_PORT}`);
  });
}

client.on("interactionCreate", async interaction => {
   // Buttons
   if (interaction.isButton()) {

    if (interaction.customId === "get_role") {
      const roleId = process.env.PROMO_PING_ROLE_ID;
      const member = interaction.member;

      if (!member.roles.cache.has(roleId)) {
        await member.roles.add(roleId);

        await interaction.reply({
          content: "✅ Rolle hinzugefügt!",
          flags: 64
        });
      } else {
        await member.roles.remove(roleId);

        await interaction.reply({
          content: "❌ Rolle entfernt!",
          flags: 64
        });
      }
    }

    return;
  }
 
if (!interaction.isChatInputCommand()) return;

if (interaction.commandName === "ping") {
  await interaction.reply("🏓 Pong!");
}

if (interaction.commandName === "restartserverscan") {
  if (interaction.user.id !== BOT_OWNER_ID) {
    return interaction.reply({
      content: "You are not authorized to execute this command!",
      flags: 64,
    });
  }

  await interaction.deferReply({ flags: 64 });

  try {
    await scanServers();

    return interaction.editReply({
      content: "✅ Server scan completed.",
    });
  } catch (err) {
    console.error(err);

    return interaction.editReply({
      content: `❌ Scan failed: ${err}`,
    });
  }
}

if (interaction.commandName === "clearuserpromocooldown") {
  if (interaction.user.id !== BOT_OWNER_ID) {
    return interaction.reply({
      content: "You are not authorized to execute this command!",
      flags: 64,
    });
  }

  const userId = interaction.options.getString("userid", true).trim();
  if (!promotionUserCooldowns[userId]) {
    return interaction.reply({
      content: `❌ No promotion user cooldown found for \`${userId}\`.`,
      flags: 64,
    });
  }

  delete promotionUserCooldowns[userId];
  fs.writeFileSync(userCooldownFile, JSON.stringify(promotionUserCooldowns, null, 2));

  return interaction.reply({
    content: `✅ Promotion user cooldown removed for \`${userId}\`.`,
    flags: 64,
  });
}

if (interaction.commandName === "clearguildpromocooldown") {
  if (interaction.user.id !== BOT_OWNER_ID) {
    return interaction.reply({
      content: "You are not authorized to execute this command!",
      flags: 64,
    });
  }

  const guildId = interaction.options.getString("guildid", true).trim();
  if (!promotionCooldowns[guildId]) {
    return interaction.reply({
      content: `❌ No promotion guild cooldown found for \`${guildId}\`.`,
      flags: 64,
    });
  }

  delete promotionCooldowns[guildId];
  fs.writeFileSync(cooldownFile, JSON.stringify(promotionCooldowns, null, 2));

  return interaction.reply({
    content: `✅ Promotion guild cooldown removed for \`${guildId}\`.`,
    flags: 64,
  });
}

if (interaction.commandName === "newsletter-send") {
  if (interaction.user.id !== BOT_OWNER_ID) {
    return interaction.reply({
      content: "You are not authorized to execute this command!",
      flags: 64,
    });
  }

  const message = interaction.options.getString("message", true).trim();
  if (!message) {
    return interaction.reply({
      content: "❌ Message cannot be empty.",
      flags: 64,
    });
  }

  await interaction.deferReply({ flags: 64 });

  try {
    const delivered = await sendNewsletterToSubscribedGuilds(message);
    appendNewsletterAnnouncement({ source: "command", message, delivered });
    return interaction.editReply({
      content: `✅ Newsletter sent to **${delivered}** server(s).`,
    });
  } catch (err) {
    log("ERROR", `newsletter-send failed: ${err}`);
    return interaction.editReply({
      content: `❌ Failed to send newsletter: ${err}`,
    });
  }
}

if (interaction.commandName === "checkboost") {
  const user = interaction.options.getUser("user") || interaction.user;

  const member = await interaction.guild.members.fetch(user.id);

  if (!member.premiumSince) {
    return interaction.reply({
      content: `❌ ${user.tag} boostet diesen Server nicht.`,
      flags:64
    });
  }

  const boostDate = Math.floor(member.premiumSinceTimestamp / 1000);

  await interaction.reply({
    content: `🚀 ${user.tag} boostet diesen Server!\nSeit: <t:${boostDate}:F>\n(<t:${boostDate}:R>)`,
    flags:64
  });
}

if (interaction.commandName === "hello") {
  await interaction.reply("👋 Hallo!");
}

if (interaction.commandName === "userinfo") {
  const user = interaction.options.getUser("user");

  const embed = new EmbedBuilder()
    .setTitle(`Collected data for <@${user.id}>`)
    .setAuthor({ name: client.user.tag })
    .setDescription("All collected information available")
    .setColor(0x38bdf8)
    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: "ID", value: user.id, inline: true },
      { name: "Tag", value: user.tag, inline: true },
      { name: "Created At", value: user.createdAt.toISOString(), inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], allowedMentions: { users: [user.id] } });
}
 
if (interaction.commandName === "globalbanlist") {

  const list = Object.entries(globalBans)
    .map(([id, data]) => `${id} → ${data.reason}`)
    .slice(0, 20)
    .join("\n");

  await interaction.reply({
    content: list || "Keine globalen Bans.",
    ephemeral: true
  });
}

if (interaction.commandName === "globalunban") {

  const user = interaction.options.getUser("user");
  const reason = interaction.options.getString("reason");

  delete globalBans[user.id];
  fs.writeFileSync(globalBanFile, JSON.stringify(globalBans, null, 2));

  let unbanned = 0;

  for (const guild of client.guilds.cache.values()) {
    try {
      await guild.members.unban(user.id, reason);
      unbanned++;
    } catch {}
  }

  await interaction.reply({
    content: `✅ Global unban ausgeführt (${unbanned} Server).`,
    ephemeral: true
  });
}

if (interaction.commandName === "globalbansettings") {

  if (!interaction.memberPermissions.has("Administrator")) {
    return interaction.reply({ content: "❌ Admin only", ephemeral: true });
  }

  const enable = interaction.options.getBoolean("enable");
  const guildId = interaction.guild.id;

  let servers = JSON.parse(fs.readFileSync(serversFile));

  if (!servers[guildId]) servers[guildId] = {};

  servers[guildId].globalban = enable;

  fs.writeFileSync(serversFile, JSON.stringify(servers, null, 2));

  await interaction.reply({
    content: enable ? "✅ Enabled" : "❌ Disabled",
    ephemeral: true
  });
}

if (interaction.commandName === "promote") {


try {

  const guild = interaction.guild;
  const user = interaction.user;
  const BOOST_GUILD_ID = process.env.SRVR_BOOST_ID;

   let boostMonths = 0;
   let boostMember = null;

try {
  const boostGuild = await client.guilds.fetch(BOOST_GUILD_ID);
  boostMember = await boostGuild.members.fetch(interaction.user.id);

  if (boostMember.premiumSinceTimestamp) {
    const diff = Date.now() - boostMember.premiumSinceTimestamp;
    boostMonths = diff / (1000 * 60 * 60 * 24 * 30); // Monate
  }
} catch {
  
}
  
  
  if (!guild) {
    return interaction.reply({
      content: "❌ Dieser Command kann nur in einem Server verwendet werden.",
      ephemeral: true
    });
  }
  
  const now = Date.now();
  
  const lastUse = promotionCooldowns[guild.id];
  const lastUserUse = promotionUserCooldowns[user.id];

  if (lastUse && now - lastUse < COOLDOWN) {
  
    const nextUse = Math.floor((lastUse + COOLDOWN) / 1000);
  
    return interaction.reply({
      content: `⏳ Dieser Server wurde bereits promoted.\nDu kannst ihn wieder **<t:${nextUse}:R>** promoten.`,
      flags:64
    });
  }

  if (lastUserUse && now - lastUserUse < USERCOOLDOWN) {
  
    const nextUse = Math.floor((lastUserUse + USERCOOLDOWN) / 1000);
  
    return interaction.reply({
      content: `⏳ Du hast heute schonmal promoted! Du kannst diesen Befehl **<t:${nextUse}:R>** nutzen.`,
      flags: 64
    });
  }

  
  const channel = guild.channels.cache.find(
    c => c.type === 0 && c.permissionsFor(guild.members.me).has("CreateInstantInvite")
  );

  if (!channel) {
    return interaction.reply({
      content: "❌ Kein Channel gefunden, in dem ich einen Invite erstellen kann.",
      flags:64
    });
  }

 
  const createdInvite = await channel.createInvite({
    maxAge: 0,
    maxUses: 0,
    reason: "Server Promotion"
  });

  const inviteCode = createdInvite.code;

 
 

  const server = guild;

const data = {
  memberCount: guild.memberCount,
  onlineCount: guild.members.cache.filter(
    m => m.presence && m.presence.status !== "offline"
  ).size
};

const embed = new EmbedBuilder()
.setTitle(server.name)
.setURL(createdInvite.url)
.setDescription(server.description || "Keine Beschreibung vorhanden.")
.setThumbnail(server.iconURL({ dynamic: true, size: 512 }))
.addFields(
  {
    name: "👥 Mitglieder",
    value: `${data.memberCount.toLocaleString()}`,
    inline: true
  },
  {
    name: "🟢 Online",
    value: `${data.onlineCount.toLocaleString()}`,
    inline: true
  },
  {
    name: "🚀 Boosts",
    value: `${guild.premiumSubscriptionCount || 0}`,
    inline: true
  }
)
.setColor(0x5865F2)
.setFooter({
  text: "Serverinfo provided by Discord API"
});

const bannerURL = guild.bannerURL({
dynamic: true,
size: 1024
});

if (bannerURL) {
embed.setImage(bannerURL);
}

  const promoChannel = await interaction.client.channels.fetch(process.env.PROMO_CHANNEL_ID);
  
  let pingText = "";

if (boostMonths >= 12) {
  pingText = "@everyone";
} else if (boostMonths >= 6) {
  pingText = `<@&${process.env.PROMOTEPING1ID}>`;
} else if (interaction.user.id === process.env.BOT_OWNER_ID) {
  pingText = `<@&${process.env.PROMOTEPING1ID}>`;
}
await promoChannel.send({
  content: `# ${pingText} 📢 **Neue Server Promotion!**\n${createdInvite.url}`,
  embeds: [embed],
  allowedMentions: {
    parse: boostMonths >= 12 ? ["everyone"] : ["roles"]
  }
});

  
  promotionCooldowns[guild.id] = now;

fs.writeFileSync(
cooldownFile,
JSON.stringify(promotionCooldowns, null, 2)
);

promotionUserCooldowns[user.id] = now;

fs.writeFileSync(
userCooldownFile,
JSON.stringify(promotionUserCooldowns, null, 2)
);

  await interaction.reply({
    content: "✅ Promotion wurde gepostet.",
    flags: 64,
  });
  await interaction.followUp({
    content:
      "Du willst, dass deine Promotion gepingt wird und mehr Leute erreicht? Dann booste unseren Server! <https://lgg.lovable.app/s/lokrogang>",
    flags: 64,
  });

} catch (err) {
  console.error(err);
  logToChannel(err, "error");

  const errorPayload = {
    content: "❌ Fehler beim Erstellen der Promotion.",
    flags: 64,
  };

  if (interaction.replied || interaction.deferred) {
    await interaction.followUp(errorPayload).catch(() => {});
  } else {
    await interaction.reply(errorPayload).catch(() => {});
  }
}
}
if (interaction.commandName === "newsletter") {

if (!interaction.memberPermissions.has("Administrator")) {
  return interaction.reply({
    content: "❌ Only server admins can change newsletter settings.",
    ephemeral: true
  });
}

const subscribe = interaction.options.getBoolean("subscribe");
const guildId = interaction.guild.id;

let servers = {};

if (fs.existsSync(serversFile)) {
  servers = JSON.parse(fs.readFileSync(serversFile, "utf8"));
}

if (!servers[guildId]) {
  servers[guildId] = {};
}

servers[guildId].newsletter = subscribe;

fs.writeFileSync(serversFile, JSON.stringify(servers, null, 2));

await interaction.reply({
  content: subscribe
    ? "✅ This server **subscribed** to the newsletter."
    : "❌ This server **unsubscribed** from the newsletter.",
  ephemeral: true
});

}

if (interaction.commandName === "newsletterchannel") {
  if (!interaction.memberPermissions.has("Administrator")) {
    return interaction.reply({
      content: "❌ Only server admins can set the newsletter channel.",
      flags: 64,
    });
  }

  const channel = interaction.options.getChannel("channel", true);
  const guild = interaction.guild;

  if (channel.guildId !== guild.id) {
    return interaction.reply({
      content: "❌ Please choose a channel from this server.",
      flags: 64,
    });
  }

  if (!channel.isTextBased()) {
    return interaction.reply({
      content: "❌ Please choose a text channel.",
      flags: 64,
    });
  }

  if (!channel.permissionsFor(guild.members.me)?.has("SendMessages")) {
    return interaction.reply({
      content: "❌ I don't have permission to send messages in that channel.",
      flags: 64,
    });
  }

  let servers = {};
  if (fs.existsSync(serversFile)) {
    servers = JSON.parse(fs.readFileSync(serversFile, "utf8"));
  }

  if (!servers[guild.id]) {
    servers[guild.id] = { id: guild.id };
  }

  servers[guild.id].newsletterChannelId = channel.id;
  fs.writeFileSync(serversFile, JSON.stringify(servers, null, 2));

  return interaction.reply({
    content: `✅ Newsletter channel set to <#${channel.id}>.`,
    flags: 64,
  });
}

if (interaction.commandName === "globalban") {

if (!interaction.memberPermissions.has("BanMembers")) {
  return interaction.reply({ content: "❌ No permission", ephemeral: true });
}

const user = interaction.options.getUser("user");
const reason = interaction.options.getString("reason");
const proof = interaction.options.getAttachment("proof");

const guildId = interaction.guild.id;


let servers = JSON.parse(fs.readFileSync(serversFile));
if (servers[guildId]?.globalban === false) {
  return interaction.reply({ content: "❌ Globalban disabled on this server", ephemeral: true });
}


if (protectedUsers.includes(user.id)) {
  return interaction.reply({ content: "❌ You cannot ban this user.", ephemeral: true });
}


const today = new Date().toDateString();
if (!globalBanLimits[guildId]) globalBanLimits[guildId] = {};

if (globalBanLimits[guildId].date !== today) {
  globalBanLimits[guildId] = { date: today, count: 0 };
}

if (globalBanLimits[guildId].count >= 5) {
  return interaction.reply({ content: "❌ Daily limit reached (5)", ephemeral: true });
}

globalBanLimits[guildId].count++;


globalBans[user.id] = {
  reason,
  proof: proof?.url || null,
  by: interaction.user.tag,
  date: new Date()
};

fs.writeFileSync(globalBanFile, JSON.stringify(globalBans, null, 2));
fs.writeFileSync(globalBanLimitsFile, JSON.stringify(globalBanLimits, null, 2));


let bannedCount = 0;

for (const guild of client.guilds.cache.values()) {
  try {
    await guild.members.ban(user.id, { reason: `[GLOBAL] ${reason}` });
    bannedCount++;
  } catch {}
}

await interaction.reply({
  content: `🌍 Globalban ausgeführt.\nGebannt auf ${bannedCount} Servern.`,
  ephemeral: true
});
}
if (interaction.commandName === "listuserpromocooldowns") {
  if (interaction.user.id !== BOT_OWNER_ID) {
    return interaction.reply({
      content: "❌ You are not authorized to execute this command!",
      flags: 64,
    });
  }

  if (Object.keys(promotionUserCooldowns).length === 0) {
    return interaction.reply({
      content: "❌ Keine User Cooldowns vorhanden.",
      flags: 64,
    });
  }

  let text = "";

  for (const userId of Object.keys(promotionUserCooldowns)) {
    try {
      const user = await client.users.fetch(userId);

      const timestamp = promotionUserCooldowns[userId];
      const nextUse = Math.floor((timestamp + USERCOOLDOWN) / 1000);

      text += `👤 ${user.tag} (${userId})\n⏳ Ende: <t:${nextUse}:F>\n\n`;
    } catch {
      text += `👤 Unknown User (${userId})\n\n`;
    }
  }

  if (text.length > 1900) {
    text = text.slice(0, 1900) + "\n...";
  }

  return interaction.reply({
    content: text,
    flags: 64,
  });
}

if (interaction.commandName === "listguildpromocooldowns") {
  if (interaction.user.id !== BOT_OWNER_ID) {
    return interaction.reply({
      content: "❌ You are not authorized to execute this command!",
      flags: 64,
    });
  }

  if (Object.keys(promotionCooldowns).length === 0) {
    return interaction.reply({
      content: "❌ Keine Guild Cooldowns vorhanden.",
      flags: 64,
    });
  }

  let text = "";

  for (const guildId of Object.keys(promotionCooldowns)) {
    try {
      const guild = await client.guilds.fetch(guildId);

      const timestamp = promotionCooldowns[guildId];
      const nextUse = Math.floor((timestamp + COOLDOWN) / 1000);

      text += `🏠 ${guild.name} (${guildId})\n⏳ Ende: <t:${nextUse}:F>\n\n`;
    } catch {
      text += `🏠 Unknown Guild (${guildId})\n\n`;
    }
  }

  if (text.length > 1900) {
    text = text.slice(0, 1900) + "\n...";
  }

  return interaction.reply({
    content: text,
    flags: 64,
  });
}
});


const sessions = new Map();

// Express app for control panel
const app = express();
const cookieParser = require("cookie-parser");
app.use(cookieParser());
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Simple header-based auth for owner actions
function requireOwner(req, res, next) {
  if (!PANEL_PASSWORD) {
    return res.status(200).next();
  }
  const token = req.headers['x-panel-token'];
  if (token && token === PANEL_PASSWORD) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}



// Public info about the bot
app.get('/api/info', async (req, res) => {
  if (!client.user) {
    return res.status(503).json({ error: 'Bot is not ready yet' });
  }

  try {
    const guilds = await client.guilds.fetch();
    const guildSummaries = [];
    for (const [id, guild] of guilds) {
      guildSummaries.push({
        id,
        name: guild.name,
      });
    }

    res.json({
      bot: {
        id: client.user.id,
        username: client.user.username,
        tag: client.user.tag,
        createdAt: client.user.createdAt,
      },
      presence: presenceState,
      guilds: guildSummaries,
    });
  } catch (err) {
    log("ERROR",`Error building info response: ${err}`);
    logToChannel(`Error building info response: ${err}`, "error");
    res.status(500).json({ error: 'Failed to fetch bot info' });
  }
});

app.get('/api/servers', (_req, res) => {
  try {
    let servers = {};
    if (fs.existsSync(serversFile)) {
      const raw = fs.readFileSync(serversFile, "utf8").trim();
      servers = raw ? JSON.parse(raw) : {};
    }

    const items = Object.values(servers).sort((a, b) => {
      return (b.memberCount || 0) - (a.memberCount || 0);
    });

    return res.json({
      ok: true,
      count: items.length,
      servers: items
    });
  } catch (err) {
    log("ERROR", `Failed to load server index data: ${err}`);
    logToChannel(`Failed to load server index data: ${err}`, "error");
    return res.status(500).json({ error: "Failed to load server data" });
  }
});





// Owner-only endpoint to update presence / name
app.post('/api/settings', requireOwner, async (req, res) => {
  if (!client.user) {
    return res.status(503).json({ error: 'Bot is not ready yet' });
  }

  const {
    status,
    activityText,
    activityType,
    username,
  } = req.body || {};

  if (status && !['online', 'idle', 'dnd', 'invisible'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  if (
    activityType &&
    !['Playing', 'Listening', 'Watching', 'Competing'].includes(activityType)
  ) {
    return res.status(400).json({ error: 'Invalid activityType value' });
  }

  if (status) presenceState.status = status;
  presenceState.activityText =
    typeof activityText === 'string' ? activityText : presenceState.activityText;
  if (activityType) presenceState.activityType = activityType;
  if (username && typeof username === 'string' && username.trim().length > 0) {
    presenceState.username = username.trim();
  }

  try {
    await applyPresenceFromState();
    return res.json({
      ok: true,
      presence: presenceState,
    });
  } catch (err) {
    console.error('Failed to update presence:', err);
    log("ERROR",`Failed to update presence: ${err}`);
    logToChannel(`Failed to update presence: ${err}`, "error");
    return res.status(500).json({ error: 'Failed to update presence' });
  }
});


app.post('/api/dm', requireOwner, async (req, res) => {
  const { userId, message } = req.body || {};

  if (!userId || !message) {
    return res.status(400).json({ error: 'userId and message are required' });
  }

  const now = Date.now();
  const lastDM = dmCooldowns.get(userId);

  if (lastDM && now - lastDM < DM_COOLDOWN) {
    const remaining = Math.ceil((DM_COOLDOWN - (now - lastDM)) / 1000);
    return res.status(429).json({
      error: `Cooldown active. Wait ${remaining}s before sending another DM.`,
    });
  }

  try {
    const user = await client.users.fetch(userId);
    await user.send(message);

    dmCooldowns.set(userId, now);

    res.json({
      ok: true,
      message: 'DM sent successfully',
    });
  } catch (err) {
    console.error('Failed to send DM:', err);
    log("ERROR",`Failed to send DM: ${err}`);
    logToChannel(`Failed to send DM: ${err}`, "error");
    res.status(500).json({ error: 'Failed to send DM' });
  }
});
app.post('/api/newsletter', requireOwner, async (req, res) => {

  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "message required" });
  }

  const delivered = await sendNewsletterToSubscribedGuilds(message);
  appendNewsletterAnnouncement({ source: "dashboard", message, delivered });

  res.json({
    ok: true,
    delivered
  });

});


// Serve main control panel HTML at root
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/serverlist', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'serverlist.html'));
});






// Start everything
app.listen(PORT, () => {
  console.log(`Control panel running on http://localhost:${PORT}`);
  log("INFO",`Control panel running on http://localhost:${PORT}`);
   
});

client
  .login(DISCORD_TOKEN)
  .catch((err) => {
    console.error('Failed to log into Discord:', err);
    log("ERROR", `Failed to log into Discord: ${err}`);
    logToChannel(`Failed to log into Discord: ${err}`, "error");
    process.exit(1);
  });

