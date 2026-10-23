const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'node_modules', 'expo-notifications', 'build', 'TopicSubscriptionModule.android.js');

const patchContent = `import { requireOptionalNativeModule } from 'expo-modules-core';

const fallbackModule = {
  addListener: () => {},
  removeListeners: () => {},
  subscribeToTopicAsync: () => Promise.resolve(null),
  unsubscribeFromTopicAsync: () => Promise.resolve(null),
};

const nativeModule =
  (typeof requireOptionalNativeModule === 'function'
    ? requireOptionalNativeModule('ExpoTopicSubscriptionModule')
    : null) || fallbackModule;

export default nativeModule;
`;

try {
  if (fs.existsSync(targetPath)) {
    fs.writeFileSync(targetPath, patchContent, 'utf8');
    console.log('[patch-expo-notifications] Successfully patched TopicSubscriptionModule.android.js for Expo Go');
  }
} catch (err) {
  console.warn('[patch-expo-notifications] Warning: Could not patch TopicSubscriptionModule:', err.message);
}
