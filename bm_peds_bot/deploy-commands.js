// deploy-commands.js

const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { PermissionsBitField } = require('discord.js');
require('dotenv').config(); // כדי לקרוא את המשתנים מ-.env

// ודא שהמשתנים האלה קיימים ב-.env
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = '1403412038524342413'; // ה-ID של השרת שלך

if (!DISCORD_TOKEN || !CLIENT_ID || !GUILD_ID) {
    console.error('ERROR: Missing required environment variables (TOKEN, CLIENT_ID) or Guild ID.');
    process.exit(1);
}

const commands = [
    {
        name: 'startgiveaway',
        description: 'מתחיל הגרלה חדשה.',
        default_member_permissions: PermissionsBitField.Flags.ManageGuild.toString(), // רק לצוות
        options: [
            { name: 'duration', type: 3, description: 'משך ההגרלה (לדוגמה: 1h, 30m, 2d).', required: true },
            { name: 'winners', type: 4, description: 'מספר הזוכים.', required: true },
            { name: 'prize', type: 3, description: 'הפרס בהגרלה.', required: true },
            { name: 'requirements', type: 3, description: 'הדרישות להשתתפות (אופציונלי).', required: false },
        ],
    },
    {
        name: 'invites',
        description: 'מציג את סטטיסטיקת ההזמנות שלך או של משתמש אחר.',
        options: [
            { name: 'user', type: 6, description: 'המשתמש שברצונך לבדוק (אופציונלי).', required: false },
        ],
    },
    {
        name: 'verify',
        description: 'יוצר את הודעת האימות עם כפתור בחדר הנוכחי.',
        default_member_permissions: PermissionsBitField.Flags.ManageGuild.toString(), // רק לצוות
    },
    {
        name: 'ticket',
        description: 'יוצר את ההודעה לפתיחת טיקט בחדר הנוכחי.',
        default_member_permissions: PermissionsBitField.Flags.ManageGuild.toString(), // רק לצוות
    },
    {
        name: 'close',
        description: 'סוגר את הטיקט הנוכחי (לשימוש בתוך ערוץ טיקט).',
        default_member_permissions: PermissionsBitField.Flags.ManageMessages.toString(), // רק לצוות
    }
];

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

console.log('[COMMANDS] Started refreshing application (/) commands.');

rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands })
    .then(data => console.log(`[COMMANDS] Successfully reloaded ${data.length} application (/) commands.`))
    .catch(error => console.error(error));
