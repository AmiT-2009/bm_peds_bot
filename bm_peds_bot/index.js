const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, Events } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const MEMBER_ROLE = '[・Member・]';
const STAFF_ROLE = '[・Staff・]';
const CATEGORY_NAME = 'רכישה';

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'verify') {
        let role = interaction.guild.roles.cache.find(r => r.name === MEMBER_ROLE);
        if (!role) {
            role = await interaction.guild.roles.create({ name: MEMBER_ROLE });
        }
        await interaction.member.roles.add(role);
        return interaction.reply({ content: `קיבלת את הרול ${MEMBER_ROLE}`, ephemeral: true });
    }

    if (interaction.customId === 'ticket') {
        let category = interaction.guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === CATEGORY_NAME);
        if (!category) {
            category = await interaction.guild.channels.create({ name: CATEGORY_NAME, type: ChannelType.GuildCategory });
        }

        const ticketChannel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: category.id,
            permissionOverwrites: [
                { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: interaction.guild.roles.cache.find(r => r.name === STAFF_ROLE)?.id || '', allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ]
        });

        return interaction.reply({ content: `נפתח לך טיקט: ${ticketChannel}`, ephemeral: true });
    }
});

client.on(Events.MessageCreate, async message => {
    if (message.content === '!setup') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;

        const verifyBtn = new ButtonBuilder().setCustomId('verify').setLabel('✅ Verify').setStyle(ButtonStyle.Success);
        const ticketBtn = new ButtonBuilder().setCustomId('ticket').setLabel('📩 פתיחת טיקט').setStyle(ButtonStyle.Primary);

        await message.channel.send({ content: 'לחץ כאן לקבלת רול:', components: [new ActionRowBuilder().addComponents(verifyBtn)] });
        await message.channel.send({ content: 'לחץ כאן לפתיחת טיקט:', components: [new ActionRowBuilder().addComponents(ticketBtn)] });
    }
});

client.login(process.env.BOT_TOKEN);
