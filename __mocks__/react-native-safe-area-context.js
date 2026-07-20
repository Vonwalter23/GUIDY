/**
 * Mock for react-native-safe-area-context
 */

const React = require('react');
const {View} = require('react-native');

const SafeAreaContext = React.createContext({
  insets: {top: 0, left: 0, right: 0, bottom: 0},
});

function SafeAreaProvider({children}) {
  return React.createElement(
    SafeAreaContext.Provider,
    {value: {insets: {top: 0, left: 0, right: 0, bottom: 0}}},
    children,
  );
}

function SafeAreaView({children, style, edges}) {
  return React.createElement(View, {style}, children);
}

function useSafeAreaInsets() {
  return {top: 0, left: 0, right: 0, bottom: 0};
}

function useSafeAreaFrame() {
  return {x: 0, y: 0, width: 375, height: 812};
}

function SafeAreaConsumer({children}) {
  const value = React.useContext(SafeAreaContext);
  return children(value.insets);
}

// Create a simple component for SafeAreaFrame
const SafeAreaFrame = function SafeAreaFrameComponent() {
  return React.createElement(View);
};

module.exports = {
  SafeAreaProvider,
  SafeAreaView,
  SafeAreaConsumer,
  SafeAreaFrame,
  useSafeAreaInsets,
  useSafeAreaFrame,
  SafeAreaInsetsContext: SafeAreaContext,
};
