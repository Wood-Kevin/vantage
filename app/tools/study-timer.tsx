import { useRouter } from "expo-router";
import { ArrowLeft, ChevronDown, ChevronUp, Pause, Play, RotateCcw } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, Vibration, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PremiumGate from "@/components/PremiumGate";
import { usePremium } from "@/lib/entitlements";

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = "work" | "shortBreak" | "longBreak";

type Settings = {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  pomodorosBeforeLong: number;
};

const DEFAULT_SETTINGS: Settings = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  pomodorosBeforeLong: 4,
};

const PHASE_LABELS: Record<Phase, string> = {
  work: "Work",
  shortBreak: "Short Break",
  longBreak: "Long Break",
};

const PHASE_COLORS: Record<Phase, string> = {
  work: "#7c3aed",
  shortBreak: "#16a34a",
  longBreak: "#0369a1",
};

function phaseSeconds(p: Phase, s: Settings): number {
  switch (p) {
    case "work":
      return s.workMinutes * 60;
    case "shortBreak":
      return s.shortBreakMinutes * 60;
    case "longBreak":
      return s.longBreakMinutes * 60;
  }
}

// ─── Stepper sub-component ────────────────────────────────────────────────────

function Stepper({
  label,
  value,
  min,
  max,
  onDecrement,
  onIncrement,
  suffix = "",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onDecrement: () => void;
  onIncrement: () => void;
  suffix?: string;
}) {
  return (
    <View className="flex-row items-center justify-between py-2">
      <Text className="flex-1 text-sm text-zinc-700 dark:text-zinc-300">{label}</Text>
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={onDecrement}
          disabled={value <= min}
          hitSlop={8}
          className="rounded-lg border border-zinc-200 px-3 py-1 dark:border-zinc-700"
        >
          <Text
            className={`text-lg font-bold ${
              value <= min ? "text-zinc-300 dark:text-zinc-600" : "text-violet-600"
            }`}
          >
            −
          </Text>
        </Pressable>
        <Text className="w-12 text-center text-sm font-bold text-zinc-900 dark:text-white">
          {value}
          {suffix}
        </Text>
        <Pressable
          onPress={onIncrement}
          disabled={value >= max}
          hitSlop={8}
          className="rounded-lg border border-zinc-200 px-3 py-1 dark:border-zinc-700"
        >
          <Text
            className={`text-lg font-bold ${
              value >= max ? "text-zinc-300 dark:text-zinc-600" : "text-violet-600"
            }`}
          >
            +
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StudyTimerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPremium, isLoading } = usePremium();

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("work");
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_SETTINGS.workMinutes * 60);
  const [running, setRunning] = useState(false);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);

  // Refs so the interval always has fresh values
  const phaseRef = useRef<Phase>("work");
  const secondsLeftRef = useRef(DEFAULT_SETTINGS.workMinutes * 60);
  const settingsRef = useRef<Settings>(DEFAULT_SETTINGS);
  const completedRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep refs in sync with state
  phaseRef.current = phase;
  secondsLeftRef.current = secondsLeft;
  settingsRef.current = settings;
  completedRef.current = completedPomodoros;

  function advance() {
    Vibration.vibrate([0, 400, 200, 400]);
    const currentPhase = phaseRef.current;
    const completed = completedRef.current;
    const s = settingsRef.current;

    let nextCompleted = completed;
    let nextPhase: Phase;

    if (currentPhase === "work") {
      nextCompleted = completed + 1;
      nextPhase =
        nextCompleted % s.pomodorosBeforeLong === 0 ? "longBreak" : "shortBreak";
    } else {
      nextPhase = "work";
    }

    const nextSeconds = phaseSeconds(nextPhase, s);

    setCompletedPomodoros(nextCompleted);
    setPhase(nextPhase);
    setSecondsLeft(nextSeconds);
    setRunning(true);
  }

  // Interval tick
  useEffect(() => {
    if (!running) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      const next = secondsLeftRef.current - 1;
      if (next <= 0) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        setRunning(false);
        setSecondsLeft(0);
        advance();
      } else {
        setSecondsLeft(next);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      if (!running) {
        const newSeconds = phaseSeconds(phaseRef.current, next);
        setSecondsLeft(newSeconds);
      }
      return next;
    });
  }

  function resetCurrent() {
    setRunning(false);
    setSecondsLeft(phaseSeconds(phase, settings));
  }

  function resetAll() {
    setRunning(false);
    setPhase("work");
    setCompletedPomodoros(0);
    setSecondsLeft(settings.workMinutes * 60);
  }

  const totalSecs = phaseSeconds(phase, settings);
  const progressPct = totalSecs > 0 ? 1 - secondsLeft / totalSecs : 0;
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeStr = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  const phaseColor = PHASE_COLORS[phase];
  const pomodoroInCycle = completedPomodoros % settings.pomodorosBeforeLong;

  if (isLoading) return null;
  if (!isPremium) {
    return (
      <View className="flex-1 bg-white dark:bg-zinc-900">
        <PremiumGate toolName="Study Timer" onClose={() => router.back()} />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-zinc-900"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
    >
      {/* Header */}
      <View
        style={{ paddingTop: insets.top + 8 }}
        className="flex-row items-center gap-3 px-4 pb-4"
      >
        <Pressable onPress={() => router.back()} hitSlop={8} className="rounded-full p-1">
          <ArrowLeft size={22} color="#7c3aed" />
        </Pressable>
        <Text className="text-xl font-bold text-zinc-900 dark:text-white">
          Study Timer
        </Text>
      </View>

      <View className="px-4">
        {/* Collapsible settings */}
        <Pressable
          onPress={() => setSettingsOpen((v) => !v)}
          className="mb-4 flex-row items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800"
        >
          <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Timer Settings
          </Text>
          {settingsOpen ? (
            <ChevronUp size={16} color="#a1a1aa" />
          ) : (
            <ChevronDown size={16} color="#a1a1aa" />
          )}
        </Pressable>

        {settingsOpen && (
          <View className="mb-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-800">
            <Stepper
              label="Work duration"
              value={settings.workMinutes}
              min={5}
              max={60}
              suffix=" min"
              onDecrement={() =>
                updateSetting("workMinutes", Math.max(5, settings.workMinutes - 5))
              }
              onIncrement={() =>
                updateSetting("workMinutes", Math.min(60, settings.workMinutes + 5))
              }
            />
            <View className="border-t border-zinc-200 dark:border-zinc-700" />
            <Stepper
              label="Short break"
              value={settings.shortBreakMinutes}
              min={1}
              max={30}
              suffix=" min"
              onDecrement={() =>
                updateSetting(
                  "shortBreakMinutes",
                  Math.max(1, settings.shortBreakMinutes - 1)
                )
              }
              onIncrement={() =>
                updateSetting(
                  "shortBreakMinutes",
                  Math.min(30, settings.shortBreakMinutes + 1)
                )
              }
            />
            <View className="border-t border-zinc-200 dark:border-zinc-700" />
            <Stepper
              label="Long break"
              value={settings.longBreakMinutes}
              min={5}
              max={60}
              suffix=" min"
              onDecrement={() =>
                updateSetting(
                  "longBreakMinutes",
                  Math.max(5, settings.longBreakMinutes - 5)
                )
              }
              onIncrement={() =>
                updateSetting(
                  "longBreakMinutes",
                  Math.min(60, settings.longBreakMinutes + 5)
                )
              }
            />
            <View className="border-t border-zinc-200 dark:border-zinc-700" />
            <Stepper
              label="Pomodoros before long break"
              value={settings.pomodorosBeforeLong}
              min={2}
              max={8}
              onDecrement={() =>
                updateSetting(
                  "pomodorosBeforeLong",
                  Math.max(2, settings.pomodorosBeforeLong - 1)
                )
              }
              onIncrement={() =>
                updateSetting(
                  "pomodorosBeforeLong",
                  Math.min(8, settings.pomodorosBeforeLong + 1)
                )
              }
            />
          </View>
        )}

        {/* Phase label */}
        <Text
          className="mb-4 text-center text-sm font-semibold uppercase tracking-widest"
          style={{ color: phaseColor }}
        >
          {PHASE_LABELS[phase]}
        </Text>

        {/* Circular timer display */}
        <View className="mb-6 items-center">
          <View
            className="items-center justify-center"
            style={{
              width: 220,
              height: 220,
              borderRadius: 110,
              borderWidth: 8,
              borderColor: phaseColor + "25",
              backgroundColor: phaseColor + "0d",
            }}
          >
            {/* Simulated fill ring overlay */}
            <View
              className="absolute"
              style={{
                width: 220,
                height: 220,
                borderRadius: 110,
                borderWidth: 8,
                borderColor: phaseColor,
                opacity: Math.max(progressPct, 0.12),
              }}
            />
            <Text
              className="text-6xl font-bold"
              style={{ color: phaseColor }}
            >
              {timeStr}
            </Text>
            <Text className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
              {running ? "running" : secondsLeft === 0 ? "done!" : "paused"}
            </Text>
          </View>
        </View>

        {/* Pomodoro progress dots */}
        <View className="mb-6 flex-row items-center justify-center gap-2">
          {Array.from({ length: settings.pomodorosBeforeLong }).map((_, i) => (
            <View
              key={i}
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: i < pomodoroInCycle ? PHASE_COLORS.work : "#d4d4d8",
              }}
            />
          ))}
          <Text className="ml-2 text-xs text-zinc-400 dark:text-zinc-500">
            {completedPomodoros} done
          </Text>
        </View>

        {/* Controls */}
        <View className="flex-row items-center justify-center gap-4">
          <Pressable
            onPress={resetCurrent}
            className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-700"
          >
            <RotateCcw size={22} color="#a1a1aa" />
          </Pressable>

          <Pressable
            onPress={() => setRunning((r) => !r)}
            className="items-center justify-center rounded-full px-10 py-4"
            style={{ backgroundColor: phaseColor }}
          >
            {running ? (
              <Pause size={30} color="#fff" />
            ) : (
              <Play size={30} color="#fff" />
            )}
          </Pressable>

          <Pressable
            onPress={resetAll}
            className="items-center rounded-2xl border border-zinc-200 p-4 dark:border-zinc-700"
          >
            <Text className="text-center text-[10px] font-semibold leading-4 text-zinc-400">
              Reset{"\n"}All
            </Text>
          </Pressable>
        </View>

        {/* Phase strip */}
        <View className="mt-6 flex-row gap-2">
          {(["work", "shortBreak", "longBreak"] as Phase[]).map((p) => (
            <View
              key={p}
              className="flex-1 items-center rounded-2xl border py-3"
              style={
                phase === p
                  ? { borderColor: PHASE_COLORS[p], backgroundColor: PHASE_COLORS[p] + "12" }
                  : { borderColor: "#e4e4e7" }
              }
            >
              <Text className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                {PHASE_LABELS[p]}
              </Text>
              <Text
                className="mt-0.5 text-sm font-bold"
                style={{ color: phase === p ? PHASE_COLORS[p] : "#a1a1aa" }}
              >
                {p === "work"
                  ? settings.workMinutes
                  : p === "shortBreak"
                  ? settings.shortBreakMinutes
                  : settings.longBreakMinutes}{" "}
                min
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
