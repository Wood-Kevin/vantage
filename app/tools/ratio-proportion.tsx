import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PremiumGate from "@/components/PremiumGate";
import { usePremium } from "@/lib/entitlements";

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = "simplify" | "scale" | "missing";
type MissingSlot = "c" | "d"; // A:B = C:? or A:B = ?:D

// ─── Pure calculations ────────────────────────────────────────────────────────

function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b !== 0) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

type SimplifyResult = {
  simplifiedA: number;
  simplifiedB: number;
  decimal: number;
  pctA: number;
  pctB: number;
  alreadySimplest: boolean;
};

function calcSimplify(aStr: string, bStr: string): SimplifyResult | null {
  const a = parseFloat(aStr);
  const b = parseFloat(bStr);
  if (isNaN(a) || isNaN(b) || a <= 0 || b <= 0) return null;

  // Scale to integers for GCD (handle decimals by multiplying)
  const scale = Math.pow(10, Math.max(
    (aStr.split(".")[1] ?? "").length,
    (bStr.split(".")[1] ?? "").length,
  ));
  const intA = Math.round(a * scale);
  const intB = Math.round(b * scale);
  const g = gcd(intA, intB);
  const simplifiedA = intA / g;
  const simplifiedB = intB / g;

  const total = a + b;
  return {
    simplifiedA,
    simplifiedB,
    decimal: a / b,
    pctA: (a / total) * 100,
    pctB: (b / total) * 100,
    alreadySimplest: simplifiedA === Math.round(a) && simplifiedB === Math.round(b),
  };
}

type ScaleResult = {
  newA: number;
  newB: number;
};

function calcScale(
  aStr: string,
  bStr: string,
  factorStr: string
): ScaleResult | null {
  const a = parseFloat(aStr);
  const b = parseFloat(bStr);
  const factor = parseFloat(factorStr);
  if (isNaN(a) || isNaN(b) || isNaN(factor) || a <= 0 || b <= 0 || factor === 0) return null;
  return { newA: a * factor, newB: b * factor };
}

type MissingResult = {
  value: number;
  working: string;
};

function calcMissing(
  aStr: string,
  bStr: string,
  cStr: string,
  dStr: string,
  missing: MissingSlot
): MissingResult | null {
  const a = parseFloat(aStr);
  const b = parseFloat(bStr);
  const c = parseFloat(cStr);
  const d = parseFloat(dStr);

  if (missing === "d") {
    if (isNaN(a) || isNaN(b) || isNaN(c) || a === 0) return null;
    if (a <= 0 || b <= 0 || c <= 0) return null;
    const value = (b * c) / a;
    return { value, working: `D = (B × C) / A = (${b} × ${c}) / ${a}` };
  } else {
    if (isNaN(a) || isNaN(b) || isNaN(d) || b === 0) return null;
    if (a <= 0 || b <= 0 || d <= 0) return null;
    const value = (a * d) / b;
    return { value, working: `C = (A × D) / B = (${a} × ${d}) / ${b}` };
  }
}

