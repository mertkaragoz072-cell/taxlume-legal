// The game only schedules LOCAL reminders (expo-notifications), which need no push entitlement. expo-notifications' config plugin always adds
// `aps-environment` to the iOS entitlements, and a provisioning profile without the Push Notifications capability then fails the archive
// (Codemagic: "Archive and export" exit 65). This removes it again. Listed BEFORE expo-notifications in app.json: Expo runs mods in reverse order,
// so this one runs after it.
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (c) => {
    delete c.modResults['aps-environment'];
    return c;
  });
};
