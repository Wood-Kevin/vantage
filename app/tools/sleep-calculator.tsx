import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Pure calculation ─────────────────────────────────────────────────────────

const FALL_ASLEEP_MINUTES = 14;
const CYCLE_MINUTES = 90;
const NUM_CYCLES = 6;

type SleepOption = {
  time: string; // formatted HH:MM AM/PM
  cycles: number;
  label: string; // e.g. "6 cycles · 9 hrs"
};

function formatTime(totalMinutes: number): string {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  const period = h < 12 ? "AM" : "PM";
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${m.toString().padStart(2, "0")} ${period}`;
}

function hoursLabel(totalMin: number): string {
  const hrs = totalMin / 60;
  return hrs % 1 === 0 ? `${hrs} hrs` : `${hrs.toFixed(1)} hrs`;
}

function calcWakeUpOptions(wakeH: number, wakeM: number): SleepOption[] {
  const wakeTotalMin = wakeH * 60 + wakeM;
  return Array.from({ length: NUM_CYCLES }, (_, i) => {
    const cycles = NUM_CYCLES - i; // 6 down to 1
    const sleepMinutes = cycles * CYCLE_MINUTES + FALL_ASLEEP_MINUTES;
    const bedtimeMin = wakeTotalMin - sleepMinutes;
    return {
      time: formatTime(bedtimeMin),
      cycles,
      label: `${cycles} ${cycles === 1 ? "cycle" : "cycles"} · ${hoursLabel(cycles * CYCLE_MINUTES)}`,
    };
  });
}

function calcSleepNowOptions(nowH: number, nowM: number): SleepOption[] {
  const nowTotalMin = nowH * 60 + nowM;
  return Array.from({ length: NUM_CYCLES }, (_, i) => {
    const cycles = i + 1; // 1 up to 6
    const wakeMinutes = nowTotalMin + FALL_ASLEEP_MINUTES + cycles * CYCLE_MINUTES;
    return {
      time: formatTime(wakeMinutes),
      cycles,
      label: `${cycles} ${cycles === 1 ? "cycle" : "cycles"} · ${hoursLabel(cycles * CYCLE_MINUTES)}`,
    };
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

type Mode = "wakeup" | "now";

function Stepper({
  label,
  value,
  onDecrement,
  onIncrement,
  display,
}: {
  label: string;
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  display: string;
}) {
  return (
    <View className="flex-1 items-center">
      <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {label}
      </Text>
      <View className="flex-row items-center gap-4">
        <Pressable
          onPress={onDecrement}
          className="h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800"
        >
          <Text className="text-lg font-bold text-zinc-700 dark:text-zinc-200">−</Text>
        </Pressable>
        <Text className="w-10 text-center text-xl font-bold text-zinc-900 dark:text-white">
          {display}
        </Text>
        <Pressable
          onPress={onIncrement}
          className="h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800"
        >
          <Text className="text-lg font-bold text-zinc-700 dark:text-zinc-200">+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function qualityLabel(cycles: number): { text: string; color: string } {
  if (cycles >= 5) return { text: "Excellent", color: "text-emerald-600 dark:text-emerald-400" };
  if (cycles === 4) return { text: "Good", color: "text-violet-600 dark:text-violet-400" };
  if (cycles === 3) return { text: "Fair", color: "text-amber-500 dark:text-amber-400" };
  return { text: "Short", color: "text-red-500 dark:text-red-400" };
}

export default function SleepCalculatorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<Mode>("wakeup");

  // Wake-up mode: user sets desired wake time
  const [wakeHour, setWakeHour] = useState(7);
  const [wakeMinute, setWakeMinute] = useState(0);

  const now = new Date();
  const nowH = now.getHours();
  const nowM = now.getMinutes();

  const options =
    mode === "wakeup"
      ? calcWakeUpOptions(wakeHour, wakeMinute)
      : calcSleepNowOptions(nowH, nowM);

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-zinc-900"
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
          Sleep Calculator
        </Text>
      </View>

      <View className="px-4">
        {/* Mode toggle */}
        <View className="mb-6 flex-row rounded-2xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800">
          {(["wakeup", "now"] as Mode[]).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              className={`flex-1 rounded-xl py-2.5 ${mode === m ? "bg-violet-600" : ""}`}
            >
              <Text
                className={`text-center text-sm font-semibold ${
                  mode === m
                    ? "text-white"
                    : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {m === "wakeup" ? "Wake up at" : "Sleep now"}
              </Text>
            </Pressable>
          ))}
        </View>

        {mode === "wakeup" ? (
          <>
            <Text className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              I want to wake up at
            </Text>
            <View className="mb-6 flex-row justify-around rounded-2xl border border-zinc-200 bg-zinc-50 py-4 dark:border-zinc-700 dark:bg-zinc-800">
              <Stepper
                label="Hour"
                value={wakeHour}
                onDecrement={() => setWakeHour((h) => (h - 1 + 24) % 24)}
                onIncrement={() => setWakeHour((h) => (h + 1) % 24)}
                display={wakeHour === 0 ? "12" : wakeHour > 12 ? String(wakeHour - 12) : String(wakeHour)}
              />
              <View className="items-center justify-center">
                <Text className="text-2xl font-bold text-zinc-400">:</Text>
              </View>
              <Stepper
                label="Minute"
                value={wakeMinute}
                onDecrement={() => setWakeMinute((m) => (m - 15 + 60) % 60)}
                onIncrement={() => setWakeMinute((m) => (m + 15) % 60)}
                display={wakeMinute.toString().padStart(2, "0")}
              />
              <View className="items-center justify-center pl-2">
                <Text className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                  {wakeHour < 12 ? "AM" : "PM"}
                </Text>
              </View>
            </View>
            <Text className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
              Go to bed at one of these times:
            </Text>
          </>
        ) : (
          <View className="mb-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
            <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Sleeping now at
            </Text>
            <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              {formatTime(nowH * 60 + nowM)}
            </Text>
            <Text className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
              +{FALL_ASLEEP_MINUTES} min to fall asleep
            </Text>
          </View>
        )}

        {mode === "now" && (
          <Text className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
            Wake up at one of these times:
          </Text>
        )}

        {/* Result cards */}
        <View className="gap-3">
          {options.map((opt) => {
            const q = qualityLabel(opt.cycles);
            return (
              <View
                key={opt.cycles}
                className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    {opt.label}
                  </Text>
                  <Text className={`text-xs font-semibold ${q.color}`}>
                    {q.text}
                  </Text>
                </View>
                <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                  {opt.time}
                </Text>
              </View>
            );
          })}
        </View>

        <Text className="mt-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
          Based on 90-min sleep cycles · Includes {FALL_ASLEEP_MINUTES} min to fall asleep
        </Text>
      </View>
    </ScrollView>
  );
}
