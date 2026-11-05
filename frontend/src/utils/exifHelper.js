// Browser-based EXIF parser for extracting GPS and capture datetime from JPEG ArrayBuffer
export function parseExifGps(arrayBuffer) {
  try {
    const dataView = new DataView(arrayBuffer);
    if (dataView.byteLength < 4) return null;

    if (dataView.getUint16(0, false) === 0xFFD8) {
      let offset = 2;
      const length = dataView.byteLength;

      while (offset < length) {
        if (dataView.getUint8(offset) !== 0xFF) return null;
        const marker = dataView.getUint8(offset + 1);

        if (marker === 0xE1) {
          return parseExifBlock(dataView, offset + 4);
        } else if ((marker >= 0xE0 && marker <= 0xEF) || marker === 0xFE || marker === 0xDB || marker === 0xC0) {
          const markerLength = dataView.getUint16(offset + 2, false);
          offset += 2 + markerLength;
        } else {
          offset += 2;
        }
      }
    }

    if (dataView.byteLength > 8 && String.fromCharCode(
      dataView.getUint8(0),
      dataView.getUint8(1),
      dataView.getUint8(2),
      dataView.getUint8(3),
      dataView.getUint8(4),
      dataView.getUint8(5),
      dataView.getUint8(6),
      dataView.getUint8(7)
    ) === '\x89PNG\r\n\x1a\n') {
      return parsePngExif(dataView);
    }
  } catch (err) {
    console.warn('EXIF parse error:', err);
  }
  return null;
}

function parsePngExif(dataView) {
  try {
    let offset = 8;
    const length = dataView.byteLength;

    while (offset + 8 <= length) {
      const chunkLength = dataView.getUint32(offset, false);
      const chunkTypeBytes = [
        dataView.getUint8(offset + 4),
        dataView.getUint8(offset + 5),
        dataView.getUint8(offset + 6),
        dataView.getUint8(offset + 7)
      ];
      const chunkType = String.fromCharCode(...chunkTypeBytes);
      const chunkDataStart = offset + 8;
      const chunkDataEnd = chunkDataStart + chunkLength;

      if (chunkType === 'eXIf' && chunkLength >= 6) {
        const exifHeader = String.fromCharCode(
          dataView.getUint8(chunkDataStart),
          dataView.getUint8(chunkDataStart + 1),
          dataView.getUint8(chunkDataStart + 2),
          dataView.getUint8(chunkDataStart + 3),
          dataView.getUint8(chunkDataStart + 4),
          dataView.getUint8(chunkDataStart + 5)
        );
        if (exifHeader === 'Exif\x00\x00') {
          return parseExifBlock(dataView, chunkDataStart + 6);
        }
      }

      offset = chunkDataEnd + 4;
    }
  } catch (err) {
    console.warn('PNG EXIF parse error:', err);
  }
  return null;
}

