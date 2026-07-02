import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import {
  AdminDispute,
  AdminDriver,
  AdminDriverDetail,
  AdminLiveMap,
  AdminOverview,
  AdminPayment,
  AdminTrip,
  AdminTripDetail,
  AdminUser,
  cancelAdminTrip,
  getAdminDisputes,
  getAdminDriver,
  getAdminDrivers,
  getAdminLiveMap,
  getAdminOverview,
  getAdminPayments,
  getAdminTrip,
  getAdminTrips,
  getAdminUsers,
  setAdminDriverOffline,
  updateAdminDispute,
  updateAdminDriverVerification,
  updateAdminPaymentStatus,
} from '../api/adminApi';
import { createAdminConnection } from '../api/adminRealtime';
import { useAdminAuth } from '../auth/AdminAuthContext';

const colors = {
  blue: '#0757d8',
  navy: '#07112f',
  muted: '#64708a',
  line: '#dbe3ef',
  background: '#f4f7fb',
  surface: '#ffffff',
  green: '#16a34a',
  amber: '#f59e0b',
  red: '#e11d48',
};

type TabKey = 'overview' | 'users' | 'drivers' | 'trips' | 'payments' | 'disputes';

export function AdminDashboardScreen() {
  const { width } = useWindowDimensions();
  const compact = width < 980;
  const { loading, session, signOut } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [overview, setOverview] = useState<AdminOverview>();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [drivers, setDrivers] = useState<AdminDriver[]>([]);
  const [trips, setTrips] = useState<AdminTrip[]>([]);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [liveMap, setLiveMap] = useState<AdminLiveMap>();
  const [selectedTrip, setSelectedTrip] = useState<AdminTripDetail>();
  const [selectedDriver, setSelectedDriver] = useState<AdminDriverDetail>();
  const [selectedDispute, setSelectedDispute] = useState<AdminDispute>();
  const [selectedPayment, setSelectedPayment] = useState<AdminPayment>();
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'reconnecting' | 'offline'>('offline');
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/login');
    }
  }, [loading, session]);

  const loadDashboard = useCallback(async () => {
    if (!session) {
      return;
    }

    setRefreshing(true);
    setError('');
    try {
      const [nextOverview, nextUsers, nextDrivers, nextTrips, nextPayments, nextDisputes, nextLiveMap] = await Promise.all([
        getAdminOverview(session.accessToken),
        getAdminUsers(session.accessToken),
        getAdminDrivers(session.accessToken),
        getAdminTrips(session.accessToken),
        getAdminPayments(session.accessToken),
        getAdminDisputes(session.accessToken),
        getAdminLiveMap(session.accessToken),
      ]);

      setOverview(nextOverview);
      setUsers(nextUsers);
      setDrivers(nextDrivers);
      setTrips(nextTrips);
      setPayments(nextPayments);
      setDisputes(nextDisputes);
      setLiveMap(nextLiveMap);
      setSelectedDispute((current) => current ? nextDisputes.find((dispute) => dispute.id === current.id) : undefined);
      setSelectedPayment((current) => current ? nextPayments.find((payment) => payment.id === current.id) : undefined);
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError));
    } finally {
      setRefreshing(false);
    }
  }, [session]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!session) {
      return;
    }

    let disposed = false;
    const connection = createAdminConnection(session.accessToken);
    const queueRefresh = () => {
      if (refreshTimer.current) {
        clearTimeout(refreshTimer.current);
      }

      refreshTimer.current = setTimeout(() => {
        if (!disposed) {
          void loadDashboard();
        }
      }, 650);
    };

    connection.on('trip.updated', queueRefresh);
    connection.on('driver.location', queueRefresh);
    connection.on('driver.availability', queueRefresh);
    connection.onreconnecting(() => setRealtimeStatus('reconnecting'));
    connection.onreconnected(async () => {
      setRealtimeStatus('connected');
      await connection.invoke('JoinLiveMap');
      queueRefresh();
    });
    connection.onclose(() => {
      if (!disposed) {
        setRealtimeStatus('offline');
      }
    });

    setRealtimeStatus('connecting');
    connection
      .start()
      .then(async () => {
        await connection.invoke('JoinLiveMap');
        if (!disposed) {
          setRealtimeStatus('connected');
        }
      })
      .catch((requestError) => {
        if (!disposed) {
          setRealtimeStatus('offline');
          setError(getRequestErrorMessage(requestError));
        }
      });

    return () => {
      disposed = true;
      if (refreshTimer.current) {
        clearTimeout(refreshTimer.current);
      }
      void connection.stop();
    };
  }, [loadDashboard, session]);

  const openTrip = async (tripId: string) => {
    if (!session) return;
    setActionBusy(true);
    setError('');
    try {
      setSelectedTrip(await getAdminTrip(tripId, session.accessToken));
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError));
    } finally {
      setActionBusy(false);
    }
  };

  const openDriver = async (driverProfileId: string) => {
    if (!session) return;
    setActionBusy(true);
    setError('');
    try {
      setSelectedDriver(await getAdminDriver(driverProfileId, session.accessToken));
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError));
    } finally {
      setActionBusy(false);
    }
  };

  const runAction = async (action: () => Promise<void>) => {
    setActionBusy(true);
    setError('');
    try {
      await action();
      await loadDashboard();
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError));
    } finally {
      setActionBusy(false);
    }
  };

  const tabs = useMemo(() => ([
    { key: 'overview' as const, label: 'Overview', icon: 'grid' as const },
    { key: 'users' as const, label: 'Users', icon: 'people' as const },
    { key: 'drivers' as const, label: 'Drivers', icon: 'car-sport' as const },
    { key: 'trips' as const, label: 'Trips', icon: 'map' as const },
    { key: 'payments' as const, label: 'Payments', icon: 'card' as const },
    { key: 'disputes' as const, label: 'Disputes', icon: 'alert-circle' as const },
  ]), []);

  if (loading || !session) {
    return <View style={styles.loading}><ActivityIndicator color={colors.blue} size="large" /></View>;
  }

  return (
    <View style={[styles.screen, compact && styles.screenCompact]}>
      <View style={[styles.sidebar, compact && styles.sidebarCompact]}>
        <View>
          <Text style={styles.logo}>RYDO</Text>
          <Text style={styles.logoTag}>ADMIN</Text>
        </View>
        <View style={[styles.nav, compact && styles.navCompact]}>
          {tabs.map((tab) => (
            <Pressable key={tab.key} onPress={() => setActiveTab(tab.key)} style={[styles.navItem, activeTab === tab.key && styles.navItemActive]}>
              <Ionicons name={tab.icon} size={18} color={activeTab === tab.key ? colors.blue : colors.muted} />
              <Text style={[styles.navText, activeTab === tab.key && styles.navTextActive]}>{tab.label}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={() => { signOut(); router.replace('/login'); }} style={styles.signOut}>
          <Ionicons name="log-out" size={18} color={colors.red} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Operations dashboard</Text>
            <Text style={styles.title}>{tabTitle(activeTab)}</Text>
          </View>
          <View style={styles.headerActions}>
            <RealtimePill status={realtimeStatus} />
            <Pressable disabled={refreshing} onPress={() => void loadDashboard()} style={styles.refreshButton}>
              {refreshing ? <ActivityIndicator color="#fff" /> : <><Ionicons name="refresh" size={18} color="#fff" /><Text style={styles.refreshText}>Refresh</Text></>}
            </Pressable>
          </View>
        </View>

        {error ? <View style={styles.errorBanner}><Text style={styles.errorText}>{error}</Text></View> : null}

        {activeTab === 'overview' ? <OverviewPanel overview={overview} liveMap={liveMap} /> : null}
        {activeTab === 'users' ? <UsersPanel users={users} /> : null}
        {activeTab === 'drivers' ? <DriversPanel drivers={drivers} selectedDriver={selectedDriver} busy={actionBusy} onOpenDriver={openDriver} onSetOffline={(driverId) => runAction(() => setAdminDriverOffline(driverId, session.accessToken))} onToggleVerification={(driver) => runAction(async () => { await updateAdminDriverVerification(driver.id, !driver.isVerified, session.accessToken); await openDriver(driver.id); })} /> : null}
        {activeTab === 'trips' ? <TripsPanel trips={trips} selectedTrip={selectedTrip} busy={actionBusy} onOpenTrip={openTrip} onCancelTrip={(tripId) => runAction(async () => { await cancelAdminTrip(tripId, session.accessToken); await openTrip(tripId); })} /> : null}
        {activeTab === 'payments' ? <PaymentsPanel payments={payments} selectedPayment={selectedPayment} busy={actionBusy} onSelectPayment={setSelectedPayment} onUpdatePayment={(paymentId, status) => runAction(() => updateAdminPaymentStatus(paymentId, status, session.accessToken))} /> : null}
        {activeTab === 'disputes' ? <DisputesPanel disputes={disputes} selectedDispute={selectedDispute} resolutionNotes={resolutionNotes} busy={actionBusy} onSelectDispute={(dispute) => { setSelectedDispute(dispute); setResolutionNotes(dispute.resolutionNotes ?? ''); }} onChangeNotes={setResolutionNotes} onUpdateDispute={(disputeId, status) => runAction(() => updateAdminDispute(disputeId, status, resolutionNotes, session.accessToken))} /> : null}
      </ScrollView>
    </View>
  );
}

function OverviewPanel({ overview, liveMap }: { overview?: AdminOverview; liveMap?: AdminLiveMap }) {
  return (
    <View style={styles.stack}>
      <View style={styles.kpiGrid}>
        <Kpi label="Users" value={`${overview?.totalUsers ?? 0}`} icon="people" />
        <Kpi label="Drivers" value={`${overview?.totalDrivers ?? 0}`} detail={`${overview?.onlineDrivers ?? 0} online`} icon="car-sport" tone="green" />
        <Kpi label="Active trips" value={`${overview?.activeTrips ?? 0}`} icon="navigate" tone="blue" />
        <Kpi label="Paid today" value={formatFare(overview?.paidToday ?? 0)} detail={`${overview?.completedToday ?? 0} completed`} icon="cash" tone="green" />
        <Kpi label="Disputes" value={`${overview?.pendingDisputes ?? 0}`} icon="alert-circle" tone="amber" />
      </View>
      <View style={styles.dashboardGrid}>
        <LiveMapPanel liveMap={liveMap} />
        <View style={styles.panel}>
          <PanelTitle title="Recent trips" subtitle="Latest ride activity" />
          {overview?.recentTrips?.length ? overview.recentTrips.map((trip) => (
            <View key={trip.id} style={styles.activityRow}>
              <View style={styles.flex}>
                <Text style={styles.rowTitle}>{trip.pickupAddress}</Text>
                <Text style={styles.muted}>to {trip.destinationAddress}</Text>
              </View>
              <View style={styles.alignRight}>
                <StatusPill label={tripStatusLabel(trip.status)} tone={statusTone(trip.status)} />
                <Text style={styles.money}>{formatFare(trip.fare)}</Text>
              </View>
            </View>
          )) : <EmptyTable label="No recent trips yet" />}
        </View>
      </View>
    </View>
  );
}

function LiveMapPanel({ liveMap }: { liveMap?: AdminLiveMap }) {
  return (
    <View style={styles.panel}>
      <PanelTitle title="Live map" subtitle={`${liveMap?.drivers.length ?? 0} tracked drivers, ${liveMap?.activeTrips.length ?? 0} active trips`} />
      <View style={styles.mapCanvas}>
        {Array.from({ length: 8 }).map((_, index) => <View key={`road-${index}`} style={[styles.mapRoad, { top: 24 + index * 42, transform: [{ rotate: index % 2 ? '-18deg' : '24deg' }] }]} />)}
        {(liveMap?.drivers ?? []).slice(0, 10).map((driver, index) => (
          <View key={driver.id} style={[styles.mapDot, { left: `${16 + (index * 19) % 70}%`, top: `${22 + (index * 23) % 58}%`, backgroundColor: driver.isOnline ? colors.green : colors.muted }]} />
        ))}
        {(liveMap?.activeTrips ?? []).slice(0, 6).map((trip, index) => (
          <View key={trip.id} style={[styles.tripDot, { left: `${24 + (index * 17) % 62}%`, top: `${30 + (index * 29) % 48}%` }]} />
        ))}
      </View>
    </View>
  );
}

function UsersPanel({ users }: { users: AdminUser[] }) {
  return <DataTable headers={['Name', 'Phone', 'Role', 'Verified', 'Joined']} rows={users.map((user) => ({ cells: [user.displayName ?? 'Unnamed user', user.phoneNumber, roleLabel(user.role), user.isPhoneVerified ? 'Yes' : 'No', formatDate(user.createdAtUtc)] }))} empty="No users yet" />;
}

function DriversPanel({
  drivers,
  selectedDriver,
  busy,
  onOpenDriver,
  onSetOffline,
  onToggleVerification,
}: {
  drivers: AdminDriver[];
  selectedDriver?: AdminDriverDetail;
  busy: boolean;
  onOpenDriver: (driverId: string) => void;
  onSetOffline: (driverId: string) => void;
  onToggleVerification: (driver: AdminDriverDetail) => void;
}) {
  return (
    <View style={styles.stack}>
      <DataTable headers={['Driver', 'Phone', 'Status', 'Verified', 'Rating', 'Vehicle']} rows={drivers.map((driver) => ({ cells: [driver.name ?? 'Unnamed driver', driver.phoneNumber, driver.isOnline ? 'Online' : 'Offline', driver.isVerified ? 'Verified' : 'Unverified', `${driver.ratingAverage.toFixed(1)} (${driver.ratingCount})`, driver.vehicle ? `${driver.vehicle.make} ${driver.vehicle.model} ${driver.vehicle.numberPlate}` : 'No vehicle'], onPress: () => onOpenDriver(driver.id) }))} empty="No drivers yet" />
      {selectedDriver ? <DriverDetailPanel driver={selectedDriver} busy={busy} onSetOffline={() => onSetOffline(selectedDriver.id)} onToggleVerification={() => onToggleVerification(selectedDriver)} /> : null}
    </View>
  );
}

function TripsPanel({
  trips,
  selectedTrip,
  busy,
  onOpenTrip,
  onCancelTrip,
}: {
  trips: AdminTrip[];
  selectedTrip?: AdminTripDetail;
  busy: boolean;
  onOpenTrip: (tripId: string) => void;
  onCancelTrip: (tripId: string) => void;
}) {
  return (
    <View style={styles.stack}>
      <DataTable headers={['Pickup', 'Destination', 'Status', 'Payment', 'Fare', 'Requested']} rows={trips.map((trip) => ({ cells: [trip.pickupAddress, trip.destinationAddress, tripStatusLabel(trip.status), paymentMethodLabel(trip.preferredPaymentMethod), formatFare(trip.fare), formatDate(trip.requestedAtUtc)], onPress: () => onOpenTrip(trip.id) }))} empty="No trips yet" />
      {selectedTrip ? <TripDetailPanel trip={selectedTrip} busy={busy} onCancel={() => onCancelTrip(selectedTrip.id)} /> : null}
    </View>
  );
}

function PaymentsPanel({
  payments,
  selectedPayment,
  busy,
  onSelectPayment,
  onUpdatePayment,
}: {
  payments: AdminPayment[];
  selectedPayment?: AdminPayment;
  busy: boolean;
  onSelectPayment: (payment: AdminPayment) => void;
  onUpdatePayment: (paymentId: string, status: number) => void;
}) {
  return (
    <View style={styles.stack}>
      <DataTable headers={['Trip', 'Method', 'Status', 'Amount', 'Created']} rows={payments.map((payment) => ({ cells: [shortId(payment.tripId), paymentMethodLabel(payment.method), paymentStatusLabel(payment.status), `${payment.currency} ${payment.amount.toFixed(2)}`, formatDate(payment.createdAtUtc)], onPress: () => onSelectPayment(payment) }))} empty="No payments yet" />
      {selectedPayment ? <PaymentOperationsPanel payment={selectedPayment} busy={busy} onUpdatePayment={onUpdatePayment} /> : null}
    </View>
  );
}

function DisputesPanel({
  disputes,
  selectedDispute,
  resolutionNotes,
  busy,
  onSelectDispute,
  onChangeNotes,
  onUpdateDispute,
}: {
  disputes: AdminDispute[];
  selectedDispute?: AdminDispute;
  resolutionNotes: string;
  busy: boolean;
  onSelectDispute: (dispute: AdminDispute) => void;
  onChangeNotes: (notes: string) => void;
  onUpdateDispute: (disputeId: string, status: number) => void;
}) {
  return (
    <View style={styles.stack}>
      <DataTable headers={['Trip', 'Status', 'Reason', 'Created']} rows={disputes.map((dispute) => ({ cells: [shortId(dispute.tripId), disputeStatusLabel(dispute.status), dispute.reason || 'No reason supplied', formatDate(dispute.createdAtUtc)], onPress: () => onSelectDispute(dispute) }))} empty="No disputes yet" />
      {selectedDispute ? <DisputeDetailPanel dispute={selectedDispute} resolutionNotes={resolutionNotes} busy={busy} onChangeNotes={onChangeNotes} onUpdateDispute={onUpdateDispute} /> : null}
    </View>
  );
}

type DataRow = { cells: string[]; onPress?: () => void };

function DataTable({ headers, rows, empty }: { headers: string[]; rows: DataRow[]; empty: string }) {
  return (
    <View style={styles.panel}>
      <ScrollView horizontal>
        <View style={styles.table}>
          <View style={styles.tableHeader}>{headers.map((header) => <Text key={header} style={styles.th}>{header}</Text>)}</View>
          {rows.length ? rows.map((row, rowIndex) => (
            <Pressable key={`${row.cells[0]}-${rowIndex}`} onPress={row.onPress} style={[styles.tableRow, row.onPress && styles.tableRowInteractive]}>{row.cells.map((cell, cellIndex) => <Text key={`${cell}-${cellIndex}`} style={styles.td}>{cell}</Text>)}</Pressable>
          )) : <EmptyTable label={empty} />}
        </View>
      </ScrollView>
    </View>
  );
}

function TripDetailPanel({ trip, busy, onCancel }: { trip: AdminTripDetail; busy: boolean; onCancel: () => void }) {
  const canCancel = trip.status !== 6 && trip.status !== 7;
  return (
    <View style={styles.detailPanel}>
      <PanelTitle title="Trip detail" subtitle={`${shortId(trip.id)} · ${tripStatusLabel(trip.status)}`} />
      <View style={styles.detailGrid}>
        <DetailItem label="Passenger" value={trip.passenger?.displayName ?? trip.passenger?.phoneNumber ?? 'Unknown passenger'} />
        <DetailItem label="Driver" value={trip.driver?.name ?? trip.driver?.phoneNumber ?? 'Unassigned'} />
        <DetailItem label="Fare" value={formatFare(trip.fare)} />
        <DetailItem label="Payment" value={trip.payment ? `${paymentMethodLabel(trip.payment.method)} · ${paymentStatusLabel(trip.payment.status)}` : paymentMethodLabel(trip.preferredPaymentMethod)} />
        <DetailItem label="Pickup" value={trip.pickupAddress} />
        <DetailItem label="Destination" value={trip.destinationAddress} />
      </View>
      <View style={styles.timeline}>
        {trip.timeline.map((item) => <View key={`${item.label}-${item.atUtc}`} style={styles.timelineItem}><View style={styles.timelineDot} /><Text style={styles.timelineText}>{item.label}: {formatDate(item.atUtc)}</Text></View>)}
      </View>
      <View style={styles.buttonRow}>
        <ActionButton label="Cancel stuck trip" danger disabled={!canCancel || busy} onPress={() => confirmAction('Cancel trip', 'Cancel this trip for passenger and driver?', onCancel)} />
      </View>
    </View>
  );
}

function DriverDetailPanel({ driver, busy, onSetOffline, onToggleVerification }: { driver: AdminDriverDetail; busy: boolean; onSetOffline: () => void; onToggleVerification: () => void }) {
  return (
    <View style={styles.detailPanel}>
      <PanelTitle title="Driver detail" subtitle={`${driver.name ?? 'Unnamed driver'} · ${driver.isOnline ? 'Online' : 'Offline'}`} />
      <View style={styles.detailGrid}>
        <DetailItem label="Phone" value={driver.phoneNumber} />
        <DetailItem label="Email" value={driver.email ?? 'No email'} />
        <DetailItem label="Verification" value={driver.isVerified ? 'Verified' : 'Unverified'} />
        <DetailItem label="Rating" value={`${driver.ratingAverage.toFixed(1)} from ${driver.ratingCount} ratings`} />
      </View>
      <View style={styles.subsection}>
        <Text style={styles.subsectionTitle}>Vehicles</Text>
        {driver.vehicles.length ? driver.vehicles.map((vehicle) => <Text key={vehicle.id} style={styles.muted}>{vehicle.colour} {vehicle.make} {vehicle.model} · {vehicle.numberPlate}</Text>) : <Text style={styles.muted}>No vehicles on record</Text>}
      </View>
      <View style={styles.subsection}>
        <Text style={styles.subsectionTitle}>Recent trips</Text>
        {driver.trips.length ? driver.trips.slice(0, 5).map((trip) => <Text key={trip.id} style={styles.muted}>{tripStatusLabel(trip.status)} · {trip.pickupAddress} to {trip.destinationAddress} · {formatFare(trip.fare)}</Text>) : <Text style={styles.muted}>No driver trips yet</Text>}
      </View>
      <View style={styles.buttonRow}>
        <ActionButton label={driver.isVerified ? 'Unverify driver' : 'Verify driver'} disabled={busy} onPress={() => confirmAction('Update driver', 'Change this driver verification status?', onToggleVerification)} />
        <ActionButton label="Set offline" danger disabled={!driver.isOnline || busy} onPress={() => confirmAction('Set driver offline', 'Force this driver offline?', onSetOffline)} />
      </View>
    </View>
  );
}

function PaymentOperationsPanel({ payment, busy, onUpdatePayment }: { payment: AdminPayment; busy: boolean; onUpdatePayment: (paymentId: string, status: number) => void }) {
  return (
    <View style={styles.detailPanel}>
      <PanelTitle title="Payment operations" subtitle={`${shortId(payment.id)} · ${paymentStatusLabel(payment.status)}`} />
      <View style={styles.detailGrid}>
        <DetailItem label="Trip" value={shortId(payment.tripId)} />
        <DetailItem label="Method" value={paymentMethodLabel(payment.method)} />
        <DetailItem label="Amount" value={`${payment.currency} ${payment.amount.toFixed(2)}`} />
        <DetailItem label="Provider ref" value={payment.providerReference ?? 'Not set'} />
      </View>
      <View style={styles.buttonRow}>
        <ActionButton label="Flag pending" disabled={busy || payment.status === 1} onPress={() => onUpdatePayment(payment.id, 1)} />
        <ActionButton label="Mark paid" disabled={busy || payment.status === 2} onPress={() => onUpdatePayment(payment.id, 2)} />
        <ActionButton label="Flag failed" danger disabled={busy || payment.status === 3} onPress={() => onUpdatePayment(payment.id, 3)} />
      </View>
      <Text style={styles.muted}>Refunds and manual adjustments will build on this status-control flow later.</Text>
    </View>
  );
}

function DisputeDetailPanel({ dispute, resolutionNotes, busy, onChangeNotes, onUpdateDispute }: { dispute: AdminDispute; resolutionNotes: string; busy: boolean; onChangeNotes: (notes: string) => void; onUpdateDispute: (disputeId: string, status: number) => void }) {
  return (
    <View style={styles.detailPanel}>
      <PanelTitle title="Dispute detail" subtitle={`${shortId(dispute.id)} · ${disputeStatusLabel(dispute.status)}`} />
      <View style={styles.detailGrid}>
        <DetailItem label="Trip" value={shortId(dispute.tripId)} />
        <DetailItem label="Created by" value={shortId(dispute.createdByUserId)} />
        <DetailItem label="Reason" value={dispute.reason || 'No reason supplied'} />
        <DetailItem label="Created" value={formatDate(dispute.createdAtUtc)} />
      </View>
      <TextInput value={resolutionNotes} onChangeText={onChangeNotes} multiline placeholder="Resolution notes" style={styles.notesInput} />
      <View style={styles.buttonRow}>
        <ActionButton label="In review" disabled={busy || dispute.status === 2} onPress={() => onUpdateDispute(dispute.id, 2)} />
        <ActionButton label="Resolve" disabled={busy || dispute.status === 3} onPress={() => onUpdateDispute(dispute.id, 3)} />
        <ActionButton label="Reject" danger disabled={busy || dispute.status === 4} onPress={() => onUpdateDispute(dispute.id, 4)} />
      </View>
    </View>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function ActionButton({ label, danger, disabled, onPress }: { label: string; danger?: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.actionButton, danger && styles.actionButtonDanger, disabled && styles.actionButtonDisabled]}>
      <Text style={[styles.actionButtonText, danger && styles.actionButtonDangerText]}>{label}</Text>
    </Pressable>
  );
}

function Kpi({ label, value, detail, icon, tone = 'blue' }: { label: string; value: string; detail?: string; icon: keyof typeof Ionicons.glyphMap; tone?: 'blue' | 'green' | 'amber' }) {
  const toneColor = tone === 'green' ? colors.green : tone === 'amber' ? colors.amber : colors.blue;
  return (
    <View style={styles.kpi}>
      <View style={[styles.kpiIcon, { backgroundColor: `${toneColor}18` }]}><Ionicons name={icon} size={22} color={toneColor} /></View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
      {detail ? <Text style={styles.kpiDetail}>{detail}</Text> : null}
    </View>
  );
}

function RealtimePill({ status }: { status: 'connecting' | 'connected' | 'reconnecting' | 'offline' }) {
  const online = status === 'connected';
  const label = status === 'connected'
    ? 'Live'
    : status === 'connecting'
      ? 'Connecting'
      : status === 'reconnecting'
        ? 'Reconnecting'
        : 'Offline';

  return (
    <View style={[styles.realtimePill, online && styles.realtimePillOnline]}>
      <View style={[styles.realtimeDot, online && styles.realtimeDotOnline]} />
      <Text style={[styles.realtimeText, online && styles.realtimeTextOnline]}>{label}</Text>
    </View>
  );
}

function PanelTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return <View><Text style={styles.panelTitle}>{title}</Text><Text style={styles.muted}>{subtitle}</Text></View>;
}

function StatusPill({ label, tone }: { label: string; tone: 'blue' | 'green' | 'amber' | 'red' | 'muted' }) {
  const toneColor = tone === 'green' ? colors.green : tone === 'amber' ? colors.amber : tone === 'red' ? colors.red : tone === 'muted' ? colors.muted : colors.blue;
  return <Text style={[styles.pill, { color: toneColor, backgroundColor: `${toneColor}15` }]}>{label}</Text>;
}

function EmptyTable({ label }: { label: string }) {
  return <View style={styles.empty}><Text style={styles.muted}>{label}</Text></View>;
}

function tabTitle(tab: TabKey) {
  return tab === 'overview' ? 'Overview' : tab[0].toUpperCase() + tab.slice(1);
}

function roleLabel(role: number) {
  if (role === 3) return 'Admin';
  if (role === 2) return 'Driver';
  return 'Passenger';
}

function tripStatusLabel(status: number) {
  return ['Unknown', 'Requested', 'Matching', 'Assigned', 'Arriving', 'In progress', 'Completed', 'Cancelled', 'Expired'][status] ?? 'Unknown';
}

function statusTone(status: number): 'blue' | 'green' | 'amber' | 'red' | 'muted' {
  if (status === 6) return 'green';
  if (status === 7 || status === 8) return 'red';
  if (status === 1 || status === 2) return 'amber';
  return 'blue';
}

function paymentMethodLabel(method: number) {
  return ['Unknown', 'Cash', 'Card', 'EFT', 'Wallet', 'Ozow', 'SnapScan', 'Yoco', 'Apple Pay', 'Google Pay'][method] ?? 'Unknown';
}

function paymentStatusLabel(status: number) {
  return ['Unknown', 'Pending', 'Paid', 'Failed', 'Refunded'][status] ?? 'Unknown';
}

function disputeStatusLabel(status: number) {
  return ['Unknown', 'Open', 'In review', 'Resolved', 'Rejected'][status] ?? 'Unknown';
}

function formatFare(value: number) {
  return `R${value.toFixed(2)}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function shortId(value: string) {
  return value.slice(0, 8);
}

function confirmAction(title: string, message: string, action: () => void) {
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Continue', style: 'destructive', onPress: action },
  ]);
}

function getRequestErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, flexDirection: 'row' },
  screenCompact: { flexDirection: 'column' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  sidebar: { width: 260, backgroundColor: colors.surface, borderRightWidth: 1, borderRightColor: colors.line, padding: 22, gap: 24 },
  sidebarCompact: { width: '100%', borderRightWidth: 0, borderBottomWidth: 1, borderBottomColor: colors.line },
  logo: { color: colors.blue, fontSize: 34, fontWeight: '900', letterSpacing: 0 },
  logoTag: { color: colors.navy, fontSize: 11, fontWeight: '900' },
  nav: { gap: 8 },
  navCompact: { flexDirection: 'row', flexWrap: 'wrap' },
  navItem: { minHeight: 44, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12 },
  navItemActive: { backgroundColor: '#eaf2ff' },
  navText: { color: colors.muted, fontSize: 14, fontWeight: '800' },
  navTextActive: { color: colors.blue },
  signOut: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  signOutText: { color: colors.red, fontWeight: '900' },
  content: { flexGrow: 1, padding: 26, gap: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  eyebrow: { color: colors.muted, fontSize: 13, fontWeight: '800', textTransform: 'uppercase' },
  title: { color: colors.navy, fontSize: 34, fontWeight: '900' },
  refreshButton: { minHeight: 44, borderRadius: 8, backgroundColor: colors.blue, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  refreshText: { color: '#fff', fontWeight: '900' },
  realtimePill: { minHeight: 38, borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  realtimePillOnline: { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' },
  realtimeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.muted },
  realtimeDotOnline: { backgroundColor: colors.green },
  realtimeText: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  realtimeTextOnline: { color: colors.green },
  errorBanner: { borderRadius: 8, backgroundColor: '#fff1f2', borderWidth: 1, borderColor: '#fecdd3', padding: 12 },
  errorText: { color: colors.red, fontWeight: '800' },
  stack: { gap: 20 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  kpi: { minWidth: 190, flexGrow: 1, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 7 },
  kpiIcon: { width: 42, height: 42, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  kpiValue: { color: colors.navy, fontSize: 28, fontWeight: '900' },
  kpiLabel: { color: colors.muted, fontSize: 13, fontWeight: '800' },
  kpiDetail: { color: colors.green, fontSize: 12, fontWeight: '900' },
  dashboardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  panel: { flex: 1, minWidth: 360, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 14 },
  panelTitle: { color: colors.navy, fontSize: 18, fontWeight: '900' },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  mapCanvas: { height: 360, borderRadius: 8, backgroundColor: '#eef3fa', overflow: 'hidden' },
  mapRoad: { position: 'absolute', left: -80, right: -80, height: 14, backgroundColor: '#fff', opacity: 0.9 },
  mapDot: { position: 'absolute', width: 18, height: 18, borderRadius: 9, borderWidth: 3, borderColor: '#fff' },
  tripDot: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: colors.blue, borderWidth: 2, borderColor: '#fff' },
  activityRow: { minHeight: 70, borderTopWidth: 1, borderTopColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  flex: { flex: 1, minWidth: 0 },
  rowTitle: { color: colors.navy, fontSize: 14, fontWeight: '900' },
  alignRight: { alignItems: 'flex-end', gap: 5 },
  money: { color: colors.navy, fontSize: 13, fontWeight: '900' },
  pill: { borderRadius: 999, overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 4, fontSize: 11, fontWeight: '900' },
  table: { minWidth: 900 },
  tableHeader: { flexDirection: 'row', minHeight: 42, backgroundColor: '#f8faff', borderRadius: 8, alignItems: 'center' },
  tableRow: { flexDirection: 'row', minHeight: 54, borderBottomWidth: 1, borderBottomColor: colors.line, alignItems: 'center' },
  tableRowInteractive: { cursor: 'pointer' },
  th: { width: 180, color: colors.muted, fontSize: 12, fontWeight: '900', paddingHorizontal: 12, textTransform: 'uppercase' },
  td: { width: 180, color: colors.navy, fontSize: 13, fontWeight: '700', paddingHorizontal: 12 },
  empty: { minHeight: 120, alignItems: 'center', justifyContent: 'center' },
  detailPanel: { borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 14 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  detailItem: { minWidth: 220, flexGrow: 1, borderRadius: 8, backgroundColor: '#f8faff', borderWidth: 1, borderColor: colors.line, padding: 12, gap: 4 },
  detailLabel: { color: colors.muted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  detailValue: { color: colors.navy, fontSize: 14, fontWeight: '800' },
  timeline: { gap: 8, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 },
  timelineItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timelineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.blue },
  timelineText: { color: colors.navy, fontSize: 13, fontWeight: '700' },
  subsection: { gap: 6, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 },
  subsectionTitle: { color: colors.navy, fontSize: 14, fontWeight: '900' },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionButton: { minHeight: 42, borderRadius: 8, borderWidth: 1, borderColor: colors.blue, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eaf2ff' },
  actionButtonDanger: { borderColor: '#fecdd3', backgroundColor: '#fff1f2' },
  actionButtonDisabled: { opacity: 0.45 },
  actionButtonText: { color: colors.blue, fontSize: 13, fontWeight: '900' },
  actionButtonDangerText: { color: colors.red },
  notesInput: { minHeight: 92, borderRadius: 8, borderWidth: 1, borderColor: colors.line, padding: 12, color: colors.navy, textAlignVertical: 'top' },
});
