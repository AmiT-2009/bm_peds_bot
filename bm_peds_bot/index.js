// הקוד הסופי של הבוט
const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ChannelType, Events, StringSelectMenuBuilder } = require('discord.js');
require('dotenv').config();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = '1403412038524342413';
const IMAGE_URL = process.env.IMAGE_URL || null;

if (!DISCORD_TOKEN || !GUILD_ID) {
  console.error('ERROR: Missing DISCORD_TOKEN or GUILD_ID.');
  process.exit(1);
}

const client = new Client({
  intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent ],
  partials: [Partials.Channel]
});

const MEMBER_ROLE_NAME = '[・Member・]';
const STAFF_ROLE_NAME = '[・Staff・]';
const PURCHASE_CATEGORY_NAME = 'רכישה';
const QUESTION_CATEGORY_NAME = 'שאלה';

const VERIFY_BUTTON_ID = 'bm_verify';
const OPEN_TICKET_MENU_ID = 'category_select';
const REQUEST_CLOSE_ID = 'bm_request_close';
const CONFIRM_CLOSE_ID = 'bm_confirm_close';
const CANCEL_CLOSE_ID = 'bm_cancel_close';

client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.inGuild() || interaction.guildId !== GUILD_ID) return;

  try {
    if (interaction.isChatInputCommand()) {
      const isStaff = interaction.member.roles.cache.some(r => r.name === STAFF_ROLE_NAME);
      if (!isStaff) {
        return interaction.reply({ content: 'רק חברי צוות עם רול [・Staff・] יכולים להשתמש בפקודה זו.', ephemeral: true });
      }

      if (interaction.commandName === 'verify') {
        const embed = new EmbedBuilder().setTitle('אימות משתמשים').setDescription('לחץ על הכפתור למטה כדי לקבל גישה לשרת.').setColor(0x00FF66);
        if (IMAGE_URL) embed.setThumbnail(IMAGE_URL);
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(VERIFY_BUTTON_ID).setLabel('אמת אותי').setStyle(ButtonStyle.Success));
        await interaction.reply({ content: '✅ הודעת האימות נשלחה.', ephemeral: true });
        await interaction.channel.send({ embeds: [embed], components: [row] });
      }

      if (interaction.commandName === 'ticket') {
        const embed = new EmbedBuilder().setTitle('פתיחת פנייה / טיקט').setDescription('בחר את הקטגוריה של הטיקט שלך למטה').setColor(0x0099FF);
        if (IMAGE_URL) embed.setThumbnail(IMAGE_URL);
        const row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder().setCustomId(OPEN_TICKET_MENU_ID).setPlaceholder('בחר קטגוריה')
            .addOptions(
              { label: 'רכישה', value: 'רכישה', description: 'טיקט הקשור לרכישה', emoji: '🛒' },
              { label: 'שאלה', value: 'שאלה', description: 'טיקט הקשור לשאלה', emoji: '❓' }
            )
        );
        await interaction.reply({ content: '✅ ההודעה לפתיחת טיקטים נשלחה.', ephemeral: true });
        await interaction.channel.send({ embeds: [embed], components: [row] });
      }

      if (interaction.commandName === 'close') {
        if (!interaction.channel.name.startsWith('רכישה-') && !interaction.channel.name.startsWith('שאלה-')) {
          return interaction.reply({ content: 'פקודה זו זמינה רק בתוך ערוץ טיקט.', ephemeral: true });
        }
        await interaction.reply({ content: 'הטיקט ייסגר כעת.' });
        setTimeout(() => interaction.channel.delete().catch(() => {}), 1000);
      }
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === OPEN_TICKET_MENU_ID) {
        const isStaffMember = interaction.member.roles.cache.some(r => r.name === STAFF_ROLE_NAME);
        if (!isStaffMember) {
          const existing = interaction.guild.channels.cache.find(ch => ch.topic === `ticket-opener:${interaction.user.id}`);
          if (existing) return interaction.reply({ content: `כבר קיים טיקט פתוח עבורך: ${existing}. רק חברי צוות יכולים לפתוח מספר טיקטים.`, ephemeral: true });
        }

        const selectedValue = interaction.values[0];
        const channelName = `${selectedValue}-${interaction.user.username.toLowerCase()}`.slice(0, 90);
        const parentName = selectedValue === 'רכישה' ? PURCHASE_CATEGORY_NAME : QUESTION_CATEGORY_NAME;
        const parentCategory = interaction.guild.channels.cache.find(c => c.name === parentName && c.type === ChannelType.GuildCategory);
        const staffRole = interaction.guild.roles.cache.find(r => r.name === STAFF_ROLE_NAME);

        const perms = [
          { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
          { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] }
        ];
        if (staffRole) perms.push({ id: staffRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] });

        const channel = await interaction.guild.channels.create({ name: channelName, type: ChannelType.GuildText, parent: parentCategory?.id, permissionOverwrites: perms, topic: `ticket-opener:${interaction.user.id}` });
        const embed = new EmbedBuilder().setDescription(`<@${interaction.user.id}> תודה שפתחת טיקט 🙂 אחד מהצוות יגיע אליך בקרוב.`).setColor(0x00AAFF);
        if (IMAGE_URL) embed.setThumbnail(IMAGE_URL);
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`${REQUEST_CLOSE_ID}::${interaction.user.id}`).setLabel('🔒 בקשת סגירה').setStyle(ButtonStyle.Danger));

        await channel.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [row] });
        await interaction.reply({ content: `✅ טיקט נפתח: ${channel}`, ephemeral: true });
      }
    }

    if (interaction.isButton()) {
      const isStaff = interaction.member.roles.cache.some(r => r.name === STAFF_ROLE_NAME);
      const [customId, openerId] = interaction.customId.split('::');

      if (customId === VERIFY_BUTTON_ID) {
        const role = interaction.guild.roles.cache.find(r => r.name === MEMBER_ROLE_NAME);
        if (!role) return interaction.reply({ content: `❌ לא נמצא רול בשם ${MEMBER_ROLE_NAME}`, ephemeral: true });
        if (interaction.member.roles.cache.has(role.id)) return interaction.reply({ content: '⚠️ כבר יש לך את הרול.', ephemeral: true });
        await interaction.member.roles.add(role);
        return interaction.reply({ content: '✅ קיבלת את הרול בהצלחה!', ephemeral: true });
      }

      if (customId === REQUEST_CLOSE_ID) {
        if (interaction.user.id !== openerId && !isStaff) {
          return interaction.reply({ content: 'רק פותח הטיקט או איש צוות יכולים לבקש את סגירתו.', ephemeral: true });
        }
        const confirmRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`${CONFIRM_CLOSE_ID}::${openerId}`).setLabel('✅ סגור (Staff בלבד)').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId(CANCEL_CLOSE_ID).setLabel('❌ ביטול').setStyle(ButtonStyle.Secondary)
        );
        await interaction.reply({ content: `המשתמש <@${interaction.user.id}> מבקש לסגור את הטיקט. לאישור, על איש צוות ללחוץ על הכפתור.`, components: [confirmRow] });
      }

      if (customId === CONFIRM_CLOSE_ID) {
        if (!isStaff) return interaction.reply({ content: 'רק חבר צוות עם רול [・Staff・] יכול לאשר סגירה זו.', ephemeral: true });
        await interaction.reply({ content: '✅ מאשר סגירה... הטיקט יימחק בעוד מספר שניות.' });
        setTimeout(() => interaction.channel.delete('Closed by staff').catch(console.error), 3000);
      }

      if (customId === CANCEL_CLOSE_ID) {
        await interaction.message.delete();
        await interaction.reply({ content: 'בקשת הסגירה בוטלה. הטיקט נשאר פתוח.', ephemeral: true });
      }
    }
  } catch (err) {
    console.error('Interaction error:', err);
  }
});

client.login(DISCORD_TOKEN);
