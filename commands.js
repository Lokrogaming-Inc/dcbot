const { SlashCommandBuilder } = require("discord.js");


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
  )
  ];

  module.exports = commands.map(cmd => cmd.toJSON());