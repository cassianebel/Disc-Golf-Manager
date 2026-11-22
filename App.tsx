import { CameraView, useCameraPermissions } from "expo-camera";
import { recognizeText } from "expo-ocr-kit";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useRef, useState, type ElementRef } from "react";
import {
  loadLocalBag,
  removeStoredPhoto,
  saveDiscPhoto,
  saveLocalBag,
  type LocalDisc,
} from "./storage/localBagStorage";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type CameraScreenProps = {
  onCancel: () => void;
  onPhotoCaptured: (uri: string) => void;
  onTextRecognized: (text: string) => void;
};

type CatalogSearchResponse = {
  matches: Record<string, unknown>[];
  attribution: string;
};

type EditableDiscField = {
  path: string;
  name: string;
  label: string;
  originalValue: unknown;
};

type DiscFormRow =
  | { kind: "field"; field: EditableDiscField }
  | { kind: "flight-numbers"; fields: EditableDiscField[] };

const EDITABLE_DISC_FIELDS = new Set([
  "brand",
  "name",
  "type",
  "speed",
  "glide",
  "turn",
  "fade",
  "notes",
]);
const FLIGHT_NUMBER_FIELDS = new Set(["speed", "glide", "turn", "fade"]);
const NUMERIC_DISC_FIELDS = new Set([
  "speed",
  "glide",
  "turn",
  "fade",
  "stability",
]);

