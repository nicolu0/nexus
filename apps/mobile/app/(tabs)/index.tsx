import { Text, View, FlatList, Image, Dimensions } from "react-native";
import { usePhotos } from "../../context/PhotoContext";

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const IMAGE_SIZE = (width - 32) / COLUMN_COUNT - 8;

export default function Dashboard() {
  const { photos } = usePhotos();

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>Dashboard</Text>
      {photos.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#888' }}>No photos yet. Go to Camera tab!</Text>
        </View>
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(item, index) => index.toString()}
          numColumns={COLUMN_COUNT}
          renderItem={({ item }) => (
            <Image
              source={{ uri: item }}
              style={{
                width: IMAGE_SIZE,
                height: IMAGE_SIZE,
                margin: 4,
                borderRadius: 8,
                backgroundColor: '#eee'
              }}
            />
          )}
        />
      )}
    </View>
  );
}
