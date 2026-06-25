"use client";

import { pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure the pdf.js worker. react-pdf 9 uses pdfjs-dist 4 which ships an
// .mjs worker. Bundling that worker through webpack/Terser breaks the build, so
// instead we serve it as a static asset from /public (copied there by the
// project's postinstall "copy-pdf-worker" script) and point workerSrc at it.
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export { pdfjs };
