import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Alert,
  StyleSheet,
  AppState,
  AppStateStatus,
  SafeAreaView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import FlightCard from '../components/FlightCard';
import { fetchFlights } from '../services/flightApi';
import { resolveNearestAirport, ResolvedAirport } from '../services/airportResolver';
import * as Location from 'expo-location';
import { Airport } from '../data/airports';
import { AdMobBanner } from 'expo-ads-admob';
import config from '../src/config';

const FLIGHTS_PER_PAGE = 50;

const TableHeader = () => (
  <View style={headerStyles.headerContainer}>
    <View style={headerStyles.headerRow}>
      <Text style={[headerStyles.headerCell, headerStyles.col0]} numberOfLines={1}>Flight</Text>
      <Text style={[headerStyles.headerCell, headerStyles.col1]} numberOfLines={1}>To</Text>
      <Text style={[headerStyles.headerCell, headerStyles.col2]} numberOfLines={1}>Time</Text>
      <Text style={[headerStyles.headerCell, headerStyles.col3]} numberOfLines={1}>Status</Text>
      <Text style={[headerStyles.headerCell, headerStyles.col4]} numberOfLines={1}>Gate</Text>
    </View>
  </View>
);

const headerStyles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#181818',
    borderRadius: 8,
    marginBottom: 8,
    marginTop: 8,
    marginHorizontal: 0,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  headerCell: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'VT323-Regular' : 'VT323_400Regular',
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  col0: { flex: 1, minWidth: 50 },
  col1: { flex: 2, minWidth: 60 },
  col2: { flex: 1, minWidth: 60 },
  col3: { flex: 2, minWidth: 70 },
  col4: { flex: 2, minWidth: 90 },
});

