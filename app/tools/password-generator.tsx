import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { ArrowLeft, Copy, RefreshCw } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Slider from "@react-native-community/slider";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Pure functions ───────────────────────────────────────────────────────────

const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const NUMBERS = "0123456789";
const SYMBOLS = "!@#$%^&*()_+-=[]{}|;:,.?";
const AMBIGUOUS = /[0Ol1]/g;

type Options = {
  length: number;
  uppercase: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
};

function generatePassword(opts: Options): string {
  let charset = LOWERCASE;
  if (opts.uppercase) charset += UPPERCASE;
  if (opts.numbers) charset += NUMBERS;
  if (opts.symbols) charset += SYMBOLS;
  if (opts.excludeAmbiguous) charset = charset.replace(AMBIGUOUS, "");
  if (!charset) return "";

  const array = new Uint8Array(opts.length);
  // Use Math.random as a fallback — crypto is unavailable on Hermes without polyfill
  for (let i = 0; i < opts.length; i++) {
    array[i] = Math.floor(Math.random() * charset.length);
  }
  return Array.from(array, (idx) => charset[idx % charset.length]).join("");
}

type Strength = "Weak" | "Fair" | "Strong" | "Very Strong";

function passwordStrength(pw: string, opts: Options): Strength {
  const types =
    1 +
    (opts.uppercase ? 1 : 0) +
    (opts.numbers ? 1 : 0) +
    (opts.symbols ? 1 : 0);

  if (pw.length >= 16 && types >= 3) return "Very Strong";
  if (pw.length >= 12 && types >= 2) return "Strong";
  if (pw.length >= 8 && types >= 2) return "Fair";
  return "Weak";
}

function strengthColor(s: Strength): string {
  switch (s) {
    case "Very Strong":
      return "text-emerald-600 dark:text-emerald-400";
    case "Strong":
      return "text-violet-600 dark:text-violet-400";
    case "Fair":
      return "text-amber-500 dark:text-amber-400";
    case "Weak":
      return "text-red-500 dark:text-red-400";
  }
}

function strengthBarColor(s: Strength): string {
  switch (s) {
    case "Very Strong":
      return "bg-emerald-500";
    case "Strong":
      return "bg-violet-500";
    case "Fair":
      return "bg-amber-400";
    case "Weak":
      return "bg-red-400";
  }
}

function strengthWidth(s: Strength): string {
  switch (s) {
    case "Very Strong":
      return "w-full";
    case "Strong":
      return "w-3/4";
    case "Fair":
      return "w-1/2";
    case "Weak":
      return "w-1/4";
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Toggle({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      className="flex-row items-center justify-between py-3"
    >
      <Text className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
        {label}
      </Text>
      <View
        className={`h-7 w-12 rounded-full ${value ? "bg-violet-600" : "bg-zinc-300 dark:bg-zinc-600"}`}
      >
        <View
          className={`m-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : "translate-x-0"}`}
        />
      </View>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PasswordGeneratorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [opts, setOpts] = useState<Options>({
    length: 16,
    uppercase: true,
    numbers: true,
    symbols: true,
    excludeAmbiguous: false,
  });
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);

  const generate = useCallback(() => {
    setPassword(generatePassword(opts));
    setCopied(false);
  }, [opts]);

  useEffect(() => {
    generate();
  }, [opts]);

  async function copyToClipboard() {
    await Clipboard.setStringAsync(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function setOpt<K extends keyof Options>(key: K, val: Options[K]) {
    setOpts((prev) => ({ ...prev, [key]: val }));
  }

  const strength = passwordStrength(password, opts);

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
          Password Generator
        </Text>
      </View>

      <View className="px-4">
        {/* Generated password */}
        <View className="mb-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Generated Password
          </Text>
          <Text
            className="mt-2 font-mono text-lg font-bold leading-6 text-zinc-900 dark:text-zinc-100"
            selectable
            numberOfLines={2}
          >
            {password || "—"}
          </Text>
        </View>

        {/* Strength */}
        <View className="mb-5">
          <View className="mb-1 flex-row justify-between">
            <Text className="text-xs text-zinc-500 dark:text-zinc-400">Strength</Text>
            <Text className={`text-xs font-semibold ${strengthColor(strength)}`}>
              {strength}
            </Text>
          </View>
          <View className="h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-700">
            <View className={`h-1.5 rounded-full ${strengthBarColor(strength)} ${strengthWidth(strength)}`} />
          </View>
        </View>

        {/* Action buttons */}
        <View className="mb-6 flex-row gap-3">
          <Pressable
            onPress={generate}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-violet-600 py-4"
          >
            <RefreshCw size={16} color="#fff" />
            <Text className="font-bold text-white">Generate New</Text>
          </Pressable>
          <Pressable
            onPress={copyToClipboard}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-zinc-200 py-4 dark:border-zinc-700"
          >
            <Copy size={16} color={copied ? "#7c3aed" : "#a1a1aa"} />
            <Text
              className={
                copied
                  ? "font-semibold text-violet-600"
                  : "font-semibold text-zinc-600 dark:text-zinc-300"
              }
            >
              {copied ? "Copied!" : "Copy"}
            </Text>
          </Pressable>
        </View>

        {/* Length slider */}
        <View className="mb-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <View className="mb-1 flex-row justify-between">
            <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Length
            </Text>
            <Text className="text-sm font-bold text-violet-600">
              {opts.length}
            </Text>
          </View>
          <Slider
            value={opts.length}
            minimumValue={8}
            maximumValue={64}
            step={1}
            onValueChange={(v) => setOpt("length", Math.round(v))}
            minimumTrackTintColor="#7c3aed"
            maximumTrackTintColor="#e4e4e7"
            thumbTintColor="#7c3aed"
          />
          <View className="flex-row justify-between">
            <Text className="text-xs text-zinc-400">8</Text>
            <Text className="text-xs text-zinc-400">64</Text>
          </View>
        </View>

        {/* Toggles */}
        <View className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
          <Toggle
            label="Include uppercase letters"
            value={opts.uppercase}
            onToggle={() => setOpt("uppercase", !opts.uppercase)}
          />
          <View className="h-px bg-zinc-200 dark:bg-zinc-700" />
          <Toggle
            label="Include numbers"
            value={opts.numbers}
            onToggle={() => setOpt("numbers", !opts.numbers)}
          />
          <View className="h-px bg-zinc-200 dark:bg-zinc-700" />
          <Toggle
            label="Include symbols"
            value={opts.symbols}
            onToggle={() => setOpt("symbols", !opts.symbols)}
          />
          <View className="h-px bg-zinc-200 dark:bg-zinc-700" />
          <Toggle
            label="Exclude ambiguous characters"
            value={opts.excludeAmbiguous}
            onToggle={() => setOpt("excludeAmbiguous", !opts.excludeAmbiguous)}
          />
        </View>
      </View>
    </ScrollView>
  );
}
