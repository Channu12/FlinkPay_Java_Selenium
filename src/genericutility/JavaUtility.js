// Port of org.tyss.flinkpay.genericutility.JavaUtility
// Includes a small java.text.SimpleDateFormat-compatible formatter so the generated
// transaction ids / dates are identical to the Java framework (e.g. "TR" + yyyyMMddhhmmssSSS).

const pad = (n, len = 2) => String(n).padStart(len, '0');

/**
 * Formats a Date with a SimpleDateFormat pattern.
 * Supported tokens: yyyy, yy, MM, dd, HH, hh, mm, ss, SSS, a and 'quoted literals'.
 */
function formatDate(date, pattern) {
  let out = '';
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i];
    if (ch === "'") {
      // quoted literal
      const end = pattern.indexOf("'", i + 1);
      if (end === i + 1) { out += "'"; i += 2; continue; }
      out += pattern.substring(i + 1, end === -1 ? pattern.length : end);
      i = end === -1 ? pattern.length : end + 1;
      continue;
    }
    if (/[A-Za-z]/.test(ch)) {
      let j = i;
      while (j < pattern.length && pattern[j] === ch) j++;
      const len = j - i;
      switch (ch) {
        case 'y': out += len === 2 ? pad(date.getFullYear() % 100) : pad(date.getFullYear(), len); break;
        case 'M': out += pad(date.getMonth() + 1, len); break;
        case 'd': out += pad(date.getDate(), len); break;
        case 'H': out += pad(date.getHours(), len); break;
        case 'h': { const h = date.getHours() % 12; out += pad(h === 0 ? 12 : h, len); break; }
        case 'm': out += pad(date.getMinutes(), len); break;
        case 's': out += pad(date.getSeconds(), len); break;
        case 'S': out += pad(date.getMilliseconds(), 3).substring(0, Math.max(len, 3)); break;
        case 'a': out += date.getHours() < 12 ? 'AM' : 'PM'; break;
        default: out += pattern.substring(i, j);
      }
      i = j;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

class JavaUtility {
  getDateAndTimeInSpecifiedFormat(format) {
    return formatDate(new Date(), format);
  }

  getRandomNumber(range) {
    return Math.floor(Math.random() * range);
  }

  getCurrentProjectDirectory() {
    return process.cwd();
  }

  // function to generate a random string of length n
  getRandomAlphaNumericString(n) {
    const AlphaNumericString = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' + '0123456789' + 'abcdefghijklmnopqrstuvxyz';
    let sb = '';
    for (let i = 0; i < n; i++) {
      sb += AlphaNumericString.charAt(Math.floor(AlphaNumericString.length * Math.random()));
    }
    return sb;
  }

  generateDateWithOffset(offset, format) {
    const d = new Date();
    d.setDate(d.getDate() + parseInt(offset, 10));
    return formatDate(d, format);
  }

  /** Equivalent of Thread.sleep(ms) */
  async sleep(ms) {
    await new Promise((r) => setTimeout(r, ms));
  }
}

module.exports = { JavaUtility, formatDate };
