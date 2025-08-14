// index.js (Final Version with Custom Ticket Names)

const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ChannelType, Events, StringSelectMenuBuilder } = require('discord.js');
require('dotenv').config();
const { createTranscript } = require('discord-html-transcripts');

// ======================= IDs & CONFIGURATION =======================
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = '1403412038524342413';
const IMAGE_URL = process.env.IMAGE_URL || null;

// Channel & Category IDs
const LOG_CHANNEL_ID = '1403412038914539629';
const TRANSCRIPT_CHANNEL_ID = '1403412038914539629';
const INVITES_LOG_CHANNEL_ID = '1404182039556653077';
const GIVEAWAY_CHANNEL_ID = '1404181153077788892';
const BOT_COMMANDS_CHANNEL_ID = '1404181095896977488';
const PURCHASE_CATEGORY_NAME = 'רכישה';
const QUESTION_CATEGORY_NAME = 'שאלה';

// Role Names
const MEMBER_ROLE_NAME = '[・Member・]';
const STAFF_ROLE_NAME = '[・Staff・]';

// Interaction Custom IDs
const VERIFY_BUTTON_ID = 'bm_verify';
const OPEN_TICKET_PROMPT_BUTTON_ID = 'bm_open_ticket_prompt';
const OPEN_TICKET_MENU_ID = 'category_select';
// =====================================================================

if (!DISCORD_TOKEN || !CLIENT_ID) {
    console.error('ERROR: Missing required environment variables.');
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildInvites
    ],
    partials: [Partials.Channel]
});

// --- Helper Functions and Invite Tracking ---
const guildInvites = new Map(); const memberInvites = new Map(); const memberToInviter = new Map();
async function logAction(message) { if (!LOG_CHANNEL_ID) return; try { const logChannel = await client.channels.fetch(LOG_CHANNEL_ID); if (logChannel && logChannel.isTextBased()) { const embed = new EmbedBuilder().setDescription(message).setColor(0x5865F2).setTimestamp(); await logChannel.send({ embeds: [embed] }); } } catch (error) { console.error(`Failed to send log message:`, error); } }
function parseDuration(str) { const parts = str.match(/(\d+)([smhd])/); if (!parts) return null; const value = parseInt(parts[1], 10); const unit = parts[2]; switch (unit) { case 's': return value * 1000; case 'm': return value * 1000 * 60; case 'h': return value * 1000 * 60 * 60; case 'd': return value * 1000 * 60 * 60 * 24; default: return null; } }
client.once(Events.ClientReady, async () => { console.log(`✅ Logged in as ${client.user.tag}`); try { const guild = await client.guilds.fetch(GUILD_ID); const invites = await guild.invites.fetch(); invites.forEach(invite => guildInvites.set(invite.code, invite.uses)); console.log(`✅ Cached ${guildInvites.size} invites.`); } catch (error) { console.error("Error caching invites on startup:", error); } });
client.on(Events.GuildMemberAdd, async member => { if (member.guild.id !== GUILD_ID) return; try { const newInvites = await member.guild.invites.fetch(); const usedInvite = newInvites.find(inv => guildInvites.get(inv.code) < inv.uses); newInvites.forEach(inv => guildInvites.set(inv.code, inv.uses)); const inviter = usedInvite ? await client.users.fetch(usedInvite.inviter.id) : null; if (inviter) { memberToInviter.set(member.id, inviter.id); if (!memberInvites.has(inviter.id)) { memberInvites.set(inviter.id, { joins: new Set(), leaves: new Set() }); } memberInvites.get(inviter.id).joins.add(member.id); const stats = memberInvites.get(inviter.id); const netInvites = stats.joins.size - stats.leaves.size; if (INVITES_LOG_CHANNEL_ID) { const logChannel = await client.channels.fetch(INVITES_LOG_CHANNEL_ID).catch(() => null); if (logChannel) { logChannel.send(`📥 ${member} הצטרף לשרת. הוזמן על ידי **${inviter.tag}** (סה"כ הזמנות: ${netInvites})`); } } } else if (INVITES_LOG_CHANNEL_ID) { const logChannel = await client.channels.fetch(INVITES_LOG_CHANNEL_ID).catch(() => null); if (logChannel) logChannel.send(`📥 ${member} הצטרף לשרת, אך לא ניתן היה לקבוע מי הזמין אותו.`); } } catch (error) { console.error("Error in GuildMemberAdd event:", error); } });
client.on(Events.GuildMemberRemove, async member => { if (member.guild.id !== GUILD_ID) return; try { const inviterId = memberToInviter.get(member.id); if (inviterId) { const inviterStats = memberInvites.get(inviterId); if (inviterStats) inviterStats.leaves.add(member.id); memberToInviter.delete(member.id); if (INVITES_LOG_CHANNEL_ID) { const inviter = await client.users.fetch(inviterId); const logChannel = await client.channels.fetch(INVITES_LOG_CHANNEL_ID).catch(() => null); if (logChannel) { logChannel.send(`📤 ${member.user.tag} עזב את השרת. הוא הוזמן על ידי **${inviter.tag}**.`); } } } } catch (error) { console.error("Error in GuildMemberRemove event:", error); } });

