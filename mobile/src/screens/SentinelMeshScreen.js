import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getNodeId, getPendingMeshMessages } from '../services/meshProtocol';
import { meshService } from '../services/mesh';

export default function SentinelMeshScreen({ isOnline }) {
  const [nodeId, setNodeId] = useState('Loading node identity...');
  const [pending, setPending] = useState(0);
  const [meshState, setMeshState] = useState({ nativeAvailable: false, advertising: false, discovering: false });

  const refresh = async () => {
    setNodeId(await getNodeId());
    setPending((await getPendingMeshMessages()).length);
    setMeshState({
      nativeAvailable: Boolean(meshService.nativeModule),
      advertising: meshService.isAdvertising,
      discovering: Boolean(meshService.nativeModule),
    });
  };

  useEffect(() => { refresh(); }, []);

  const startMesh = async () => {
    const permissionsGranted = await meshService.requestPermissions();
    if (!permissionsGranted) {
      await refresh();
      return;
    }
    await meshService.init();
    if (meshService.nativeModule) {
      meshService.startAdvertising();
      meshService.startDiscovery();
    }
    await refresh();
  };

  return <ScrollView contentContainerStyle={styles.container}>
    <View style={styles.header}><View><Text style={styles.eyebrow}>OFFLINE EMERGENCY NETWORK</Text><Text style={styles.title}>SentinelMesh</Text><Text style={styles.subtitle}>Store-and-forward emergency communication over nearby Android devices.</Text></View><Feather name="radio" size={28} color="#2563EB" /></View>
    <View style={styles.statusCard}><View style={styles.statusRow}><View style={[styles.dot, { backgroundColor: meshState.nativeAvailable ? '#16A34A' : '#D97706' }]} /><Text style={styles.statusTitle}>{meshState.nativeAvailable ? 'BLE MODULE AVAILABLE' : 'INTEGRATION UNAVAILABLE'}</Text></View><Text style={styles.statusText}>{meshState.nativeAvailable ? 'Nearby Connections native module is available. Actual discovery begins only after permissions and Bluetooth are granted.' : 'Install the native Android build with the SentinelMesh module to enable nearby relay. No mesh connection is claimed.'}</Text><TouchableOpacity style={styles.primaryButton} onPress={startMesh}><Feather name="radio" size={16} color="#FFFFFF" /><Text style={styles.primaryText}>{meshState.nativeAvailable ? 'START SENTINELMESH' : 'CHECK NATIVE MODULE'}</Text></TouchableOpacity></View>
    <View style={styles.grid}><Metric label="Internet" value={isOnline ? 'AVAILABLE' : 'OFFLINE'} tone={isOnline ? '#15803D' : '#B91C1C'} /><Metric label="Bluetooth mesh" value={meshState.advertising ? 'ACTIVE' : 'NOT ACTIVE'} tone={meshState.advertising ? '#15803D' : '#64748B'} /><Metric label="Nearby nodes" value="--" tone="#64748B" /><Metric label="Gateway" value="NOT CONNECTED" tone="#64748B" /></View>
    <View style={styles.panel}><Text style={styles.panelTitle}>LOCAL NODE</Text><Row label="Node ID" value={nodeId} /><Row label="Role" value="CITIZEN_NODE" /><Row label="Pending messages" value={String(pending)} /><Row label="Cloud sync" value={isOnline ? 'Available for queued items' : 'Waiting for Internet'} /></View>
    <View style={styles.panel}><Text style={styles.panelTitle}>DELIVERY TRUST</Text><Text style={styles.body}>A message is marked relayed, gateway-received, or synced only after the corresponding application event or server acknowledgement. Discovery counts and gateway status are unavailable until the native layer reports them.</Text></View>
  </ScrollView>;
}

function Metric({ label, value, tone }) { return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={[styles.metricValue, { color: tone }]}>{value}</Text></View>; }
function Row({ label, value }) { return <View style={styles.row}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowValue}>{value}</Text></View>; }

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 36, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 18 },
  eyebrow: { color: '#2563EB', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  title: { marginTop: 5, color: '#0F172A', fontSize: 26, fontWeight: '800' },
  subtitle: { maxWidth: 300, marginTop: 5, color: '#64748B', fontSize: 12, lineHeight: 18 },
  statusCard: { padding: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, dot: { width: 9, height: 9, borderRadius: 5 }, statusTitle: { color: '#334155', fontSize: 11, fontWeight: '800', letterSpacing: .5 }, statusText: { marginTop: 10, color: '#64748B', fontSize: 12, lineHeight: 18 },
  primaryButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 14, padding: 12, backgroundColor: '#2563EB', borderRadius: 8 }, primaryText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }, metric: { width: '48%', padding: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8 }, metricLabel: { color: '#64748B', fontSize: 10 }, metricValue: { marginTop: 5, fontSize: 12, fontWeight: '800' },
  panel: { marginTop: 12, padding: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12 }, panelTitle: { color: '#2563EB', fontSize: 10, fontWeight: '800', letterSpacing: 1 }, row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }, rowLabel: { color: '#64748B', fontSize: 12 }, rowValue: { maxWidth: '58%', color: '#0F172A', fontSize: 12, fontWeight: '700', textAlign: 'right' }, body: { marginTop: 10, color: '#475569', fontSize: 12, lineHeight: 18 },
});
