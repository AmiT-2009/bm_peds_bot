/**
 * B&M PEDS — Complete Discord Bot
 * Requires: discord.js v14, @discordjs/rest, discord-api-types, dotenv
 *
 * Environment variables required:
 *   DISCORD_TOKEN  -> Bot token
 *   CLIENT_ID      -> Application (client) id
 *   IMAGE_URL      -> Raw URL to BENJO image (thumbnail)
 *   GUILD_ID       -> (optional) for fast registration of slash commands during testing
 *
 * Start command: node index.js
 */

const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ChannelType, Events, AttachmentBuilder, StringSelectMenuBuilder } = require('discord.js');
require('dotenv').config();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID || null; // optional for testing (register as guild command)
const IMAGE_URL = process.env.IMAGE_URL || null;


if (!DISCORD_TOKEN) {
  console.error('ERROR: DISCORD_TOKEN not set in environment variables.');
  process.exit(1);
}
if (!CLIENT_ID) {
  console.warn('Warning: CLIENT_ID not set. Slash command registration will be skipped (or fail).');
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

// ====== Configuration ======
const MEMBER_ROLE_NAME = '[・Member・]';
const STAFF_ROLE_NAME = '[・Staff・]';
const TICKET_CATEGORY_NAME = 'רכישה'; // optional category name
const TICKET_PREFIX = 'רכישה-';
const VERIFY_BUTTON_ID = 'bm_verify';
const OPEN_TICKET_BUTTON_ID = 'bm_open_ticket';
const REQUEST_CLOSE_ID = 'bm_request_close';
const CONFIRM_CLOSE_ID = 'bm_confirm_close';
const CANCEL_CLOSE_ID = 'bm_cancel_close';
// ===========================

client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// ---------- Slash commands registration ----------
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');

async function registerCommands() {
  if (!CLIENT_ID) return;
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

  const commands = [
    { name: 'verify', description: 'שלח הודעת אימות עם כפתור' },
    { name: 'ticket', description: 'שלח הודעת פתיחת טיקט' },
    { name: 'close', description: 'סגור טיקט (מומלץ להשתמש בכפתורי הסגירה)' }
  ];

  try {
    if (GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
      console.log('Slash commands registered to guild', GUILD_ID);
    } else {
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      console.log('Global slash commands registered (may take up to 1 hour to appear).');
    }
  } catch (err) {
    console.error('Failed registering commands:', err);
  }
}

registerCommands().catch(console.error);

// ---------- Interaction handling ----------
client.on(Events.InteractionCreate, async interaction => {
  try {
    // Slash command handling
    if (interaction.isChatInputCommand()) {
      const cmd = interaction.commandName;

      // Only allow admins to send the public verify/ticket messages
      const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

      if (cmd === 'verify') {
        if (!isAdmin) return interaction.reply({ content: 'אין לך הרשאה להריץ פקודה זו.', ephemeral: true });

        const embed = new EmbedBuilder()
          .setTitle('אימות משתמשים')
          .setDescription('לחץ על הכפתור למטה כדי לקבל גישה לשרת.')
          .setColor(0x00FF66);

        if (IMAGE_URL) {
          embed.setThumbnail(IMAGE_URL);
        }

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(VERIFY_BUTTON_ID).setLabel('אמת אותי').setStyle(ButtonStyle.Success)
        );

        await interaction.reply({ embeds: [embed], components: [row] });
        return;
      }

      if (cmd === 'ticket') {
        if (!isAdmin) return interaction.reply({ content: 'אין לך הרשאה להריץ פקודה זו.', ephemeral: true });

        const embed = new EmbedBuilder()
          .setTitle('פתיחת פנייה / טיקט')
          .setDescription('בחר את הקטגוריה של הטיקט שלך למטה')
          .setColor(0x0099FF);

        if (IMAGE_URL) embed.setThumbnail(IMAGE_URL);

        // Create the select menu for choosing ticket category
        const row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('category_select')
            .setPlaceholder('בחר קטגוריה')
            .addOptions(
              {
                label: 'רכישה',
                value: 'purchase',
                description: 'טיקט הקשור לרכישה',
                emoji: '🛒'
              },
              {
                label: 'שאלה',
                value: 'question',
                description: 'טיקט הקשור לשאלה',
                emoji: '❓'
              }
            )
        );

        await interaction.reply({ embeds: [embed], components: [row] });
        return;
      }

      if (cmd === 'close') {
        // fallback — do not rely on this for normal flow
        if (!interaction.channel || !interaction.channel.name.startsWith(TICKET_PREFIX)) {
          return interaction.reply({ content: 'פקודה זו זמינה רק בתוך ערוץ טיקט.', ephemeral: true });
        }
        // require staff or admin to close
        const isStaff = interaction.member.roles.cache.some(r => r.name === STAFF_ROLE_NAME) || interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
        if (!isStaff) return interaction.reply({ content: 'אין לך הרשאה לסגור טיקט זה.', ephemeral: true });

        await interaction.reply({ content: 'הטיקט ייסגר כעת.' });
        setTimeout(() => interaction.channel.delete().catch(() => {}), 1000);
        return;
      }
    }

    // Button handling
    if (interaction.isButton()) {
      const id = interaction.customId;

      // VERIFY button: give MEMBER role
      if (id === VERIFY_BUTTON_ID) {
        const role = interaction.guild.roles.cache.find(r => r.name === MEMBER_ROLE_NAME);
        if (!role) return interaction.reply({ content: `❌ לא נמצא רול בשם ${MEMBER_ROLE_NAME}`, ephemeral: true });

        try {
          await interaction.member.roles.add(role);
          return interaction.reply({ content: '✅ קיבלת את ה־Role בהצלחה!', ephemeral: true });
        } catch (e) {
          console.error('Add role error:', e);
          return interaction.reply({ content: '❌ לא הצלחתי להוסיף את הרול — בדוק הרשאות של הבוט.', ephemeral: true });
        }
      }

      // OPEN TICKET button
      if (id === OPEN_TICKET_BUTTON_ID) {
        // check if user already has ticket
        const safeName = `${TICKET_PREFIX}${interaction.user.username}`.slice(0, 90);
        const existing = interaction.guild.channels.cache.find(ch => ch.name === safeName);
        if (existing) return interaction.reply({ content: `כבר קיים טיקט עבורך: ${existing}`, ephemeral: true });

        // Get the selected category (purchase or question)
        const selectedCategory = interaction.values[0]; // It will contain either 'purchase' or 'question'

        // Set category name and emoji
        let categoryName = '';
        if (selectedCategory === 'purchase') {
          categoryName = `רכישה-${interaction.user.username}`;
        } else if (selectedCategory === 'question') {
          categoryName = `שאלה-${interaction.user.username}`;
        }

        // Find the correct category
        const category = interaction.guild.channels.cache.find(c => c.name === TICKET_CATEGORY_NAME && c.type === ChannelType.GuildCategory);

        // Permission overwrites
        const perms = [
          { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }, // everyone denied
          { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
          { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] }
        ];

        const staffRole = interaction.guild.roles.cache.find(r => r.name === STAFF_ROLE_NAME);
        if (staffRole) perms.push({ id: staffRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] });

        // Create channel
        let channel;
        try {
          channel = await interaction.guild.channels.create({
            name: categoryName,
            type: ChannelType.GuildText,
            parent: category ? category.id : null,
            permissionOverwrites: perms,
            topic: `ticket-opener:${interaction.user.id}`
          });
        } catch (err) {
          console.error('Create ticket channel error:', err);
          return interaction.reply({ content: '❌ שגיאה ביצירת הטיקט. ודא שלבוט יש הרשאות מתאימות.', ephemeral: true });
        }

        // Send short message + thumbnail image + close button
        const embed = new EmbedBuilder()
          .setDescription(`<@${interaction.user.id}> תודה שפתחת טיקט 🙂 אחד מהצוות יגיע אליך בקרוב, בינתיים אנא המתן בסבלנות.`)
          .setColor(0x00AAFF);

        if (IMAGE_URL) embed.setThumbnail(IMAGE_URL);

        const closeRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`${REQUEST_CLOSE_ID}::${interaction.user.id}`).setLabel('🔒 בקשת סגירה').setStyle(ButtonStyle.Danger)
        );

        await channel.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [closeRow] });
        await interaction.reply({ content: `✅ טיקט נפתח: ${channel}`, ephemeral: true });
        return;
      }

      // REQUEST CLOSE (clicked by opener or member) -> shows confirm with two buttons
      if (id.startsWith(`${REQUEST_CLOSE_ID}::`)) {
        const parts = id.split('::');
        const openerId = parts[1];

        // allow opener or members with Member role or admins to request close
        const isOpener = interaction.user.id === openerId;
        const hasMemberRole = interaction.member.roles.cache.some(r => r.name === MEMBER_ROLE_NAME);
        const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

        if (!isOpener && !hasMemberRole && !isAdmin) {
          return interaction.reply({ content: 'אין לך הרשאה לבקש סגירת טיקט זה.', ephemeral: true });
        }

        const confirmRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`${CONFIRM_CLOSE_ID}::${openerId}`).setLabel('✅ סגור (Staff בלבד)').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId(`${CANCEL_CLOSE_ID}::${openerId}`).setLabel('❌ ביטול').setStyle(ButtonStyle.Secondary)
        );

        // send visible message so staff sees it
        await interaction.reply({ content: 'האם אתה בטוח שברצונך לסגור את הטיקט? (רק Staff יוכל לאשר את הסגירה)', components: [confirmRow] });
        return;
      }

      // CONFIRM CLOSE (only staff can press)
      if (id.startsWith(`${CONFIRM_CLOSE_ID}::`)) {
        const parts = id.split('::');
        const openerId = parts[1];

        const isStaff = interaction.member.roles.cache.some(r => r.name === STAFF_ROLE_NAME) || interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
        if (!isStaff) {
          return interaction.reply({ content: 'רק חבר צוות עם רול [・Staff・] יכול לאשר סגירה זו.', ephemeral: true });
        }

        const chan = interaction.channel;
        await interaction.reply({ content: '✅ הטיקט ייסגר כעת.', ephemeral: true });
        setTimeout(() => chan.delete('Closed by staff').catch(() => {}), 1200);
        return;
      }

      // CANCEL CLOSE
      if (id.startsWith(`${CANCEL_CLOSE_ID}::`)) {
        await interaction.reply({ content: 'ביטול — הטיקט נשאר פתוח.', ephemeral: true });
        return;
      }
    }
  } catch (err) {
    console.error('Interaction error:', err);
    if (interaction && !interaction.replied) {
      try { await interaction.reply({ content: 'אירעה שגיאה פנימית.', ephemeral: true }); } catch {}
    }
  }
});

// ---------- Optional text commands (backwards compatibility) ----------
client.on(Events.MessageCreate, async message => {
  if (!message.guild || message.author.bot) return;

  if (message.content === '!verifymsg') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
    const embed = new EmbedBuilder().setTitle('אימות משתמשים').setDescription('לחץ על הכפתור למטה כדי לקבל גישה לשרת.').setColor(0x00FF66);
    if (IMAGE_URL) embed.setThumbnail(IMAGE_URL);
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(VERIFY_BUTTON_ID).setLabel('אמת אותי').setStyle(ButtonStyle.Success));
    await message.channel.send({ embeds: [embed], components: [row] });
    return;
  }

  if (message.content === '!ticketmsg') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
    const embed = new EmbedBuilder().setTitle('פתיחת פנייה / טיקט').setDescription('לחץ על הכפתור למטה כדי לפתוח פנייה לצוות.').setColor(0x0099FF);
    if (IMAGE_URL) embed.setThumbnail(IMAGE_URL);
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(OPEN_TICKET_BUTTON_ID).setLabel('פתח טיקט').setStyle(ButtonStyle.Primary));
    await message.channel.send({ embeds: [embed], components: [row] });
    return;
  }
});

// Login
client.login(DISCORD_TOKEN);
