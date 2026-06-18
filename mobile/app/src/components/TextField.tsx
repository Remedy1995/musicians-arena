import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { theme } from "../theme/theme";

type TextFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  helperText?: string;
  multiline?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad" | "url";
  secureTextEntry?: boolean;
  editable?: boolean;
};

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  helperText,
  multiline = false,
  keyboardType = "default",
  secureTextEntry = false,
  editable = true,
}: TextFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, isFocused ? styles.fieldLabelFocused : undefined]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        editable={editable}
        placeholder={placeholder || label}
        placeholderTextColor={theme.semanticColors.textMuted}
        style={[
          styles.input,
          multiline ? styles.inputMultiline : undefined,
          isFocused ? styles.inputFocused : undefined,
          !editable ? styles.inputDisabled : undefined,
        ]}
        multiline={multiline}
        autoCapitalize="none"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
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
    color: theme.semanticColors.textSecondary,
  },
  fieldLabelFocused: {
    color: theme.semanticColors.primary,
  },
  input: {
    minHeight: theme.layout.inputHeight,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
    backgroundColor: theme.semanticColors.surface,
    paddingHorizontal: theme.spacing[4],
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.md,
    color: theme.semanticColors.textPrimary,
  },
  inputFocused: {
    borderColor: theme.semanticColors.primary,
    backgroundColor: "#FFF7F2",
  },
  inputMultiline: {
    minHeight: 112,
    paddingTop: theme.spacing[4],
    textAlignVertical: "top",
  },
  inputDisabled: {
    backgroundColor: theme.colors.stone[50],
    color: theme.semanticColors.textSecondary,
  },
  helperText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.xs,
    color: theme.semanticColors.textMuted,
  },
});