export default function HomeScreen() {
  const [locationDenied, setLocationDenied] = useState(false);
  const [userRejectedMock, setUserRejectedMock] = useState(false);
  const [flights, setFlights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [nearestAirport, setNearestAirport] = useState<Airport | null>(null);
  const [userConfirmed, setUserConfirmed] = useState(false);
  const [isMocked, setIsMocked] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const appState = useRef(AppState.currentState);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  function filterRecentFlights(flights: any[]) {
    const now = Math.floor(Date.now() / 1000);
    return flights.filter(flight => {
      const depTs = flight.dep_time_ts || 0;
      return depTs >= now - 1800;
    });
  }

  const fetchAndSetFlights = useCallback(async (isRefresh = false, newOffset = 0) => {
    if (!nearestAirport?.iata) return;
    if (isRefresh) setRefreshing(true);
    if (!isRefresh) setLoading(true);

    try {
      const data = await fetchFlights(nearestAirport.iata, FLIGHTS_PER_PAGE, newOffset);
      if (data && data.data) {
        const filtered = filterRecentFlights(data.data);
        if (isRefresh || newOffset === 0) {
          setFlights(filtered);
        } else {
          setFlights(prev => [...prev, ...filtered]);
        }
        setHasMore(filtered.length === FLIGHTS_PER_PAGE);
        setOffset(newOffset + FLIGHTS_PER_PAGE);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      setHasMore(false);
    }
    setLoading(false);
    setRefreshing(false);
  }, [nearestAirport]);

  // Peça permissão e busque localização só uma vez
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationDenied(true);
        setLoading(false);
        return;
      }
      setLocationDenied(false);
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      setLoading(false);
    })();
  }, []);

  // Resolve aeroporto
  useEffect(() => {
    if (!location?.coords) return;
    const result: ResolvedAirport = resolveNearestAirport(
      location.coords.latitude,
      location.coords.longitude
    );
    if (!result.airport) {
      setUserRejectedMock(true);
      setLoading(false);
      return;
    }
    setNearestAirport(result.airport);
    setIsMocked(result.isMock);
  }, [location]);

  useEffect(() => {
	if (nearestAirport && !userConfirmed && !userRejectedMock) {
	  if (isMocked) {
		// Só mostra prompt se for mock
		const msg = `Simulated location: ${nearestAirport.title} (${nearestAirport.iata})`;
		Alert.alert('Confirm location', msg, [
		  { text: 'Cancel', style: 'cancel', onPress: () => setUserRejectedMock(true) },
		  { text: 'Confirm', onPress: () => setUserConfirmed(true) },
		]);
	  } else {
		// Se for real, já confirma automático
		setUserConfirmed(true);
	  }
	}
  }, [nearestAirport, isMocked, userConfirmed, userRejectedMock]);
  

  // Busca voos depois da confirmação
  useEffect(() => {
    if (userConfirmed && nearestAirport?.iata) {
      fetchAndSetFlights(true, 0);
    }
  }, [userConfirmed, nearestAirport, fetchAndSetFlights]);

  // Auto-refresh a cada 5 min, só se userConfirmed
  useEffect(() => {
    if (!userConfirmed) return;

    const REFRESH_INTERVAL = 5 * 60 * 1000;

    const fetchAndUpdate = async () => {
      await fetchAndSetFlights(true, 0);
    };

    if (AppState.currentState === 'active' && !intervalRef.current) {
      intervalRef.current = setInterval(fetchAndUpdate, REFRESH_INTERVAL);
    }

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const isActive = nextAppState === 'active';
      if (isActive) {
        fetchAndUpdate();
        if (!intervalRef.current) {
          intervalRef.current = setInterval(fetchAndUpdate, REFRESH_INTERVAL);
        }
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [userConfirmed, fetchAndSetFlights]);

  const handleRefresh = () => {
    fetchAndSetFlights(true, 0);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchAndSetFlights(false, offset);
    }
  };

  // --- RENDER FLOW ---
  if (loading && !locationDenied) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (locationDenied) {
    return (
		<View style={[styles.center, { backgroundColor: '#23272F', flex: 1 }]}>
		<Text style={[styles.infoText, { color: '#fff' }]}>
		  Location permission is required to use this app.
		</Text>
		<TouchableOpacity
		  style={{
			backgroundColor: '#FFD700',
			padding: 16,
			borderRadius: 12,
			marginTop: 24
		  }}
		  onPress={async () => {
			setLoading(true);
			setLocationDenied(false);
			const { status } = await Location.requestForegroundPermissionsAsync();
			if (status !== 'granted') {
			  setLocationDenied(true);
			  setLoading(false);
			  return;
			}
			setLocationDenied(false);
			const loc = await Location.getCurrentPositionAsync({});
			setLocation(loc);
		  }}
		>
		  <Text style={{ color: '#23272F', fontWeight: 'bold', fontSize: 17 }}>
			Try Again
		  </Text>
		</TouchableOpacity>
	  </View>
	  
    );
  }

  if (userRejectedMock) {
	return (
	  <View style={[styles.center, { backgroundColor: '#23272F', flex: 1 }]}>
		<Text style={[styles.infoText, { color: '#fff' }]}>
		  This app only works inside an airport.
		</Text>
	  </View>
	);
  }

  if (!userConfirmed) {
	return (
	  <View style={[styles.center, { backgroundColor: '#23272F', flex: 1 }]}>
		<Text style={[styles.infoText, { color: '#fff' }]}>
		  Waiting for location confirmation...
		</Text>
	  </View>
	);
  }

  // Mostra o painel de voos
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Text style={styles.airportName} numberOfLines={1} ellipsizeMode="tail">
          {nearestAirport ? `${nearestAirport.title}` : ''}
        </Text>
      </View>
      <FlatList
        data={flights}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => <FlightCard flight={item} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={<TableHeader />}
        ListFooterComponent={hasMore ? <ActivityIndicator style={{ marginVertical: 16 }} /> : null}
      />
	  // Adicione logo acima do fechamento do SafeAreaView na HomeScreen
<View style={{
  width: '100%',
  height: 64,
  backgroundColor: '#333',
  justifyContent: 'center',
  alignItems: 'center',
  position: 'absolute',
  bottom: 0,
  left: 0,
  zIndex: 10
}}>
  <AdMobBanner
  bannerSize="smartBannerPortrait"
  adUnitID={
	config.mockMode
	  ? config.admobBannerTest
	  : Platform.OS === 'ios'
		? config.iosBannerAdId
		: config.androidBannerAdId
  }
  servePersonalizedAds={config.isProduction}
  onDidFailToReceiveAdWithError={error => console.log(error)}
/>
</View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#23272F',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#F5F7FA',
  },
  infoText: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 24,
    color: '#F5F7FA',
  },
  topBar: {
    width: '100%',
    backgroundColor: '#11151c',
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomColor: '#FFD70044',
    borderBottomWidth: 1,
    marginBottom: 2,
    zIndex: 2,
  },
  airportName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'VT323-Regular' : 'VT323_400Regular',
    letterSpacing: 1,
  },
});
