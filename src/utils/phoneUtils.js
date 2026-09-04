// 🇹🇷 Türkiye Telefon Numarası Otomatik Maskeleme ve Biçimlendirici (+90 5XX XXX XX XX)
export function formatPhoneNumber(value) {
  if (!value) return '';
  
  // Sadece rakamları ayıkla
  let digits = String(value).replace(/\D/g, '');
  
  // Başında 90 veya 0 varsa yerel 10 haneli formata indirge
  if (digits.startsWith('90')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  
  // En fazla 10 hane (5XX XXX XX XX)
  digits = digits.slice(0, 10);
  
  if (digits.length === 0) return '';
  
  let formatted = '+90 ';
  if (digits.length > 0) {
    formatted += digits.slice(0, 3);
  }
  if (digits.length > 3) {
    formatted += ' ' + digits.slice(3, 6);
  }
  if (digits.length > 6) {
    formatted += ' ' + digits.slice(6, 8);
  }
  if (digits.length > 8) {
    formatted += ' ' + digits.slice(8, 10);
  }
  
  return formatted;
}

export function cleanPhoneNumber(formatted) {
  if (!formatted) return '';
  const digits = String(formatted).replace(/\D/g, '');
  return digits;
}

// 🇹🇷 Türkçe Kurallarına Uygun Title Case (İlk Harf Büyük, Sonrakiler Küçük: "ahmet mehmet" -> "Ahmet Mehmet")
export function formatTurkishTitleCase(str) {
  if (!str) return '';
  return str
    .split(' ')
    .map(word => {
      if (!word) return '';
      const first = word.charAt(0).toLocaleUpperCase('tr-TR');
      const rest = word.slice(1).toLocaleLowerCase('tr-TR');
      return first + rest;
    })
    .join(' ');
}

// 🇹🇷 Türkçe Kurallarına Uygun Tamamen BÜYÜK HARF ("akbalık" -> "AKBALIK", "ışık" -> "IŞIK")
export function formatTurkishUpperCase(str) {
  if (!str) return '';
  return str.toLocaleUpperCase('tr-TR');
}
