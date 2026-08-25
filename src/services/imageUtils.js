// İnzar Turizm - Akıllı İstemci Taraflı Görsel Sıkıştırma ve Avatar Optimizasyonu
export async function compressAvatarImage(file, maxDimension = 256, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Lütfen geçerli bir görsel dosyası seçiniz.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const { width, height } = img;

          // Kare kırpma (Center Crop) hesabı
          const minDim = Math.min(width, height);
          const startX = (width - minDim) / 2;
          const startY = (height - minDim) / 2;

          canvas.width = maxDimension;
          canvas.height = maxDimension;

          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Fotoğrafı tam ortalayarak 256x256 kareye kırp ve çiz
          ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, maxDimension, maxDimension);

          // Kalite kaybı olmadan ~25-35 KB boyutunda JPEG/WebP dataUrl üret
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Görsel yüklenemedi.'));
      img.src = event.target.result;
    };
    reader.onerror = () => reject(new Error('Dosya okunamadı.'));
    reader.readAsDataURL(file);
  });
}
