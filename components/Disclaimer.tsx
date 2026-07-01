import { Info } from "lucide-react-native";
import { Text, View } from "react-native";

export type DisclaimerVariant = "health" | "finance" | "tax";

const DISCLAIMER_TEXT: Record<DisclaimerVariant, string> = {
  health:
    "This tool is for general informational and educational purposes only and is not medical advice. Results are estimates based on the values you enter and standard formulas, and individual health needs vary. Consult a qualified healthcare professional before making decisions about your health, diet, or fitness.",
  finance:
    "This tool provides estimates for general informational purposes only and is not financial, tax, or legal advice. Results depend on the values you enter and simplified assumptions, and your actual figures may differ. Consult a qualified professional for advice specific to your situation.",
  tax:
    "This estimator is for general informational purposes only and is not tax advice. It uses simplified rates and does not account for all deductions, credits, or your local tax rules. Actual amounts owed may differ. Consult a licensed tax professional or your local tax authority for guidance on your situation.",
};

type DisclaimerProps = {
  variant: DisclaimerVariant;
};

export function Disclaimer({ variant }: DisclaimerProps) {
  return (
    <View className="mt-4 flex-row items-start gap-2 rounded-2xl bg-zinc-100 p-3 dark:bg-zinc-800/60">
      <View className="mt-0.5">
        <Info size={14} color="#a1a1aa" />
      </View>
      <Text className="flex-1 text-xs leading-4 text-zinc-500 dark:text-zinc-400">
        {DISCLAIMER_TEXT[variant]}
      </Text>
    </View>
  );
}
