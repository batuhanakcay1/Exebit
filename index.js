// index.js
const {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const {
  joinVoiceChannel,
  getVoiceConnection,
  VoiceConnectionStatus,
} = require("@discordjs/voice");

require("dotenv").config();
const express = require("express");

const TOKEN = process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID || "1364991919607779491";
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID || "1424114597446815995";
const WELCOME_CHANNEL_ID =
  process.env.WELCOME_CHANNEL_ID || "1424114597446815995";
const PORT = process.env.PORT || 3000;

if (!TOKEN) {
  console.error("Hata: TOKEN eksik! Replit Secrets içine TOKEN ekleyin.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// --- Slash Komutları ---
const commands = [
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Botun yanıt süresini ölçer"),
  new SlashCommandBuilder()
    .setName("yardim")
    .setDescription("Botun komut listesini gösterir"),
  new SlashCommandBuilder()
    .setName("sunucu")
    .setDescription("Sunucu bilgilerini gösterir"),
  new SlashCommandBuilder()
    .setName("kullanici")
    .setDescription("Kullanıcı bilgilerini gösterir")
    .addUserOption((o) =>
      o
        .setName("hedef")
        .setDescription("Bilgileri alınacak kullanıcı")
        .setRequired(false),
    ),
  new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Kullanıcının avatarını gönderir")
    .addUserOption((o) =>
      o
        .setName("hedef")
        .setDescription("Avatarı alınacak kullanıcı")
        .setRequired(false),
    ),
  new SlashCommandBuilder()
    .setName("yazitura")
    .setDescription("Yazı mı tura mı?"),
  new SlashCommandBuilder().setName("zar").setDescription("1-6 arası zar atar"),
  new SlashCommandBuilder().setName("saka").setDescription("Bir şaka söyler"),
  new SlashCommandBuilder()
    .setName("bilgi")
    .setDescription("Bot hakkında kısa bilgi"),
  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Üyeyi sunucudan atar (moderasyon)")
    .addUserOption((o) =>
      o.setName("hedef").setDescription("Atılacak kullanıcı").setRequired(true),
    )
    .addStringOption((o) =>
      o.setName("sebep").setDescription("Sebep").setRequired(false),
    ),
  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Üyeyi banlar (moderasyon)")
    .addUserOption((o) =>
      o
        .setName("hedef")
        .setDescription("Banlanacak kullanıcı")
        .setRequired(true),
    )
    .addStringOption((o) =>
      o.setName("sebep").setDescription("Sebep").setRequired(false),
    ),
  new SlashCommandBuilder()
    .setName("duyuru")
    .setDescription("Sunucuda herkese duyuru gönderir")
    .addStringOption((o) =>
      o.setName("mesaj").setDescription("Gönderilecek mesaj").setRequired(true),
    ),
].map((c) => c.toJSON());

// --- Yardımcı Fonksiyonlar ---
async function findLogChannel(guild) {
  if (!guild) return null;
  if (LOG_CHANNEL_ID) {
    const ch = guild.channels.cache.get(LOG_CHANNEL_ID);
    if (ch) return ch;
  }
  const names = ["mod-log", "log", "logs", "bot-logs", "modlog"];
  return (
    guild.channels.cache.find((c) => names.includes(c.name)) ||
    guild.systemChannel
  );
}

async function findWelcomeChannel(guild) {
  if (!guild) return null;
  if (WELCOME_CHANNEL_ID) {
    const ch = guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (ch) return ch;
  }
  const names = ["welcome", "hoşgeldin", "giris"];
  return (
    guild.channels.cache.find((c) => names.includes(c.name)) ||
    guild.systemChannel
  );
}

// --- Komut Kaydetme ---
client.once("ready", async () => {
  console.log(`${client.user.tag} aktif! Komutlar yükleniyor...`);
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  try {
    await rest.put(Routes.applicationGuildCommands(client.user.id, GUILD_ID), {
      body: commands,
    });
    console.log("Slash komutları başarıyla kaydedildi!");
  } catch (err) {
    console.error("Komut yükleme hatası:", err);
  }

  // --- SES KANALINA GİRİŞ ---
  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) return console.error("Sunucu bulunamadı!");

  const VOICE_CHANNEL_ID = "1424444217689903214"; // buraya ses kanalının ID’sini yaz

  const channel = guild.channels.cache.get(VOICE_CHANNEL_ID);
  if (!channel || channel.type !== 2)
    return console.error("Ses kanalı bulunamadı!");

  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: false,
  });

  connection.on(VoiceConnectionStatus.Ready, () => {
    console.log(`Bot ses kanalına katıldı: ${channel.name} ✅`);
  });

  connection.on(VoiceConnectionStatus.Disconnected, () => {
    console.log("Bot ses kanalından ayrıldı ❌");
  });
});