function fmtNum(n: number, decimals = 4): string {
  // Show up to decimals places but trim trailing zeros
  return parseFloat(n.toFixed(decimals)).toString();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NumInput({
  label,
  value,
  onChangeText,
  placeholder = "0",
  highlight = false,
}: {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  highlight?: boolean;
}) {
  return (
    <View className="flex-1">
      {label && (
        <Text className="mb-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">{label}</Text>
      )}
      <View
        className={`flex-row items-center rounded-2xl border px-3 ${
          highlight
            ? "border-violet-400 bg-violet-50 dark:border-violet-600 dark:bg-violet-950"
            : "border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800"
        }`}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor="#a1a1aa"
          className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
        />
      </View>
    </View>
  );
}

function Colon() {
  return (
    <Text className="mt-5 text-2xl font-bold text-zinc-400">:</Text>
  );
}

function Equals() {
  return (
    <Text className="mt-5 text-xl font-bold text-zinc-400">=</Text>
  );
}

function ResultCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <View
      className={
        highlight
          ? "rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-950"
          : "rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800"
      }
    >
      <Text
        className={
          highlight
            ? "text-xs font-semibold uppercase tracking-wider text-violet-500 dark:text-violet-400"
            : "text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
        }
      >
        {label}
      </Text>
      <Text
        className={
          highlight
            ? "mt-1 text-3xl font-bold text-violet-700 dark:text-violet-200"
            : "mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100"
        }
      >
        {value}
      </Text>
      {sub && (
        <Text className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">{sub}</Text>
      )}
    </View>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <View className="items-center rounded-2xl border border-zinc-200 bg-zinc-50 p-8 dark:border-zinc-700 dark:bg-zinc-800">
      <Text className="text-center text-sm text-zinc-400 dark:text-zinc-500">{text}</Text>
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

const MODES: { value: Mode; label: string }[] = [
  { value: "simplify", label: "Simplify" },
  { value: "scale", label: "Scale" },
  { value: "missing", label: "Find Missing" },
];

export default function RatioProportionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPremium, isLoading } = usePremium();

  const [mode, setMode] = useState<Mode>("simplify");

  // Simplify
  const [simpA, setSimpA] = useState("");
  const [simpB, setSimpB] = useState("");

  // Scale
  const [scaleA, setScaleA] = useState("");
  const [scaleB, setScaleB] = useState("");
  const [scaleFactor, setScaleFactor] = useState("");

  // Missing value
  const [missA, setMissA] = useState("");
  const [missB, setMissB] = useState("");
  const [missC, setMissC] = useState("");
  const [missD, setMissD] = useState("");
  const [missing, setMissing] = useState<MissingSlot>("d");

  if (isLoading) return null;
  if (!isPremium) {
    return (
      <View className="flex-1 bg-white dark:bg-zinc-900">
        <PremiumGate toolName="Ratio & Proportion Solver" onClose={() => router.back()} />
      </View>
    );
  }

  const simpResult = mode === "simplify" ? calcSimplify(simpA, simpB) : null;
  const scaleResult = mode === "scale" ? calcScale(scaleA, scaleB, scaleFactor) : null;

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
        <Text className="text-xl font-bold text-zinc-900 dark:text-white">Ratio & Proportion</Text>
      </View>

      <View className="px-4">
        {/* Mode tabs */}
        <View className="mb-6 flex-row rounded-2xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800">
          {MODES.map(({ value, label }) => (
            <Pressable
              key={value}
              onPress={() => setMode(value)}
              className={`flex-1 rounded-xl py-2.5 ${mode === value ? "bg-violet-600" : ""}`}
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

        {/* ── SIMPLIFY ── */}
        {mode === "simplify" && (
          <View>
            <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Ratio A : B</Text>
            <View className="mb-6 flex-row items-center gap-2">
              <NumInput label="A" value={simpA} onChangeText={setSimpA} />
              <Colon />
              <NumInput label="B" value={simpB} onChangeText={setSimpB} />
            </View>
            {simpResult ? (
              <View className="gap-3">
                <ResultCard
                  label="Simplified Ratio"
                  value={`${simpResult.simplifiedA} : ${simpResult.simplifiedB}`}
                  sub={simpResult.alreadySimplest ? "Already in simplest form" : undefined}
                  highlight
                />
                <ResultCard
                  label="Decimal Form"
                  value={fmtNum(simpResult.decimal)}
                  sub="A ÷ B"
                />
                <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
                  <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Percentage Split
                  </Text>
                  <View className="flex-row items-center gap-3">
                    <View className="flex-1">
                      <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                        {simpResult.pctA.toFixed(1)}%
                      </Text>
                      <Text className="text-xs text-zinc-400">Part A</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                        {simpResult.pctB.toFixed(1)}%
                      </Text>
                      <Text className="text-xs text-zinc-400">Part B</Text>
                    </View>
                  </View>
                  <View className="mt-3 h-3 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                    <View
                      className="h-full rounded-full bg-violet-500"
                      style={{ width: `${simpResult.pctA}%` }}
                    />
                  </View>
                </View>
              </View>
            ) : (
              <EmptyCard text="Enter two positive numbers to simplify the ratio" />
            )}
          </View>
        )}

        {/* ── SCALE ── */}
        {mode === "scale" && (
          <View>
            <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Original Ratio A : B</Text>
            <View className="mb-5 flex-row items-center gap-2">
              <NumInput label="A" value={scaleA} onChangeText={setScaleA} />
              <Colon />
              <NumInput label="B" value={scaleB} onChangeText={setScaleB} />
            </View>
            <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Scale Factor</Text>
            <View className="mb-6 flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
              <TextInput
                value={scaleFactor}
                onChangeText={setScaleFactor}
                keyboardType="decimal-pad"
                placeholder="2"
                placeholderTextColor="#a1a1aa"
                className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
              />
              <Text className="text-zinc-400">×</Text>
            </View>
            {scaleResult ? (
              <View className="gap-3">
                <ResultCard
                  label="Scaled Ratio"
                  value={`${fmtNum(scaleResult.newA)} : ${fmtNum(scaleResult.newB)}`}
                  highlight
                />
                <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
                  <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Working
                  </Text>
                  <Text className="text-sm text-zinc-700 dark:text-zinc-300">
                    {scaleA} × {scaleFactor} = {fmtNum(scaleResult.newA)}
                  </Text>
                  <Text className="text-sm text-zinc-700 dark:text-zinc-300">
                    {scaleB} × {scaleFactor} = {fmtNum(scaleResult.newB)}
                  </Text>
                </View>
              </View>
            ) : (
              <EmptyCard text="Enter a ratio and scale factor" />
            )}
          </View>
        )}

        {/* ── MISSING VALUE ── */}
        {mode === "missing" && (
          <View>
            {/* Which slot is unknown */}
            <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Solve For
            </Text>
            <View className="mb-5 flex-row rounded-2xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800">
              {([
                { value: "d" as MissingSlot, label: "A:B = C:?" },
                { value: "c" as MissingSlot, label: "A:B = ?:D" },
              ]).map(({ value, label }) => (
                <Pressable
                  key={value}
                  onPress={() => setMissing(value)}
                  className={`flex-1 rounded-xl py-2.5 ${missing === value ? "bg-violet-600" : ""}`}
                >
                  <Text
                    className={`text-center text-sm font-semibold ${
                      missing === value ? "text-white" : "text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Four input slots: A B = C D, one is unknown */}
            <View className="mb-6 flex-row items-end gap-2">
              <NumInput label="A" value={missA} onChangeText={setMissA} />
              <Colon />
              <NumInput label="B" value={missB} onChangeText={setMissB} />
              <Equals />
              <NumInput
                label="C"
                value={missing === "c" ? "?" : missC}
                onChangeText={missing === "c" ? () => {} : setMissC}
                highlight={missing === "c"}
                placeholder={missing === "c" ? "?" : "0"}
              />
              <Colon />
              <NumInput
                label="D"
                value={missing === "d" ? "?" : missD}
                onChangeText={missing === "d" ? () => {} : setMissD}
                highlight={missing === "d"}
                placeholder={missing === "d" ? "?" : "0"}
              />
            </View>

            {(() => {
              const r = calcMissing(missA, missB, missC, missD, missing);
              if (!r) {
                return <EmptyCard text="Enter three of the four values to find the missing one" />;
              }
              return (
                <View className="gap-3">
                  <ResultCard
                    label={missing === "d" ? "Missing Value (D)" : "Missing Value (C)"}
                    value={fmtNum(r.value)}
                    highlight
                  />
                  <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
                    <Text className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Working
                    </Text>
                    <Text className="font-mono text-sm text-zinc-700 dark:text-zinc-300">
                      {r.working} = {fmtNum(r.value)}
                    </Text>
                  </View>
                </View>
              );
            })()}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
