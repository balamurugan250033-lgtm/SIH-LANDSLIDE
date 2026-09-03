import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';

const PREFERENCES_KEY = '@citizen_preferences';

export default function ProfileScreen() {
  const [preferences, setPreferences] = useState({
    language: 'en',
    notificationsEnabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
    alertThreshold: 'high', // low, moderate, high, critical
    autoSync: true,
  });

  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [thresholdModalVisible, setThresholdModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'हिंदी (Hindi)' },
    { code: 'ta', name: 'தமிழ் (Tamil)' },
    { code: 'ml', name: 'മലയാളം (Malayalam)' },
    { code: 'te', name: 'తెలుగు (Telugu)' },
    { code: 'kn', name: 'ಕನ್ನಡ (Kannada)' },
  ];

  const alertThresholds = [
    { value: 'critical', label: 'Critical Only', desc: 'Only highest risk alerts' },
    { value: 'high', label: 'High & Above', desc: 'High and critical alerts' },
    { value: 'moderate', label: 'Moderate & Above', desc: 'All significant alerts' },
    { value: 'low', label: 'All Alerts', desc: 'Every alert notification' },
  ];

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const stored = await AsyncStorage.getItem(PREFERENCES_KEY);
      if (stored) {
        setPreferences(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load preferences', e);
    }
  };

  const savePreferences = async (updatedPrefs) => {
    setIsSaving(true);
    try {
      await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(updatedPrefs));
      setPreferences(updatedPrefs);
      Alert.alert('Saved', 'Your preferences have been updated.');
    } catch (e) {
      Alert.alert('Error', 'Failed to save preferences.');
    } finally {
      setIsSaving(false);
    }
  };

  const updatePreference = (key, value) => {
    const updated = { ...preferences, [key]: value };
    savePreferences(updated);
  };

  const selectLanguage = (code) => {
    updatePreference('language', code);
    setLanguageModalVisible(false);
  };

  const selectThreshold = (value) => {
    updatePreference('alertThreshold', value);
    setThresholdModalVisible(false);
  };

  const getLanguageName = () => {
    const lang = languages.find((l) => l.code === preferences.language);
    return lang ? lang.name : 'English';
  };

  const getThresholdLabel = () => {
    const threshold = alertThresholds.find((t) => t.value === preferences.alertThreshold);
    return threshold ? threshold.label : 'High & Above';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Feather name="settings" size={28} color="#2563EB" />
        <Text style={styles.title}>Preferences & Settings</Text>
        <Text style={styles.subtitle}>Customize your landslide monitoring experience</Text>
      </View>

      {/* Language Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Language & Region</Text>
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => setLanguageModalVisible(true)}
        >
          <View style={styles.settingLeft}>
            <Feather name="globe" size={20} color="#2563EB" />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>Language</Text>
              <Text style={styles.settingValue}>{getLanguageName()}</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={20} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* Notification Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Feather name="bell" size={20} color="#2563EB" />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>Enable Notifications</Text>
              <Text style={styles.settingDescription}>Receive alert updates</Text>
            </View>
          </View>
          <Switch
            value={preferences.notificationsEnabled}
            onValueChange={(value) => updatePreference('notificationsEnabled', value)}
            trackColor={{ false: '#CBD5E1', true: '#86EFAC' }}
            thumbColor={preferences.notificationsEnabled ? '#22C55E' : '#F3F4F6'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Feather name="volume-2" size={20} color="#2563EB" />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>Sound</Text>
              <Text style={styles.settingDescription}>Play notification sound</Text>
            </View>
          </View>
          <Switch
            value={preferences.soundEnabled}
            onValueChange={(value) => updatePreference('soundEnabled', value)}
            trackColor={{ false: '#CBD5E1', true: '#86EFAC' }}
            thumbColor={preferences.soundEnabled ? '#22C55E' : '#F3F4F6'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Feather name="smartphone" size={20} color="#2563EB" />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>Vibration</Text>
              <Text style={styles.settingDescription}>Vibrate on alert</Text>
            </View>
          </View>
          <Switch
            value={preferences.vibrationEnabled}
            onValueChange={(value) => updatePreference('vibrationEnabled', value)}
            trackColor={{ false: '#CBD5E1', true: '#86EFAC' }}
            thumbColor={preferences.vibrationEnabled ? '#22C55E' : '#F3F4F6'}
          />
        </View>

        {/* Alert Threshold */}
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => setThresholdModalVisible(true)}
        >
          <View style={styles.settingLeft}>
            <Feather name="alert-circle" size={20} color="#2563EB" />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>Alert Threshold</Text>
              <Text style={styles.settingDescription}>{getThresholdLabel()}</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={20} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* Data & Sync Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data & Sync</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Feather name="wifi" size={20} color="#2563EB" />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>Auto Sync</Text>
              <Text style={styles.settingDescription}>Sync reports when online</Text>
            </View>
          </View>
          <Switch
            value={preferences.autoSync}
            onValueChange={(value) => updatePreference('autoSync', value)}
            trackColor={{ false: '#CBD5E1', true: '#86EFAC' }}
            thumbColor={preferences.autoSync ? '#22C55E' : '#F3F4F6'}
          />
        </View>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.aboutContainer}>
          <Text style={styles.aboutTitle}>Landslide Early Warning</Text>
          <Text style={styles.aboutVersion}>Version 1.0.0</Text>
          <Text style={styles.aboutDescription}>
            Citizen reporting platform for landslide hazards and environmental monitoring across Indian Northeast Regions (NER).
          </Text>
        </View>
      </View>

      {/* Language Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={languageModalVisible}
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Language</Text>
              <TouchableOpacity onPress={() => setLanguageModalVisible(false)}>
                <Feather name="x" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={languages}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.languageOption,
                    preferences.language === item.code && styles.languageOptionSelected,
                  ]}
                  onPress={() => selectLanguage(item.code)}
                >
                  <Text
                    style={[
                      styles.languageOptionText,
                      preferences.language === item.code && styles.languageOptionTextSelected,
                    ]}
                  >
                    {item.name}
                  </Text>
                  {preferences.language === item.code && (
                    <Feather name="check" size={20} color="#2563EB" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Threshold Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={thresholdModalVisible}
        onRequestClose={() => setThresholdModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Alert Threshold</Text>
              <TouchableOpacity onPress={() => setThresholdModalVisible(false)}>
                <Feather name="x" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={alertThresholds}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.thresholdOption,
                    preferences.alertThreshold === item.value && styles.thresholdOptionSelected,
                  ]}
                  onPress={() => selectThreshold(item.value)}
                >
                  <View>
                    <Text
                      style={[
                        styles.thresholdOptionText,
                        preferences.alertThreshold === item.value && styles.thresholdOptionTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                    <Text style={styles.thresholdOptionDesc}>{item.desc}</Text>
                  </View>
                  {preferences.alertThreshold === item.value && (
                    <Feather name="check" size={20} color="#2563EB" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 12,
    marginLeft: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0F172A',
  },
  settingDescription: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  settingValue: {
    fontSize: 14,
    color: '#2563EB',
    marginTop: 2,
    fontWeight: '500',
  },
  aboutContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  aboutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  aboutVersion: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  aboutDescription: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  languageOptionSelected: {
    backgroundColor: '#F0F9FF',
  },
  languageOptionText: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '400',
  },
  languageOptionTextSelected: {
    fontWeight: '600',
    color: '#2563EB',
  },
  thresholdOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  thresholdOptionSelected: {
    backgroundColor: '#F0F9FF',
  },
  thresholdOptionText: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '400',
  },
  thresholdOptionTextSelected: {
    fontWeight: '600',
    color: '#2563EB',
  },
  thresholdOptionDesc: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
});
