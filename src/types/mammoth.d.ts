declare module 'mammoth/mammoth.browser' {
  export interface ExtractRawTextOptions {
    arrayBuffer: ArrayBuffer
  }
  export interface ExtractRawTextResult {
    value: string
    messages: unknown[]
  }
  export function extractRawText(options: ExtractRawTextOptions): Promise<ExtractRawTextResult>
}
