const { EmbedBuilder } = require('discord.js');

const MEDAL_EMOJIS = ['🥇', '🥈', '🥉'];
const MAX_LEADERS = 10;

const getMedalEmoji = index => MEDAL_EMOJIS[index] || '🏅';

const formatUserEntry = (username, rank, data) => {
    const medal = getMedalEmoji(rank);
    return `${medal}${rank + 1}. ${username}\n📊 Toplam: ${data.total} | 👥 Aktif: ${data.invites} | 👋 Ayrılan: ${data.leaves}\n`;
};

const buildLeaderboard = async (sortedData, client) => {
    let leaderboardText = '';
    
    for (let i = 0; i < sortedData.length; i++) {
        const [userId, userData] = sortedData[i];
        const user = await client.users.fetch(userId).catch(() => null);
        const displayName = user?.username ?? 'Bilinmeyen Kullanıcı';
        leaderboardText += formatUserEntry(displayName, i, userData);
    }
    
    return leaderboardText;
};

const createLeaderboardEmbed = (guild, description) => {
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('🏆 En Çok Davet Edenler')
        .setThumbnail(guild.iconURL({ dynamic: true }));

    const maxLength = 1024;
    if (description.length <= maxLength) {
        embed.addFields({ name: 'Sıralama', value: description, inline: false });
    } else {
        const chunks = [];
        const lines = description.split('\n');
        let currentChunk = '';
        
        for (const line of lines) {
            if (currentChunk.length + line.length + 1 <= maxLength) {
                currentChunk += (currentChunk ? '\n' : '') + line;
            } else {
                if (currentChunk) chunks.push(currentChunk);
                currentChunk = line;
            }
        }
        if (currentChunk) chunks.push(currentChunk);
        
        chunks.forEach((chunk, index) => {
            const fieldName = index === 0 ? 'Sıralama' : `Sıralama (devam)`;
            embed.addFields({ name: fieldName, value: chunk, inline: false });
        });
    }
    
    return embed;
};

const processInviteData = data => {
    return Array.from(data.entries())
        .sort(([, a], [, b]) => b.total - a.total)
        .slice(0, MAX_LEADERS);
};

module.exports = {
    name: 'topdavet',
    description: 'En çok davet eden kullanıcıların sıralamasını gösterir',
    execute: async (message, inviteData, client) => {
        try {
            const topInviters = processInviteData(inviteData);
            
            if (!topInviters.length) {
                return await message.reply('❌ Henüz davet verisi bulunmuyor.');
            }
            
            const leaderboardText = await buildLeaderboard(topInviters, client);
            const embed = createLeaderboardEmbed(message.guild, leaderboardText);
            
            await message.reply({ embeds: [embed] });
        } catch (err) {
            console.error('Liderlik tablosu hatası:', err);
            await message.reply('❌ Komut işlenirken bir hata oluştu.');
        }
    }
};