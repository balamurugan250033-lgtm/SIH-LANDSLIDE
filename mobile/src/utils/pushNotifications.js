function isExpoGo(appContext = {}) {
  const ownership = appContext.appOwnership || 'standalone';
  return ownership === 'expo';
}

function hasGoogleServicesConfig(appContext = {}) {
  const androidConfig = appContext.expoConfig?.android || appContext.android || {};
  const iosConfig = appContext.expoConfig?.ios || appContext.ios || {};

  return Boolean(
    androidConfig.googleServicesFile ||
    androidConfig.googleServicesFilePath ||
    iosConfig.googleServicesFile ||
    iosConfig.googleServicesFilePath ||
    process.env.GOOGLE_SERVICES_JSON
  );
}

function shouldInitPushNotifications(appContext = {}) {
  if (isExpoGo(appContext)) {
    return false;
  }

  return hasGoogleServicesConfig(appContext);
}

module.exports = {
  isExpoGo,
  hasGoogleServicesConfig,
  shouldInitPushNotifications,
};
