import { useRouter } from "expo-router";
import { ArrowLeft, ArrowLeftRight } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Conversion tables ────────────────────────────────────────────────────────

type Category = "Length" | "Weight" | "Temperature" | "Volume";

const CATEGORIES: Category[] = ["Length", "Weight", "Temperature", "Volume"];

const LENGTH_UNITS = ["mm", "cm", "m", "km", "in", "ft", "yd", "mi"] as const;
const WEIGHT_UNITS = ["mg", "g", "kg", "oz", "lb"] as const;
const TEMP_UNITS = ["°C", "°F", "K"] as const;
const VOLUME_UNITS = ["ml", "l", "tsp", "tbsp", "fl oz", "cup", "pt", "gal"] as const;

// Factors to convert TO base unit (m for length, g for weight, l for volume)
const LENGTH_FACTORS: Record<string, number> = {
  mm: 0.001,
  cm: 0.01,
  m: 1,
  km: 1000,
  in: 0.0254,
  ft: 0.3048,
  yd: 0.9144,
  mi: 1609.344,
};
const WEIGHT_FACTORS: Record<string, number> = {
  mg: 0.001,
  g: 1,
  kg: 1000,
  oz: 28.3495,
  lb: 453.592,
};
const VOLUME_FACTORS: Record<string, number> = {
  ml: 0.001,
  l: 1,
  tsp: 0.00492892,
  tbsp: 0.0147868,
  "fl oz": 0.0295735,
  cup: 0.236588,
  pt: 0.473176,
  gal: 3.78541,
};

function unitsForCategory(cat: Category): readonly string[] {
  if (cat === "Length") return LENGTH_UNITS;
  if (cat === "Weight") return WEIGHT_UNITS;
  if (cat === "Temperature") return TEMP_UNITS;
  return VOLUME_UNITS;
}

function defaultUnits(cat: Category): [string, string] {
  if (cat === "Length") return ["m", "ft"];
  if (cat === "Weight") return ["kg", "lb"];
  if (cat === "Temperature") return ["°C", "°F"];
  return ["l", "cup"];
}

// ─── Pure calculation ─────────────────────────────────────────────────────────

function convertTemperature(value: number, from: string, to: string): number {
  if (from === to) return value;
  // Convert to Celsius first
  let celsius: number;
  if (from === "°C") celsius = value;
  else if (from === "°F") celsius = (value - 32) * (5 / 9);
  else celsius = value - 273.15; // Kelvin

  // Convert from Celsius to target
  if (to === "°C") return celsius;
  if (to === "°F") return celsius * (9 / 5) + 32;
  return celsius + 273.15; // Kelvin
}

function convert(
  valueStr: string,
  from: string,
  to: string,
  cat: Category
): string {
  const value = parseFloat(valueStr);
  if (isNaN(value)) return "—";
  if (from === to) return valueStr;

  let result: number;
  if (cat === "Temperature") {
    result = convertTemperature(value, from, to);
  } else {
    const factors =
      cat === "Length"
        ? LENGTH_FACTORS
        : cat === "Weight"
        ? WEIGHT_FACTORS
        : VOLUME_FACTORS;
    const base = value * factors[from];
    result = base / factors[to];
  }

  // Format: avoid scientific notation for reasonable numbers
  if (Math.abs(result) >= 0.001 && Math.abs(result) < 1e9) {
    const decimals = Math.abs(result) >= 100 ? 3 : Math.abs(result) >= 1 ? 4 : 6;
    return parseFloat(result.toFixed(decimals)).toString();
  }
  return result.toExponential(4);
}

// ─── Component ────────────────────────────────────────────────────────────────

function UnitPills({
  units,
  selected,
  onSelect,
}: {
  units: readonly string[];
  selected: string;
  onSelect: (u: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View className="flex-row gap-2 pb-1">
        {units.map((u) => {
          const active = u === selected;
          return (
            <Pressable
              key={u}
              onPress={() => onSelect(u)}
              className={
                active
                  ? "rounded-xl bg-violet-600 px-3 py-2"
                  : "rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
              }
            >
              <Text
                className={
                  active
                    ? "text-sm font-semibold text-white"
                    : "text-sm font-semibold text-zinc-700 dark:text-zinc-300"
                }
              >
                {u}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

export default function UnitConverterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [category, setCategory] = useState<Category>("Length");
  const [value, setValue] = useState("");
  const [fromUnit, setFromUnit] = useState("m");
  const [toUnit, setToUnit] = useState("ft");

  function handleCategoryChange(cat: Category) {
    setCategory(cat);
    setValue("");
    const [f, t] = defaultUnits(cat);
    setFromUnit(f);
    setToUnit(t);
  }

  function swapUnits() {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
    const converted = convert(value, fromUnit, toUnit, category);
    setValue(converted === "—" ? "" : converted);
  }

  const units = unitsForCategory(category);
  const result = convert(value, fromUnit, toUnit, category);

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
          Unit Converter
        </Text>
      </View>

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-6 px-4"
      >
        <View className="flex-row gap-2">
          {CATEGORIES.map((cat) => {
            const active = cat === category;
            return (
              <Pressable
                key={cat}
                onPress={() => handleCategoryChange(cat)}
                className={
                  active
                    ? "rounded-xl bg-violet-600 px-4 py-2"
                    : "rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                }
              >
                <Text
                  className={
                    active
                      ? "font-semibold text-white"
                      : "font-semibold text-zinc-700 dark:text-zinc-300"
                  }
                >
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View className="px-4">
        {/* Value input */}
        <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Value
        </Text>
        <View className="mb-5 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
          <TextInput
            value={value}
            onChangeText={setValue}
            keyboardType="decimal-pad"
            placeholder="Enter value"
            placeholderTextColor="#a1a1aa"
            className="py-4 text-lg text-zinc-900 dark:text-white"
          />
        </View>

        {/* From unit */}
        <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          From
        </Text>
        <View className="mb-3">
          <UnitPills units={units} selected={fromUnit} onSelect={setFromUnit} />
        </View>

        {/* Swap button */}
        <Pressable
          onPress={swapUnits}
          className="mb-3 flex-row items-center justify-center gap-2 rounded-2xl border border-zinc-200 py-3 dark:border-zinc-700"
        >
          <ArrowLeftRight size={16} color="#7c3aed" />
          <Text className="text-sm font-semibold text-violet-600">Swap</Text>
        </Pressable>

        {/* To unit */}
        <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          To
        </Text>
        <View className="mb-6">
          <UnitPills units={units} selected={toUnit} onSelect={setToUnit} />
        </View>

        {/* Result */}
        <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Result ({toUnit})
          </Text>
          <Text
            className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100"
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {result}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
