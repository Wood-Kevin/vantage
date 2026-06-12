import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = "ofY" | "whatPct" | "pctChange";

// ─── Pure calculations ────────────────────────────────────────────────────────

function calcOfY(pctStr: string, numStr: string): number | null {
  const pct = parseFloat(pctStr);
  const num = parseFloat(numStr);
  if (isNaN(pct) || isNaN(num)) return null;
  return (pct / 100) * num;
}

function calcWhatPct(xStr: string, yStr: string): number | null {
  const x = parseFloat(xStr);
  const y = parseFloat(yStr);
  if (isNaN(x) || isNaN(y) || y === 0) return null;
  return (x / y) * 100;
}

type ChangeResult = { pct: number; isIncrease: boolean };

function calcPctChange(fromStr: string, toStr: string): ChangeResult | null {
  const from = parseFloat(fromStr);
  const to = parseFloat(toStr);
  if (isNaN(from) || isNaN(to) || from === 0) return null;
  const pct = ((to - from) / Math.abs(from)) * 100;
  return { pct: Math.abs(pct), isIncrease: to >= from };
}

function fmt(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) {
    return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

// ─── Component ────────────────────────────────────────────────────────────────

const MODES: { value: Mode; label: string }[] = [
  { value: "ofY", label: "X% of Y" },
  { value: "whatPct", label: "X is ?% of Y" },
  { value: "pctChange", label: "% Change" },
];

export default function PercentageCalculatorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<Mode>("ofY");

  // Mode 1
  const [pct1, setPct1] = useState("");
  const [num1, setNum1] = useState("");

  // Mode 2
  const [x2, setX2] = useState("");
  const [y2, setY2] = useState("");

  // Mode 3
  const [from3, setFrom3] = useState("");
  const [to3, setTo3] = useState("");

  const ofYResult = mode === "ofY" ? calcOfY(pct1, num1) : null;
  const whatPctResult = mode === "whatPct" ? calcWhatPct(x2, y2) : null;
  const changeResult = mode === "pctChange" ? calcPctChange(from3, to3) : null;

  function ResultCard({
    label,
    value,
    sub,
    highlight,
    color,
  }: {
    label: string;
    value: string;
    sub?: string;
    highlight?: boolean;
    color?: string;
  }) {
    const bg = highlight
      ? "rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-950"
      : "rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800";
    const labelCls = highlight
      ? "text-xs font-semibold uppercase tracking-wider text-violet-500 dark:text-violet-400"
      : "text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400";
    const valueCls = highlight
      ? "mt-1 text-3xl font-bold text-violet-700 dark:text-violet-200"
      : "mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100";

    return (
      <View className={bg} style={color ? { borderColor: color + "60", backgroundColor: color + "12" } : {}}>
        <Text className={labelCls} style={color ? { color } : {}}>{label}</Text>
        <Text className={valueCls} style={color ? { color } : {}}>{value}</Text>
        {sub && (
          <Text className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">{sub}</Text>
        )}
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-zinc-900"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
    >
      <View style={{ paddingTop: insets.top + 8 }} className="flex-row items-center gap-3 px-4 pb-4">
        <Pressable onPress={() => router.back()} hitSlop={8} className="rounded-full p-1">
          <ArrowLeft size={22} color="#7c3aed" />
        </Pressable>
        <Text className="text-xl font-bold text-zinc-900 dark:text-white">Percentage Calculator</Text>
      </View>

      <View className="px-4">
        {/* Mode tabs */}
        <View className="mb-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800">
          {MODES.map(({ value, label }) => (
            <Pressable
              key={value}
              onPress={() => setMode(value)}
              className={`rounded-xl px-4 py-2.5 ${mode === value ? "bg-violet-600" : ""}`}
            >
              <Text
                className={`text-center text-sm font-semibold ${
                  mode === value ? "text-white" : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Mode 1: What is X% of Y? */}
        {mode === "ofY" && (
          <View className="gap-4">
            <View className="flex-row items-center gap-3">
              <View className="flex-1">
                <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Percentage</Text>
                <View className="flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
                  <TextInput
                    value={pct1}
                    onChangeText={setPct1}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor="#a1a1aa"
                    className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
                  />
                  <Text className="text-zinc-400">%</Text>
                </View>
              </View>
              <Text className="mt-5 text-sm font-semibold text-zinc-400">of</Text>
              <View className="flex-1">
                <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Number</Text>
                <View className="flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
                  <TextInput
                    value={num1}
                    onChangeText={setNum1}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor="#a1a1aa"
                    className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
                  />
                </View>
              </View>
            </View>
            {ofYResult !== null ? (
              <ResultCard label={`${pct1}% of ${num1}`} value={fmt(ofYResult)} highlight />
            ) : (
              <EmptyCard text="Enter a percentage and a number" />
            )}
          </View>
        )}

        {/* Mode 2: X is what % of Y? */}
        {mode === "whatPct" && (
          <View className="gap-4">
            <View className="flex-row items-center gap-3">
              <View className="flex-1">
                <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Value (X)</Text>
                <View className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
                  <TextInput
                    value={x2}
                    onChangeText={setX2}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor="#a1a1aa"
                    className="py-4 text-lg text-zinc-900 dark:text-white"
                  />
                </View>
              </View>
              <Text className="mt-5 text-sm font-semibold text-zinc-400">of</Text>
              <View className="flex-1">
                <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Total (Y)</Text>
                <View className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
                  <TextInput
                    value={y2}
                    onChangeText={setY2}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor="#a1a1aa"
                    className="py-4 text-lg text-zinc-900 dark:text-white"
                  />
                </View>
              </View>
            </View>
            {whatPctResult !== null ? (
              <ResultCard
                label={`${x2} is what % of ${y2}`}
                value={`${fmt(whatPctResult)}%`}
                highlight
              />
            ) : (
              <EmptyCard text="Enter two numbers to find the percentage" />
            )}
          </View>
        )}

        {/* Mode 3: % change */}
        {mode === "pctChange" && (
          <View className="gap-4">
            <View className="flex-row items-center gap-3">
              <View className="flex-1">
                <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">From</Text>
                <View className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
                  <TextInput
                    value={from3}
                    onChangeText={setFrom3}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor="#a1a1aa"
                    className="py-4 text-lg text-zinc-900 dark:text-white"
                  />
                </View>
              </View>
              <Text className="mt-5 text-sm font-semibold text-zinc-400">→</Text>
              <View className="flex-1">
                <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">To</Text>
                <View className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
                  <TextInput
                    value={to3}
                    onChangeText={setTo3}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor="#a1a1aa"
                    className="py-4 text-lg text-zinc-900 dark:text-white"
                  />
                </View>
              </View>
            </View>
            {changeResult !== null ? (
              <ResultCard
                label={changeResult.isIncrease ? "Increase" : "Decrease"}
                value={`${fmt(changeResult.pct)}%`}
                color={changeResult.isIncrease ? "#16a34a" : "#dc2626"}
              />
            ) : (
              <EmptyCard text="Enter a starting and ending value" />
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <View className="items-center rounded-2xl border border-zinc-200 bg-zinc-50 p-8 dark:border-zinc-700 dark:bg-zinc-800">
      <Text className="text-center text-sm text-zinc-400 dark:text-zinc-500">{text}</Text>
    </View>
  );
}
