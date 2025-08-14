
const { Routes } = require('discord-api-types/v10');
const { SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = '1403412038524342413';

const commands = [
    new SlashCommandBuilder().setName('verify').setDescription('שולח את הודעת האימות לערוץ.'),
    new SlashCommandBuilder().setName('ticket').setDescription('שולח את ההודעה לפתיחת טיקטים.'),
    new SlashCommandBuilder().setName('close').setDescription('סוגר את הטיקט הנוכחי.'),
    new SlashCommandBuilder().setName('startgiveaway')
        .setDescription('מתחיל הגרלה חדשה.')
        .addStringOption(option =>
            option.setName('duration')
            .setDescription('משך ההגרלה (לדוגמה: 1d, 12h, 30m, 5s).')
            .setRequired(true))
        .addIntegerOption(option =>
            option.setName('winners')
            .setDescription('מספר הזוכים.')
            .setRequired(true))
        .addStringOption(option =>
            option.setName('prize')
            .setDescription('הפרס בהגרלה.')
            .setRequired(true))
        .addStringOption(option =>
            option.setName('requirements')
            .setDescription('דרישות להשתתפות (אופציונלי).')
            .setRequired(false)),
    new SlashCommandBuilder().setName('invites')
        .setDescription('מציג את סטטיסטיקת ההזמנות של משתמש.')
        .addUserOption(option =>
            option.setName('user')
            .setDescription('המשתמש לבדיקה (ברירת מחדל: אתה).')
            .setRequired(false)),
    new SlashCommandBuilder().setName('add')
        .setDescription('מוסיף משתמש לטיקט (לצוות בלבד).')
        .addUserOption(option =>
            option.setName('user')
            .setDescription('המשתמש להוספה לטיקט.')
            .setRequired(true)),
    new SlashCommandBuilder().setName('remove')
        .setDescription('מסיר משתמש מטיקט (לצוות בלבד).')
        .addUserOption(option =>
            option.setName('user')
            .setDescription('המשתמש להסרה מהטיקט.')
            .setRequired(true))
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);
        const data = await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands },
        );
        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error("An error occurred while deploying commands:", error);
    }
})();
