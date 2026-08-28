import { CycleRingModel } from "../../types/period";
import { getCanvasPixelRatio } from "../../utils/device";

const FULL_CIRCLE = Math.PI * 2;
const START_ANGLE = -Math.PI / 2;
const GAP_ANGLE = (Math.PI / 180) * 6;

function easeOutCubic(value: number): number {
  return 1 - Math.pow(1 - value, 3);
}

Component({
  properties: {
    model: {
      type: Object,
      value: null,
      observer() {
        this.redraw();
      },
    },
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
        .select("#cycleCanvas")
        .fields({ node: true, size: true })
        .exec((result) => {
          const canvasInfo = result?.[0];
          if (!canvasInfo?.node || !canvasInfo.width || !canvasInfo.height) return;
          const dpr = getCanvasPixelRatio();
          const canvas = canvasInfo.node;
          canvas.width = canvasInfo.width * dpr;
          canvas.height = canvasInfo.height * dpr;
          const context = canvas.getContext("2d");
          context.scale(dpr, dpr);
          this.canvas = canvas;
          this.context = context;
          this.logicalWidth = canvasInfo.width;
          this.logicalHeight = canvasInfo.height;
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
      if (!this.canvas || !this.context || !this.data.model) return;
      this.cancelFrame();
      const model = this.data.model as CycleRingModel;
      const hasRecords = model.centerTitle !== "等待记录";
      const shouldAnimate =
        !model.isStale &&
        (!this.hasDrawn || (this.lastHadRecords === false && hasRecords));
      this.lastHadRecords = hasRecords;

      if (!shouldAnimate) {
        this.draw(1);
        this.hasDrawn = true;
        return;
      }

      const startedAt = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startedAt;
        const progress = easeOutCubic(Math.min(1, elapsed / 500));
        this.draw(progress);
        if (progress < 1 && this.canvas) {
          this.frameId = this.canvas.requestAnimationFrame(animate);
        } else {
          this.frameId = undefined;
          this.hasDrawn = true;
        }
      };
      animate();
    },

    draw(progress: number) {
      const model = this.data.model as CycleRingModel;
      const context = this.context;
      const width = this.logicalWidth;
      const height = this.logicalHeight;
      const centerX = width / 2;
      const centerY = height / 2;
      const lineWidth = Math.max(18, Math.min(width, height) * 0.105);
      const radius = Math.min(width, height) / 2 - lineWidth / 2 - 8;
      const progressAngle = START_ANGLE + FULL_CIRCLE * progress;

      context.clearRect(0, 0, width, height);
      context.save();
      context.globalAlpha = model.isStale ? 0.55 : 1;
      context.lineWidth = lineWidth;
      context.lineCap = "round";

      let cursor = START_ANGLE;
      model.segments.forEach((segment) => {
        const sweep = (segment.days / model.totalDays) * FULL_CIRCLE;
        const visibleEnd = cursor + Math.max(0.02, sweep - GAP_ANGLE);
        const animatedEnd = Math.min(visibleEnd, progressAngle);
        if (animatedEnd > cursor) {
          context.beginPath();
          context.strokeStyle = segment.color;
          context.shadowColor = `${segment.color}55`;
          context.shadowBlur = 10;
          context.arc(centerX, centerY, radius, cursor, animatedEnd);
          context.stroke();
        }
        cursor += sweep;
      });
      context.restore();

      const indicatorRatio = (model.currentDay - 0.5) / model.totalDays;
      if (progress >= indicatorRatio || model.isStale) {
        const angle = START_ANGLE + indicatorRatio * FULL_CIRCLE;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        context.beginPath();
        context.fillStyle = "rgba(255,255,255,0.78)";
        context.arc(x, y, 13, 0, FULL_CIRCLE);
        context.fill();
        context.beginPath();
        context.fillStyle = model.isStale ? "#A39399" : "#D4768A";
        context.arc(x, y, 6, 0, FULL_CIRCLE);
        context.fill();
      }
    },
  },
});
