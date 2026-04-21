import * as mm from 'music-metadata-browser';
import { ID3Writer } from 'browser-id3-writer';
import type { MP3Metadata } from '@/types';

/**
 * Guesses title and artist from the filename.
 * Pattern: "Artist - Title" or just "Title"
 */
function guessMetadataFromFilename(filename: string): { title?: string, artist?: string } {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
  
  if (nameWithoutExt.includes(" - ")) {
    const parts = nameWithoutExt.split(" - ");
    return {
      artist: parts[0].trim(),
      title: parts.slice(1).join(" - ").trim()
    };
  }
  
  return { title: nameWithoutExt };
}

/**
 * Reads metadata from an MP3 file.
 */
export async function readMP3Metadata(file: File): Promise<MP3Metadata> {
  try {
    const metadata = await mm.parseBlob(file);
    const common = metadata.common;
    
    // Try to get pictures from common metadata
    const pictures = [...(common.picture || [])];
    
    // Fallback values from native tags
    let nativeAlbum = '';
    let nativeTitle = '';
    let nativeArtist = '';
    let nativeYear = '';
    let nativeGenre = '';
    let nativeComment = '';
    let nativeTrack = '';
    let nativeComposer = '';

    // Fallback: Check native tags if common is empty or to find more
    if (metadata.native) {
      Object.entries(metadata.native).forEach(([format, nativeTags]) => {
        nativeTags.forEach(tag => {
          const val = tag.value as any;
          
          // ID3v2.3/2.4 uses 'APIC', ID3v2.2 uses 'PIC', APEv2 uses 'Cover Art (Front)' etc.
          if ((tag.id === 'APIC' || tag.id === 'PIC' || tag.id.includes('Cover Art')) && val) {
            if (val.data && val.format) {
              const alreadyExists = pictures.some(p => 
                p.data.byteLength === val.data.byteLength && 
                p.format === val.format
              );
              if (!alreadyExists) {
                pictures.push(val);
              }
            }
          }

          // Native Album fallback: TALB (v2.3/2.4) or TAL (v2.2) or 'Album' (APEv2)
          if (tag.id === 'TALB' || tag.id === 'TAL' || tag.id === 'Album') {
            nativeAlbum = nativeAlbum || String(val);
          }
          // Native Title fallback: TIT2 (v2.3/2.4) or TT2 (v2.2) or 'Title' (APEv2)
          if (tag.id === 'TIT2' || tag.id === 'TT2' || tag.id === 'Title') {
            nativeTitle = nativeTitle || String(val);
          }
          // Native Artist fallback: TPE1 (v2.3/2.4) or TP1 (v2.2) or 'Artist' (APEv2)
          if (tag.id === 'TPE1' || tag.id === 'TP1' || tag.id === 'Artist') {
            nativeArtist = nativeArtist || String(val);
          }
          // Native Year: TYER (v2.3/2.4) or TYE (v2.2) or 'Year' (APEv2) or TDRC
          if (tag.id === 'TYER' || tag.id === 'TYE' || tag.id === 'TDRC' || tag.id === 'Year') {
            nativeYear = nativeYear || String(val);
          }
          // Native Genre: TCON (v2.3/2.4) or TCO (v2.2) or 'Genre' (APEv2)
          if (tag.id === 'TCON' || tag.id === 'TCO' || tag.id === 'Genre') {
            nativeGenre = nativeGenre || String(val);
          }
          // Native Comment: COMM (v2.3/2.4) or COM (v2.2) or 'Comment' (APEv2)
          if (tag.id === 'COMM' || tag.id === 'COM' || tag.id === 'Comment') {
            nativeComment = nativeComment || (typeof val === 'object' ? val.text : String(val));
          }
          // Native Track: TRCK (v2.3/2.4) or TRK (v2.2) or 'Track' (APEv2)
          if (tag.id === 'TRCK' || tag.id === 'TRK' || tag.id === 'Track') {
            nativeTrack = nativeTrack || String(val);
          }
          // Native Composer: TCOM (v2.3/2.4) or TCM (v2.2) or 'Composer' (APEv2)
          if (tag.id === 'TCOM' || tag.id === 'TCM' || tag.id === 'Composer') {
            nativeComposer = nativeComposer || String(val);
          }
        });
      });
    }

    const covers = pictures.map(pic => {
      const dataCopy = new Uint8Array(pic.data).slice();
      let format = pic.format || 'image/jpeg';
      if (!format.includes('/')) {
        format = `image/${format}`;
      }

      return {
        data: dataCopy.buffer as ArrayBuffer,
        format: format,
        description: pic.description,
        type: pic.type,
      };
    });

    const guessed = guessMetadataFromFilename(file.name);

    return {
      title: common.title || nativeTitle || guessed.title || '',
      artist: common.artist || nativeArtist || guessed.artist || '',
      album: common.album || nativeAlbum || '',
      year: common.year?.toString() || nativeYear || '',
      genre: common.genre?.[0] || nativeGenre || '',
      comment: common.comment?.[0] || nativeComment || '',
      trackNumber: common.track.no?.toString() || nativeTrack || '',
      composer: common.composer?.[0] || nativeComposer || '',
      covers,
    };
  } catch (err) {
    console.error('Error parsing MP3 metadata:', err);
    const guessed = guessMetadataFromFilename(file.name);
    return {
      title: guessed.title || '',
      artist: guessed.artist || '',
      album: '',
      year: '',
      genre: '',
      comment: '',
      trackNumber: '',
      composer: '',
      covers: [],
    };
  }
}

/**
 * Writes metadata to an MP3 file and returns a new Blob.
 */
export async function writeMP3Metadata(file: File, metadata: MP3Metadata): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const writer: any = new ID3Writer(arrayBuffer);
  
  if (metadata.title) writer.setFrame('TIT2', metadata.title);
  if (metadata.artist) writer.setFrame('TPE1', [metadata.artist]);
  if (metadata.album) writer.setFrame('TALB', metadata.album);
  if (metadata.year) writer.setFrame('TYER', metadata.year);
  if (metadata.genre) writer.setFrame('TCON', [metadata.genre]);
  if (metadata.comment) {
    writer.setFrame('COMM', {
      description: '',
      text: metadata.comment,
      language: 'eng',
    });
  }
  if (metadata.trackNumber) writer.setFrame('TRCK', metadata.trackNumber);
  if (metadata.composer) writer.setFrame('TCOM', [metadata.composer]);

  if (metadata.covers && metadata.covers.length > 0) {
    metadata.covers.forEach((cover, index) => {
      writer.setFrame('APIC', {
        type: cover.type || (index === 0 ? 3 : 0), // Default to front cover (3) for the first one if not specified
        data: cover.data,
        description: cover.description || `Cover ${index + 1}`,
      });
    });
  }

  writer.addTag();
  return writer.getBlob();
}
