import { DiscordSDK, DiscordSDKMock } from "@discord/embedded-app-sdk";

const clientId = import.meta.env.PUBLIC_DISCORD_CLIENT_ID || "no-defined";

let discordSdk: DiscordSDK | DiscordSDKMock;

// Detect if we are running inside Discord
const isDiscord = new URLSearchParams(window.location.search).has('frame_id') || 
                  document.referrer.includes('discord.com');

if (isDiscord) {
  discordSdk = new DiscordSDK(clientId);
} else {
  // Use a mock for local development outside of Discord
  const mockUserId = "123456789012345678";
  const mockGuildId = "876543210987654321";
  const mockChannelId = "112233445566778899";

  discordSdk = new DiscordSDKMock(clientId, mockGuildId, mockChannelId);
  const discriminator = String(mockUserId).padStart(4, '0');

  // Optional: setup mock data
  discordSdk._updateCommandMocks({
    authenticate: async () => {
      return {
        access_token: 'mock_token',
        user: {
          username: 'mock_user',
          discriminator,
          id: mockUserId,
          avatar: null,
          public_flags: 1,
        },
        scopes: [],
        expires: new Date(2112, 1, 1).toString(),
        application: {
          description: 'mock_app_description',
          icon: 'mock_app_icon',
          id: 'mock_app_id',
          name: 'mock_app_name',
        },
      };
    },
  });
}

export async function setupDiscordSdk() {
  await discordSdk.ready();
  console.log("Discord SDK is ready");

  // Authenticate with Discord client if we need user info
  // You would typically fetch an access token from your backend
  // using discordSdk.commands.authorize() to get a code, then exchange it.
  
  // For now, we just indicate readiness
  return discordSdk;
}

export { discordSdk, isDiscord };
