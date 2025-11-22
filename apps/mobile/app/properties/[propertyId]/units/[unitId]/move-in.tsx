import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Button,
  Modal,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePhotos } from '@/context/PhotoContext';
import { supabase } from '@/lib/supabase';

type SectionKey =
  | 'entry'
  | 'living_room'
  | 'kitchen'
  | 'bathroom'
  | 'bedroom'
  | 'hallway'
  | 'closets';

type MoveInPhoto = {
  id: string;
  localUri: string;
  storagePath?: string;
  publicUrl?: string;
};

type Section = {
  key: SectionKey;
  label: string;
  minPhotos: number;
  photos: MoveInPhoto[];
};

type Step = 'sections' | 'camera' | 'summary';

const INITIAL_SECTIONS: Omit<Section, 'photos'>[] = [
  { key: 'entry', label: 'Entry', minPhotos: 1 },
  { key: 'living_room', label: 'Living Room', minPhotos: 2 },
  { key: 'kitchen', label: 'Kitchen', minPhotos: 3 },
  { key: 'bathroom', label: 'Bathroom', minPhotos: 2 },
  { key: 'bedroom', label: 'Bedroom', minPhotos: 2 },
  { key: 'hallway', label: 'Hallway', minPhotos: 1 },
  { key: 'closets', label: 'Closets', minPhotos: 1 },
];

