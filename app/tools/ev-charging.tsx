import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PremiumGate from "@/components/PremiumGate";
import { usePremium } from "@/lib/entitlements";

// ─── Charger data ─────────────────────────────────────────────────────────────

type ChargerLevel = "l1" | "l2" | "l2fast" | "dcfast" | "dcultra" | "custom";
type RangeUnit = "mi" | "km";

const CHARGER_OPTIONS: {
  value: Exclude<ChargerLevel, "custom">;
  label: string;
  kw: number;
}[] = [
  { value: "l1", label: "L1\n1.4kW", kw: 1.4 },
  { value: "l2", label: "L2\n7.2kW", kw: 7.2 },
  { value: "l2fast", label: "L2 Fast\n11kW", kw: 11 },
  { value: "dcfast", label: "DC Fast\n50kW", kw: 50 },
  { value: "dcultra", label: "Ultra\n150kW", kw: 150 },
];

// ─── Pure calculation ─────────────────────────────────────────────────────────

type EvResult = {
  energyKwh: number;
  chargingMinutes: number;
  cost: number;
  rangeAdded: number;
};

function calcEv(
  capacityStr: string,
  currentPctStr: string,
  targetPctStr: string,
  chargerKw: number,
  rateStr: string,
  efficiencyStr: string,
  rangeUnit: RangeUnit,
): EvResult | null {
  const capacity = parseFloat(capacityStr);
  const currentPct = parseFloat(currentPctStr);
  const targetPct = parseFloat(targetPctStr);
  const rate = parseFloat(rateStr);
  const efficiency = parseFloat(efficiencyStr);

  if (
    !capacity || capacity <= 0 ||
    isNaN(currentPct) || isNaN(targetPct) ||
    !chargerKw || chargerKw <= 0 ||
    !rate || rate <= 0
  ) return null;

  const clampedCurrent = Math.max(0, Math.min(100, currentPct));
  const clampedTarget = Math.max(0, Math.min(100, targetPct));
  if (clampedTarget <= clampedCurrent) return null;

  const energyKwh = ((clampedTarget - clampedCurrent) / 100) * capacity;
  const chargingHours = energyKwh / chargerKw;
  const chargingMinutes = chargingHours * 60;
  const cost = energyKwh * rate;

  let rangeAdded = 0;
  if (efficiency && efficiency > 0) {
    rangeAdded = energyKwh * efficiency;
  }

  return { energyKwh, chargingMinutes, cost, rangeAdded };
}

function fmtTime(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hrs === 0) return `${mins} min`;
  if (mins === 0) return `${hrs} hr`;
  return `${hrs} hr ${mins} min`;
}

