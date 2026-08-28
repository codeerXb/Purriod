import { ChartBarItem } from "../../types/period";

function roundedRect(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, height / 2, width / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

Component({
  properties: {
    bars: {
      type: Array,
      value: [],
      observer() {
        this.redraw();
      },
    },
  },
  data: {
    activeItem: null,
  },
  lifetimes: {
    ready() {
      this.initializeCanvas();
    },
    detached() {
      this.cancelFrame();
      this.canvas = null;
      this.context = null;
    },
  },
  methods: {
    initializeCanvas() {
      this.createSelectorQuery()
        .select("#durationCanvas")
        .fields({ node: true, size: true })
        .exec((result) => {
          const info = result?.[0];
          if (!info?.node || !info.width || !info.height) return;
          const dpr = wx.getSystemInfoSync().pixelRatio || 1;
          const canvas = info.node;
          canvas.width = info.width * dpr;
          canvas.height = info.height * dpr;
          const context = canvas.getContext("2d");
          context.scale(dpr, dpr);
          this.canvas = canvas;
          this.context = context;
          this.logicalWidth = info.width;
          this.logicalHeight = info.height;
          this.redraw();
        });
    },
    cancelFrame() {
      if (this.canvas && this.frameId !== undefined) {
        this.canvas.cancelAnimationFrame(this.frameId);
      }
      this.frameId = undefined;
    },
    redraw() {
      if (!this.canvas || !this.context) return;
      this.cancelFrame();
      const bars = (this.data.bars || []) as ChartBarItem[];
      if (!bars.length) {
        this.draw(1);
        return;
      }
      if (this.hasDrawn) {
        this.draw(1);
        this.hasDrawn = true;
        return;
      }
      const startedAt = Date.now();
      const animate = () => {
        const linear = Math.min(1, (Date.now() - startedAt) / 500);
        const progress = 1 - Math.pow(1 - linear, 3);
        this.draw(progress);
        if (linear < 1 && this.canvas) {
          this.frameId = this.canvas.requestAnimationFrame(animate);
        } else {
          this.frameId = undefined;
          this.hasDrawn = true;
        }
      };
      animate();
    },
    draw(progress: number) {
      const bars = (this.data.bars || []) as ChartBarItem[];
      const context = this.context;
      const width = this.logicalWidth;
      const height = this.logicalHeight;
      context.clearRect(0, 0, width, height);
      this.barRects = [];
      if (!bars.length) return;

      const top = 28;
      const bottom = 34;
      const side = 12;
      const gap = 10;
      const slotWidth = (width - side * 2) / bars.length;
      const barWidth = Math.min(34, slotWidth - gap);
      const chartHeight = height - top - bottom;
      const maxValue = Math.max(...bars.map((item) => item.value), 1);
      bars.forEach((item, index) => {
        const fullHeight = Math.max(16, (chartHeight * item.value) / maxValue);
        const currentHeight = fullHeight * progress;
        const x = side + index * slotWidth + (slotWidth - barWidth) / 2;
        const y = top + chartHeight - currentHeight;
        roundedRect(context, x, y, barWidth, currentHeight, 8);
        if (item.variant === "estimated") {
          context.setLineDash([5, 4]);
          context.strokeStyle = "#D4768A";
          context.lineWidth = 1.5;
          context.stroke();
          context.setLineDash([]);
        } else {
          const gradient = context.createLinearGradient(0, y, 0, y + fullHeight);
          gradient.addColorStop(0, "#D4768A");
          gradient.addColorStop(1, "#F0B6C1");
          context.fillStyle = gradient;
          context.fill();
        }
        context.fillStyle = "#6E6066";
        context.font = "12px sans-serif";
        context.textAlign = "center";
        context.fillText(item.valueLabel, x + barWidth / 2, Math.max(14, y - 7));
        context.fillStyle = "#9A8C91";
        context.fillText(item.label, x + barWidth / 2, height - 10);
        this.barRects.push({
          item,
          x,
          y: top + chartHeight - fullHeight,
          width: barWidth,
          height: fullHeight,
        });
      });
    },
    onTouchEnd(event) {
      const touch = event.changedTouches?.[0];
      if (!touch) return;
      const hit = (this.barRects || []).find(
        (rect) =>
          touch.x >= rect.x &&
          touch.x <= rect.x + rect.width &&
          touch.y >= rect.y &&
          touch.y <= rect.y + rect.height,
      );
      this.setData({ activeItem: hit?.item || null });
    },
  },
});