// Upload a photo file:// URI to Supabase Storage (bucket "Images" for now)
// Later you can change "raw/..." to unit/tenancy-aware paths and insert into your images table.
async function uploadPhotoToSupabase(uri: string) {
  const response = await fetch(uri);
  const blob = await response.blob();

  const ext = 'jpg';
  const filename = `${Date.now()}.${ext}`;
  const path = `raw/${filename}`;

  const { error } = await supabase.storage
    .from('Images')
    .upload(path, blob, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (error) {
    console.error('Supabase upload error:', error);
    throw error;
  }

  const { data: publicData } = supabase.storage.from('Images').getPublicUrl(path);

  return {
    storagePath: path,
    publicUrl: publicData.publicUrl,
  };
}

export default function MoveInScreen() {
  const router = useRouter();
  const { addPhoto } = usePhotos();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const { propertyId, propertyName, unitId, unitLabel } = useLocalSearchParams<{
    propertyId: string;
    propertyName?: string;
    unitId: string;
    unitLabel?: string;
  }>();

  const displayUnitLabel = unitLabel ?? `Unit ${unitId}`;

  const [step, setStep] = useState<Step>('sections');
  const [sections, setSections] = useState<Section[]>(
    INITIAL_SECTIONS.map((s) => ({ ...s, photos: [] }))
  );
  const [currentSectionKey, setCurrentSectionKey] = useState<SectionKey | null>(
    null
  );
  const [capturing, setCapturing] = useState(false);

  const [previewPhoto, setPreviewPhoto] = useState<{
    sectionKey: SectionKey;
    photoId: string;
  } | null>(null);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 justify-center px-4">
        <Text className="text-center pb-2.5">
          We need your permission to show the camera
        </Text>
        <Button onPress={requestPermission} title="Grant permission" />
      </View>
    );
  }

  const currentSection: Section | undefined = useMemo(
    () => sections.find((s) => s.key === currentSectionKey),
    [sections, currentSectionKey]
  );

  const allSectionsComplete = useMemo(
    () => sections.every((s) => s.photos.length >= s.minPhotos),
    [sections]
  );

  // ---- Navigation helpers ----

  function openSectionCamera(sectionKey: SectionKey) {
    setCurrentSectionKey(sectionKey);
    setStep('camera');
  }

  function finishSection() {
    setCurrentSectionKey(null);
    setStep('sections');
  }

  function finishMoveIn() {
    setStep('summary');
  }

  // ---- Photo capture logic ----

  async function takePicture() {
    if (!cameraRef.current || capturing || !currentSectionKey) return;

    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        skipProcessing: true,
        base64: false,
        exif: false,
      });

      if (photo?.uri) {
        // Save locally (for your gallery / debugging)
        addPhoto(photo.uri);

        // Upload to Supabase
        const { storagePath, publicUrl } = await uploadPhotoToSupabase(photo.uri);

        const newPhoto: MoveInPhoto = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          localUri: photo.uri,
          storagePath,
          publicUrl,
        };

        setSections((prev) =>
          prev.map((section) =>
            section.key === currentSectionKey
              ? { ...section, photos: [...section.photos, newPhoto] }
              : section
          )
        );
      }
    } catch (e) {
      console.error('takePicture error:', e);
    } finally {
      setCapturing(false);
    }
  }

  function handleDeletePhoto(sectionKey: SectionKey, photoId: string) {
    setSections((prev) =>
      prev.map((section) =>
        section.key === sectionKey
          ? {
              ...section,
              photos: section.photos.filter((p) => p.id !== photoId),
            }
          : section
      )
    );
    setPreviewPhoto(null);
  }

  // ---- UI render helpers ----

  function renderSectionStatus(section: Section) {
    const count = section.photos.length;
    const min = section.minPhotos;

    if (count === 0) {
      return <Text className="text-xs text-gray-400">Not started</Text>;
    }

    if (count < min) {
      return (
        <Text className="text-xs text-amber-500">
          In progress · {count}/{min}
        </Text>
      );
    }

    return (
      <Text className="text-xs text-emerald-500">
        Complete · {count} photo{count > 1 ? 's' : ''}
      </Text>
    );
  }

  function renderSectionsStep() {
    const completedCount = sections.filter(
      (s) => s.photos.length >= s.minPhotos
    ).length;
    const progressPct = (completedCount / sections.length) * 100;

    return (
      <View className="flex-1 bg-white px-4 py-6">
        <Text className="text-xs text-gray-400 mb-1">
          {propertyName ?? propertyId}
        </Text>
        <Text className="text-xl font-semibold mb-1">{displayUnitLabel}</Text>
        <Text className="text-xs text-gray-500 mb-4">
          Move-in photo checklist · Capture each section to record the
          condition at the start of the tenancy.
        </Text>

        {/* Progress bar */}
        <View className="w-full h-2 bg-gray-100 rounded-full mb-4 overflow-hidden">
          <View
            className="h-2 bg-blue-500 rounded-full"
            style={{ width: `${progressPct}%` }}
          />
        </View>

        <ScrollView className="flex-1">
          {sections.map((section) => (
            <TouchableOpacity
              key={section.key}
              onPress={() => openSectionCamera(section.key)}
              className="mb-3 p-4 rounded-xl bg-white shadow-sm border border-gray-200 flex-row items-center"
            >
              <View className="flex-1">
                <Text className="font-medium mb-1">{section.label}</Text>
                {renderSectionStatus(section)}
              </View>
              {section.photos.length > 0 && (
                <View className="flex-row space-x-1">
                  {section.photos.slice(0, 3).map((photo) => (
                    <Image
                      key={photo.id}
                      source={{ uri: photo.localUri }}
                      className="w-8 h-8 rounded-md"
                    />
                  ))}
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View className="mt-4">
          <Button
            title="Finish move-in photos"
            onPress={finishMoveIn}
            disabled={!allSectionsComplete}
          />
          {!allSectionsComplete && (
            <Text className="text-xs text-gray-500 mt-2 text-center">
              Complete all sections with at least the minimum photos to finish.
            </Text>
          )}
          <TouchableOpacity
            className="mt-3"
            onPress={() => router.back()}
          >
            <Text className="text-xs text-gray-400 text-center">
              Back to unit
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderCameraStep() {
    if (!currentSection) return null;

    return (
      <View className="flex-1 bg-black">
        {/* Header overlay */}
        <View className="absolute top-12 left-4 right-4 z-10 bg-black/40 rounded-xl px-4 py-2">
          <Text className="text-xs text-gray-300">
            {propertyName ?? propertyId} · {displayUnitLabel}
          </Text>
          <Text className="text-base text-white font-semibold">
            {currentSection.label} · Move-in
          </Text>
          <Text className="text-[11px] text-gray-300 mt-1">
            Take at least {currentSection.minPhotos} photo
            {currentSection.minPhotos > 1 ? 's' : ''} of this section.
          </Text>
        </View>

        <CameraView className="flex-1" ref={cameraRef}>
          <View className="flex-1 justify-end pb-10">
            {/* Thumbnail strip */}
            {currentSection.photos.length > 0 && (
              <ScrollView
                horizontal
                className="mb-4 px-4"
                showsHorizontalScrollIndicator={false}
              >
                {currentSection.photos.map((photo) => (
                  <TouchableOpacity
                    key={photo.id}
                    className="mr-2"
                    onPress={() =>
                      setPreviewPhoto({
                        sectionKey: currentSection.key,
                        photoId: photo.id,
                      })
                    }
                  >
                    <Image
                      source={{ uri: photo.localUri }}
                      className="w-16 h-16 rounded-md border border-white/50"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Capture + Done buttons */}
            <View className="flex-row items-center px-8">
              <TouchableOpacity
                disabled={capturing}
                className={
                  capturing
                    ? 'opacity-50 flex-1 self-end items-center'
                    : 'flex-1 self-end items-center'
                }
                onPress={takePicture}
              >
                <View className="w-[70px] h-[70px] rounded-[35px] bg-white/30 justify-center items-center">
                  <View className="w-[60px] h-[60px] rounded-[30px] bg-white" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={finishSection}
                className="ml-6 px-4 py-2 rounded-full bg-black/60 border border-white/30"
              >
                <Text className="text-white text-sm font-medium">
                  Done with {currentSection.label}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>

        {/* Preview modal */}
        <Modal visible={!!previewPhoto} transparent animationType="fade">
          {previewPhoto && (
            <View className="flex-1 bg-black/80 justify-center items-center px-4">
              <View className="w-full rounded-2xl bg-black p-3">
                <Text className="text-white text-sm mb-2">
                  {currentSection?.label}
                </Text>
                {(() => {
                  const section = sections.find(
                    (s) => s.key === previewPhoto.sectionKey
                  );
                  const photo = section?.photos.find(
                    (p) => p.id === previewPhoto.photoId
                  );
                  if (!photo) return null;
                  return (
                    <Image
                      source={{ uri: photo.localUri }}
                      className="w-full h-80 rounded-xl mb-3"
                      resizeMode="contain"
                    />
                  );
                })()}
                <View className="flex-row justify-between">
                  <TouchableOpacity
                    onPress={() => setPreviewPhoto(null)}
                    className="px-4 py-2 rounded-full bg-white/10"
                  >
                    <Text className="text-white text-sm">Close</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() =>
                      previewPhoto &&
                      handleDeletePhoto(
                        previewPhoto.sectionKey,
                        previewPhoto.photoId
                      )
                    }
                    className="px-4 py-2 rounded-full bg-red-600"
                  >
                    <Text className="text-white text-sm">
                      Delete & retake
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </Modal>
      </View>
    );
  }

  function renderSummaryStep() {
    const totalPhotos = sections.reduce(
      (sum, s) => sum + s.photos.length,
      0
    );

    return (
      <View className="flex-1 bg-white px-4 py-6">
        <Text className="text-xs text-gray-400 mb-1">
          {propertyName ?? propertyId}
        </Text>
        <Text className="text-xl font-semibold mb-2">
          Move-in photos saved
        </Text>
        <Text className="text-sm text-gray-600 mb-4">
          You&apos;ve recorded the unit&apos;s condition at the start of the
          tenancy. These photos can later be compared to move-out photos and
          included in AB 2801 documentation.
        </Text>

        <View className="mb-4 p-4 rounded-xl bg-white shadow-sm border border-gray-200">
          <Text className="font-medium mb-2">Summary</Text>
          <Text className="text-sm text-gray-700">
            Total photos: {totalPhotos}
          </Text>
          {sections.map((s) => (
            <Text key={s.key} className="text-xs text-gray-500 mt-1">
              • {s.label}: {s.photos.length} photo
              {s.photos.length !== 1 ? 's' : ''} (min {s.minPhotos})
            </Text>
          ))}
        </View>

        <Button
          title="Done"
          onPress={() => {
            // For now, go back to the unit screen.
            router.back();
          }}
        />
      </View>
    );
  }

  // ---- Main render switch ----

  if (step === 'camera') return renderCameraStep();
  if (step === 'summary') return renderSummaryStep();
  return renderSectionsStep();
}
