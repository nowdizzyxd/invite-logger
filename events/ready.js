const initializeBot = async (client, guildInvites, saveData, config) => {
    console.log(`✅ Bot ${client.user.tag} olarak giriş yaptı!`);
    
    if (config.status) {
        try {
            const activityType = config.status.type || 'PLAYING';
            const activityName = config.status.name || 'Davet takipçisi';
            const statusType = config.status.status || 'online';
            
            await client.user.setPresence({
                activities: [{
                    name: activityName,
                    type: activityType === 'PLAYING' ? 0 : 
                          activityType === 'STREAMING' ? 1 :
                          activityType === 'LISTENING' ? 2 :
                          activityType === 'WATCHING' ? 3 :
                          activityType === 'COMPETING' ? 5 : 0
                }],
                status: statusType
            });
            
            console.log(`🎮 Bot durumu ayarlandı: ${activityType} ${activityName}`);
        } catch (error) {
            console.error('Bot durumu ayarlanırken hata oluştu:', error);
        }
    }
    
    const guilds = Array.from(client.guilds.cache.values());
    const invitePromises = guilds.map(async guild => {
        try {
            const invites = await guild.invites.fetch();
            const inviteMap = new Map(invites.map(invite => [invite.code, invite.uses]));
            guildInvites.set(guild.id, inviteMap);
        } catch (err) {
            console.error(`${guild.name} sunucusu için davetler alınamadı:`, err);
        }
    });
    
    await Promise.allSettled(invitePromises);
    saveData();
};

module.exports = {
    name: 'ready',
    once: true,
    execute: (client, guildInvites, inviteData, memberInviter, saveData, config) => 
        initializeBot(client, guildInvites, saveData, config)
};