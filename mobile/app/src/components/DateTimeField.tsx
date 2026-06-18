import { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

import { theme } from "../theme/theme";

type DateTimeFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  mode: "date" | "time";
  helperText?: string;
};

export function DateTimeField({ label, value, onChange, mode, helperText }: DateTimeFieldProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerValue = useMemo(() => toDateValue(value, mode), [mode, value]);
  const icon = mode === "date" ? "📅" : "🕐";

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {Platform.OS === "web" ? (
        <input
          aria-label={label}
          type={mode}
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
          style={webInputStyle}
        />
      ) : (
        <>
          <Pressable
            onPress={() => setPickerOpen(true)}
            style={[styles.inputButton, value ? styles.inputButtonSelected : undefined]}
          >
            <Text style={styles.inputIcon}>{icon}</Text>
            <Text style={value ? styles.inputValue : styles.inputPlaceholder}>
              {value || (mode === "date" ? "Pick a date" : "Pick a time")}
            </Text>
            {value ? <View style={styles.inputClearDot} /> : null}
          </Pressable>
          {pickerOpen ? (
            <DateTimePicker
              value={pickerValue}
              mode={mode}
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onValueChange={(event, selectedDate) => {
                handleNativeValueChange(event, selectedDate, mode, onChange, setPickerOpen);
              }}
              onDismiss={() => {
                if (Platform.OS !== "ios") {
                  setPickerOpen(false);
                }
              }}
            />
          ) : null}
        </>
      )}
      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldWrap: {
    gap: theme.spacing[2],
  },
  fieldLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textPrimary,
  },
  inputButton: {
    minHeight: theme.layout.inputHeight,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
    backgroundColor: theme.semanticColors.surface,
    paddingHorizontal: theme.spacing[4],
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
  },
  inputButtonSelected: {
    borderColor: theme.semanticColors.primary,
    backgroundColor: "#FFF7F2",
  },
  inputIcon: {
    fontSize: 18,
  },
  inputClearDot: {
    marginLeft: "auto" as unknown as number,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.semanticColors.success,
  },
  inputValue: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.md,
    color: theme.semanticColors.textPrimary,
  },
  inputPlaceholder: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.md,
    color: theme.semanticColors.textMuted,
  },
  helperText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.xs,
    color: theme.semanticColors.textMuted,
  },
});

const webInputStyle = {
  minHeight: theme.layout.inputHeight,
  borderRadius: `${theme.radius.lg}px`,
  border: `1px solid ${theme.semanticColors.borderSoft}`,
  backgroundColor: theme.semanticColors.surface,
  padding: `0 ${theme.spacing[4]}px`,
  fontFamily: theme.typography.fontFamily.body,
  fontSize: `${theme.typography.size.md}px`,
  color: theme.semanticColors.textPrimary,
  outline: "none",
  width: "100%",
  boxSizing: "border-box" as const,
};

function toDateValue(value: string, mode: "date" | "time") {
  if (!value) {
    return new Date();
  }

  if (mode === "date") {
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  const [hours = "0", minutes = "0"] = value.split(":");
  const parsed = new Date();
  parsed.setHours(Number(hours), Number(minutes), 0, 0);
  return parsed;
}

function handleNativeValueChange(
  event: { nativeEvent: { timestamp: number } },
  selectedDate: Date,
  mode: "date" | "time",
  onChange: (value: string) => void,
  setPickerOpen: (value: boolean) => void,
) {
  if (Platform.OS !== "ios") {
    setPickerOpen(false);
  }

  if (!selectedDate) {
    return;
  }

  if (mode === "date") {
    onChange(selectedDate.toISOString().slice(0, 10));
    return;
  }

  const hours = `${selectedDate.getHours()}`.padStart(2, "0");
  const minutes = `${selectedDate.getMinutes()}`.padStart(2, "0");
  onChange(`${hours}:${minutes}`);
}