function parseExifBlock(dataView, start) {
  try {
    const exifHeader = String.fromCharCode(
      dataView.getUint8(start),
      dataView.getUint8(start + 1),
      dataView.getUint8(start + 2),
      dataView.getUint8(start + 3)
    );
    if (exifHeader !== 'Exif') return null;

    const tiffStart = start + 6;
    const isLittle = dataView.getUint16(tiffStart, false) === 0x4949; // 'II'

    const firstIFDOffset = dataView.getUint32(tiffStart + 4, isLittle);
    if (firstIFDOffset < 0x00000008) return null;

    let gpsOffset = null;
    let dateTimeOriginal = null;
    const numEntries = dataView.getUint16(tiffStart + firstIFDOffset, isLittle);

    for (let i = 0; i < numEntries; i++) {
      const entryOffset = tiffStart + firstIFDOffset + 2 + i * 12;
      const tag = dataView.getUint16(entryOffset, isLittle);
      if (tag === 0x8825) {
        gpsOffset = dataView.getUint32(entryOffset + 8, isLittle);
      } else if (tag === 0x0132 || tag === 0x9003) {
        const valueOffset = dataView.getUint32(entryOffset + 8, isLittle);
        const count = dataView.getUint32(entryOffset + 4, isLittle);
        const type = dataView.getUint16(entryOffset + 2, isLittle);
        if (type === 2 && count > 0) {
          dateTimeOriginal = readAscii(dataView, tiffStart + valueOffset, count);
        }
      }
    }

    if (gpsOffset === null) return null;

    const gpsStart = tiffStart + gpsOffset;
    const gpsEntries = dataView.getUint16(gpsStart, isLittle);
    let latValues = null;
    let latRef = 'N';
    let lonValues = null;
    let lonRef = 'E';

    for (let i = 0; i < gpsEntries; i++) {
      const entryOffset = gpsStart + 2 + i * 12;
      const tag = dataView.getUint16(entryOffset, isLittle);
      const type = dataView.getUint16(entryOffset + 2, isLittle);
      const count = dataView.getUint32(entryOffset + 4, isLittle);
      const valueOrOffset = dataView.getUint32(entryOffset + 8, isLittle);

      if (tag === 0x0001) {
        latRef = readAsciiValue(dataView, tiffStart + valueOrOffset, type, count, isLittle, 2).charAt(0) || 'N';
      } else if (tag === 0x0002) {
        latValues = readRationals(dataView, tiffStart + valueOrOffset, isLittle, count);
      } else if (tag === 0x0003) {
        lonRef = readAsciiValue(dataView, tiffStart + valueOrOffset, type, count, isLittle, 2).charAt(0) || 'E';
      } else if (tag === 0x0004) {
        lonValues = readRationals(dataView, tiffStart + valueOrOffset, isLittle, count);
      }
    }

    if (latValues && lonValues) {
      const lat = latValues[0] + latValues[1] / 60.0 + latValues[2] / 3600.0;
      const lon = lonValues[0] + lonValues[1] / 60.0 + lonValues[2] / 3600.0;

      return {
        latitude: parseFloat((latRef === 'S' ? -lat : lat).toFixed(6)),
        longitude: parseFloat((lonRef === 'W' ? -lon : lon).toFixed(6)),
        timestamp: dateTimeOriginal || null
      };
    }
  } catch (e) {
    console.warn('Failed parsing EXIF details:', e);
  }
  return null;
}

function readAsciiValue(dataView, startOffset, type, count, isLittle, fallbackLength = 2) {
  if (type === 2) {
    return readAscii(dataView, startOffset, count || fallbackLength);
  }

  if (type === 1 && count > 0) {
    const bytes = [];
    for (let i = 0; i < Math.min(count, 8); i++) {
      bytes.push(String.fromCharCode(dataView.getUint8(startOffset + i)));
    }
    return bytes.join('').trim();
  }

  return '';
}

function readAscii(dataView, offset, length) {
  let str = '';
  if (offset + length > dataView.byteLength) length = Math.max(0, dataView.byteLength - offset);
  for (let i = 0; i < length; i++) {
    const code = dataView.getUint8(offset + i);
    if (code === 0) break;
    str += String.fromCharCode(code);
  }
  return str.trim();
}

function readRationals(dataView, offset, isLittle, count) {
  const vals = [];
  if (offset + count * 8 > dataView.byteLength) return null;
  for (let i = 0; i < count; i++) {
    const num = dataView.getUint32(offset + i * 8, isLittle);
    const den = dataView.getUint32(offset + i * 8 + 4, isLittle);
    vals.push(den === 0 ? 0 : num / den);
  }
  return vals;
}

// Parse GPS coordinates from OCR text output (GPS Map Camera app overlays, etc.)
function parseGpsFromOcrText(text) {
  if (!text) return null;
  // Match patterns like: "Lat 12.297886° Long 76.652196°"
  // or "Latitude: 12.297886, Longitude: 76.652196"
  // or "12.297886, 76.652196"
  const latMatch = text.match(/Lat(?:itude)?[:\s°]*([0-9]{1,2}\.[0-9]{3,8})/i);
  const lonMatch = text.match(/Lon(?:g|gitude)?[:\s°]*([0-9]{2,3}\.[0-9]{3,8})/i);
  if (latMatch && lonMatch) {
    const lat = parseFloat(latMatch[1]);
    const lon = parseFloat(lonMatch[1]);
    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return { latitude: lat, longitude: lon, timestamp: null, source: 'ocr' };
    }
  }
  // Try matching pair of coordinates near each other
  const pairMatch = text.match(/([1-9][0-9]{0,1}\.[0-9]{4,8})\s*°?\s*[,\s]+\s*([0-9]{2,3}\.[0-9]{4,8})/);
  if (pairMatch) {
    const lat = parseFloat(pairMatch[1]);
    const lon = parseFloat(pairMatch[2]);
    if (lat >= 5 && lat <= 35 && lon >= 65 && lon <= 95) { // rough India bounding box
      return { latitude: lat, longitude: lon, timestamp: null, source: 'ocr' };
    }
  }
  return null;
}

