import * as Keychain from 'react-native-keychain';

const ACCESS_TOKEN_KEY = 'voicecall_access_token';
const REFRESH_TOKEN_KEY = 'voicecall_refresh_token';

// In-memory fallback for environments where Keychain is initializing
let inMemoryAccessToken: string | null = null;
let inMemoryRefreshToken: string | null = null;

export const StorageService = {
  /**
   * Save JWT Access Token securely in Keychain
   */
  async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    inMemoryAccessToken = accessToken;
    inMemoryRefreshToken = refreshToken;

    try {
      await Keychain.setGenericPassword(
        'auth_tokens',
        JSON.stringify({ accessToken, refreshToken }),
        { service: ACCESS_TOKEN_KEY },
      );
    } catch (err) {
      console.warn('Keychain saveTokens error, using fallback:', err);
    }
  },

  /**
   * Retrieve Access Token
   */
  async getAccessToken(): Promise<string | null> {
    if (inMemoryAccessToken) return inMemoryAccessToken;

    try {
      const credentials = await Keychain.getGenericPassword({ service: ACCESS_TOKEN_KEY });
      if (credentials && credentials.password) {
        const parsed = JSON.parse(credentials.password);
        inMemoryAccessToken = parsed.accessToken;
        inMemoryRefreshToken = parsed.refreshToken;
        return parsed.accessToken;
      }
    } catch (err) {
      console.warn('Keychain getAccessToken error:', err);
    }
    return inMemoryAccessToken;
  },

  /**
   * Retrieve Refresh Token
   */
  async getRefreshToken(): Promise<string | null> {
    if (inMemoryRefreshToken) return inMemoryRefreshToken;

    try {
      const credentials = await Keychain.getGenericPassword({ service: ACCESS_TOKEN_KEY });
      if (credentials && credentials.password) {
        const parsed = JSON.parse(credentials.password);
        inMemoryAccessToken = parsed.accessToken;
        inMemoryRefreshToken = parsed.refreshToken;
        return parsed.refreshToken;
      }
    } catch (err) {
      console.warn('Keychain getRefreshToken error:', err);
    }
    return inMemoryRefreshToken;
  },

  /**
   * Clear all stored credentials on Logout
   */
  async clearAll(): Promise<void> {
    inMemoryAccessToken = null;
    inMemoryRefreshToken = null;

    try {
      await Keychain.resetGenericPassword({ service: ACCESS_TOKEN_KEY });
    } catch (err) {
      console.warn('Keychain clearAll error:', err);
    }
  },
};
