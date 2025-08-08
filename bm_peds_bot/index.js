const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, Events } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

const MEMBER_ROLE = '[・Member・]';
const STAFF_ROLE = '[・Staff・]';
const TICKET_CATEGORY_NAME = 'Tickets';

// כשמתחברים
client.once(Events.ClientReady, () => {
    console.log(`✅ הבוט מחובר בתור ${client.user.tag}`);
});

// כשמישהו לוחץ על כפתור
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isButton()) return;

    // כפתור ווריפיי
    if (interaction.customId === 'verify_button') {
        const role = interaction.guild.roles.cache.find(r => r.name === MEMBER_ROLE);
        if (!role) return interaction.reply({ content: '❌ רול [・Member・] לא נמצא.', ephemeral: true });

        await interaction.member.roles.add(role);
        return interaction.reply({ content: '✅ אומתת בהצלחה!', ephemeral: true });
    }

    // כפתור פתיחת טיקט
    if (interaction.customId === 'open_ticket') {
        const category = interaction.guild.channels.cache.find(c => c.name === TICKET_CATEGORY_NAME && c.type === 4);

        const channel = await interaction.guild.channels.create({
            name: `רכישה-${interaction.user.username}`,
            type: 0,
            parent: category ? category.id : null,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                { id: interaction.guild.roles.cache.find(r => r.name === STAFF_ROLE)?.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
            ]
        });

        await channel.send(`📩 שלום ${interaction.user}, צוות הסטאף יהיה איתך בקרוב.\nלהגשת בקשה לסגירה השתמש בפקודה: \`/close\``);
        return interaction.reply({ content: `✅ טיקט נפתח: ${channel}`, ephemeral: true });
    }
});

// פקודת /close
client.on(Events.MessageCreate, async message => {
    if (message.content === '/close') {
        if (!message.channel.name.startsWith('רכישה-')) return;
        await message.channel.delete();
    }
});

// פקודת שליחה של הודעת Verify + כפתור
client.on(Events.MessageCreate, async message => {
    if (message.content === '!verifymsg') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

        const embed = new EmbedBuilder()
            .setTitle('אימות משתמשים')
            .setDescription('לחץ על הכפתור למטה כדי לקבל גישה לשרת.')
            .setColor(0x00ff00);

        const button = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('verify_button')
                .setLabel('אמת אותי')
                .setStyle(ButtonStyle.Success)
        );

        await message.channel.send({ embeds: [embed], components: [button] });
    }
});

// פקודת שליחה של הודעת Open Ticket
client.on(Events.MessageCreate, async message => {
    if (message.content === '!ticketmsg') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

        const embed = new EmbedBuilder()
            .setTitle('פתיחת טיקט')
            .setDescription('לחץ על הכפתור למטה כדי לפתוח טיקט עם צוות הסטאף.')
            .setColor(0x0099ff);

        const button = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('open_ticket')
                .setLabel('פתח טיקט')
                .setStyle(ButtonStyle.Primary)
        );

        await message.channel.send({ embeds: [embed], components: [button] });
    }
});

client.login(process.env.DISCORD_TOKEN);
