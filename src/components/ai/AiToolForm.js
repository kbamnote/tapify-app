import React from 'react';
import { View, Text, TextInput, Switch, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS } from '../../theme/colors';

/**
 * Renders a tool's input fields from config and a Generate button.
 * Fully generic — supports 'text', 'textarea' and 'toggle' field types.
 */
export default function AiToolForm({ tool, values, onChange, onSubmit, loading }) {
  return (
    <View style={styles.form}>
      {tool.inputs.map((field) => {
        if (field.type === 'toggle') {
          return (
            <View key={field.name} style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>{field.label}</Text>
              <Switch
                value={!!values[field.name]}
                onValueChange={(v) => onChange(field.name, v)}
                trackColor={{ false: '#d1d5db', true: COLORS.primary }}
                thumbColor="#ffffff"
              />
            </View>
          );
        }

        const isArea = field.type === 'textarea';
        return (
          <View key={field.name} style={styles.field}>
            <Text style={styles.label}>
              {field.label}
              {field.required ? <Text style={styles.req}> *</Text> : null}
            </Text>
            <TextInput
              style={[styles.input, isArea && styles.textarea]}
              value={values[field.name] ?? ''}
              onChangeText={(v) => onChange(field.name, v)}
              placeholder={field.placeholder || ''}
              placeholderTextColor={COLORS.textMuted}
              multiline={isArea}
              numberOfLines={isArea ? 4 : 1}
              textAlignVertical={isArea ? 'top' : 'center'}
            />
          </View>
        );
      })}

      <TouchableOpacity
        style={[styles.generateBtn, loading && styles.generateBtnDisabled]}
        onPress={onSubmit}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.generateText}>✨ Generate</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { marginBottom: 8 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.primary, marginBottom: 6 },
  req: { color: COLORS.error },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: 'rgba(21,62,63,0.12)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text,
  },
  textarea: { minHeight: 96, paddingTop: 12 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  toggleLabel: { fontSize: 14, color: COLORS.text, fontWeight: '500', flex: 1, paddingRight: 12 },
  generateBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  generateBtnDisabled: { opacity: 0.6 },
  generateText: { color: '#ffffff', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
});