// --- Tek Listener: Slash + Buton ---
client.on("interactionCreate", async (interaction) => {
  try {
    // --- Slash Komutları ---
    if (interaction.isChatInputCommand()) {
      const name = interaction.commandName;

      if (name === "ping") {
        const latency = Date.now() - interaction.createdTimestamp;
        return interaction.reply(`🏓 Pong! Gecikme: ${latency} ms`);
      } else if (name === "yardim") {
        const embed = new EmbedBuilder()
          .setTitle("📘 Yardım Menüsü")
          .setDescription("Aşağıdaki kategorilerden birini seçebilirsin:")
          .addFields(
            {
              name: "🎮 Eğlence Komutları",
              value: "`/yazitura`, `/zar`, `/saka`",
            },
            {
              name: "ℹ️ Bilgi Komutları",
              value: "`/ping`, `/sunucu`, `/kullanici`, `/avatar`, `/bilgi`",
            },
            { name: "🛡️ Moderasyon", value: "`/kick`, `/ban`" },
          )
          .setColor("#5865F2")
          .setFooter({
            text: "Bot yardım sistemi",
            iconURL: client.user.displayAvatarURL(),
          })
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("help_fun")
            .setLabel("🎮 Eğlence")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("help_info")
            .setLabel("ℹ️ Bilgi")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId("help_mod")
            .setLabel("🛡️ Moderasyon")
            .setStyle(ButtonStyle.Danger),
        );

        return interaction.reply({
          embeds: [embed],
          components: [row],
          ephemeral: true,
        });
      } else if (name === "yazitura") {
        const res = Math.random() < 0.5 ? "Yazı" : "Tura";
        return interaction.reply(`🪙 Sonuç: **${res}**`);
      } else if (name === "zar") {
        const n = Math.floor(Math.random() * 6) + 1;
        return interaction.reply(`🎲 Zar: **${n}**`);
      } else if (name === "saka") {
        const jokes = [
          "Cosmin Denilen Arkadaş Eşinsel Oyunlar Oynuyor!",
          "Neden bilgisayar soğuk? Çünkü pencereleri açık!",
          "Programcı neden denize giremez? Çünkü suyun içinde 'float' var!",
          "Neden klavye uçamaz? Çünkü space'i var ama kanadı yok.",
        ];
        const j = jokes[Math.floor(Math.random() * jokes.length)];
        return interaction.reply(j);
      } else if (name === "bilgi") {
        const embed = new EmbedBuilder()
          .setTitle("🤖 Bot Bilgisi")
          .setDescription(
            "Ben çok amaçlı bir Discord botuyum! Yaratıcım EXE 💫",
          )
          .addFields(
            { name: "Dil", value: "JavaScript (Node.js)", inline: true },
            { name: "Kütüphane", value: "discord.js v14", inline: true },
            { name: "Durum", value: "Aktif ✅", inline: true },
          )
          .setColor("#FFD700")
          .setFooter({ text: "Teşekkürler botumu kullandığın için 💙" })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      // --- Kick ve Ban komutları ---
      else if (name === "kick") {
        if (
          !interaction.member.permissions.has(
            PermissionsBitField.Flags.KickMembers,
          )
        )
          return interaction.reply({
            content: "Yetkin yok ❌",
            ephemeral: true,
          });

        const user = interaction.options.getUser("hedef");
        const reason =
          interaction.options.getString("sebep") || "Sebep belirtilmedi";
        const member = await interaction.guild.members
          .fetch(user.id)
          .catch(() => null);
        if (!member)
          return interaction.reply({
            content: "Üye bulunamadı.",
            ephemeral: true,
          });

        await member.kick(reason);
        await interaction.reply(
          `${user.tag} sunucudan atıldı. Sebep: ${reason}`,
        );

        const logCh = await findLogChannel(interaction.guild);
        if (logCh)
          logCh.send({
            embeds: [
              new EmbedBuilder()
                .setTitle("Üye Atıldı")
                .addFields(
                  { name: "Hedef", value: `${user.tag}` },
                  { name: "Sebep", value: reason },
                )
                .setTimestamp(),
            ],
          });
      } else if (name === "ban") {
        if (
          !interaction.member.permissions.has(
            PermissionsBitField.Flags.BanMembers,
          )
        )
          return interaction.reply({
            content: "Yetkin yok ❌",
            ephemeral: true,
          });

        const user = interaction.options.getUser("hedef");
        const reason =
          interaction.options.getString("sebep") || "Sebep belirtilmedi";
        await interaction.guild.members.ban(user.id, { reason });
        return interaction.reply(`${user.tag} banlandı. Sebep: ${reason}`);
      }

      // --- Sunucu ve Kullanıcı bilgisi ---
      else if (name === "sunucu") {
        const g = interaction.guild;
        const embed = new EmbedBuilder()
          .setTitle(`📊 ${g.name}`)
          .setThumbnail(g.iconURL({ dynamic: true }))
          .addFields(
            { name: "🆔 Sunucu ID", value: g.id, inline: true },
            { name: "👥 Üye Sayısı", value: `${g.memberCount}`, inline: true },
            { name: "👑 Kurucu", value: `<@${g.ownerId}>`, inline: true },
            {
              name: "📅 Oluşturulma",
              value: `<t:${Math.floor(g.createdTimestamp / 1000)}:R>`,
              inline: true,
            },
          )
          .setColor("#7289DA")
          .setFooter({ text: "Sunucu Bilgisi", iconURL: g.iconURL() })
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      } else if (name === "kullanici") {
        const target = interaction.options.getUser("hedef") || interaction.user;
        const member = await interaction.guild.members
          .fetch(target.id)
          .catch(() => null);
        const embed = new EmbedBuilder()
          .setTitle(`${target.tag}`)
          .setThumbnail(target.displayAvatarURL({ dynamic: true }))
          .addFields(
            { name: "🆔 Kullanıcı ID", value: target.id, inline: true },
            {
              name: "📅 Discord Katılımı",
              value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`,
              inline: true,
            },
            {
              name: "👋 Sunucu Katılımı",
              value: member
                ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
                : "Bilinmiyor",
              inline: true,
            },
          )
          .setColor("#43B581")
          .setFooter({
            text: "Kullanıcı Bilgisi",
            iconURL: target.displayAvatarURL(),
          })
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      } else if (name === "avatar") {
        const target = interaction.options.getUser("hedef") || interaction.user;
        const embed = new EmbedBuilder()
          .setTitle(`${target.tag} - Avatar`)
          .setImage(target.displayAvatarURL({ dynamic: true, size: 1024 }))
          .setColor("#FFD700");
        return interaction.reply({ embeds: [embed] });
      }
    }

    // --- Butonlar ---
    else if (interaction.isButton()) {
      const embeds = {
        help_fun: new EmbedBuilder()
          .setTitle("🎮 Eğlence Komutları")
          .setDescription("• `/yazitura`\n• `/zar`\n• `/saka`")
          .setColor("#00FF99"),
        help_info: new EmbedBuilder()
          .setTitle("ℹ️ Bilgi Komutları")
          .setDescription(
            "• `/ping`\n• `/sunucu`\n• `/kullanici`\n• `/avatar`\n• `/bilgi`",
          )
          .setColor("#00BFFF"),
        help_mod: new EmbedBuilder()
          .setTitle("🛡️ Moderasyon Komutları")
          .setDescription("• `/kick`\n• `/ban`")
          .setColor("#FF5555"),
      };

      return interaction.update({
        embeds: [embeds[interaction.customId]],
        components: [],
      });
    }
  } catch (err) {
    console.error("Komut hatası:", err);
    if (!interaction.replied)
      await interaction.reply({
        content: "Komut çalıştırılırken hata oluştu.",
        ephemeral: true,
      });
  }
});

// === Mesaj Silinme Logu ===
client.on("messageDelete", async (message) => {
  const logCh = await findLogChannel(message.guild);
  if (!logCh) return;
  const embed = new EmbedBuilder()
    .setTitle("🗑️ Mesaj Silindi")
    .addFields(
      {
        name: "Yazan",
        value: message.author ? message.author.tag : "Bilinmiyor",
      },
      { name: "Kanal", value: `${message.channel}` },
      { name: "İçerik", value: message.content || "(boş)" },
    )
    .setColor("#FF0000")
    .setTimestamp();
  logCh.send({ embeds: [embed] });
});

// === Karşılama Mesajı ===
client.on("guildMemberAdd", async (member) => {
  const ch = await findWelcomeChannel(member.guild);
  if (ch)
    ch.send(`Hoş geldin ${member.user}, aramıza katıldığın için memnunuz! 🎉 @everyone`);
});

// === Express (uptime) ===
const app = express(); // Yeni express instance

app.get("/", (req, res) => res.send("Bot aktif ✅"));

app.listen(PORT, () =>
  console.log(`Express server ${PORT} portunda çalışıyor`),
);

// === Bot Girişi ===
client.login(TOKEN);
