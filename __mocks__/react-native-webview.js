/**
 * Mock for react-native-webview
 */

import React from 'react';
import {View} from 'react-native';

export const WebView = React.forwardRef((props, ref) => {
  return React.createElement(View, {ref, style: props.style, testID: 'webview'});
});

export default WebView;
