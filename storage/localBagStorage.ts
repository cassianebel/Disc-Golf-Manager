import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";

export type LocalDisc = Record<string, unknown> & {
  disc_id: string;
  photo_uri?: string;
};

const BAG_STORAGE_KEY = "@disc-golf-manager/bag-v1";
const PHOTO_DIRECTORY = new Directory(Paths.document, "disc-photos");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isLocalDisc(value: unknown): value is LocalDisc {
  return (
    isRecord(value) &&
    typeof value.disc_id === "string" &&
    (value.photo_uri === undefined || typeof value.photo_uri === "string")
  );
}

export async function loadLocalBag(): Promise<LocalDisc[]> {
  const storedBag = await AsyncStorage.getItem(BAG_STORAGE_KEY);
  if (storedBag === null) {
    return [];
  }

  let parsedBag: unknown;
  try {
    parsedBag = JSON.parse(storedBag);
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "The saved data is unreadable.";
    throw new Error(`Could not read the saved bag: ${detail}`);
  }

  if (!Array.isArray(parsedBag) || !parsedBag.every(isLocalDisc)) {
    throw new Error("The saved bag has an invalid format.");
  }
  return parsedBag;
}

export async function saveLocalBag(discs: LocalDisc[]): Promise<void> {
  await AsyncStorage.setItem(BAG_STORAGE_KEY, JSON.stringify(discs));
}

export async function saveDiscPhoto(
  sourceUri: string,
  discId: string,
): Promise<string> {
  if (!PHOTO_DIRECTORY.exists) {
    PHOTO_DIRECTORY.create();
  }

  const sourcePhoto = new File(sourceUri);
  if (!sourcePhoto.exists) {
    throw new Error("The captured photo is no longer available. Retake it and try again.");
  }

  const savedPhoto = new File(PHOTO_DIRECTORY, `${discId}.jpg`);
  await sourcePhoto.copy(savedPhoto);
  return savedPhoto.uri;
}

export function removeStoredPhoto(photoUri: string): void {
  const photo = new File(photoUri);
  if (photo.exists) {
    photo.delete();
  }
}
