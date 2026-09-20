// Browser-based EXIF parser for extracting GPS and capture datetime from JPEG ArrayBuffer
export function parseExifGps(arrayBuffer) {
  try {
    const dataView = new DataView(arrayBuffer);
    if (dataView.byteLength < 4) return null;
    if (dataView.getUint16(0, false) !== 0xFFD8) {
      return null; // Not a JPEG
    }

    let offset = 2;
    const length = dataView.byteLength;

    while (offset < length) {
      if (dataView.getUint8(offset) !== 0xFF) return null;
      const marker = dataView.getUint8(offset + 1);

      if (marker === 0xE1) {
        // APP1 marker
        return parseExifBlock(dataView, offset + 4);
      } else if ((marker >= 0xE0 && marker <= 0xEF) || marker === 0xFE || marker === 0xDB || marker === 0xC0) {
        const markerLength = dataView.getUint16(offset + 2, false);
        offset += 2 + markerLength;
      } else {
        offset += 2;
      }
    }
  } catch (err) {
    console.warn('EXIF parse error:', err);
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
        // GPSInfo tag
        gpsOffset = dataView.getUint32(entryOffset + 8, isLittle);
      } else if (tag === 0x0132 || tag === 0x9003) {
        // DateTime or DateTimeOriginal
        const strOffset = dataView.getUint32(entryOffset + 8, isLittle);
        dateTimeOriginal = readAscii(dataView, tiffStart + strOffset, 19);
      }
    }

    if (!gpsOffset) return null;

    const gpsEntries = dataView.getUint16(tiffStart + gpsOffset, isLittle);
    let latValues = null;
    let latRef = 'N';
    let lonValues = null;
    let lonRef = 'E';

    for (let i = 0; i < gpsEntries; i++) {
      const entryOffset = tiffStart + gpsOffset + 2 + i * 12;
      const tag = dataView.getUint16(entryOffset, isLittle);

      if (tag === 0x0001) {
        latRef = String.fromCharCode(dataView.getUint8(entryOffset + 8));
      } else if (tag === 0x0002) {
        const offsetToVals = dataView.getUint32(entryOffset + 8, isLittle);
        latValues = readRationals(dataView, tiffStart + offsetToVals, isLittle, 3);
      } else if (tag === 0x0003) {
        lonRef = String.fromCharCode(dataView.getUint8(entryOffset + 8));
      } else if (tag === 0x0004) {
        const offsetToVals = dataView.getUint32(entryOffset + 8, isLittle);
        lonValues = readRationals(dataView, tiffStart + offsetToVals, isLittle, 3);
      }
    }

    if (latValues && lonValues) {
      let lat = latValues[0] + latValues[1] / 60.0 + latValues[2] / 3600.0;
      if (latRef !== 'N') lat = -lat;

      let lon = lonValues[0] + lonValues[1] / 60.0 + lonValues[2] / 3600.0;
      if (lonRef !== 'E') lon = -lon;

      return {
        latitude: parseFloat(lat.toFixed(6)),
        longitude: parseFloat(lon.toFixed(6)),
        timestamp: dateTimeOriginal || null
      };
    }
  } catch (e) {
    console.warn('Failed parsing EXIF details:', e);
  }
  return null;
}

function readAscii(dataView, offset, length) {
  let str = '';
  for (let i = 0; i < length; i++) {
    const code = dataView.getUint8(offset + i);
    if (code === 0) break;
    str += String.fromCharCode(code);
  }
  return str;
}

function readRationals(dataView, offset, isLittle, count) {
  const vals = [];
  for (let i = 0; i < count; i++) {
    const num = dataView.getUint32(offset + i * 8, isLittle);
    const den = dataView.getUint32(offset + i * 8 + 4, isLittle);
    vals.push(den === 0 ? 0 : num / den);
  }
  return vals;
}

// Extracts EXIF GPS metadata from a browser File / Blob
export async function extractExifGps(file) {
  if (!file || !file.type.includes('jpeg') && !file.type.includes('jpg')) {
    return null;
  }
  try {
    const arrayBuffer = await file.slice(0, 131072).arrayBuffer(); // First 128KB is plenty for EXIF
    return parseExifGps(arrayBuffer);
  } catch (err) {
    console.warn('Error reading file arrayBuffer for EXIF:', err);
    return null;
  }
}

// Stamps a high-visibility, professional Geotag Overlay onto an image file
export async function stampGeotagOnImage(file, { latitude, longitude, wardName, timestamp }) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        // Draw base photo
        ctx.drawImage(img, 0, 0);

        // Watermark banner styling
        const barHeight = Math.max(54, Math.round(canvas.height * 0.085));
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);

        // Accent top border line
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(0, canvas.height - barHeight, canvas.width, Math.max(3, Math.round(barHeight * 0.06)));

        // Text typography
        const fontSize = Math.max(14, Math.round(barHeight * 0.28));
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

        ctx.fillText(line1, 20, canvas.height - barHeight + fontSize + 8);
        ctx.font = 'normal ' + Math.round(fontSize * 0.9) + 'px sans-serif';
        ctx.fillStyle = '#93c5fd';
        ctx.fillText(line2, 20, canvas.height - 12);

        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const stampedFile = new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() });
          resolve(stampedFile);
        }, 'image/jpeg', 0.92);
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
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('en-IN', {
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