function fmt2(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EvChargingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPremium, isLoading } = usePremium();

  const [capacity, setCapacity] = useState("");
  const [currentPct, setCurrentPct] = useState("20");
  const [targetPct, setTargetPct] = useState("80");
  const [charger, setCharger] = useState<ChargerLevel>("l2");
  const [customKw, setCustomKw] = useState("");
  const [rate, setRate] = useState("0.13");
  const [efficiency, setEfficiency] = useState("");
  const [rangeUnit, setRangeUnit] = useState<RangeUnit>("mi");

  if (isLoading) return null;
  if (!isPremium) {
    return (
      <View className="flex-1 bg-white dark:bg-zinc-900">
        <PremiumGate toolName="EV Charging Calculator" onClose={() => router.back()} />
      </View>
    );
  }

  const chargerKw =
    charger === "custom"
      ? parseFloat(customKw) || 0
      : CHARGER_OPTIONS.find((o) => o.value === charger)?.kw ?? 0;

  const result = calcEv(
    capacity, currentPct, targetPct, chargerKw, rate, efficiency, rangeUnit
  );

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
        <Text className="text-xl font-bold text-zinc-900 dark:text-white">EV Charging Calculator</Text>
      </View>

      <View className="px-4">
        {/* Battery capacity */}
        <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Battery Capacity</Text>
        <View className="mb-5 flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
          <TextInput
            value={capacity}
            onChangeText={setCapacity}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor="#a1a1aa"
            className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
          />
          <Text className="text-zinc-400">kWh</Text>
        </View>

        {/* Charge levels */}
        <View className="mb-5 flex-row gap-3">
          <View className="flex-1">
            <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Current Charge</Text>
            <View className="flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
              <TextInput
                value={currentPct}
                onChangeText={setCurrentPct}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor="#a1a1aa"
                maxLength={3}
                className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
              />
              <Text className="text-zinc-400">%</Text>
            </View>
          </View>
          <View className="flex-1">
            <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Target Charge</Text>
            <View className="flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
              <TextInput
                value={targetPct}
                onChangeText={setTargetPct}
                keyboardType="number-pad"
                placeholder="100"
                placeholderTextColor="#a1a1aa"
                maxLength={3}
                className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
              />
              <Text className="text-zinc-400">%</Text>
            </View>
          </View>
        </View>

        {/* Charger speed */}
        <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Charger Type</Text>
        <View className="mb-3 flex-row flex-wrap gap-2">
          {CHARGER_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => setCharger(opt.value)}
              className={`items-center rounded-xl px-3 py-2 ${
                charger === opt.value
                  ? "bg-violet-600"
                  : "border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800"
              }`}
            >
              <Text
                className={`text-center text-xs font-semibold leading-4 ${
                  charger === opt.value ? "text-white" : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => setCharger("custom")}
            className={`items-center rounded-xl px-3 py-2 ${
              charger === "custom"
                ? "bg-violet-600"
                : "border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800"
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                charger === "custom" ? "text-white" : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              Custom
            </Text>
          </Pressable>
        </View>

        {charger === "custom" && (
          <View className="mb-5 flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
            <TextInput
              value={customKw}
              onChangeText={setCustomKw}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#a1a1aa"
              autoFocus
              className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
            />
            <Text className="text-zinc-400">kW</Text>
          </View>
        )}

        <View className="mb-5" />

        {/* Electricity rate */}
        <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Electricity Rate</Text>
        <View className="mb-5 flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
          <Text className="mr-1 text-lg text-zinc-400">$</Text>
          <TextInput
            value={rate}
            onChangeText={setRate}
            keyboardType="decimal-pad"
            placeholder="0.13"
            placeholderTextColor="#a1a1aa"
            className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
          />
          <Text className="text-zinc-400">/ kWh</Text>
        </View>

        {/* Vehicle efficiency (optional) */}
        <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Vehicle Efficiency{" "}
          <Text className="text-xs font-normal text-zinc-400">(optional, for range estimate)</Text>
        </Text>
        <View className="mb-6 flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
          <TextInput
            value={efficiency}
            onChangeText={setEfficiency}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor="#a1a1aa"
            className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
          />
          <View className="flex-row rounded-lg border border-zinc-200 bg-white p-0.5 dark:border-zinc-700 dark:bg-zinc-900">
            {(["mi", "km"] as RangeUnit[]).map((u) => (
              <Pressable
                key={u}
                onPress={() => setRangeUnit(u)}
                className={`rounded-md px-2 py-1 ${rangeUnit === u ? "bg-violet-600" : ""}`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    rangeUnit === u ? "text-white" : "text-zinc-500"
                  }`}
                >
                  {u}/kWh
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Results */}
        {result === null ? (
          <View className="items-center rounded-2xl border border-zinc-200 bg-zinc-50 p-8 dark:border-zinc-700 dark:bg-zinc-800">
            <Text className="text-center text-sm text-zinc-400 dark:text-zinc-500">
              {parseFloat(targetPct) <= parseFloat(currentPct)
                ? "Target charge must be higher than current charge"
                : "Enter your battery and charger details above"}
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            <View className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-950">
              <Text className="text-xs font-semibold uppercase tracking-wider text-violet-500 dark:text-violet-400">
                Charging Time
              </Text>
              <Text className="mt-1 text-3xl font-bold text-violet-700 dark:text-violet-200">
                {fmtTime(result.chargingMinutes)}
              </Text>
              <Text className="mt-0.5 text-xs text-violet-500 dark:text-violet-400">
                at {chargerKw} kW
              </Text>
            </View>

            <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Energy Needed
              </Text>
              <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {fmt2(result.energyKwh)} kWh
              </Text>
            </View>

            <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Estimated Cost
              </Text>
              <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                ${fmt2(result.cost)}
              </Text>
            </View>

            {result.rangeAdded > 0 && (
              <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
                <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Range Added
                </Text>
                <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                  {Math.round(result.rangeAdded)} {rangeUnit}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
