/**
 * Compresses an image file and returns an ArrayBuffer of the compressed image.
 * @param file The original image file.
 * @param maxWidth Maximum width of the compressed image.
 * @param maxHeight Maximum height of the compressed image.
 * @param quality Compression quality (0 to 1).
 */
export async function compressImage(
  file: File | Blob,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.8
): Promise<{ data: ArrayBuffer; format: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        
        // Output as jpeg for better compression
        canvas.toBlob(
          async (blob) => {
            if (blob) {
              const arrayBuffer = await blob.arrayBuffer();
              resolve({
                data: arrayBuffer,
                format: 'image/jpeg',
              });
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

/**
 * Converts an ArrayBuffer to a Base64 string for display in <img> tags.
 */
export function arrayBufferToBase64(buffer: ArrayBuffer, format: string): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:${format};base64,${window.btoa(binary)}`;
}
