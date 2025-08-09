/**
 * B&M PEDS — Complete Discord Bot (Guild-Specific)
 * Final Version with Logging & Corrected Two-Step Tickets
 * Requires: discord.js v14, @discordjs/rest, discord-api-types, dotenv
 * NEW: discord-html-transcripts for saving tickets
 *
 * Environment variables to set in Render:
 * DISCORD_TOKEN     -> Bot token (Required)
 * CLIENT_ID         -> Application (client) id (Required)
 * IMAGE_URL         -> Raw URL to a thumbnail image (Optional)
 *
 * Start command: node index.js
 */

const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ChannelType, Events, StringSelectMenuBuilder } = require('discord.js');
require('dotenv').config();
const { createTranscript } = require('discord-html-transcripts');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = '1403412038524342413';
const IMAGE_URL = process.env.IMAGE_URL || null;
const LOG_CHANNEL_ID = '1403412038914539629';
const TRANSCRIPT_CHANNEL_ID = '1403412038914539629'; // Change this to a dedicated transcripts channel if you wish

if (!DISCORD_TOKEN || !CLIENT_ID || !GUILD_ID) {
    console.error('ERROR: Missing required environment variables or Guild ID.');
    process.exit(1);
}

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
    partials: [Partials.Channel]
});

// ====== Configuration ======
const MEMBER_ROLE_NAME = '[・Member・]';
const STAFF_ROLE_NAME = '[・Staff・]';
const PURCHASE_CATEGORY_NAME = 'רכישה';
const QUESTION_CATEGORY_NAME = 'שאלה';

const VERIFY_BUTTON_ID = 'bm_verify';
const OPEN_TICKET_PROMPT_BUTTON_ID = 'bm_open_ticket_prompt';
const OPEN_TICKET_MENU_ID = 'category_select';

const REQUEST_CLOSE_ID = 'bm_request_close';
const CONFIRM_CLOSE_ID = 'bm_confirm_close';
const CANCEL_CLOSE_ID = 'bm_cancel_close';
// ===========================

// פונקציית עזר לשליחת לוגים
async function logAction(message) {
    if (!LOG_CHANNEL_ID) return;
    try {
        const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
        if (logChannel && logChannel.isTextBased()) {
            const embed = new EmbedBuilder()
                .setDescription(message)
                .setColor(0x5865F2)
                .setTimestamp();
            await logChannel.send({ embeds: [embed] });
        }
    } catch (error) {
        console.error(`Failed to send log message:`, error);
    }
}