// OCR-based GPS extraction for GPS Map Camera app images (burns coords as visible text)
async function extractGpsFromImageText(file) {
  try {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng');
    const imageUrl = URL.createObjectURL(file);
    const result = await worker.recognize(imageUrl);
    await worker.terminate();
    URL.revokeObjectURL(imageUrl);
    return parseGpsFromOcrText(result.data.text);
  } catch (err) {
    console.warn('OCR GPS extraction failed:', err);
    return null;
  }
}

// Extracts EXIF GPS metadata from a browser File / Blob.
export async function extractExifGps(file) {
  if (!file) return null;
  const isImage = (file.type && file.type.startsWith('image/')) ||
    (file.name && /\.(jpg|jpeg|png|webp|bmp|heic|heif)$/i.test(file.name));

  if (!isImage) return null;

  try {
    const sliceSize = Math.min(file.size, 2097152);
    const arrayBuffer = await file.slice(0, sliceSize).arrayBuffer();
    const exifResult = parseExifGps(arrayBuffer);
    if (exifResult && exifResult.latitude && exifResult.longitude) {
      return { ...exifResult, source: 'exif' };
    }

    const ocrResult = await extractGpsFromImageText(file);
    if (ocrResult && ocrResult.latitude && ocrResult.longitude) {
      return { ...ocrResult, source: 'ocr' };
    }
  } catch (err) {
    console.warn('Error in extractExifGps:', err);
  }
  return null;
}

// Stamps a high-visibility, professional Geotag Overlay onto an image file
export async function stampGeotagOnImage(file, { latitude, longitude, wardName, timestamp }) {
  return new Promise((resolve) => {
    // Safety timeout: always resolve within 2.5 seconds to never hang the UI
    const timeoutId = setTimeout(() => {
      resolve(file);
    }, 2500);

    const finish = (resultFile) => {
      clearTimeout(timeoutId);
      resolve(resultFile || file);
    };

    const reader = new FileReader();
    reader.onerror = () => finish(file);
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => finish(file);
      img.onload = () => {
        try {
          // Scale to max dimension 1280px for fast upload and minimal server memory footprint
          const maxDim = 1280;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          // Draw base photo
          ctx.drawImage(img, 0, 0, width, height);

          // Watermark banner styling
          const barHeight = Math.max(50, Math.round(canvas.height * 0.085));
          ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
          ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);

          // Accent top border line
          ctx.fillStyle = '#0284c7';
          ctx.fillRect(0, canvas.height - barHeight, canvas.width, Math.max(3, Math.round(barHeight * 0.06)));

          // Text typography
          const fontSize = Math.max(13, Math.round(barHeight * 0.28));
          ctx.font = 'bold ' + fontSize + 'px sans-serif';
          ctx.fillStyle = '#ffffff';

          const latStr = typeof latitude === 'number' ? latitude.toFixed(5) : latitude;
          const lonStr = typeof longitude === 'number' ? longitude.toFixed(5) : longitude;
          const formattedTime = timestamp || new Date().toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          });

          const line1 = `📍 MCC GEOTAG | Lat: ${latStr}°, Lng: ${lonStr}°`;
          const line2 = (wardName ? `Ward: ${wardName} | ` : '') + `Time: ${formattedTime}`;

          ctx.fillText(line1, 16, canvas.height - barHeight + fontSize + 8);
          ctx.font = 'normal ' + Math.round(fontSize * 0.9) + 'px sans-serif';
          ctx.fillStyle = '#93c5fd';
          ctx.fillText(line2, 16, canvas.height - 10);

          canvas.toBlob((blob) => {
            if (!blob) {
              finish(file);
              return;
            }
            const cleanName = (file.name || 'complaint.jpg').replace(/\.[^/.]+$/, "") + ".jpg";
            const stampedFile = new File([blob], cleanName, { type: 'image/jpeg', lastModified: Date.now() });
            finish(stampedFile);
          }, 'image/jpeg', 0.88);
        } catch (err) {
          console.warn('Canvas stamping error:', err);
          finish(file);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Utility to format date and time nicely across the app
export function formatDateTime(isoString) {
  if (!isoString) return 'N/A';
  try {
    let raw = String(isoString).trim();
    // Normalize date strings without timezone indicator to UTC
    if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(raw)) {
      raw = raw.replace(' ', 'T') + 'Z';
    }
    const d = new Date(raw);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return isoString;
  }
}
