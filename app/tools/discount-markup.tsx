import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PremiumGate from "@/components/PremiumGate";
import { usePremium } from "@/lib/entitlements";

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = "discount" | "markup" | "reverse";
type ReverseType = "discount" | "markup";

// ─── Pure calculations ────────────────────────────────────────────────────────

type DiscountResult = {
  discountAmount: number;
  finalPrice: number;
  savings: number;
};

type MarkupResult = {
  markupAmount: number;
  sellingPrice: number;
  profitMarginPct: number;
};

type ReverseResult = {
  originalPrice: number;
  difference: number;
  label: string;
};

function calcDiscount(originalStr: string, pctStr: string): DiscountResult | null {
  const original = parseFloat(originalStr);
  const pct = parseFloat(pctStr);
  if (isNaN(original) || isNaN(pct) || original <= 0 || pct < 0 || pct > 100) return null;
  const discountAmount = original * (pct / 100);
  const finalPrice = original - discountAmount;
  return { discountAmount, finalPrice, savings: discountAmount };
}

function calcMarkup(costStr: string, pctStr: string): MarkupResult | null {
  const cost = parseFloat(costStr);
  const pct = parseFloat(pctStr);
  if (isNaN(cost) || isNaN(pct) || cost <= 0 || pct < 0) return null;
  const markupAmount = cost * (pct / 100);
  const sellingPrice = cost + markupAmount;
  const profitMarginPct = sellingPrice > 0 ? (markupAmount / sellingPrice) * 100 : 0;
  return { markupAmount, sellingPrice, profitMarginPct };
}

function calcReverse(
  finalStr: string,
  pctStr: string,
  type: ReverseType
): ReverseResult | null {
  const final = parseFloat(finalStr);
  const pct = parseFloat(pctStr);
  if (isNaN(final) || isNaN(pct) || final <= 0 || pct < 0) return null;
  if (type === "discount") {
    if (pct >= 100) return null;
    const original = final / (1 - pct / 100);
    return { originalPrice: original, difference: original - final, label: "Amount Saved" };
  } else {
    const original = final / (1 + pct / 100);
    return { originalPrice: original, difference: final - original, label: "Markup Added" };
  }
}

function fmtCurrency(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PriceInput({
  label,
  value,
  onChangeText,
  placeholder = "0.00",
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <View className="mb-5">
      <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">{label}</Text>
      <View className="flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
        <Text className="mr-1 text-lg text-zinc-400">$</Text>
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

function PctInput({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
}) {
  return (
    <View className="mb-5">
      <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">{label}</Text>
      <View className="flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor="#a1a1aa"
          className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
        />
        <Text className="text-zinc-400">%</Text>
      </View>
    </View>
  );
}

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
  return (
    <View
      className={
        highlight
          ? "rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-950"
          : "rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800"
      }
      style={color ? { borderColor: color + "50", backgroundColor: color + "12" } : {}}
    >
      <Text
        className={
          highlight
            ? "text-xs font-semibold uppercase tracking-wider text-violet-500 dark:text-violet-400"
            : "text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
        }
        style={color ? { color } : {}}
      >
        {label}
      </Text>
      <Text
        className={
          highlight
            ? "mt-1 text-3xl font-bold text-violet-700 dark:text-violet-200"
            : "mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100"
        }
        style={color ? { color } : {}}
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
  { value: "discount", label: "Discount" },
  { value: "markup", label: "Markup" },
  { value: "reverse", label: "Reverse" },
];

export default function DiscountMarkupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPremium, isLoading } = usePremium();

  const [mode, setMode] = useState<Mode>("discount");

  // Discount inputs
  const [discOriginal, setDiscOriginal] = useState("");
  const [discPct, setDiscPct] = useState("");

  // Markup inputs
  const [markCost, setMarkCost] = useState("");
  const [markPct, setMarkPct] = useState("");

  // Reverse inputs
  const [revFinal, setRevFinal] = useState("");
  const [revPct, setRevPct] = useState("");
  const [revType, setRevType] = useState<ReverseType>("discount");

  if (isLoading) return null;
  if (!isPremium) {
    return (
      <View className="flex-1 bg-white dark:bg-zinc-900">
        <PremiumGate toolName="Discount & Markup Calculator" onClose={() => router.back()} />
      </View>
    );
  }

  const discResult = mode === "discount" ? calcDiscount(discOriginal, discPct) : null;
  const markResult = mode === "markup" ? calcMarkup(markCost, markPct) : null;
  const revResult = mode === "reverse" ? calcReverse(revFinal, revPct, revType) : null;

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
        <Text className="text-xl font-bold text-zinc-900 dark:text-white">
          Discount & Markup
        </Text>
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

        {/* ── DISCOUNT ── */}
        {mode === "discount" && (
          <View>
            <PriceInput label="Original Price" value={discOriginal} onChangeText={setDiscOriginal} />
            <PctInput label="Discount %" value={discPct} onChangeText={setDiscPct} />
            {discResult ? (
              <View className="gap-3">
                <ResultCard label="Discount Amount" value={fmtCurrency(discResult.discountAmount)} color="#dc2626" />
                <ResultCard label="Final Price" value={fmtCurrency(discResult.finalPrice)} highlight />
                <ResultCard label="You Save" value={fmtCurrency(discResult.savings)} />
              </View>
            ) : (
              <EmptyCard text="Enter a price and discount percentage" />
            )}
          </View>
        )}

        {/* ── MARKUP ── */}
        {mode === "markup" && (
          <View>
            <PriceInput label="Cost Price" value={markCost} onChangeText={setMarkCost} />
            <PctInput label="Markup %" value={markPct} onChangeText={setMarkPct} />
            {markResult ? (
              <View className="gap-3">
                <ResultCard label="Markup Amount" value={fmtCurrency(markResult.markupAmount)} />
                <ResultCard label="Selling Price" value={fmtCurrency(markResult.sellingPrice)} highlight />
                <ResultCard
                  label="Profit Margin"
                  value={`${markResult.profitMarginPct.toFixed(1)}%`}
                  sub="Margin % = markup / selling price"
                />
              </View>
            ) : (
              <EmptyCard text="Enter a cost price and markup percentage" />
            )}
          </View>
        )}

        {/* ── REVERSE ── */}
        {mode === "reverse" && (
          <View>
            <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Type
            </Text>
            <View className="mb-5 flex-row rounded-2xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800">
              {(["discount", "markup"] as ReverseType[]).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setRevType(t)}
                  className={`flex-1 rounded-xl py-2.5 ${revType === t ? "bg-violet-600" : ""}`}
                >
                  <Text
                    className={`text-center text-sm font-semibold ${
                      revType === t ? "text-white" : "text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    {t === "discount" ? "Was Discounted" : "Was Marked Up"}
                  </Text>
                </Pressable>
              ))}
            </View>
            <PriceInput label="Final Price Paid" value={revFinal} onChangeText={setRevFinal} />
            <PctInput
              label={revType === "discount" ? "Discount %" : "Markup %"}
              value={revPct}
              onChangeText={setRevPct}
            />
            {revResult ? (
              <View className="gap-3">
                <ResultCard
                  label="Original Price"
                  value={fmtCurrency(revResult.originalPrice)}
                  highlight
                />
                <ResultCard label={revResult.label} value={fmtCurrency(revResult.difference)} />
              </View>
            ) : (
              <EmptyCard text="Enter the final price and percentage to find the original" />
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
