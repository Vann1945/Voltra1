export const compressImage = async (
  file: File,
  maxWidth = 800,
  maxHeight = 800,
  initialQuality = 0.8,
  maxSizeKb = 300 // Target max size in KB
): Promise<string> => {
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
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
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

        // Auto quality compression to hit target size
        let quality = initialQuality;
        let dataUrl = canvas.toDataURL('image/webp', quality);
        let sizeKb = (dataUrl.length * (3 / 4)) / 1024;

        // Iteratively reduce quality if the image is too large
        while (sizeKb > maxSizeKb && quality > 0.1) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/webp', quality);
          sizeKb = (dataUrl.length * (3 / 4)) / 1024;
        }
        
        // If still too large, try JPEG as a fallback for compression efficiency
        if (sizeKb > maxSizeKb) {
           let jpegQuality = 0.6;
           while (sizeKb > maxSizeKb && jpegQuality > 0.1) {
             const jpegDataUrl = canvas.toDataURL('image/jpeg', jpegQuality);
             const jpegSizeKb = (jpegDataUrl.length * (3 / 4)) / 1024;
             if (jpegSizeKb < sizeKb) {
               dataUrl = jpegDataUrl;
               sizeKb = jpegSizeKb;
             }
             jpegQuality -= 0.1;
           }
        }

        resolve(dataUrl);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};
