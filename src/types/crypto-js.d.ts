declare module 'crypto-js' {
  interface WordArray {
    words: number[];
    sigBytes: number;
    toString(encoder?: any): string;
  }

  interface Encoder {
    stringify(wordArray: WordArray): string;
    parse(str: string): WordArray;
  }

  namespace enc {
    const Hex: Encoder;
    const Base64: Encoder;
    const Utf8: Encoder;
  }

  function MD5(message: string | WordArray): WordArray;

  const CryptoJS: {
    enc: typeof enc;
    MD5: typeof MD5;
  };

  export = CryptoJS;
}
