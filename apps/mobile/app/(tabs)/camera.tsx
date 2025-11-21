import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useState, useRef } from 'react';
import { Button, Text, TouchableOpacity, View } from 'react-native';
import { usePhotos } from '../../context/PhotoContext';

export default function CameraScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [capturing, setCapturing] = useState(false);
    const cameraRef = useRef<CameraView>(null);
    const { addPhoto } = usePhotos();

    if (!permission) {
        return <View />;
    }

    if (!permission.granted) {
        return (
            <View className="flex-1 justify-center">
                <Text className="text-center pb-2.5">We need your permission to show the camera</Text>
                <Button onPress={requestPermission} title="grant permission" />
            </View>
        );
    }

    async function takePicture() {
        if (!cameraRef.current || capturing) return;

        setCapturing(true);
        try {
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.5,
                skipProcessing: true,
                base64: false,
                exif: false,
            });
            if (photo?.uri) {
                addPhoto(photo.uri);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setCapturing(false);
        }
    }

    return (
        <View className="flex-1 justify-center">
            <CameraView className="flex-1" ref={cameraRef}>
                <View className="flex-1 flex-row bg-transparent m-16 justify-between items-end">
                    <TouchableOpacity
                        disabled={capturing}
                        className={capturing
                            ? 'opacity-50 flex-1 self-end items-center w-[70px] h-[70px] rounded-[35px] bg-white/30 justify-center mb-5'
                            : 'flex-1 self-end items-center w-[70px] h-[70px] rounded-[35px] bg-white/30 justify-center mb-5'}
                        onPress={takePicture}
                    >
                        <View className="w-[60px] h-[60px] rounded-[30px] bg-white" />
                    </TouchableOpacity>
                    <View className="flex-1 self-end items-center" />
                </View>
            </CameraView>
        </View>
    );
}
