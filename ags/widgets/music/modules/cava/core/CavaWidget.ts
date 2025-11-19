import { Gtk, Gdk } from "ags/gtk4";
import Cava from "gi://AstalCava";
import GObject, { register, setter, getter } from "ags/gobject";
import GLib from "gi://GLib?version=2.0";
import { Accessor, jsx } from "ags";
import { CavaStyle, getStyleEnum } from "./CavaStyle";

import {
  drawCatmullRom,
  drawSmooth,
  drawBars,
  drawDots,
  drawCircular,
  drawMesh,
  drawJumpingBars,
  drawParticles,
  drawWaveParticles,
  drawWaterfall,
} from "../visualizers";

import {
  createJumpingBarsState,
  JumpingBarsState,
  createParticleState,
  ParticleState,
  createWaterfallState,
  WaterfallState,
} from "../utils";

const CavaStyleSpec = (name: string, flags: GObject.ParamFlags) =>
  GObject.ParamSpec.int(
    name,
    "Style",
    "Visualization style",
    flags,
    CavaStyle.SMOOTH,
    CavaStyle.MESH,
    CavaStyle.CATMULL_ROM,
  );

@register({ GTypeName: "Cava" })
export class CavaWidget extends Gtk.Widget {
  static {
    Gtk.Widget.set_css_name.call(this, "cava");
  }

  #style = CavaStyle.CATMULL_ROM;
  #disposed = false;
  #cavaSignalId: number | null = null;
  #styleSignalId: number | null = null;
  
  private cava: Cava.Cava | null = null;
  private particleState: ParticleState | null = null;
  private waterfallState: WaterfallState | null = null;
  private jumpingBarsState: JumpingBarsState | null = null;
  private rgba: Gdk.RGBA | null = null;
  private lastValues: number[] = [];
  private lastBars: number = 0;

  constructor(params?: any) {
    const { style, ...gtkParams } = params || {};
    super(gtkParams);

    try {
      // Initialize states
      this.particleState = createParticleState();
      this.waterfallState = createWaterfallState();
      this.jumpingBarsState = createJumpingBarsState();

      // Pre-allocate color
      this.rgba = new Gdk.RGBA();
      this.rgba.parse("#a6da95");

      // Setup style signal
      this.#styleSignalId = this.connect("notify::style", () => {
        if (!this.#disposed) {
          this.queue_draw();
        }
      });

      if (style !== undefined) {
        this.style = style;
      }

