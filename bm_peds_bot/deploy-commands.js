// קובץ חד-פעמי לניקוי ורישום פקודות
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
require('dotenv').config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = '1403412038524342413';

if (!token || !clientId || !guildId) {
    console.error('Missing token, clientId, or guildId.');
    process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

const commands = [
    { name: 'verify', description: 'שלח הודעת אימות עם כפתור' },
    { name: 'ticket', description: 'שלח הודעת פתיחת טיקט עם בחירת קטגוריה' },
    { name: 'close', description: 'סגור טיקט (מומלץ להשתמש בכפתורי הסגירה)' }
];

(async () => {
    try {
        console.log('Started clearing all application commands.');
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
        await rest.put(Routes.applicationCommands(clientId), { body: [] });
        console.log('Successfully cleared all commands.');

        console.log('Registering new commands to guild.');
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
        console.log('Successfully reloaded commands.');
    } catch (error) {
        console.error(error);
    }
})();
