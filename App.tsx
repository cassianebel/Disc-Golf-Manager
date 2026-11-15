import { CameraView, useCameraPermissions } from "expo-camera";
import { recognizeText } from "expo-ocr-kit";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
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
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Allow camera</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={openSettings}
            style={styles.primaryButton}
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
  const [showCamera, setShowCamera] = useState(false);
  const [lastPhotoUri, setLastPhotoUri] = useState<string | null>(null);
  const [lastRecognizedText, setLastRecognizedText] = useState<string | null>(
    null,
  );
  const [recognizedWords, setRecognizedWords] = useState<string[]>([]);
  const [selectedWords, setSelectedWords] = useState<boolean[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  function handleTextRecognized(text: string) {
    const words = text.trim() ? text.trim().split(/\s+/) : [];
    setLastRecognizedText(text);
    setRecognizedWords(words);
    setSelectedWords(words.map(() => false));
    setSearchQuery("");
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
      return nextSelection;
    });
  }

  if (showCamera) {
    return (
      <CameraScreen
        onCancel={() => setShowCamera(false)}
        onPhotoCaptured={(uri) => {
          setLastPhotoUri(uri);
          setLastRecognizedText(null);
          setRecognizedWords([]);
          setSelectedWords([]);
          setSearchQuery("");
        }}
        onTextRecognized={handleTextRecognized}
      />
    );
  }

  return (
    <SafeAreaView style={styles.homeScreen}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.homeScrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.homeContent}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>DG</Text>
          </View>
          <Text style={styles.eyebrow}>YOUR DISC GOLF COLLECTION</Text>
          <Text style={styles.title}>Keep your discs{"\n"}in the loop.</Text>
          <Text style={styles.subtitle}>
            Add a disc to start building your collection.
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

          {lastPhotoUri ? (
            <View style={styles.latestPhotoCard}>
              <Image source={{ uri: lastPhotoUri }} style={styles.thumbnail} />
              <View style={styles.latestPhotoContent}>
                <Text numberOfLines={1} style={styles.latestPhotoTitle}>
                  {lastRecognizedText ? "Recognized text" : "No text found"}
                </Text>
                <Text numberOfLines={3} style={styles.latestPhotoSubtitle}>
                  {lastRecognizedText ||
                    "Try taking a clearer photo of the disc."}
                </Text>
              </View>
            </View>
          ) : null}

          {recognizedWords.length > 0 ? (
            <View style={styles.queryCard}>
              <Text style={styles.queryTitle}>Choose Search Terms</Text>
              <Text style={styles.queryInstructions}>
                Words start unselected. Toggling a word rebuilds the query and
                replaces any manual edits.
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
              <Text style={styles.queryLabel}>Finalize Search Terms</Text>
              <Text style={styles.queryInstructions}>
                Edit any misspelled words or add words to your search terms as
                needed.
              </Text>
              <TextInput
                accessibilityLabel="Edit TryDiscs search terms"
                multiline
                onChangeText={setSearchQuery}
                placeholder="Select words or enter search text"
                placeholderTextColor="#829087"
                style={styles.queryInput}
                value={searchQuery}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>
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
  queryTitle: {
    color: "#183528",
    fontSize: 16,
    fontWeight: "700",
  },
  queryInstructions: {
    color: "#64746a",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
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
    fontSize: 14,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  queryInput: {
    minHeight: 76,
    borderWidth: 1,
    borderColor: "#cbd8ce",
    borderRadius: 12,
    color: "#183528",
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: "top",
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
