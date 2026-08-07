const { withEntitlementsPlist } = require("@expo/config-plugins");

module.exports = function withIosPushCapability(config) {
  return withEntitlementsPlist(config, (updatedConfig) => {
    if (updatedConfig.extra?.nativePushEnabled === false) {
      delete updatedConfig.modResults["aps-environment"];
    }

    return updatedConfig;
  });
};
