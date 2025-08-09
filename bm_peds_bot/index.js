/**
 * B&M PEDS — Complete Discord Bot (Guild-Specific)
 * Requires: discord.js v14, @discordjs/rest, discord-api-types, dotenv
 *
 * Environment variables required:
 *   DISCORD_TOKEN  -> Bot token
 *   CLIENT_ID      -> Application (client) id
 *   IMAGE_URL      -> Raw URL to BENJO image (thumbnail)
 *
 * Start command: node index.js
 */

const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ChannelType, Events, StringSelectMenuBuilder } = require('discord.js');
require('dotenv').config();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = '1403412038524342413'; // Guild-specific registration
const IMAGE_URL = process.env.IMAGE_URL || null;

if (!DISCORD_TOKEN) {
  console.error('ERROR: DISCORD_TOKEN not set in environment variables.');
  process.exit(1);
}
if (!CLIENT_ID) {
  console.error('ERROR: CLIENT_ID not set in environment variables. Slash command registration will fail.');
  process.exit(1);
}
if (!GUILD_ID) {
    console.error('ERROR: GUILD_ID is not set. This bot is configured to run on a specific guild.');
    process.exit(1);
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
// *** חשוב: ודא שיצרת בשרת קטגוריות בשמות אלו בדיוק ***
const PURCHASE_CATEGORY_NAME = 'רכישה'; // Parent category for purchase tickets
const QUESTION_CATEGORY_NAME = 'שאלה';   // Parent category for question tickets

const VERIFY_BUTTON_ID = 'bm_verify';
const OPEN_TICKET_MENU_ID = 'category_select';
const REQUEST_CLOSE_ID = 'bm_request_close';
const CONFIRM_CLOSE_ID = 'bm_confirm_close';
const CANCEL_CLOSE_ID = 'bm_cancel_close';
// ===========================

client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// ---------- Slash commands registration (Guild-only) ----------
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

  const commands = [
    { name: 'verify', description: 'שלח הודעת אימות עם כפתור' },
    { name: 'ticket', description: 'שלח הודעת פתיחת טיקט עם בחירת קטגוריה' },
    { name: 'close', description: 'סגור טיקט (מומלץ להשתמש בכפתורי הסגירה)' }
  ];

  try {
    console.log(`Started refreshing ${commands.length} application (/) commands for guild ${GUILD_ID}.`);
    await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands }
    );
    console.log(`Successfully reloaded application (/) commands for guild ${GUILD_ID}.`);
  } catch (err) {
    console.error('Failed registering guild commands:', err);
  }
}

registerCommands().catch(console.error);

