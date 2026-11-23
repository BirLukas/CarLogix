import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { useAppColorScheme } from '../context/ThemeContext';

function readUriAsBase64(uri: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        const base64 = result.includes(',') ? result.split(',')[1] : '';
        if (base64) resolve(base64);
        else reject(new Error('Nepodařilo se převést soubor do formátu base64.'));
      };
      reader.onerror = () => reject(new Error('Chyba při čtení obsahu souboru.'));
      reader.readAsDataURL(xhr.response);
    };
    xhr.onerror = () => reject(new Error('Nepodařilo se otevřít vybraný soubor.'));
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
}

export interface ScannedImageResult {
  uri: string;
  base64: string;
  mimeType: string;
  fileName?: string;
}

interface DocumentScannerModalProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
  allowPdf?: boolean;
  onClose: () => void;
  onCapture: (result: ScannedImageResult) => void;
}

export const DocumentScannerModal: React.FC<DocumentScannerModalProps> = ({
  visible,
  title = 'Skenovat dokument',
  subtitle = 'Vyfoťte dokument, vyberte z galerie nebo nahrajte PDF',
  allowPdf = true,
  onClose,
  onCapture,
}) => {
  const colorScheme = useAppColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const handleTakePhoto = async () => {
    if (!cameraRef.current || isCapturing) return;
    if (!isCameraReady) {
      Alert.alert('Moment', 'Fotoaparát se ještě inicializuje, zkuste to prosím za vteřinu.');
      return;
    }
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.72,
      });
      if (!photo?.uri || !photo.base64) {
        Alert.alert('Chyba', 'Nepodařilo se pořídit snímek. Zkuste to prosím znovu.');
        return;
      }
      onCapture({
        uri: photo.uri,
        base64: photo.base64,
        mimeType: 'image/jpeg',
      });
      onClose();
    } catch (err: any) {
      Alert.alert('Chyba fotoaparátu', err?.message || 'Nepodařilo se vyfotit dokument.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.75,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert('Chyba', 'Nepodařilo se načíst obrazová data ze zvoleného snímku.');
        return;
      }

      onCapture({
        uri: asset.uri,
        base64: asset.base64,
        mimeType: asset.mimeType || 'image/jpeg',
        fileName: asset.fileName || undefined,
      });
      onClose();
    } catch (err: any) {
      Alert.alert('Chyba galerie', err?.message || 'Nepodařilo se načíst obrázek z galerie.');
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: allowPdf ? ['application/pdf', 'image/*'] : ['image/*'],
        copyToCacheDirectory: true,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      let base64Data = asset.base64 || '';
      if (!base64Data && asset.uri) {
        base64Data = await readUriAsBase64(asset.uri);
      }

      if (!base64Data) {
        Alert.alert('Chyba', 'Nepodařilo se načíst obsah vybraného souboru.');
        return;
      }

      onCapture({
        uri: asset.uri,
        base64: base64Data,
        mimeType: asset.mimeType || 'application/pdf',
        fileName: asset.name,
      });
      onClose();
    } catch (err: any) {
      Alert.alert('Chyba souboru', err?.message || 'Nepodařilo se načíst vybraný dokument.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: '#09070F' }]}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn} hitSlop={10}>
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.titleWrap}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setTorchOn((v) => !v)}
            style={[styles.iconBtn, torchOn && { backgroundColor: 'rgba(255, 1, 143, 0.35)' }]}
            hitSlop={10}
          >
            <Ionicons name={torchOn ? 'flash' : 'flash-outline'} size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Camera viewport or permission prompt */}
        {!permission ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#FF018F" />
          </View>
        ) : !permission.granted ? (
          <View style={styles.centerBox}>
            <Ionicons name="camera-outline" size={56} color="#FF018F" />
            <Text style={styles.permTitle}>Přístup k fotoaparátu</Text>
            <Text style={styles.permDesc}>
              Pro skenování faktur, dokladů STK a fotodokumentaci dílů povolte přístup ke kameře, nebo vyberte snímek či PDF soubor.
            </Text>
            <TouchableOpacity
              style={[styles.permBtn, { backgroundColor: theme.neonPink }]}
              onPress={requestPermission}
            >
              <Text style={styles.permBtnText}>Povolit fotoaparát</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.galleryFallbackBtn} onPress={handlePickFromGallery}>
              <Ionicons name="images-outline" size={18} color="#FFFFFF" />
              <Text style={styles.galleryFallbackText}>Vybrat z galerie</Text>
            </TouchableOpacity>
            {allowPdf && (
              <TouchableOpacity style={styles.galleryFallbackBtn} onPress={handlePickDocument}>
                <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
                <Text style={styles.galleryFallbackText}>Nahrát PDF / soubor</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.cameraWrap}>
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing="back"
              enableTorch={torchOn}
              onCameraReady={() => setIsCameraReady(true)}
            />
            {/* Document framing guide */}
            <View pointerEvents="none" style={styles.guideFrame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
          </View>
        )}

        {/* Bottom controls */}
        {permission?.granted && (
          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.sideAction} onPress={handlePickFromGallery}>
              <Ionicons name="images-outline" size={24} color="#FFFFFF" />
              <Text style={styles.sideActionText}>Galerie</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shutterOuter}
              onPress={handleTakePhoto}
              disabled={isCapturing}
              activeOpacity={0.8}
            >
              <View style={styles.shutterInner}>
                {isCapturing && <ActivityIndicator color="#FF018F" />}
              </View>
            </TouchableOpacity>

            {allowPdf ? (
              <TouchableOpacity style={styles.sideAction} onPress={handlePickDocument}>
                <Ionicons name="document-text-outline" size={24} color="#FFFFFF" />
                <Text style={styles.sideActionText}>PDF</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.sideAction} />
            )}
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(9, 7, 15, 0.9)',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 11.5,
    marginTop: 2,
  },
  cameraWrap: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideFrame: {
    width: '84%',
    height: '72%',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#FF018F',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 10 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 10 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 10 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 10 },
  bottomBar: {
    paddingVertical: 24,
    paddingHorizontal: 28,
    paddingBottom: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(9, 7, 15, 0.92)',
  },
  sideAction: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  sideActionText: {
    color: '#E5E7EB',
    fontSize: 11.5,
    fontWeight: '600',
  },
  shutterOuter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 4,
    borderColor: '#FF018F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  permTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
    marginTop: 6,
  },
  permDesc: {
    color: '#9CA3AF',
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 20,
  },
  permBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 14,
  },
  permBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
  },
  galleryFallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  galleryFallbackText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '600',
  },
});