      // Initialize CAVA safely using GLib.idle_add
      GLib.idle_add(GLib.PRIORITY_LOW, () => {
        if (this.#disposed) return GLib.SOURCE_REMOVE;

        try {
          this.cava = Cava.get_default();
          
          if (!this.cava) {
            console.error("CAVA: Failed to get instance");
            return GLib.SOURCE_REMOVE;
          }

          // Test if CAVA works
          const testValues = this.cava.get_values();
          const testBars = this.cava.get_bars();
          
          if (!testValues || !Array.isArray(testValues) || testBars <= 0) {
            console.error("CAVA: Invalid initial data");
            this.cava = null;
            return GLib.SOURCE_REMOVE;
          }

          // Cache initial values
          this.lastValues = testValues.slice();
          this.lastBars = testBars;

          // Connect signal with safety wrapper
          this.#cavaSignalId = this.cava.connect("notify::values", () => {
            if (!this.#disposed) {
              try {
                this.queue_draw();
              } catch (e) {
                console.error("CAVA: queue_draw error:", e);
              }
            }
          });

          console.log("CAVA: Initialized successfully");

        } catch (error) {
          console.error("CAVA: Initialization error:", error);
          this.cava = null;
        }

        return GLib.SOURCE_REMOVE;
      });

    } catch (error) {
      console.error("CAVA: Constructor error:", error);
      this.#disposed = true;
    }
  }

  @getter(CavaStyleSpec)
  get style(): CavaStyle {
    return this.#style;
  }

  @setter(CavaStyleSpec)
  set style(value: CavaStyle | string | number) {
    if (this.#disposed) return;

    const enumValue =
      typeof value === "string" || typeof value === "number"
        ? getStyleEnum(value)
        : value;

    if (this.#style !== enumValue) {
      this.#style = enumValue;
      this.notify("style");
    }
  }

  getColor(): Gdk.RGBA {
    return this.rgba || new Gdk.RGBA();
  }

  private getSafeData(): { values: number[], bars: number } | null {
    if (!this.cava) {
      return this.lastValues.length > 0 
        ? { values: this.lastValues, bars: this.lastBars }
        : null;
    }

    try {
      const values = this.cava.get_values();
      const bars = this.cava.get_bars();

      // Validate
      if (!values || !Array.isArray(values) || bars <= 0 || values.length === 0) {
        return this.lastValues.length > 0 
          ? { values: this.lastValues, bars: this.lastBars }
          : null;
      }

      // Validate all values are finite numbers
      for (let i = 0; i < values.length; i++) {
        if (typeof values[i] !== 'number' || !isFinite(values[i])) {
          return this.lastValues.length > 0 
            ? { values: this.lastValues, bars: this.lastBars }
            : null;
        }
      }

      // Cache good values
      this.lastValues = values.slice();
      this.lastBars = bars;

      return { values, bars };

    } catch (error) {
      console.error("CAVA: Error getting data:", error);
      return this.lastValues.length > 0 
        ? { values: this.lastValues, bars: this.lastBars }
        : null;
    }
  }

  vfunc_snapshot(snapshot: Gtk.Snapshot): void {
    if (this.#disposed) return;

    super.vfunc_snapshot(snapshot);

    try {
      const width = this.get_width();
      const height = this.get_height();

      if (width <= 0 || height <= 0) return;

      const data = this.getSafeData();
      if (!data) return;

      const { values, bars } = data;
      const color = this.getColor();

      // Draw based on style
      try {
        switch (this.#style) {
          case CavaStyle.SMOOTH:
            drawSmooth(this, snapshot, values, bars);
            break;
          case CavaStyle.CATMULL_ROM:
            drawCatmullRom(this, snapshot, values, bars);
            break;
          case CavaStyle.BARS:
            drawBars(this, snapshot, values, bars);
            break;
          case CavaStyle.JUMPING_BARS:
            if (this.jumpingBarsState) {
              drawJumpingBars(this, snapshot, values, bars, this.jumpingBarsState);
            }
            break;
          case CavaStyle.DOTS:
            drawDots(this, snapshot, values, bars);
            break;
          case CavaStyle.CIRCULAR:
            drawCircular(this, snapshot, values, bars);
            break;
          case CavaStyle.PARTICLES:
            if (this.particleState) {
              drawParticles(this, snapshot, values, bars, this.particleState);
            }
            break;
          case CavaStyle.WAVE_PARTICLES:
            if (this.particleState) {
              drawWaveParticles(this, snapshot, values, bars, this.particleState);
            }
            break;
          case CavaStyle.WATERFALL:
            if (this.waterfallState) {
              drawWaterfall(this, snapshot, values, bars, this.waterfallState);
            }
            break;
          case CavaStyle.MESH:
            drawMesh(this, snapshot, values, bars);
            break;
          default:
            drawCatmullRom(this, snapshot, values, bars);
        }
      } catch (drawError) {
        console.error("CAVA: Draw error:", drawError);
      }

    } catch (error) {
      console.error("CAVA: Snapshot error:", error);
    }
  }

  vfunc_dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;

    // Disconnect signals
    if (this.#cavaSignalId !== null && this.cava) {
      try {
        this.cava.disconnect(this.#cavaSignalId);
      } catch (error) {
        console.error("CAVA: Error disconnecting signal:", error);
      }
      this.#cavaSignalId = null;
    }

    if (this.#styleSignalId !== null) {
      try {
        this.disconnect(this.#styleSignalId);
      } catch (error) {
        console.error("CAVA: Error disconnecting style signal:", error);
      }
      this.#styleSignalId = null;
    }

    // Clear references
    this.particleState = null;
    this.waterfallState = null;
    this.jumpingBarsState = null;
    this.rgba = null;
    this.cava = null;
    this.lastValues = [];

    super.vfunc_dispose();
  }
}

export interface CavaDrawProps {
  style?: CavaStyle | string | Accessor<string>;
  hexpand?: boolean;
  vexpand?: boolean;
}

export function CavaDraw({
  style,
  hexpand,
  vexpand,
}: CavaDrawProps): CavaWidget {
  return jsx(CavaWidget, {
    style,
    hexpand,
    vexpand,
  });
}