function isNumericDiscField(field: EditableDiscField): boolean {
  return (
    typeof field.originalValue === "number" ||
    NUMERIC_DISC_FIELDS.has(field.name) ||
    field.name.endsWith("_cm") ||
    field.name.endsWith("_ratio") ||
    field.name === "rim_configuration"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatFieldLabel(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isEditableDiscField(name: string): boolean {
  return EDITABLE_DISC_FIELDS.has(name.toLowerCase());
}

function getEditableDiscFields(
  disc: Record<string, unknown>,
): EditableDiscField[] {
  const fields = Object.entries(disc)
    .filter(([key]) => isEditableDiscField(key))
    .map(([key, value]) => ({
      path: key,
      name: key,
      label: formatFieldLabel(key),
      originalValue: value,
    }));
  if (!fields.some((field) => field.name.toLowerCase() === "notes")) {
    fields.push({
      path: "notes",
      name: "notes",
      label: "Notes",
      originalValue: "",
    });
  }
  return fields;
}

function getDiscFormRows(fields: EditableDiscField[]): DiscFormRow[] {
  const flightFields = fields.filter((field) =>
    FLIGHT_NUMBER_FIELDS.has(field.name),
  );
  const rows: DiscFormRow[] = [];
  let flightRowAdded = false;

  for (const field of fields) {
    if (FLIGHT_NUMBER_FIELDS.has(field.name)) {
      if (!flightRowAdded) {
        rows.push({ kind: "flight-numbers", fields: flightFields });
        flightRowAdded = true;
      }
    } else {
      rows.push({ kind: "field", field });
    }
  }

  return rows;
}

function toDiscFormValues(
  disc: Record<string, unknown>,
): Record<string, string> {
  return Object.fromEntries(
    getEditableDiscFields(disc).map((field) => [
      field.path,
      field.originalValue == null
        ? ""
        : typeof field.originalValue === "string"
          ? field.originalValue
          : String(field.originalValue),
    ]),
  );
}

function parseDiscFormValue(field: EditableDiscField, value: string): unknown {
  const trimmedValue = value.trim();
  if (typeof field.originalValue === "boolean") {
    if (trimmedValue.toLowerCase() === "true") {
      return true;
    }
    if (trimmedValue.toLowerCase() === "false") {
      return false;
    }
    throw new Error(`${field.label} must be true or false.`);
  }

  if (isNumericDiscField(field)) {
    if (!trimmedValue) {
      return null;
    }
    const numberValue = Number(trimmedValue);
    if (!Number.isFinite(numberValue)) {
      throw new Error(`${field.label} must be a number.`);
    }
    return numberValue;
  }

  return value;
}

function buildEditedDiscRecord(
  disc: Record<string, unknown>,
  values: Record<string, string>,
): Record<string, unknown> {
  const editedDisc = Object.fromEntries(
    Object.entries(disc).map(([key, value]) => {
      if (!isEditableDiscField(key)) {
        return [key, value];
      }
      const field: EditableDiscField = {
        path: key,
        name: key,
        label: formatFieldLabel(key),
        originalValue: value,
      };
      return [key, parseDiscFormValue(field, values[field.path] ?? "")];
    }),
  );
  if (!Object.keys(disc).some((key) => key.toLowerCase() === "notes")) {
    editedDisc.notes = values.notes ?? "";
  }
  return editedDisc;
}

type DiscFormInputProps = {
  field: EditableDiscField;
  value: string;
  compact?: boolean;
  onChangeText: (value: string) => void;
  onInputBlur?: (input: ElementRef<typeof TextInput>) => void;
  onInputFocus?: (input: ElementRef<typeof TextInput>) => void;
};

function DiscFormInput({
  field,
  value,
  compact = false,
  onChangeText,
  onInputBlur,
  onInputFocus,
}: DiscFormInputProps) {
  const isNotesField = field.name.toLowerCase() === "notes";
  const inputRef = useRef<ElementRef<typeof TextInput>>(null);
  return (
    <View style={[styles.formField, compact && styles.flightNumberField]}>
      <Text style={styles.formLabel}>{field.label}</Text>
      <TextInput
        accessibilityLabel={field.label}
        onBlur={() => {
          if (inputRef.current) {
            onInputBlur?.(inputRef.current);
          }
        }}
        keyboardType={
          isNumericDiscField(field)
            ? Platform.OS === "ios"
              ? "numbers-and-punctuation"
              : "numeric"
            : "default"
        }
        multiline={isNotesField}
        onChangeText={onChangeText}
        onFocus={() => {
          if (inputRef.current) {
            onInputFocus?.(inputRef.current);
          }
        }}
        numberOfLines={isNotesField ? 4 : 1}
        placeholder={field.label}
        placeholderTextColor="#829087"
        style={[
          styles.formInput,
          compact && styles.flightNumberInput,
          isNotesField && styles.notesInput,
        ]}
        textAlignVertical={isNotesField ? "top" : "center"}
        value={value}
        ref={inputRef}
      />
    </View>
  );
}

function CameraScreen({
  onCancel,
  onPhotoCaptured,
  onTextRecognized,
}: CameraScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [isRecognizingText, setIsRecognizingText] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function askCameraPermission() {
    try {
      await requestPermission();
    } catch {
      setError("We couldn't request camera access. Please try again.");
    }
  }

  async function takePhoto() {
    if (!cameraReady || isTakingPhoto) {
      return;
    }

    setError(null);
    setIsTakingPhoto(true);

    try {
      const photo = await cameraRef.current?.takePictureAsync({
        quality: 0.85,
      });
      if (!photo) {
        setError("The camera isn't ready yet. Please try again.");
        return;
      }

      setCameraReady(false);
      setPhotoUri(photo.uri);
      onPhotoCaptured(photo.uri);
    } catch {
      setError("We couldn't take the photo. Please try again.");
    } finally {
      setIsTakingPhoto(false);
    }
  }

  async function finishAddingDisc() {
    if (!photoUri || isRecognizingText) {
      return;
    }

    setError(null);
    setIsRecognizingText(true);

    try {
      const result = await recognizeText(photoUri);
      setIsRecognizingText(false);
      onTextRecognized(result.text.trim());
      onCancel();
    } catch {
      setIsRecognizingText(false);
      setError(
        "We couldn't read text from this photo. Try again or retake it.",
      );
    }
  }

  if (!permission) {
    return (
      <SafeAreaView style={styles.centeredScreen}>
        <ActivityIndicator color="#1f6b49" />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    const openSettings = () => {
      void Linking.openSettings().catch(() => {
        setError(
          "Couldn't open settings. Enable camera access in your device settings.",
        );
      });
    };

    return (
      <SafeAreaView style={styles.centeredScreen}>
        <StatusBar style="dark" />
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionText}>
          Allow camera access to take a photo of your disc.
        </Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {permission.canAskAgain ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void askCameraPermission()}
            style={[styles.primaryButton, styles.permissionButton]}
          >
            <Text style={styles.primaryButtonText}>Allow camera</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={openSettings}
            style={[styles.primaryButton, styles.permissionButton]}
          >
            <Text style={styles.primaryButtonText}>Open settings</Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={onCancel}
          style={styles.textButton}
        >
          <Text style={styles.textButtonLabel}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel adding a disc"
          onPress={onCancel}
          style={styles.backButton}
        >
          <Text style={styles.backButtonLabel}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Add a disc</Text>
        <View style={styles.headerSpacer} />
      </View>

      <Text style={styles.cameraHint}>
        {photoUri ? "Here's your disc photo" : "Place your disc in the frame"}
      </Text>

      <View style={styles.cameraFrame}>
        {photoUri ? (
          <Image
            source={{ uri: photoUri }}
            style={styles.camera}
            resizeMode="cover"
          />
        ) : (
          <>
            <CameraView
              ref={cameraRef}
              facing="back"
              onCameraReady={() => setCameraReady(true)}
              style={styles.camera}
            />
            {!cameraReady ? (
              <View style={styles.cameraLoading}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.cameraLoadingText}>Starting camera…</Text>
              </View>
            ) : null}
          </>
        )}
      </View>

      {error ? (
        <Text accessibilityRole="alert" style={styles.errorText}>
          {error}
        </Text>
      ) : null}

      {photoUri ? (
        <View style={styles.photoActions}>
          <Pressable
            accessibilityRole="button"
            disabled={isRecognizingText}
            onPress={() => {
              setPhotoUri(null);
              setError(null);
            }}
            style={[
              styles.secondaryButton,
              isRecognizingText && styles.disabledButton,
            ]}
          >
            <Text style={styles.secondaryButtonText}>Retake photo</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={isRecognizingText}
            onPress={() => void finishAddingDisc()}
            style={[
              styles.primaryButton,
              isRecognizingText && styles.disabledButton,
            ]}
          >
            {isRecognizingText ? (
              <View style={styles.buttonProgress}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.primaryButtonText}>Reading text…</Text>
              </View>
            ) : (
              <Text style={styles.primaryButtonText}>Done</Text>
            )}
          </Pressable>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Take disc photo"
          disabled={!cameraReady || isTakingPhoto}
          onPress={() => void takePhoto()}
          style={({ pressed }) => [
            styles.shutterButton,
            (!cameraReady || isTakingPhoto) && styles.disabledButton,
            pressed && cameraReady && styles.pressedButton,
          ]}
        >
          <View style={styles.shutterInner} />
        </Pressable>
      )}
    </SafeAreaView>
  );
}

export default function App() {
  const scrollViewRef = useRef<ElementRef<typeof ScrollView>>(null);
  const searchInputRef = useRef<ElementRef<typeof TextInput>>(null);
  const focusedTextInputRef = useRef<ElementRef<typeof TextInput> | null>(null);
  const scrollOffset = useRef(0);
  const ignoreFocusSelectAll = useRef(false);
  const [showCamera, setShowCamera] = useState(false);
  const [lastPhotoUri, setLastPhotoUri] = useState<string | null>(null);
  const [recognizedWords, setRecognizedWords] = useState<string[]>([]);
  const [selectedWords, setSelectedWords] = useState<boolean[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchReady, setSearchReady] = useState(false);
  const [querySelection, setQuerySelection] = useState<
    { start: number; end: number } | undefined
  >(undefined);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [catalogResults, setCatalogResults] =
    useState<CatalogSearchResponse | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [discFormValues, setDiscFormValues] = useState<Record<string, string>>(
    {},
  );
  const [isSavingDisc, setIsSavingDisc] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [bagDiscs, setBagDiscs] = useState<LocalDisc[]>([]);
  const [isBagLoading, setIsBagLoading] = useState(true);
  const [bagLoadError, setBagLoadError] = useState<string | null>(null);
  const [lastAddedDisc, setLastAddedDisc] = useState<LocalDisc | null>(null);
  const [deletingDiscId, setDeletingDiscId] = useState<string | null>(null);

  useEffect(() => {
    const subscription = Keyboard.addListener("keyboardDidShow", (event) => {
      const focusedInput = focusedTextInputRef.current;
      if (!focusedInput) {
        return;
      }

      requestAnimationFrame(() => {
        if (focusedTextInputRef.current !== focusedInput) {
          return;
        }
        focusedInput.measureInWindow((_x, y, _width, height) => {
          const keyboardTop = event.endCoordinates.screenY;
          const obscuredAmount = y + height + 16 - keyboardTop;
          if (obscuredAmount > 0) {
            scrollViewRef.current?.scrollTo({
              y: scrollOffset.current + obscuredAmount,
              animated: true,
            });
          }
        });
      });
    });

    return () => subscription.remove();
  }, []);

  function handleTextInputFocus(input: ElementRef<typeof TextInput>) {
    focusedTextInputRef.current = input;
  }

  function handleTextInputBlur(input: ElementRef<typeof TextInput>) {
    if (focusedTextInputRef.current === input) {
      focusedTextInputRef.current = null;
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function initializeBag() {
      try {
        const savedDiscs = await loadLocalBag();
        if (isMounted) {
          setBagDiscs(savedDiscs);
        }
      } catch (error) {
        if (isMounted) {
          setBagLoadError(
            error instanceof Error
              ? error.message
              : "Could not load the saved bag.",
          );
        }
      } finally {
        if (isMounted) {
          setIsBagLoading(false);
        }
      }
    }

    void initializeBag();
    return () => {
      isMounted = false;
    };
  }, []);

  function handleTextRecognized(text: string) {
    const words = text.trim() ? text.trim().split(/\s+/) : [];
    setRecognizedWords(words);
    setSelectedWords(words.map(() => false));
    setSearchQuery("");
    setSearchReady(true);
    setSearchError(null);
    setCatalogResults(null);
    setSelectedMatch(null);
    setSaveError(null);
  }

  function toggleRecognizedWord(index: number) {
    setSelectedWords((currentSelection) => {
      const nextSelection = currentSelection.map((selected, wordIndex) =>
        wordIndex === index ? !selected : selected,
      );
      setSearchQuery(
        recognizedWords
          .filter((_, wordIndex) => nextSelection[wordIndex])
          .join(" "),
      );
      setSearchError(null);
      setCatalogResults(null);
      setSelectedMatch(null);
      setSaveError(null);
      return nextSelection;
    });
  }

  function cancelSearch() {
    Keyboard.dismiss();
    searchInputRef.current?.blur();
    if (searchInputRef.current) {
      handleTextInputBlur(searchInputRef.current);
    }
    ignoreFocusSelectAll.current = false;
    setSelectedMatch(null);
    setSearchReady(false);
  }

  function selectCatalogMatch(match: Record<string, unknown>) {
    Keyboard.dismiss();
    searchInputRef.current?.blur();
    if (searchInputRef.current) {
      handleTextInputBlur(searchInputRef.current);
    }
    ignoreFocusSelectAll.current = false;
    setSelectedMatch(match);
    setDiscFormValues(toDiscFormValues(match));
    setSaveError(null);
  }

  async function submitCatalogSearch() {
    const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
    if (!apiBaseUrl) {
      setSearchError(
        "The catalog server URL is not configured. Set EXPO_PUBLIC_API_BASE_URL and restart the app.",
      );
      return;
    }

    if (!searchQuery.trim()) {
      setSearchError("Select or enter at least one search term.");
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setCatalogResults(null);

    try {
      const baseUrl = apiBaseUrl.replace(/\/+$/, "");
      const response = await fetch(
        `${baseUrl}/catalog/discs?q=${encodeURIComponent(searchQuery)}`,
      );
      const responseBody: unknown = await response.json();

      if (!response.ok) {
        const detail =
          typeof responseBody === "object" &&
          responseBody !== null &&
          "detail" in responseBody &&
          typeof responseBody.detail === "string"
            ? responseBody.detail
            : `Catalog search failed with HTTP ${response.status}.`;
        throw new Error(detail);
      }

      if (
        typeof responseBody !== "object" ||
        responseBody === null ||
        !("matches" in responseBody) ||
        !Array.isArray(responseBody.matches) ||
        !responseBody.matches.every(isRecord) ||
        !("attribution" in responseBody) ||
        typeof responseBody.attribution !== "string"
      ) {
        throw new Error("The catalog server returned an invalid response.");
      }

      setCatalogResults({
        matches: responseBody.matches,
        attribution: responseBody.attribution,
      });
    } catch (error) {
      setSearchError(
        error instanceof Error
          ? error.message
          : "Catalog search failed. Check your connection and try again.",
      );
    } finally {
      setIsSearching(false);
    }
  }

  async function submitDiscToBag() {
    if (!selectedMatch) {
      setSaveError("Select a catalog match before adding a disc.");
      return;
    }
    if (!lastPhotoUri) {
      setSaveError(
        "The captured photo is missing. Retake it before adding the disc.",
      );
      return;
    }
    if (isBagLoading || bagLoadError) {
      setSaveError(
        "The saved bag could not be loaded, so this disc cannot be saved safely.",
      );
      return;
    }

    let discRecord: Record<string, unknown>;
    try {
      discRecord = buildEditedDiscRecord(selectedMatch, discFormValues);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Check the disc details.",
      );
      return;
    }
    setIsSavingDisc(true);
    setSaveError(null);
    Keyboard.dismiss();

    try {
      const discId = `disc-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const savedPhotoUri = await saveDiscPhoto(lastPhotoUri, discId);
      const savedDisc: LocalDisc = {
        ...discRecord,
        disc_id: discId,
        photo_uri: savedPhotoUri,
      };
      const nextBag = [savedDisc, ...bagDiscs];

      try {
        await saveLocalBag(nextBag);
      } catch (error) {
        try {
          removeStoredPhoto(savedPhotoUri);
        } catch (cleanupError) {
          console.error(
            "Could not remove the unsaved disc photo.",
            cleanupError,
          );
        }
        throw error;
      }

      setBagDiscs(nextBag);
      setLastAddedDisc(savedDisc);
      setSelectedMatch(null);
      setDiscFormValues({});
      setCatalogResults(null);
      setRecognizedWords([]);
      setSelectedWords([]);
      setLastPhotoUri(null);
      setSearchQuery("");
      setSearchReady(false);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Could not add the disc. Try again.",
      );
    } finally {
      setIsSavingDisc(false);
    }
  }

  function confirmDeleteDisc(disc: LocalDisc, discName: string) {
    Alert.alert(
      "Delete disc?",
      `Remove ${discName} and its saved photo from your bag?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void deleteDiscFromBag(disc),
        },
      ],
    );
  }

  async function deleteDiscFromBag(disc: LocalDisc) {
    if (isBagLoading || bagLoadError || deletingDiscId !== null) {
      return;
    }

    setDeletingDiscId(disc.disc_id);
    try {
      const nextBag = bagDiscs.filter(
        (bagDisc) => bagDisc.disc_id !== disc.disc_id,
      );
      await saveLocalBag(nextBag);
      setBagDiscs(nextBag);

      if (lastAddedDisc?.disc_id === disc.disc_id) {
        setLastAddedDisc(null);
      }

      if (typeof disc.photo_uri === "string") {
        try {
          removeStoredPhoto(disc.photo_uri);
        } catch (error) {
          Alert.alert(
            "Disc deleted, but photo cleanup failed",
            error instanceof Error
              ? error.message
              : "The saved photo could not be removed.",
          );
        }
      }
    } catch (error) {
      Alert.alert(
        "Couldn't delete disc",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setDeletingDiscId(null);
    }
  }

  if (showCamera) {
    return (
      <CameraScreen
        onCancel={() => setShowCamera(false)}
        onPhotoCaptured={(uri) => {
          setLastPhotoUri(uri);
          setRecognizedWords([]);
          setSelectedWords([]);
          setSearchQuery("");
          setSearchReady(false);
          setSearchError(null);
          setCatalogResults(null);
          setSelectedMatch(null);
          setDiscFormValues({});
          setSaveError(null);
        }}
        onTextRecognized={handleTextRecognized}
      />
    );
  }

  return (
    <SafeAreaView style={styles.homeScreen}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.homeScrollContent}
          keyboardShouldPersistTaps="handled"
          onScroll={(event) => {
            scrollOffset.current = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          ref={scrollViewRef}
        >
          <View style={styles.homeContent}>
            {searchReady ? (
              <>
                <View style={styles.searchHeader}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={cancelSearch}
                    style={styles.backButton}
                  >
                    <Text style={styles.backButtonLabel}>Cancel</Text>
                  </Pressable>
                </View>
                {lastPhotoUri ? (
                  <Image
                    accessibilityLabel="Photo of the disc being searched"
                    source={{ uri: lastPhotoUri }}
                    resizeMode="contain"
                    style={styles.searchPhoto}
                  />
                ) : null}
                <View style={selectedMatch ? styles.hidden : styles.queryCard}>
                  <Text style={styles.queryTitle}>Choose Search Terms</Text>
                  {recognizedWords.length > 0 ? (
                    <>
                      <Text style={styles.queryInstructions}>
                        Words start unselected. Toggling a word rebuilds the
                        query and replaces any manual edits.
                      </Text>
                      <View style={styles.wordList}>
                        {recognizedWords.map((word, index) => {
                          const selected = selectedWords[index] ?? false;
                          return (
                            <Pressable
                              key={`${index}-${word}`}
                              accessibilityRole="button"
                              accessibilityLabel={`${word}, ${selected ? "selected" : "not selected"}`}
                              accessibilityState={{ selected }}
                              onPress={() => toggleRecognizedWord(index)}
                              style={[
                                styles.wordChip,
                                selected && styles.wordChipSelected,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.wordChipText,
                                  selected && styles.wordChipTextSelected,
                                ]}
                              >
                                {word}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </>
                  ) : (
                    <Text style={styles.queryInstructions}>
                      No words were recognized. Enter search terms manually.
                    </Text>
                  )}
                  <Text style={styles.queryLabel}>Finalize Search Terms</Text>
                  <Text style={styles.queryInstructions}>
                    Edit any misspelled words or add words to your search terms
                    as needed.
                  </Text>
                  <TextInput
                    accessibilityLabel="Edit TryDiscs search terms"
                    onChangeText={(text) => {
                      setSearchQuery(text);
                      setSearchError(null);
                      setCatalogResults(null);
                      setSelectedMatch(null);
                      setSaveError(null);
                    }}
                    onBlur={() => {
                      if (searchInputRef.current) {
                        handleTextInputBlur(searchInputRef.current);
                      }
                      ignoreFocusSelectAll.current = false;
                    }}
                    onFocus={() => {
                      if (searchInputRef.current) {
                        handleTextInputFocus(searchInputRef.current);
                      }
                      ignoreFocusSelectAll.current = true;
                      const end = searchQuery.length;
                      setQuerySelection({ start: end, end });
                    }}
                    onSelectionChange={(event) => {
                      const selection = event.nativeEvent.selection;
                      if (
                        ignoreFocusSelectAll.current &&
                        selection.start === 0 &&
                        selection.end === searchQuery.length &&
                        searchQuery.length > 0
                      ) {
                        return;
                      }
                      ignoreFocusSelectAll.current = false;
                      setQuerySelection(selection);
                    }}
                    placeholder="Select words or enter search text"
                    placeholderTextColor="#829087"
                    ref={searchInputRef}
                    selectTextOnFocus={false}
                    selection={querySelection}
                    style={styles.queryInput}
                    value={searchQuery}
                  />
                  {searchError ? (
                    <Text accessibilityRole="alert" style={styles.errorText}>
                      {searchError}
                    </Text>
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    disabled={isSearching}
                    onPress={() => void submitCatalogSearch()}
                    style={({ pressed }) => [
                      styles.addButton,
                      isSearching && styles.disabledButton,
                      pressed && !isSearching && styles.pressedButton,
                    ]}
                  >
                    {isSearching ? (
                      <View style={styles.buttonProgress}>
                        <ActivityIndicator color="#fff" size="small" />
                        <Text style={styles.addButtonLabel}>Searching…</Text>
                      </View>
                    ) : (
                      <Text style={styles.addButtonLabel}>Submit Search</Text>
                    )}
                  </Pressable>
                </View>
                {selectedMatch ? (
                  <View style={styles.formCard}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        setSelectedMatch(null);
                        setSaveError(null);
                      }}
                      style={styles.backButton}
                    >
                      <Text style={styles.backButtonLabel}>
                        Back to matches
                      </Text>
                    </Pressable>
                    <Text style={styles.queryTitle}>Review Disc Details</Text>
                    <Text style={styles.queryInstructions}>
                      Edit the catalog details before adding this disc to your
                      bag.
                    </Text>
                    {getDiscFormRows(getEditableDiscFields(selectedMatch)).map(
                      (row) => {
                        if (row.kind === "flight-numbers") {
                          return (
                            <View
                              key="flight-numbers"
                              style={styles.flightNumberRow}
                            >
                              {row.fields.map((field) => (
                                <DiscFormInput
                                  key={field.path}
                                  compact
                                  field={field}
                                  onChangeText={(value) => {
                                    setDiscFormValues((currentValues) => ({
                                      ...currentValues,
                                      [field.path]: value,
                                    }));
                                    setSaveError(null);
                                  }}
                                  onInputBlur={handleTextInputBlur}
                                  onInputFocus={handleTextInputFocus}
                                  value={discFormValues[field.path] ?? ""}
                                />
                              ))}
                            </View>
                          );
                        }

                        const { field } = row;
                        return (
                          <DiscFormInput
                            key={field.path}
                            field={field}
                            onChangeText={(value) => {
                              setDiscFormValues((currentValues) => ({
                                ...currentValues,
                                [field.path]: value,
                              }));
                              setSaveError(null);
                            }}
                            onInputBlur={handleTextInputBlur}
                            onInputFocus={handleTextInputFocus}
                            value={discFormValues[field.path] ?? ""}
                          />
                        );
                      },
                    )}
                    {saveError ? (
                      <Text accessibilityRole="alert" style={styles.errorText}>
                        {saveError}
                      </Text>
                    ) : null}
                    {bagLoadError ? (
                      <Text accessibilityRole="alert" style={styles.errorText}>
                        Your saved bag could not be loaded, so this disc cannot
                        be saved without risking existing data.
                      </Text>
                    ) : null}
                    <Pressable
                      accessibilityRole="button"
                      disabled={
                        isSavingDisc || isBagLoading || Boolean(bagLoadError)
                      }
                      onPress={() => void submitDiscToBag()}
                      style={({ pressed }) => [
                        styles.addButton,
                        styles.formSubmitButton,
                        (isSavingDisc || isBagLoading || bagLoadError) &&
                          styles.disabledButton,
                        pressed &&
                          !isSavingDisc &&
                          !isBagLoading &&
                          !bagLoadError &&
                          styles.pressedButton,
                      ]}
                    >
                      {isSavingDisc || isBagLoading ? (
                        <View style={styles.buttonProgress}>
                          <ActivityIndicator color="#fff" size="small" />
                          <Text style={styles.addButtonLabel}>
                            {isSavingDisc ? "Saving…" : "Loading bag…"}
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.addButtonLabel}>Add to bag</Text>
                      )}
                    </Pressable>
                    {catalogResults ? (
                      <Text style={styles.attribution}>
                        {catalogResults.attribution}
                      </Text>
                    ) : null}
                  </View>
                ) : catalogResults ? (
                  <View style={styles.resultsCard}>
                    <Text style={styles.queryTitle}>Possible Matches</Text>
                    {catalogResults.matches.length > 0 ? (
                      <Text style={styles.queryInstructions}>
                        Tap a disc to review and edit its details.
                      </Text>
                    ) : null}
                    {catalogResults.matches.length > 0 ? (
                      catalogResults.matches.map((match, index) => (
                        <Pressable
                          key={
                            typeof match.slug === "string"
                              ? match.slug
                              : `match-${index}`
                          }
                          accessibilityRole="button"
                          accessibilityLabel={`Select ${[
                            match.brand,
                            match.name,
                          ]
                            .filter(
                              (value): value is string =>
                                typeof value === "string",
                            )
                            .join(" ")}`}
                          accessibilityHint="Opens this match so you can review and edit its details."
                          onPress={() => selectCatalogMatch(match)}
                          style={({ pressed }) => [
                            styles.resultItem,
                            pressed && styles.resultItemPressed,
                          ]}
                        >
                          <View style={styles.resultItemContent}>
                            <Text style={styles.resultName}>
                              {[match.brand, match.name]
                                .filter(
                                  (value): value is string =>
                                    typeof value === "string",
                                )
                                .join(" ")}
                            </Text>
                            {typeof match.type === "string" ? (
                              <Text style={styles.resultDetails}>
                                {match.type}
                              </Text>
                            ) : null}
                          </View>
                          <View style={styles.resultAction}>
                            <Text style={styles.resultActionLabel}>Select</Text>
                          </View>
                        </Pressable>
                      ))
                    ) : (
                      <Text style={styles.queryInstructions}>
                        No matches found. Edit the search terms and try again.
                      </Text>
                    )}
                    <Text style={styles.attribution}>
                      {catalogResults.attribution}
                    </Text>
                  </View>
                ) : null}
              </>
            ) : (
              <>
                <View style={styles.brandMark}>
                  <Text style={styles.brandMarkText}>DG</Text>
                </View>
                <Text style={styles.eyebrow}>YOUR DISC GOLF COLLECTION</Text>
                <Text style={styles.title}>
                  Keep your discs{"\n"}in the loop.
                </Text>
                <Text style={styles.subtitle}>
                  {bagDiscs.length > 0
                    ? `${bagDiscs.length} ${bagDiscs.length === 1 ? "disc" : "discs"} in your bag.`
                    : "Add a disc to start building your collection."}
                </Text>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => setShowCamera(true)}
                  style={({ pressed }) => [
                    styles.addButton,
                    pressed && styles.pressedButton,
                  ]}
                >
                  <Text style={styles.addButtonLabel}>+ add disc</Text>
                </Pressable>
                {lastAddedDisc ? (
                  <View style={styles.savedDiscCard}>
                    <Text style={styles.savedDiscTitle}>
                      Disc added to your bag
                    </Text>
                    <Text style={styles.savedDiscName}>
                      {[lastAddedDisc.brand, lastAddedDisc.name]
                        .filter(
                          (value): value is string => typeof value === "string",
                        )
                        .join(" ") || "Disc"}
                    </Text>
                  </View>
                ) : null}
                {isBagLoading ? (
                  <View style={styles.bagLoading}>
                    <ActivityIndicator color="#1f6b49" />
                    <Text style={styles.bagLoadingText}>Loading your bag…</Text>
                  </View>
                ) : null}
                {bagLoadError ? (
                  <Text accessibilityRole="alert" style={styles.errorText}>
                    Could not load your saved bag: {bagLoadError}
                  </Text>
                ) : null}
                {bagDiscs.length > 0 ? (
                  <View style={styles.bagDiscList}>
                    <Text style={styles.queryTitle}>Your Bag</Text>
                    {bagDiscs.map((disc) => {
                      const discName =
                        [disc.brand, disc.name]
                          .filter(
                            (value): value is string =>
                              typeof value === "string",
                          )
                          .join(" ") || "Disc";
                      const flightNumbers = [
                        "speed",
                        "glide",
                        "turn",
                        "fade",
                      ].flatMap((field) => {
                        const value = disc[field];
                        return typeof value === "number" ||
                          typeof value === "string"
                          ? [{ field, value: String(value) }]
                          : [];
                      });

                      return (
                        <View key={disc.disc_id} style={styles.bagDiscCard}>
                          {typeof disc.photo_uri === "string" ? (
                            <Image
                              accessibilityLabel={`Photo of ${discName}`}
                              source={{ uri: disc.photo_uri }}
                              resizeMode="cover"
                              style={styles.bagDiscImage}
                            />
                          ) : (
                            <View style={styles.bagDiscImagePlaceholder} />
                          )}
                          <View style={styles.bagDiscContent}>
                            <Text style={styles.bagDiscName}>{discName}</Text>
                            {typeof disc.type === "string" ? (
                              <Text style={styles.bagDiscDetails}>
                                {disc.type}
                              </Text>
                            ) : null}
                            {flightNumbers.length > 0 ? (
                              <View style={styles.bagFlightNumberRow}>
                                {flightNumbers.map(({ field, value }) => (
                                  <View
                                    key={field}
                                    style={styles.bagFlightNumber}
                                  >
                                    <Text style={styles.bagFlightNumberText}>
                                      {value}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            ) : null}
                            {typeof disc.notes === "string" &&
                            disc.notes.trim() ? (
                              <Text
                                numberOfLines={2}
                                style={styles.bagDiscNotes}
                              >
                                {disc.notes}
                              </Text>
                            ) : null}
                          </View>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Delete ${discName} from bag`}
                            accessibilityState={{
                              disabled: deletingDiscId !== null,
                            }}
                            disabled={deletingDiscId !== null}
                            onPress={() => confirmDeleteDisc(disc, discName)}
                            style={({ pressed }) => [
                              styles.deleteDiscButton,
                              pressed &&
                                deletingDiscId === null &&
                                styles.pressedButton,
                            ]}
                          >
                            {deletingDiscId === disc.disc_id ? (
                              <ActivityIndicator color="#a33a32" size="small" />
                            ) : (
                              <Text style={styles.deleteDiscButtonText}>
                                Delete
                              </Text>
                            )}
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f7f8f3",
  },
  homeScreen: {
    flex: 1,
    backgroundColor: "#f7f8f3",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  homeScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  homeContent: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  searchHeader: {
    minHeight: 48,
    justifyContent: "center",
  },
  searchPhoto: {
    width: "100%",
    height: 220,
    borderRadius: 16,
    backgroundColor: "#e5ebe4",
  },
  brandMark: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1f6b49",
    marginBottom: 32,
  },
  brandMarkText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  eyebrow: {
    color: "#52715f",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
    marginBottom: 12,
  },
  title: {
    color: "#183528",
    fontSize: 38,
    fontWeight: "800",
    letterSpacing: -1.2,
    lineHeight: 44,
  },
  subtitle: {
    color: "#64746a",
    fontSize: 16,
    lineHeight: 24,
    marginTop: 14,
    marginBottom: 28,
  },
  addButton: {
    minHeight: 58,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#1f6b49",
  },
  formSubmitButton: {
    marginTop: 16,
  },
  addButtonLabel: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  latestPhotoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 24,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#fff",
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#e5ebe4",
  },
  latestPhotoContent: {
    flex: 1,
  },
  latestPhotoTitle: {
    color: "#183528",
    fontSize: 15,
    fontWeight: "700",
  },
  latestPhotoSubtitle: {
    color: "#64746a",
    fontSize: 13,
    marginTop: 4,
  },
  queryCard: {
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#fff",
  },
  hidden: {
    display: "none",
  },
  queryTitle: {
    color: "#183528",
    fontSize: 16,
    fontWeight: "700",
  },
  queryInstructions: {
    color: "#64746a",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },
  wordList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  wordChip: {
    minHeight: 36,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#cbd8ce",
    borderRadius: 18,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  wordChipSelected: {
    borderColor: "#1f6b49",
    backgroundColor: "#e7f0e9",
  },
  wordChipText: {
    color: "#52645a",
    fontSize: 14,
  },
  wordChipTextSelected: {
    color: "#1f6b49",
    fontWeight: "700",
  },
  queryLabel: {
    color: "#183528",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 20,
  },
  queryInput: {
    borderWidth: 1,
    borderColor: "#cbd8ce",
    borderRadius: 12,
    color: "#183528",
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: "top",
    marginBottom: 10,
  },
  resultsCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#fff",
  },
  formCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#fff",
  },
  formField: {
    marginTop: 14,
  },
  flightNumberRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  flightNumberField: {
    flex: 1,
    minWidth: 0,
    marginTop: 0,
  },
  formLabel: {
    color: "#183528",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  formInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#cbd8ce",
    borderRadius: 12,
    color: "#183528",
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  flightNumberInput: {
    paddingHorizontal: 6,
    textAlign: "center",
  },
  notesInput: {
    minHeight: 112,
    paddingVertical: 12,
    textAlignVertical: "top",
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#cbd8ce",
    borderRadius: 12,
    backgroundColor: "#f7f8f3",
  },
  resultItemPressed: {
    borderColor: "#1f6b49",
    backgroundColor: "#e7f0e9",
  },
  resultItemContent: {
    flex: 1,
  },
  resultName: {
    color: "#183528",
    fontSize: 15,
    fontWeight: "700",
  },
  resultDetails: {
    color: "#64746a",
    fontSize: 13,
    marginTop: 4,
  },
  resultAction: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#e7f0e9",
  },
  resultActionLabel: {
    color: "#1f6b49",
    fontSize: 13,
    fontWeight: "700",
  },
  savedDiscCard: {
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#e7f0e9",
  },
  savedDiscTitle: {
    color: "#1f6b49",
    fontSize: 14,
    fontWeight: "700",
  },
  savedDiscName: {
    color: "#183528",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 4,
  },
  bagLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 24,
  },
  bagLoadingText: {
    color: "#64746a",
    fontSize: 14,
  },
  bagDiscList: {
    gap: 12,
    marginTop: 24,
  },
  bagDiscCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#fff",
  },
  bagDiscImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: "#e5ebe4",
  },
  bagDiscImagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: "#e5ebe4",
  },
  bagDiscContent: {
    flex: 1,
  },
  bagFlightNumberRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 6,
  },
  bagFlightNumber: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e7f0e9",
  },
  bagFlightNumberText: {
    color: "#1f6b49",
    fontSize: 12,
    fontWeight: "700",
  },
  deleteDiscButton: {
    minHeight: 40,
    minWidth: 56,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#fff1ef",
  },
  deleteDiscButtonText: {
    color: "#a33a32",
    fontSize: 13,
    fontWeight: "700",
  },
  bagDiscName: {
    color: "#183528",
    fontSize: 16,
    fontWeight: "700",
  },
  bagDiscDetails: {
    color: "#64746a",
    fontSize: 13,
    marginTop: 4,
  },
  bagDiscNotes: {
    color: "#52645a",
    fontSize: 13,
    marginTop: 6,
  },
  attribution: {
    color: "#64746a",
    fontSize: 12,
    marginTop: 14,
  },
  centeredScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    backgroundColor: "#f7f8f3",
  },
  permissionTitle: {
    color: "#183528",
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  permissionText: {
    color: "#64746a",
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 24,
  },
  header: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  backButton: {
    minWidth: 64,
    paddingVertical: 10,
  },
  backButtonLabel: {
    color: "#1f6b49",
    fontSize: 16,
    fontWeight: "600",
  },
  headerTitle: {
    color: "#183528",
    fontSize: 17,
    fontWeight: "700",
  },
  headerSpacer: {
    minWidth: 64,
  },
  cameraHint: {
    color: "#64746a",
    fontSize: 15,
    textAlign: "center",
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
  },
  cameraFrame: {
    flex: 1,
    overflow: "hidden",
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 24,
    backgroundColor: "#17251d",
  },
  camera: {
    flex: 1,
  },
  cameraLoading: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "rgba(23, 37, 29, 0.65)",
  },
  cameraLoadingText: {
    color: "#fff",
    fontSize: 14,
  },
  shutterButton: {
    width: 76,
    height: 76,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#1f6b49",
    borderRadius: 38,
    marginBottom: 28,
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#1f6b49",
  },
  photoActions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  buttonProgress: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButton: {
    minHeight: 52,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#1f6b49",
    paddingHorizontal: 20,
  },
  permissionButton: {
    flex: 0,
    alignSelf: "stretch",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    minHeight: 52,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#cbd8ce",
    borderRadius: 14,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
  },
  secondaryButtonText: {
    color: "#1f6b49",
    fontSize: 16,
    fontWeight: "700",
  },
  textButton: {
    paddingVertical: 14,
  },
  textButtonLabel: {
    color: "#1f6b49",
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    color: "#a33b2f",
    fontSize: 14,
    textAlign: "center",
    marginHorizontal: 20,
    marginBottom: 12,
  },
  disabledButton: {
    opacity: 0.45,
  },
  pressedButton: {
    opacity: 0.82,
  },
});
