module.exports = async (interaction) => {

if (!interaction.isChatInputCommand()) return;

if (interaction.commandName === "ping") {
  await interaction.reply("🏓 Pong!");
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

  if (!guild) {
    return interaction.reply({
      content: "❌ Dieser Command kann nur in einem Server verwendet werden.",
      ephemeral: true
    });
  }
  
  const now = Date.now();
  
  const lastUse = promotionCooldowns[guild.id];
  
  if (lastUse && now - lastUse < COOLDOWN) {
  
    const nextUse = Math.floor((lastUse + COOLDOWN) / 1000);
  
    return interaction.reply({
      content: `⏳ Dieser Server wurde bereits promoted.\nDu kannst ihn wieder **<t:${nextUse}:R>** promoten.`,
      ephemeral: true
    });
  }

  
  const channel = guild.channels.cache.find(
    c => c.type === 0 && c.permissionsFor(guild.members.me).has("CreateInstantInvite")
  );

  if (!channel) {
    return interaction.reply({
      content: "❌ Kein Channel gefunden, in dem ich einen Invite erstellen kann.",
      ephemeral: true
    });
  }

 
  const createdInvite = await channel.createInvite({
    maxAge: 0,
    maxUses: 0,
    reason: "Server Promotion"
  });

  const inviteCode = createdInvite.code;

 
  const apiRes = await fetch(`https://dcs.lol/api/v1/discord/${inviteCode}`);
  const JSONRes = await apiRes.json();

  if (!JSONRes.success) {
    return interaction.reply({
      content: "❌ Serverdaten konnten nicht geladen werden.",
      ephemeral: true
    });
  }

  const data = JSONRes.data;
  const server = data.server;

  const embed = new EmbedBuilder()
    .setTitle(server.name)
    .setURL(createdInvite.url)
    .setDescription(server.description || "Keine Beschreibung vorhanden.")
    .setThumbnail(server.icon)
    .addFields(
      { name: "👥 Mitglieder", value: `${data.memberCount.toLocaleString()}`, inline: true },
      { name: "🟢 Online", value: `${data.onlineCount.toLocaleString()}`, inline: true },
      { name: "🚀 Boosts", value: `${server.premiumSubscriptionCount}`, inline: true }
    )
    .setColor(0x5865F2)
    .setFooter({ text: "Serverinfo provided by DCS.lol API" });

  if (server.banner) embed.setImage(server.banner);

  const promoChannel = await interaction.client.channels.fetch(process.env.PROMO_CHANNEL_ID);

  await promoChannel.send({
    content: `📢 **Neue Server Promotion!**\n${createdInvite.url}`,
    embeds: [embed]
  });

  
  promotionCooldowns[guild.id] = now;

fs.writeFileSync(
cooldownFile,
JSON.stringify(promotionCooldowns, null, 2)
);

  await interaction.reply({
    content: "✅ Promotion wurde gepostet.",
    ephemeral: true
  });

} catch (err) {
  console.error(err);
  logToChannel(err, "error")

  interaction.reply({
    content: "❌ Fehler beim Erstellen der Promotion.",
    ephemeral: true
  });
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
};
