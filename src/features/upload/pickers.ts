import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import type { ScannedPage } from '@/types';

import type { PageSource } from './uploadAction';

const ACCEPTED_TYPES = ['application/pdf', 'image/*'];

export async function pickPages(source: PageSource): Promise<ScannedPage[]> {
  switch (source) {
    case 'camera': {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Camera access is off. Enable it in Settings to scan documents.');
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
      });
      return result.canceled ? [] : result.assets.map(fromImageAsset);
    }
    case 'library': {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsMultipleSelection: true,
      });
      return result.canceled ? [] : result.assets.map(fromImageAsset);
    }
    case 'files': {
      const result = await DocumentPicker.getDocumentAsync({
        type: ACCEPTED_TYPES,
        multiple: true,
        copyToCacheDirectory: true,
      });
      return result.canceled
        ? []
        : result.assets.map((a) => ({
            uri: a.uri,
            name: a.name,
            mimeType: a.mimeType ?? 'application/octet-stream',
            sizeBytes: a.size ?? 0,
          }));
    }
  }
}

function fromImageAsset(asset: ImagePicker.ImagePickerAsset, index: number): ScannedPage {
  return {
    uri: asset.uri,
    name: asset.fileName ?? `Scan ${index + 1}.jpg`,
    mimeType: asset.mimeType ?? 'image/jpeg',
    sizeBytes: asset.fileSize ?? 0,
  };
}
