declare module "qrcode/lib/browser.js" {
  export function toString(text: string, opts: { type: "svg"; [key: string]: unknown }): Promise<string>;
}