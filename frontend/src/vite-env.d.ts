/// <reference types="vite/client" />

declare module '*.jpg' {
  const src: string
  export default src
}

declare module 'pdfjs-dist/build/pdf.worker?url' {
  const src: string
  export default src
}
