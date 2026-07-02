import * as SecureStore from 'expo-secure-store';
import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import type { SelectedPlace } from '../maps/types';

const storageKey = 'rydo.passenger.savedPlaces';

export type SavedPlaceKind = 'home' | 'work' | 'favorite';

export type SavedPlace = {
  id: string;
  kind: SavedPlaceKind;
  label: string;
  place: SelectedPlace;
  createdAtUtc: string;
};

type SavedPlacesState = {
  loading: boolean;
  places: SavedPlace[];
  home?: SavedPlace;
  work?: SavedPlace;
  favorites: SavedPlace[];
  savePlace: (kind: SavedPlaceKind, place: SelectedPlace, label?: string) => Promise<void>;
  removePlace: (id: string) => Promise<void>;
};

const SavedPlacesContext = createContext<SavedPlacesState | null>(null);

export function SavedPlacesProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [places, setPlaces] = useState<SavedPlace[]>([]);

  useEffect(() => {
    let mounted = true;

    readPlaces()
      .then((stored) => {
        if (mounted) {
          setPlaces(stored);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const persistPlaces = useCallback(async (nextPlaces: SavedPlace[]) => {
    setPlaces(nextPlaces);
    await writePlaces(nextPlaces);
  }, []);

  const savePlace = useCallback(
    async (kind: SavedPlaceKind, place: SelectedPlace, label?: string) => {
      const savedPlace: SavedPlace = {
        id: kind === 'favorite' ? createSavedPlaceId() : kind,
        kind,
        label: label?.trim() || defaultLabel(kind, place),
        place,
        createdAtUtc: new Date().toISOString(),
      };

      const nextPlaces =
        kind === 'favorite'
          ? [savedPlace, ...places.filter((item) => item.place.placeId !== place.placeId || item.kind !== 'favorite')]
          : [savedPlace, ...places.filter((item) => item.kind !== kind)];

      await persistPlaces(nextPlaces);
    },
    [persistPlaces, places],
  );

  const removePlace = useCallback(
    async (id: string) => {
      await persistPlaces(places.filter((place) => place.id !== id));
    },
    [persistPlaces, places],
  );

  const value = useMemo<SavedPlacesState>(() => {
    const favorites = places.filter((place) => place.kind === 'favorite');

    return {
      loading,
      places,
      home: places.find((place) => place.kind === 'home'),
      work: places.find((place) => place.kind === 'work'),
      favorites,
      savePlace,
      removePlace,
    };
  }, [loading, places, removePlace, savePlace]);

  return <SavedPlacesContext.Provider value={value}>{children}</SavedPlacesContext.Provider>;
}

export function useSavedPlaces() {
  const context = useContext(SavedPlacesContext);
  if (!context) {
    throw new Error('useSavedPlaces must be used inside SavedPlacesProvider.');
  }

  return context;
}

async function readPlaces() {
  const stored = await readStorage();
  if (!stored) {
    return [];
  }

  try {
    return JSON.parse(stored) as SavedPlace[];
  } catch {
    return [];
  }
}

async function writePlaces(places: SavedPlace[]) {
  await writeStorage(JSON.stringify(places));
}

async function readStorage() {
  if (Platform.OS === 'web') {
    return window.localStorage.getItem(storageKey);
  }

  return SecureStore.getItemAsync(storageKey);
}

async function writeStorage(value: string) {
  if (Platform.OS === 'web') {
    window.localStorage.setItem(storageKey, value);
    return;
  }

  await SecureStore.setItemAsync(storageKey, value);
}

function defaultLabel(kind: SavedPlaceKind, place: SelectedPlace) {
  if (kind === 'home') {
    return 'Home';
  }

  if (kind === 'work') {
    return 'Work';
  }

  return place.name || 'Saved place';
}

function createSavedPlaceId() {
  return `favorite-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
