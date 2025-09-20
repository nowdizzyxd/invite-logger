
const { EmbedBuilder } = require('discord.js');

function calculateNextMilestone(memberCount) {
    const milestones = [50, 100, 200, 500, 1000, 2000, 5000, 10000];
    return milestones.find(milestone => milestone > memberCount) || memberCount + 1000;
}

module.exports = {
    name: 'guildMemberRemove',
    async execute(member, client, guildInvites, inviteData, memberInviter, saveData, config) {
        try {
            const guild = member.guild;
            const guildId = guild.id;
            
            let inviter = "Bilinmiyor";
            let inviterId = null;
            let inviteCode = "Bilinmiyor";

            const memberKey = `${guildId}:${member.id}`;
            inviterId = memberInviter.get(memberKey);

            if (inviterId) {
                inviter = await client.users.fetch(inviterId).catch(() => null);
                if (inviter) {
                    const userInvites = await guild.invites.fetch().catch(() => null);
                    if (userInvites) {
                        const inviterInvite = userInvites.find(invite => invite.inviter && invite.inviter.id === inviterId);
                        if (inviterInvite) {
                            inviteCode = inviterInvite.code;
                        }
                    }
                    
                    const currentData = inviteData.get(inviterId) || { total: 0, invites: 0, leaves: 0 };
                    currentData.invites--;
                    currentData.leaves++;
                    inviteData.set(inviterId, currentData);
                }
                
                memberInviter.delete(memberKey);
            }

            if (config.logChannelId) {
                const logChannel = guild.channels.cache.get(config.logChannelId);
                if (logChannel) {
                    const currentMemberCount = guild.memberCount;
                    const nextMilestone = calculateNextMilestone(currentMemberCount);

                    const discordJoinDate = member.user.createdAt;
                    const daysAgo = Math.floor((Date.now() - member.user.createdTimestamp) / 86400000);
                    const formattedDate = discordJoinDate.toLocaleString('tr-TR', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric', 
                        hour: 'numeric', 
                        minute: 'numeric', 
                        second: 'numeric' 
                    });

                    const embed = new EmbedBuilder()
                        .setColor('#EF4444')
                        .setTitle('💔 Güle Güle...')
                        .setDescription(`**${member.user.username}** aramızdan ayrıldı 😢`)
                        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                        .addFields(
                            { name: '👤 Ayrılan Üye', value: `\`${member.user.tag}\``, inline: true },
                            { name: '📅 Discord\'a Kayıt', value: `${formattedDate}\n*(${daysAgo} gün önce)*`, inline: true },
                            { name: '⏰ Ayrılma Zamanı', value: `\`${new Date().toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: 'numeric' })}\``, inline: false },
                            { name: '🎟️ Onu Davet Eden', value: `${inviter === "Bilinmiyor" ? "❓ Bilinmiyor" : `<@${inviterId}> 💔`}`, inline: true },
                            { name: '🚪 Davet Kodu', value: `\`${inviteCode === "Bilinmiyor" ? "Bilinmiyor" : `discord.gg/${inviteCode}`}\``, inline: true }
                        )
                        .setFooter({ text: `🎯 Hedef: ${nextMilestone} | 👥 Mevcut: ${currentMemberCount} | 🔥 Kalan: ${nextMilestone - currentMemberCount}`, iconURL: guild.iconURL({ dynamic: true }) })
                        .setTimestamp();

                    logChannel.send({ embeds: [embed] });
                }
            }
            
            saveData();
            
        } catch (error) {
            console.log('Üye ayrılma olayında hata:', error);
        }
    },
};