// ======================= MAIN INTERACTION HANDLER =======================
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.inGuild() || interaction.guildId !== GUILD_ID) return;

    try {
        if (interaction.isChatInputCommand()) {
            
            if (interaction.commandName === 'verify') {
                const verifyEmbed = new EmbedBuilder().setTitle('אימות חברים').setDescription('על מנת לקבל גישה לכלל חדרי השרת, יש ללחוץ על הכפתור "אמת" למטה.').setColor(0x5865F2).setThumbnail(IMAGE_URL || interaction.guild.iconURL());
                const verifyButton = new ButtonBuilder().setCustomId(VERIFY_BUTTON_ID).setLabel('אמת').setStyle(ButtonStyle.Success).setEmoji('✅');
                const row = new ActionRowBuilder().addComponents(verifyButton);
                await interaction.channel.send({ embeds: [verifyEmbed], components: [row] });
                return interaction.reply({ content: 'הודעת האימות נשלחה בהצלחה לערוץ!', ephemeral: true });
            }

            if (interaction.commandName === 'ticket') {
                const ticketEmbed = new EmbedBuilder().setTitle('פתיחת פנייה / תמיכה').setDescription('יש ללחוץ על הכפתור למטה על מנת לפתוח טיקט.\nלאחר הלחיצה, תתבקש לבחור את קטגוריית הפנייה.').setColor(0x5865F2).setThumbnail(IMAGE_URL || interaction.guild.iconURL());
                const ticketButton = new ButtonBuilder().setCustomId(OPEN_TICKET_PROMPT_BUTTON_ID).setLabel('פתח טיקט').setStyle(ButtonStyle.Primary).setEmoji('✉️');
                const row = new ActionRowBuilder().addComponents(ticketButton);
                await interaction.channel.send({ embeds: [ticketEmbed], components: [row] });
                return interaction.reply({ content: 'הודעת פתיחת הטיקטים נשלחה בהצלחה לערוץ!', ephemeral: true });
            }

            if (interaction.commandName === 'close') {
                if (!interaction.channel.name.startsWith(PURCHASE_CATEGORY_NAME.toLowerCase() + '-') && !interaction.channel.name.startsWith(QUESTION_CATEGORY_NAME.toLowerCase() + '-')) {
                    return interaction.reply({ content: 'ניתן להשתמש בפקודה זו רק בערוץ טיקט.', ephemeral: true });
                }

                await interaction.reply({ content: 'סוגר את הטיקט ושומר את השיחה...', ephemeral: true });

                const attachment = await createTranscript(interaction.channel, {
                    limit: -1,
                    returnType: 'attachment',
                    filename: `transcript-${interaction.channel.name}.html`,
                    saveImages: true,
                    poweredBy: false
                });

                const transcriptChannel = await client.channels.fetch(TRANSCRIPT_CHANNEL_ID).catch(() => null);
                if (transcriptChannel) {
                    const embed = new EmbedBuilder()
                        .setAuthor({ name: `לוג טיקט - ${interaction.channel.name}` })
                        .addFields({ name: 'נסגר על ידי', value: interaction.user.tag, inline: true })
                        .setColor(0xFF5733)
                        .setTimestamp();
                    
                    await transcriptChannel.send({ embeds: [embed], files: [attachment] });
                }

                await logAction(`🔒 **${interaction.user.tag}** סגר את הטיקט ${interaction.channel.name}.`);
                await interaction.channel.delete();
            }

            if (interaction.commandName === 'startgiveaway') {
                if (interaction.channelId !== BOT_COMMANDS_CHANNEL_ID) {
                    return interaction.reply({ content: `ניתן להשתמש בפקודה זו רק בערוץ <#${BOT_COMMANDS_CHANNEL_ID}>.`, ephemeral: true });
                }
                const giveawayChannel = await client.channels.fetch(GIVEAWAY_CHANNEL_ID).catch(() => null);
                if (!giveawayChannel) {
                    return interaction.reply({ content: 'שגיאה: לא נמצא ערוץ ההגרלות.', ephemeral: true });
                }
                const durationStr = interaction.options.getString('duration');
                const winnerCount = interaction.options.getInteger('winners');
                const prize = interaction.options.getString('prize');
                const requirements = interaction.options.getString('requirements') || 'אין דרישות';
                const durationMs = parseDuration(durationStr);
                if (!durationMs) {
                    return interaction.reply({ content: 'פורמט הזמן שהזנת אינו תקין.', ephemeral: true });
                }
                const endTime = Date.now() + durationMs;
                const giveawayEmbed = new EmbedBuilder().setTitle('🎉 הגרלה חדשה! 🎉').setDescription(`**פרס:** ${prize}\n**דרישות:** ${requirements}\n\nההגרלה תסתיים <t:${Math.floor(endTime / 1000)}:R>\nמשתתפים: **0**`).setColor(0x57F287).setFooter({ text: `יוזם ההגרלה: ${interaction.user.username} | ${winnerCount} זוכים` }).setTimestamp(endTime);
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`enter_giveaway_${interaction.id}`).setLabel('היכנס להגרלה').setStyle(ButtonStyle.Success).setEmoji('🎁'));
                const giveawayMsg = await giveawayChannel.send({ embeds: [giveawayEmbed], components: [row] });
                await interaction.reply({ content: `✅ ההגרלה נשלחה בהצלחה לערוץ ${giveawayChannel}!`, ephemeral: true });
                const participants = new Set();
                const collector = giveawayMsg.createMessageComponentCollector({ time: durationMs });
                collector.on('collect', async i => { if (participants.has(i.user.id)) { return i.reply({ content: '⚠️ כבר נרשמת להגרלה זו.', ephemeral: true }); } participants.add(i.user.id); const newEmbed = EmbedBuilder.from(giveawayEmbed).setDescription(`**פרס:** ${prize}\n**דרישות:** ${requirements}\n\nההגרלה תסתיים <t:${Math.floor(endTime / 1000)}:R>\nמשתתפים: **${participants.size}**`); await giveawayMsg.edit({ embeds: [newEmbed] }); await i.reply({ content: '✅ נרשמת להגרלה בהצלחה!', ephemeral: true }); });
                collector.on('end', async () => { const winnerIds = Array.from(participants).sort(() => 0.5 - Math.random()).slice(0, winnerCount); const finalEmbed = EmbedBuilder.from(giveawayEmbed).setColor(0xED4245).setDescription(`**ההגרלה הסתיימה!**\n\n**פרס:** ${prize}\nמשתתפים: **${participants.size}**`); const disabledRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`giveaway_ended`).setLabel('ההגרלה הסתיימה').setStyle(ButtonStyle.Secondary).setDisabled(true)); if (winnerIds.length > 0) { const winnerTags = winnerIds.map(id => `<@${id}>`).join(', '); finalEmbed.addFields({ name: '🏆 זוכים', value: winnerTags }); await giveawayMsg.channel.send(`🎉 מזל טוב לזוכים ${winnerTags} בהגרלה על **${prize}**!`); } else { finalEmbed.addFields({ name: '🏆 זוכים', value: 'לא היו מספיק משתתפים.' }); } await giveawayMsg.edit({ embeds: [finalEmbed], components: [disabledRow] }); });
            }

            if (interaction.commandName === 'invites') {
                const isMember = interaction.member.roles.cache.some(r => r.name === MEMBER_ROLE_NAME);
                const isStaff = interaction.member.roles.cache.some(r => r.name === STAFF_ROLE_NAME);
                if (!isMember && !isStaff) {
                    return interaction.reply({ content: `רק בעלי רול **${MEMBER_ROLE_NAME}** ומעלה יכולים להשתמש בפקודה זו.`, ephemeral: true });
                }
                const user = interaction.options.getUser('user') || interaction.user;
                const stats = memberInvites.get(user.id);
                const joins = stats ? stats.joins.size : 0;
                const leaves = stats ? stats.leaves.size : 0;
                const validInvites = joins - leaves;
                const embed = new EmbedBuilder().setAuthor({ name: `סטטיסטיקת הזמנות - ${user.tag}`, iconURL: user.displayAvatarURL() }).setColor(0x5865F2).addFields({ name: '✅ סה"כ הצטרפו', value: `${joins}`, inline: true }, { name: '❌ עזבו', value: `${leaves}`, inline: true }, { name: '📈 סה"כ תקינות', value: `${validInvites}`, inline: true });
                await interaction.reply({ embeds: [embed] });
            }
        } 
        
        else if (interaction.isButton()) {
            if (interaction.customId === VERIFY_BUTTON_ID) {
                await interaction.deferReply({ ephemeral: true });
                const member = interaction.member;
                const role = interaction.guild.roles.cache.find(r => r.name === MEMBER_ROLE_NAME);
                if (!role) { return interaction.editReply({ content: 'שגיאת מערכת, הרול לא נמצא.' }); }
                if (member.roles.cache.has(role.id)) { return interaction.editReply({ content: 'כבר אימתת את עצמך בעבר!' }); }
                try {
                    await member.roles.add(role);
                    await interaction.editReply({ content: 'אומתת בהצלחה! קיבלת גישה מלאה לשרת.' });
                    return logAction(`✅ **${member.user.tag}** אומת וקיבל את רול ה-Member.`);
                } catch (error) { console.error("Error adding role:", error); return interaction.editReply({ content: 'אירעה שגיאה בעת ניסיון לתת לך את הרול.' }); }
            }

            if (interaction.customId === OPEN_TICKET_PROMPT_BUTTON_ID) {
                const menu = new StringSelectMenuBuilder().setCustomId(OPEN_TICKET_MENU_ID).setPlaceholder('בחר את נושא הפנייה...').addOptions({ label: 'שאלה כללית', value: 'question' }, { label: 'רכישה', value: 'purchase' });
                const row = new ActionRowBuilder().addComponents(menu);
                return interaction.reply({ content: 'כדי שאוכל לסייע, אנא בחר את קטגוריית הפנייה:', components: [row], ephemeral: true });
            }
        } 
        
        else if (interaction.isStringSelectMenu()) {
            if (interaction.customId === OPEN_TICKET_MENU_ID) {
                await interaction.deferReply({ ephemeral: true });
                const categoryValue = interaction.values[0];
                const categoryName = categoryValue === 'purchase' ? PURCHASE_CATEGORY_NAME : QUESTION_CATEGORY_NAME;
                const member = interaction.member;
                let category = interaction.guild.channels.cache.find(c => c.name === categoryName && c.type === ChannelType.GuildCategory);
                if (!category) { category = await interaction.guild.channels.create({ name: categoryName, type: ChannelType.GuildCategory }); }
                const staffRole = interaction.guild.roles.cache.find(r => r.name === STAFF_ROLE_NAME);

                // <<<!!! הנה השינוי !!!>>>
                const ticketChannel = await interaction.guild.channels.create({
                    name: `${categoryName.toLowerCase()}-${member.user.username}`, // שם הערוץ יכלול את שם הקטגוריה
                    type: ChannelType.GuildText,
                    parent: category.id,
                    permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }, { id: member.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }, { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel] }, ...(staffRole ? [{ id: staffRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }] : [])]
                });

                await interaction.editReply({ content: `✅ הטיקט שלך נוצר! עבור אל ${ticketChannel}` });
                await logAction(`🎫 **${member.user.tag}** פתח טיקט חדש: ${ticketChannel.name}`);
                
                const welcomeEmbed = new EmbedBuilder().setTitle(`ברוך הבא לטיקט, ${member.user.username}`).setDescription(`צוות השרת יגיע בהקדם לעזור לך בנושא **${categoryName}**.\nכדי לסגור את הטיקט, השתמש בפקודה /close בתוך הטיקט.`).setColor(0x5865F2);
                
                return ticketChannel.send({ content: `${member}` + (staffRole ? ` ${staffRole}` : ''), embeds: [welcomeEmbed] });
            }
        }

    } catch (err) {
        console.error('Interaction error:', err);
    }
});

// Login to Discord
client.login(DISCORD_TOKEN);