const { EmbedBuilder } = require('discord.js');

const createStatsEmbed = (author, stats, guild) => {
    return new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`🎟️ Davet İstatistikleri`)
        .setThumbnail(author.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: 'Toplam Davet', value: `🔢 ${stats.total}`, inline: true },
            { name: 'Sunucuda Olanlar', value: `👥 ${stats.invites}`, inline: true },
            { name: 'Sunucudan Çıkanlar', value: `👋 ${stats.leaves}`, inline: true }
        );
};

const getOrCreateStats = (data, userId) => data.get(userId) || { total: 0, invites: 0, leaves: 0 };

const handleError = (message, err) => {
    console.error('İstatistik komutu hatası:', err);
    return message.reply('❌ Komut işlenirken bir hata oluştu.');
};

module.exports = {
    name: 'i',
    description: 'Kullanıcının davet istatistiklerini gösterir',
    execute: async (msg, inviteData) => {
        try {
            const userStats = getOrCreateStats(inviteData, msg.author.id);
            const statsEmbed = createStatsEmbed(msg.author, userStats, msg.guild);
            await msg.reply({ embeds: [statsEmbed] });
        } catch (error) {
            await handleError(msg, error);
        }
    }
};
