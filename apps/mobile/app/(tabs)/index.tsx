import { Text, View, FlatList, Image, Dimensions } from "react-native";
import { usePhotos } from "../../context/PhotoContext";

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const IMAGE_SIZE = (width - 32) / COLUMN_COUNT - 8;

export default function Dashboard() {
  const { photos } = usePhotos();

  return (
    <View className="flex-1 bg-white p-4">
      <Text className="text-2xl font-bold mb-4">Dashboard</Text>
      {photos.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-500">No photos yet. Go to Camera tab!</Text>
        </View>
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(item, index) => index.toString()}
          numColumns={COLUMN_COUNT}
          renderItem={({ item }) => (
            <Image
              source={{ uri: item }}
              style={{ width: IMAGE_SIZE, height: IMAGE_SIZE }}
              className="m-1 rounded-lg bg-gray-200"
            />
          )}
        />
      )}
    </View>
  );
}
