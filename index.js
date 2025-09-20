const { Client, GatewayIntentBits, Collection } = require('discord.js');
const config = require('./config.json');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildInvites
    ]
});

let inviteData = new Map();
let guildInvites = new Map();
let memberInviter = new Map();


const dataPath = path.join(__dirname, 'inviteData.json');
if (fs.existsSync(dataPath)) {
    try {
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        inviteData = new Map(data.inviteData || []);
        memberInviter = new Map(data.memberInviter || []);
    } catch (error) {
        console.log('Veri dosyası yüklenemedi, yeni başlangıç yapılıyor...');
    }
}

function saveData() {
    const data = {
        inviteData: Array.from(inviteData.entries()),
        memberInviter: Array.from(memberInviter.entries())
    };
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('name' in command && 'execute' in command) {
        client.commands.set(command.name, command);
        console.log(`✅ Komut yüklendi: ${command.name}`);
    } else {
        console.log(`❌ Komut yüklenemedi: ${filePath} - name veya execute özelliği eksik`);
    }
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        if (event.name === 'ready') {
            client.once(event.name, () => event.execute(client, guildInvites, inviteData, memberInviter, saveData, config));
        } else {
            client.once(event.name, (...args) => event.execute(...args, client, guildInvites, inviteData, memberInviter, saveData, config));
        }
    } else {
        client.on(event.name, (...args) => event.execute(...args, client, guildInvites, inviteData, memberInviter, saveData, config));
    }
    console.log(`✅ Event yüklendi: ${event.name}`);
}

client.on('inviteCreate', invite => {
    const cachedInvites = guildInvites.get(invite.guild.id) || new Map();
    cachedInvites.set(invite.code, invite.uses);
    guildInvites.set(invite.guild.id, cachedInvites);
    saveData();
});

client.on('inviteDelete', invite => {
    const cachedInvites = guildInvites.get(invite.guild.id) || new Map();
    cachedInvites.delete(invite.code);
    guildInvites.set(invite.guild.id, cachedInvites);
    saveData();
});

client.on('messageCreate', async message => {
    if (!message.content.startsWith(config.prefix) || message.author.bot) return;
    
    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    
    const command = client.commands.get(commandName);
    if (!command) return;
    
    try {
        await command.execute(message, inviteData, client, args);
    } catch (error) {
        console.log('Komut işleme hatası:', error);
        message.reply('❌ Komut işlenirken bir hata oluştu.');
    }
});

client.on('error', error => {
    console.log('Discord.js hatası:', error);
});

process.on('unhandledRejection', error => {
    console.log('İşlenmemiş promise reddi:', error);
});

client.login(config.token);