// ~/.config/ags/utils/timer.ts
import { exec, execAsync } from "ags/process";
import { readFile, writeFile } from "ags/file";
import { createState } from "ags";

export interface Timer {
  id: string;
  name: string;
  duration: number; // in seconds
  remaining: number;
  running: boolean;
  notified: boolean;
}

class TimerService {
  private timersState = createState<Timer[]>([]);
  private activeTimerIdState = createState<string | null>(null);
  private intervals = new Map<string, number>();
  private configPath = `${exec("echo $HOME")}/.config/ags/configs/timers/timers.json`;

  constructor() {
    this.load();
  }

  private load() {
    try {
      const content = readFile(this.configPath);
      const savedTimers: Omit<Timer, "running" | "notified">[] = JSON.parse(content);
      
      const [, setTimers] = this.timersState;
      setTimers(
        savedTimers.map((t) => ({
          ...t,
          remaining: t.duration,
          running: false,
          notified: false,
        }))
      );
    } catch {
      // File doesn't exist or is invalid, start fresh
      this.save();
    }
  }

  private save() {
    const [timers] = this.timersState;
    const timersToSave = timers.get().map(({ id, name, duration }) => ({
      id,
      name,
      duration,
    }));
    
    writeFile(JSON.stringify(timersToSave, null, 2), this.configPath);
  }

  private notify(timer: Timer) {
    if (timer.notified) return;

    execAsync([
      "notify-send",
      "-u",
      "critical",
      "-a",
      "Timer",
      `Timer Complete: ${timer.name}`,
      "Your timer has finished!",
    ]).catch(console.error);

    // Play notification sound
    execAsync([
      "paplay",
      "/usr/share/sounds/freedesktop/stereo/complete.oga",
    ]).catch(console.error);

    // Mark as notified
    const [timers, setTimers] = this.timersState;
    const currentTimers = timers.get();
    const index = currentTimers.findIndex((t) => t.id === timer.id);
    if (index !== -1) {
      currentTimers[index].notified = true;
      setTimers([...currentTimers]);
    }
  }

  addTimer(name: string, durationMinutes: number): string {
    const id = Math.random().toString(36).substring(2, 15);
    const duration = durationMinutes * 60;

    const newTimer: Timer = {
      id,
      name,
      duration,
      remaining: duration,
      running: false,
      notified: false,
    };

    const [timers, setTimers] = this.timersState;
    setTimers([...timers.get(), newTimer]);
    this.save();
    return id;
  }

  removeTimer(id: string) {
    this.stopTimer(id);
    const [timers, setTimers] = this.timersState;
    setTimers(timers.get().filter((t) => t.id !== id));
    this.save();
  }

  startTimer(id: string) {
    const [timers, setTimers] = this.timersState;
    const currentTimers = timers.get();
    const timer = currentTimers.find((t) => t.id === id);
    if (!timer || timer.running) return;

    // Stop any other running timers
    currentTimers.forEach((t) => {
      if (t.running && t.id !== id) {
        this.stopTimer(t.id);
      }
    });

    // Mark timer as running
    timer.running = true;
    timer.notified = false;
    const [, setActiveId] = this.activeTimerIdState;
    setActiveId(id);
    setTimers([...currentTimers]);

    // Start interval
    const interval = setInterval(() => {
      const [timers, setTimers] = this.timersState;
      const currentTimers = timers.get();
      const currentTimer = currentTimers.find((t) => t.id === id);
      
      if (!currentTimer) {
        clearInterval(interval);
        return;
      }

      if (currentTimer.remaining > 0) {
        currentTimer.remaining--;
        setTimers([...currentTimers]);
      } else {
        // Timer complete
        clearInterval(interval);
        this.intervals.delete(id);
        currentTimer.running = false;
        const [, setActiveId] = this.activeTimerIdState;
        setActiveId(null);
        this.notify(currentTimer);
        setTimers([...currentTimers]);
      }
    }, 1000);

    this.intervals.set(id, interval);
  }

  stopTimer(id: string) {
    const interval = this.intervals.get(id);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(id);
    }

    const [timers, setTimers] = this.timersState;
    const currentTimers = timers.get();
    const timer = currentTimers.find((t) => t.id === id);
    if (timer) {
      timer.running = false;
      const [activeId, setActiveId] = this.activeTimerIdState;
      if (activeId.get() === id) {
        setActiveId(null);
      }
      setTimers([...currentTimers]);
    }
  }

  resetTimer(id: string) {
    this.stopTimer(id);
    
    const [timers, setTimers] = this.timersState;
    const currentTimers = timers.get();
    const timer = currentTimers.find((t) => t.id === id);
    if (timer) {
      timer.remaining = timer.duration;
      timer.notified = false;
      setTimers([...currentTimers]);
    }
  }

  getTimers() {
    const [timers] = this.timersState;
    return timers;
  }

  getActiveTimer() {
    const [activeId] = this.activeTimerIdState;
    return activeId;
  }

  formatTime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }
}

export const timerService = new TimerService();