const { isExpoGo, shouldInitPushNotifications } = require('../src/utils/pushNotifications');

describe('push notification availability', () => {
  it('treats Expo Go as unsupported for remote push notifications', () => {
    expect(isExpoGo({ appOwnership: 'expo' })).toBe(true);
    expect(shouldInitPushNotifications({ appOwnership: 'expo' })).toBe(false);
  });

  it('skips remote push setup when Firebase config is missing', () => {
    expect(shouldInitPushNotifications({ appOwnership: 'standalone' })).toBe(false);
    expect(shouldInitPushNotifications({ appOwnership: 'guest' })).toBe(false);
  });

  it('allows remote push notifications when Firebase config exists', () => {
    expect(shouldInitPushNotifications({
      appOwnership: 'standalone',
      expoConfig: { android: { googleServicesFile: './google-services.json' } },
    })).toBe(true);
  });
});
