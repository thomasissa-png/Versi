declare module "heic-convert" {
  interface HeicConvertInput {
    buffer: ArrayBuffer | Buffer;
    format: "JPEG" | "PNG";
    quality?: number;
  }
  function heicConvert(input: HeicConvertInput): Promise<ArrayBuffer>;
  export default heicConvert;
  export = heicConvert;
}