// ---------- Interaction handling ----------
client.on(Events.InteractionCreate, async interaction => {
    if (interaction.guildId !== GUILD_ID) return;

  try {
    // Slash command handling
    if (interaction.isChatInputCommand()) {
      const cmd = interaction.commandName;
      const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

      if (!isAdmin) return interaction.reply({ content: 'אין לך הרשאה להריץ פקודה זו.', ephemeral: true });

      if (cmd === 'verify') {
        const embed = new EmbedBuilder()
          .setTitle('אימות משתמשים')
          .setDescription('לחץ על הכפתור למטה כדי לקבל גישה לשרת.')
          .setColor(0x00FF66);
        if (IMAGE_URL) embed.setThumbnail(IMAGE_URL);
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(VERIFY_BUTTON_ID).setLabel('אמת אותי').setStyle(ButtonStyle.Success));
        await interaction.reply({ embeds: [embed], components: [row] });
        return;
      }

      if (cmd === 'ticket') {
        const embed = new EmbedBuilder()
          .setTitle('פתיחת פנייה / טיקט')
          .setDescription('בחר את הקטגוריה של הטיקט שלך למטה')
          .setColor(0x0099FF);
        if (IMAGE_URL) embed.setThumbnail(IMAGE_URL);
        const row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(OPEN_TICKET_MENU_ID)
            .setPlaceholder('בחר קטגוריה')
            .addOptions(
              { label: 'רכישה', value: 'רכישה', description: 'טיקט הקשור לרכישה', emoji: '🛒' },
              { label: 'שאלה', value: 'שאלה', description: 'טיקט הקשור לשאלה', emoji: '❓' }
            )
        );
        await interaction.reply({ embeds: [embed], components: [row] });
        return;
      }

      if (cmd === 'close') {
        if (!interaction.channel || (!interaction.channel.name.startsWith('רכישה-') && !interaction.channel.name.startsWith('שאלה-'))) {
          return interaction.reply({ content: 'פקודה זו זמינה רק בתוך ערוץ טיקט.', ephemeral: true });
        }
        const isStaff = interaction.member.roles.cache.some(r => r.name === STAFF_ROLE_NAME) || interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
        if (!isStaff) return interaction.reply({ content: 'אין לך הרשאה לסגור טיקט זה.', ephemeral: true });
        await interaction.reply({ content: 'הטיקט ייסגר כעת.' });
        setTimeout(() => interaction.channel.delete().catch(() => {}), 1000);
        return;
      }
    }

    // Select Menu handling (for opening tickets)
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === OPEN_TICKET_MENU_ID) {
        const isStaff = interaction.member.roles.cache.some(r => r.name === STAFF_ROLE_NAME);

        // --- הוספת לוגיקה לבדיקת טיקט קיים (אלא אם המשתמש הוא איש צוות) ---
        if (!isStaff) {
            const existing = interaction.guild.channels.cache.find(ch => ch.topic === `ticket-opener:${interaction.user.id}`);
            if (existing) {
                return interaction.reply({ content: `כבר קיים טיקט פתוח עבורך: ${existing}. רק חברי צוות יכולים לפתוח מספר טיקטים.`, ephemeral: true });
            }
        }
        
        const selectedCategoryValue = interaction.values[0]; // 'רכישה' or 'שאלה'
        const channelName = `${selectedCategoryValue}-${interaction.user.username.toLowerCase()}`.slice(0, 90);

        // --- קביעת קטגוריית האב הנכונה על סמך הבחירה ---
        let parentCategoryName;
        if (selectedCategoryValue === 'רכישה') {
            parentCategoryName = PURCHASE_CATEGORY_NAME;
        } else if (selectedCategoryValue === 'שאלה') {
            parentCategoryName = QUESTION_CATEGORY_NAME;
        }

        const parentCategory = interaction.guild.channels.cache.find(c => c.name === parentCategoryName && c.type === ChannelType.GuildCategory);

        // Permission overwrites
        const perms = [
          { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }, // @everyone
          { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
          { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] }
        ];
        const staffRole = interaction.guild.roles.cache.find(r => r.name === STAFF_ROLE_NAME);
        if (staffRole) perms.push({ id: staffRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] });
        
        try {
          const channel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: parentCategory ? parentCategory.id : null, // Set parent category
            permissionOverwrites: perms,
            topic: `ticket-opener:${interaction.user.id}`
          });
          
          const embed = new EmbedBuilder()
            .setDescription(`<@${interaction.user.id}> תודה שפתחת טיקט 🙂 אחד מהצוות יגיע אליך בקרוב, בינתיים אנא המתן בסבלנות.`)
            .setColor(0x00AAFF);
          if (IMAGE_URL) embed.setThumbnail(IMAGE_URL);

          const closeRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`${REQUEST_CLOSE_ID}::${interaction.user.id}`).setLabel('🔒 בקשת סגירה').setStyle(ButtonStyle.Danger)
          );

          await channel.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [closeRow] });
          await interaction.reply({ content: `✅ טיקט נפתח: ${channel}`, ephemeral: true });

        } catch (err) {
          console.error('Create ticket channel error:', err);
          return interaction.reply({ content: '❌ שגיאה ביצירת הטיקט. ודא שהבוט הוא בעל הרשאות "Manage Channels" ושהקטגוריות "רכישה" ו"שאלה" קיימות.', ephemeral: true });
        }
        return;
      }
    }

    // Button handling
    if (interaction.isButton()) {
      const id = interaction.customId;

      if (id === VERIFY_BUTTON_ID) {
        const role = interaction.guild.roles.cache.find(r => r.name === MEMBER_ROLE_NAME);
        if (!role) return interaction.reply({ content: `❌ לא נמצא רול בשם ${MEMBER_ROLE_NAME}`, ephemeral: true });
        try {
          if (interaction.member.roles.cache.has(role.id)) {
            return interaction.reply({ content: '⚠️ כבר יש לך את הרול.', ephemeral: true });
          }
          await interaction.member.roles.add(role);
          return interaction.reply({ content: '✅ קיבלת את הרול בהצלחה!', ephemeral: true });
        } catch (e) {
          console.error('Add role error:', e);
          return interaction.reply({ content: '❌ לא הצלחתי להוסיף את הרול — בדוק הרשאות של הבוט.', ephemeral: true });
        }
      }

      if (id.startsWith(`${REQUEST_CLOSE_ID}::`)) {
        const [, openerId] = id.split('::');
        const isOpener = interaction.user.id === openerId;
        const isStaff = interaction.member.roles.cache.some(r => r.name === STAFF_ROLE_NAME) || interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
        if (!isOpener && !isStaff) {
          return interaction.reply({ content: 'רק פותח הטיקט או איש צוות יכולים לבקש את סגירתו.', ephemeral: true });
        }
        const confirmRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`${CONFIRM_CLOSE_ID}::${openerId}`).setLabel('✅ סגור (Staff בלבד)').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId(`${CANCEL_CLOSE_ID}::${openerId}`).setLabel('❌ ביטול').setStyle(ButtonStyle.Secondary)
        );
        await interaction.reply({ content: `המשתמש <@${interaction.user.id}> מבקש לסגור את הטיקט. לאישור, על איש צוות ללחוץ על הכפתור.`, components: [confirmRow] });
        return;
      }

      if (id.startsWith(`${CONFIRM_CLOSE_ID}::`)) {
        const isStaff = interaction.member.roles.cache.some(r => r.name === STAFF_ROLE_NAME) || interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
        if (!isStaff) {
          return interaction.reply({ content: 'רק חבר צוות עם רול [・Staff・] יכול לאשר סגירה זו.', ephemeral: true });
        }
        await interaction.reply({ content: '✅ מאשר סגירה... הטיקט יימחק בעוד מספר שניות.' });
        setTimeout(() => interaction.channel.delete('Closed by staff').catch(console.error), 3000);
        return;
      }

      if (id.startsWith(`${CANCEL_CLOSE_ID}::`)) {
         await interaction.message.delete();
         await interaction.reply({ content: 'בקשת הסגירה בוטלה. הטיקט נשאר פתוח.', ephemeral: true });
         return;
      }
    }
  } catch (err) {
    console.error('Interaction error:', err);
    if (interaction && !interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({ content: 'אירעה שגיאה פנימית.', ephemeral: true });
      } catch {}
    }
  }
});

// Login
client.login(DISCORD_TOKEN);
