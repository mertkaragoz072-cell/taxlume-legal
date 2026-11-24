const { withEntitlementsPlist } = require("expo/config-plugins");

/** Strips the `aps-environment` entitlement that expo-notifications adds.
 *
 * The app schedules local notifications and nothing else — no push token is
 * ever requested, there is no server, and `scheduleNotificationAsync` needs
 * no entitlement. But expo-notifications adds `aps-environment` regardless,
 * which declares the Push Notifications capability, and the archive then
 * fails:
 *
 *     "GoldenTown" requires a provisioning profile with the Push
 *     Notifications feature.
 *
 * The alternative is to switch the capability on for the App ID and issue a
 * new profile, which means keeping an APNs setup alive for a feature the app
 * does not have, and answering for it at review. Removing the entitlement is
 * the honest shape: the app asks for what it uses.
 *
 * Registered *first* in app.json's plugins, which is what makes it run
 * *last*: config-plugin mods compose in reverse, so the plugin listed after
 * expo-notifications runs before it and sees an empty entitlements file.
 * Verified by prebuilding and reading the generated .entitlements — put this
 * anywhere else in the list and it silently does nothing.
 */
module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults["aps-environment"];
    return cfg;
  });
};