client.once(Events.ClientReady, () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.inGuild() || interaction.guildId !== GUILD_ID) return;

    try {
        // Slash command handling
        if (interaction.isChatInputCommand()) {
            const isStaff = interaction.member.roles.cache.some(r => r.name === STAFF_ROLE_NAME);
            if (!isStaff) return interaction.reply({ content: 'רק חברי צוות עם רול [・Staff・] יכולים להשתמש בפקודה זו.', ephemeral: true });

            if (interaction.commandName === 'verify') {
                const embed = new EmbedBuilder().setTitle('אימות משתמשים').setDescription('לחץ על הכפתור למטה כדי לקבל גישה לשרת.').setColor(0x00FF66);
                if (IMAGE_URL) embed.setThumbnail(IMAGE_URL);
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(VERIFY_BUTTON_ID).setLabel('אמת אותי').setStyle(ButtonStyle.Success));
                await interaction.reply({ content: '✅ הודעת האימות נשלחה.', ephemeral: true });
                await interaction.channel.send({ embeds: [embed], components: [row] });
            }

            if (interaction.commandName === 'ticket') {
                const embed = new EmbedBuilder().setTitle('מערכת הטיקטים').setDescription('לחץ על הכפתור למטה כדי לפתוח פנייה לצוות.').setColor(0x0099FF);
                if (IMAGE_URL) embed.setThumbnail(IMAGE_URL);
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(OPEN_TICKET_PROMPT_BUTTON_ID).setLabel('פתח טיקט').setStyle(ButtonStyle.Success).setEmoji('🎟️')
                );
                await interaction.reply({ content: '✅ ההודעה לפתיחת טיקטים נשלחה.', ephemeral: true });
                await interaction.channel.send({ embeds: [embed], components: [row] });
            }

            if (interaction.commandName === 'close') {
                if (!interaction.channel.name.startsWith('רכישה-') && !interaction.channel.name.startsWith('שאלה-')) {
                    return interaction.reply({ content: 'פקודה זו זמינה רק בתוך ערוץ טיקט.', ephemeral: true });
                }
                await interaction.reply({ content: 'הטיקט ייסגר כעת.' });
                setTimeout(() => interaction.channel.delete().catch(() => { }), 1000);
            }
        }

        if (interaction.isStringSelectMenu()) {
            if (interaction.customId === OPEN_TICKET_MENU_ID) {
                const selectedCategoryValue = interaction.values[0];
                const isStaffMember = interaction.member.roles.cache.some(r => r.name === STAFF_ROLE_NAME);

                if (!isStaffMember) {
                    const existing = interaction.guild.channels.cache.find(ch =>
                        ch.topic === `ticket-opener:${interaction.user.id}` && ch.name.startsWith(`${selectedCategoryValue}-`)
                    );
                    if (existing) {
                        return interaction.reply({ content: `כבר קיים לך טיקט פתוח בקטגוריית **${selectedCategoryValue}**: ${existing}.`, ephemeral: true });
                    }
                }

                const channelName = `${selectedCategoryValue}-${interaction.user.username.toLowerCase()}`.slice(0, 90);
                const parentName = selectedCategoryValue === 'רכישה' ? PURCHASE_CATEGORY_NAME : QUESTION_CATEGORY_NAME;
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
                await interaction.update({ content: `✅ טיקט נפתח בהצלחה: ${channel}`, components: [] });
                await logAction(`🎟️ **טיקט נפתח**\n> **פותח:** ${interaction.user} (${interaction.user.id})\n> **סוג:** ${selectedCategoryValue}\n> **ערוץ:** ${channel}`);
            }
        }

        if (interaction.isButton()) {
            const isStaff = interaction.member.roles.cache.some(r => r.name === STAFF_ROLE_NAME);
            const [customId, openerId] = interaction.customId.split('::');

            if (customId === OPEN_TICKET_PROMPT_BUTTON_ID) {
                const menu = new StringSelectMenuBuilder()
                    .setCustomId(OPEN_TICKET_MENU_ID)
                    .setPlaceholder('בחר את נושא הפנייה...')
                    .addOptions(
                        { label: 'רכישה', value: 'רכישה', description: 'פתיחת טיקט בנושא רכישות.', emoji: '🛒' },
                        { label: 'שאלה', value: 'שאלה', description: 'פתיחת טיקט בנושא שאלות כלליות.', emoji: '❓' }
                    );
                const row = new ActionRowBuilder().addComponents(menu);
                return interaction.reply({ content: 'באיזה נושא תרצה לפתוח טיקט?', components: [row], ephemeral: true });
            }

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

                const ticketChannel = interaction.channel;
                await interaction.reply({ content: '✅ מאשר סגירה... יוצר תיעוד שיחה.' });

                try {
                    const transcriptChannel = await client.channels.fetch(TRANSCRIPT_CHANNEL_ID);
                    if (transcriptChannel) {
                        const transcriptFile = await createTranscript(ticketChannel, {
                            limit: -1, // Fetch all messages
                            returnBuffer: false,
                            saveImages: true,
                            filename: `transcript-${ticketChannel.name}.html`
                        });

                        const embed = new EmbedBuilder()
                            .setDescription(`🔒 **טיקט נסגר**\n> **סוגר:** ${interaction.user} (${interaction.user.id})\n> **ערוץ:** \`${ticketChannel.name}\``)
                            .setColor(0xFF0000)
                            .setTimestamp();
                        await transcriptChannel.send({ embeds: [embed], files: [transcriptFile] });
                        await logAction(`🔒 **טיקט נסגר**\n> **סוגר:** ${interaction.user} (${interaction.user.id})\n> **ערוץ:** \`${ticketChannel.name}\`\n> **תיעוד:** [קישור לתיעוד](<${(await transcriptChannel.messages.fetch({ limit: 1 })).first().attachments.first().url}>)`);
                    } else {
                        await logAction(`🔒 **טיקט נסגר**\n> **סוגר:** ${interaction.user} (${interaction.user.id})\n> **ערוץ:** \`${ticketChannel.name}\``);
                    }
                } catch (error) {
                    console.error('Error creating or sending transcript:', error);
                    await logAction(`❌ **שגיאה** ביצירת תיעוד עבור טיקט ${ticketChannel.name}. הטיקט נסגר בכל זאת.`);
                }
                
                setTimeout(() => ticketChannel.delete('Closed by staff').catch(console.error), 3000);
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
