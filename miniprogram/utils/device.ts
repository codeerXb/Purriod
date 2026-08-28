export function getCanvasPixelRatio(): number {
  const info =
    typeof wx.getWindowInfo === "function"
      ? wx.getWindowInfo()
      : wx.getSystemInfoSync();
  return info.pixelRatio || 1;
}
