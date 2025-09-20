const { EmbedBuilder } = require('discord.js');

const MILESTONE_TARGETS = [50, 100, 200, 500, 1000, 2000, 5000, 10000];
const DEFAULT_INVITE_TEXT = "Özel URL";

const getNextTarget = memberCount => MILESTONE_TARGETS.find(target => target > memberCount) || memberCount + 1000;

const formatDiscordDate = timestamp => {
    const date = new Date(timestamp);
    const daysAgo = Math.floor((Date.now() - timestamp) / 86400000);
    const formatted = date.toLocaleString('tr-TR', { 
        day: 'numeric', month: 'long', year: 'numeric', 
        hour: 'numeric', minute: 'numeric', second: 'numeric' 
    });
    return { formatted, daysAgo };
};

const findUsedInvite = (newInvites, oldInvites) => {
    return newInvites.find(invite => invite.uses > (oldInvites.get(invite.code) || 0));
};

const updateInviterStats = (inviteData, inviterId) => {
    const stats = inviteData.get(inviterId) || { total: 0, invites: 0, leaves: 0 };
    stats.total++;
    stats.invites++;
    inviteData.set(inviterId, stats);
    return stats;
};

const trackMemberInviter = (memberInviter, guildId, memberId, inviterId) => {
    const memberKey = `${guildId}:${memberId}`;
    memberInviter.set(memberKey, inviterId);
};

const createWelcomeEmbed = (member, inviter, inviterId, inviteCode, memberCount, target) => {
    const { formatted, daysAgo } = formatDiscordDate(member.user.createdTimestamp);
    const isVanity = inviter === DEFAULT_INVITE_TEXT;
    
    return new EmbedBuilder()
        .setColor(0x10B981)
        .setTitle('🎉 Hoş Geldin!')
        .setDescription(`**${member.user.username}** ailemize katıldı! 🎊`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .addFields([
            { name: '👤 Yeni Üyemiz', value: `\`${member.user.tag}\``, inline: true },
            { name: '🎯 Üye Sırası', value: `\`#${memberCount}\``, inline: true },
            { name: '📅 Discord\'a Kayıt', value: `${formatted}\n*(${daysAgo} gün önce)*`, inline: false },
            { name: '🎟️ Davet Eden', value: isVanity ? "🔗 Özel URL" : `<@${inviterId}> 💝`, inline: true },
            { name: '🚪 Davet Kodu', value: `\`${isVanity ? "Özel URL" : `discord.gg/${inviteCode}`}\``, inline: true }
        ])
        .setFooter({ 
            text: `🎯 Hedef: ${target} | 👥 Mevcut: ${memberCount} | 🔥 Kalan: ${target - memberCount}`, 
            iconURL: member.guild.iconURL({ dynamic: true }) 
        })
        .setTimestamp();
};

const processInviteDetection = async (member, guildInvites, inviteData, memberInviter) => {
    let inviterInfo = { name: DEFAULT_INVITE_TEXT, id: null, code: DEFAULT_INVITE_TEXT };
    
    const guild = member.guild;
    const newInvites = await guild.invites.fetch();
    const oldInvites = guildInvites.get(guild.id) || new Map();
    const usedInvite = findUsedInvite(newInvites, oldInvites);
    
    if (usedInvite?.inviter) {
        inviterInfo = {
            name: usedInvite.inviter,
            id: usedInvite.inviter.id,
            code: usedInvite.code
        };
        
        updateInviterStats(inviteData, inviterInfo.id);
        trackMemberInviter(memberInviter, guild.id, member.id, inviterInfo.id);
    } else {
        try {
            const vanityData = await guild.fetchVanityData().catch(() => null);
            if (vanityData) inviterInfo.code = vanityData.code;
        } catch {}
    }
    
    guildInvites.set(guild.id, new Map(newInvites.map(inv => [inv.code, inv.uses])));
    return inviterInfo;
};

const sendWelcomeLog = async (member, inviterInfo, config) => {
    if (!config.logChannelId) return;
    
    const logChannel = member.guild.channels.cache.get(config.logChannelId);
    if (!logChannel) return;
    
    const memberCount = member.guild.memberCount;
    const nextTarget = getNextTarget(memberCount);
    const embed = createWelcomeEmbed(member, inviterInfo.name, inviterInfo.id, inviterInfo.code, memberCount, nextTarget);
    
    await logChannel.send({ embeds: [embed] });
};

module.exports = {
    name: 'guildMemberAdd',
    execute: async (member, client, guildInvites, inviteData, memberInviter, saveData, config) => {
        try {
            const inviterInfo = await processInviteDetection(member, guildInvites, inviteData, memberInviter);
            await sendWelcomeLog(member, inviterInfo, config);
            saveData();
        } catch (error) {
            console.error('Üye katılma olayında hata:', error);
        }
    }
};