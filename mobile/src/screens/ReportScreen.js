import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
  Image
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

export default function ReportScreen({
  regions,
  isOnline,
  queuedCount,
  onQueueReport,
  onSyncNow
}) {
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [hazardType, setHazardType] = useState('Landslide');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [regionModalVisible, setRegionModalVisible] = useState(false);
  const [photoUri, setPhotoUri] = useState(null);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [locating, setLocating] = useState(false);

  const hazardOptions = [
    { label: 'Landslide', icon: 'activity', desc: 'General slope failure/slip' },
    { label: 'Rockfall', icon: 'layers', desc: 'Boulders falling' },
    { label: 'Mudslide', icon: 'droplet', desc: 'Rapid mud/debris flows' },
    { label: 'Soil Cracks', icon: 'git-commit', desc: 'Visible cracks in ground' }
  ];

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please grant camera roll permissions to upload photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    if (!cameraPermission.granted) {
      Alert.alert('Permission Required', 'Please grant camera permissions.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const autoGeotag = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant location permissions.');
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      setLatitude(location.coords.latitude.toFixed(6));
      setLongitude(location.coords.longitude.toFixed(6));
      if (!selectedRegion) {
        const nearest = regions.reduce((prev, curr) => {
          const dPrev = Math.sqrt(Math.pow(prev.latitude - location.coords.latitude, 2) + Math.pow(prev.longitude - location.coords.longitude, 2));
          const dCurr = Math.sqrt(Math.pow(curr.latitude - location.coords.latitude, 2) + Math.pow(curr.longitude - location.coords.longitude, 2));
          return dPrev < dCurr ? prev : curr;
        });
        setSelectedRegion(nearest);
      }
    } catch (e) {
      Alert.alert('Location Error', 'Could not get current location.');
    } finally {
      setLocating(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedRegion) {
      Alert.alert('Selection Required', 'Please select the affected region.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Description Required', 'Please provide details about the hazard.');
      return;
    }

    setIsSubmitting(true);
    const reportData = {
      region_id: selectedRegion.id,
      hazard_type: hazardType,
      description: description.trim(),
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      media_path: photoUri || null,
      media_content_type: photoUri ? 'image/jpeg' : null,
    };

    try {
      const result = await onQueueReport(reportData);
      if (result.success) {
        if (result.queued) {
          Alert.alert('Offline Mode Active', 'You are offline. Your report has been saved locally and will upload automatically.');
        } else {
          Alert.alert('Report Submitted', 'Thank you. Your report has been received and logged.');
        }
        setDescription('');
        setPhotoUri(null);
        setLatitude('');
        setLongitude('');
      } else {
        Alert.alert('Failed', 'Unable to submit report. Please try again.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Citizen Reporting</Text>
        <Text style={styles.subtitle}>
          Help warning networks by reporting active geological hazards in your area.
        </Text>
      </View>

      {/* Connection Indicator Banner */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Feather name="wifi-off" size={14} color="#991B1B" style={{ marginRight: 6 }} />
          <Text style={styles.offlineText}>
            You are offline. Reports will queue in local storage ({queuedCount} pending).
          </Text>
        </View>
      )}

      {isOnline && queuedCount > 0 && (
        <View style={styles.syncBanner}>
          <Feather name="refresh-cw" size={14} color="#065F46" style={{ marginRight: 6 }} />
          <Text style={styles.syncText}>
            You have {queuedCount} queued report(s) ready to upload.
          </Text>
          <TouchableOpacity style={styles.syncBtn} onPress={onSyncNow}>
            <Text style={styles.syncBtnText}>Sync Now</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Form Card */}
      <View style={styles.card}>
        {/* Region Selector */}
        <Text style={styles.fieldLabel}>Affected Region</Text>
        <TouchableOpacity
          style={styles.regionSelector}
          onPress={() => setRegionModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={styles.regionSelectorLeft}>
            <Feather name="map-pin" size={16} color="#475569" style={{ marginRight: 8 }} />
            <Text style={selectedRegion ? styles.regionValue : styles.regionPlaceholder}>
              {selectedRegion ? selectedRegion.name : 'Select Region...'}
            </Text>
          </View>
          <Feather name="chevron-down" size={16} color="#64748B" />
        </TouchableOpacity>

        {/* Hazard Grid Select */}
        <Text style={styles.fieldLabel}>Hazard Category</Text>
        <View style={styles.hazardGrid}>
          {hazardOptions.map((opt) => {
            const isSelected = opt.label === hazardType;
            return (
              <TouchableOpacity
                key={opt.label}
                style={[styles.hazardItem, isSelected && styles.hazardItemSelected]}
                onPress={() => setHazardType(opt.label)}
                activeOpacity={0.8}
              >
                <View style={[styles.hazardIconBox, isSelected && styles.hazardIconBoxSelected]}>
                  <Feather name={opt.icon} size={18} color={isSelected ? '#2563EB' : '#475569'} />
                </View>
                <Text style={[styles.hazardLabel, isSelected && styles.hazardLabelSelected]}>
                  {opt.label}
                </Text>
                <Text style={styles.hazardDesc} numberOfLines={1}>{opt.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Description Field */}
        <Text style={styles.fieldLabel}>Hazard Description</Text>
        <TextInput
          style={styles.descriptionInput}
          multiline
          numberOfLines={4}
          maxLength={500}
          textAlignVertical="top"
          placeholder="Describe the hazard (e.g. soil movement speed, blocked roads, water flow changes, visual damage)..."
          placeholderTextColor="#94A3B8"
          value={description}
          onChangeText={setDescription}
        />

        {/* Photo Upload */}
        <Text style={styles.fieldLabel}>Photo Evidence (optional)</Text>
        <View style={styles.photoRow}>
          <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
            <Feather name="camera" size={18} color="#FFFFFF" />
            <Text style={styles.photoBtnText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.photoBtn, styles.photoBtnSecondary]} onPress={pickImage}>
            <Feather name="image" size={18} color="#2563EB" />
            <Text style={[styles.photoBtnText, styles.photoBtnTextSecondary]}>Gallery</Text>
          </TouchableOpacity>
        </View>
        {photoUri && <Image source={{ uri: photoUri }} style={styles.photoPreview} />}

        {/* Auto Geotag */}
        <TouchableOpacity style={styles.geoButton} onPress={autoGeotag} disabled={locating}>
          <Feather name="navigation" size={16} color="#FFFFFF" />
          <Text style={styles.geoText}>{locating ? 'Locating...' : 'Auto-detect Location'}</Text>
        </TouchableOpacity>

        <View style={styles.geoRow}>
          <View style={styles.geoField}>
            <Text style={styles.geoLabel}>Latitude</Text>
            <TextInput
              style={styles.geoInput}
              value={latitude}
              onChangeText={setLatitude}
              placeholder="Auto-filled"
              placeholderTextColor="#94A3B8"
            />
          </View>
          <View style={styles.geoField}>
            <Text style={styles.geoLabel}>Longitude</Text>
            <TextInput
              style={styles.geoInput}
              value={longitude}
              onChangeText={setLongitude}
              placeholder="Auto-filled"
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

        {/* Submit button */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Feather name="send" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.submitText}>
                {isOnline ? 'Submit Live Report' : 'Queue Offline Report'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Region Picker Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={regionModalVisible}
        onRequestClose={() => setRegionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Region</Text>
              <Feather
                name="x"
                size={20}
                color="#64748B"
                onPress={() => setRegionModalVisible(false)}
                style={{ padding: 4 }}
              />
            </View>

            <FlatList
              data={regions}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.regionItem}
                  onPress={() => {
                    setSelectedRegion(item);
                    setRegionModalVisible(false);
                  }}
                >
                  <Feather name="map-pin" size={14} color="#64748B" style={{ marginRight: 8 }} />
                  <Text style={styles.regionItemText}>{item.name}</Text>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={
                <Text style={styles.modalEmpty}>No regions configured in backend</Text>
              }
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
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    paddingVertical: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 18,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  offlineText: {
    fontSize: 11,
    color: '#991B1B',
    fontWeight: '500',
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4EA',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  syncText: {
    flex: 1,
    fontSize: 11,
    color: '#065F46',
    fontWeight: '500',
  },
  syncBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  syncBtnText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 2,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  regionSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 20,
  },
  regionSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  regionPlaceholder: {
    fontSize: 13,
    color: '#94A3B8',
  },
  regionValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
  },
  hazardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  hazardItem: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  hazardItemSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  hazardIconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  hazardIconBoxSelected: {
    backgroundColor: '#DBEAFE',
  },
  hazardLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  hazardLabelSelected: {
    color: '#2563EB',
  },
  hazardDesc: {
    fontSize: 8,
    color: '#64748B',
    marginTop: 2,
  },
  descriptionInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
    height: 100,
    marginBottom: 20,
  },
  photoRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  photoBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563EB', paddingVertical: 10, borderRadius: 10, gap: 6 },
  photoBtnSecondary: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#2563EB' },
  photoBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  photoBtnTextSecondary: { color: '#2563EB' },
  photoPreview: { width: '100%', height: 180, borderRadius: 10, resizeMode: 'cover', marginBottom: 20 },
  geoButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F172A', paddingVertical: 10, borderRadius: 10, marginBottom: 10, gap: 8 },
  geoText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  geoRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  geoField: { flex: 1 },
  geoLabel: { fontSize: 11, fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', marginBottom: 6 },
  geoInput: { backgroundColor: '#F8FAFC', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#0F172A' },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#2563EB',
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  regionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  regionItemText: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  modalEmpty: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
