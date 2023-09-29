export const CrossBrowserAudioContext: typeof AudioContext =
  window.AudioContext || window["webkitAudioContext"];
