export interface SeoHowToStep {
  stepNumber: number;
  title: string;
  description: string;
}

export interface SeoSupportedFormat {
  category: string;
  formats: string[];
  note: string;
}

export interface SeoFaqItem {
  question: string;
  answer: string;
}

export interface SeoRelatedTool {
  name: string;
  path: string;
  description: string;
  badge?: string;
}

export interface SeoPageConfig {
  path: string;
  view: "home" | "background-remover" | "file-tools" | "screenshot-ai" | "scam-checker" | "pricing" | "about" | "privacy" | "terms";
  subtool?: string;
  title: string;
  metaDescription: string;
  h1: string;
  badge: string;
  subheading: string;
  introParagraph: string;
  howToSteps: SeoHowToStep[];
  supportedFormats: SeoSupportedFormat[];
  technicalSpecifications: { label: string; value: string }[];
  limitations: string[];
  privacyCommitment: string;
  faqs: SeoFaqItem[];
  relatedTools: SeoRelatedTool[];
  schemaType: "WebApplication" | "WebSite" | "Organization" | "AboutPage" | "WebPage";
  appCategory?: string;
  operatingSystem?: string;
}

export const SEO_PAGES: Record<string, SeoPageConfig> = {
  "/": {
    path: "/",
    view: "home",
    title: "Free AI Tools for Files, Images & Security | Smart AI",
    metaDescription:
      "All-in-one AI utility platform to analyze screenshots, remove image backgrounds, convert PDF and office files, and inspect suspicious scam messages and links.",
    h1: "One Smart Place for Everyday Digital Problems",
    badge: "Production AI Utilities",
    subheading: "Understand screenshots, convert everyday files, and detect scam signals with dependable AI tools.",
    introParagraph:
      "Smart AI provides immediate, real-world utility software designed for everyday digital tasks. With our server-side neural segmentation, optical character recognition (OCR), document converters, and multimodal screenshot intelligence, you can solve common computer and smartphone challenges in seconds without predatory subscriptions or privacy loss.",
    howToSteps: [
      {
        stepNumber: 1,
        title: "Choose a Specialized Smart AI Tool",
        description: "Select from AI Background Removal, PDF and Image Converters, Multimodal Screenshot AI, or Scam and Threat Intelligence.",
      },
      {
        stepNumber: 2,
        title: "Upload Your Content or Paste Text",
        description: "Upload an image, PDF document, or paste a suspicious message or URL directly into the secure interface.",
      },
      {
        stepNumber: 3,
        title: "Receive Instant, High-Fidelity Results",
        description: "Inspect the processed output, review AI explanations, or download your converted files immediately.",
      },
    ],
    supportedFormats: [
      { category: "Images", formats: ["JPG", "JPEG", "PNG", "WEBP"], note: "Up to 15MB per file with true alpha channel support" },
      { category: "Documents", formats: ["PDF", "DOCX"], note: "Multi-page documents with native vector flow and OCR" },
      { category: "Threat Scans", formats: ["SMS Text", "Email Body", "HTTPS URLs"], note: "Analyzed in isolated secure sandbox memory" },
    ],
    technicalSpecifications: [
      { label: "Max File Upload", value: "15 MB (Immediate In-Memory Processing)" },
      { label: "Privacy Architecture", value: "Zero Permanent Storage • Volatile RAM Only" },
      { label: "Processing Latency", value: "Sub-Second to 3 Seconds for Typical Documents" },
      { label: "Client Platform", value: "Web, Mobile, Tablet, Desktop (No App Install Required)" },
    ],
    limitations: [
      "Maximum single upload file size is 15MB for anonymous and standard accounts.",
      "Scam Checker provides analytical risk scores (0–100) based on known deception patterns; always verify financial claims with official institutions.",
      "Temporary processing sessions expire automatically to safeguard user confidentiality.",
    ],
    privacyCommitment:
      "Your documents, images, and text inputs are held only in temporary volatile server memory during active transformation and are permanently cleared. We never sell, train public models on, or monetize your personal files.",
    faqs: [
      {
        question: "Is Smart AI free to use?",
        answer: "Yes. Smart AI provides generous daily free allowances across all tools with zero credit card requirements. Optional Pro access is available for high-volume users.",
      },
      {
        question: "Does Smart AI keep copies of uploaded files?",
        answer: "No. All files are processed strictly in volatile memory. As soon as processing and downloads are complete or sessions expire, data is discarded.",
      },
      {
        question: "Do the tools use real AI or simulated animations?",
        answer: "Every single tool executes authentic backend operations: deep learning segmentation for background removal, Tesseract and Gemini multimodal vision for text extraction, and binary parsing for PDF and DOCX documents.",
      },
      {
        question: "Can I use Smart AI on mobile devices?",
        answer: "Yes. Smart AI is fully responsive and optimized for mobile touchscreens, smartphone cameras, tablet interfaces, and modern desktop browsers.",
      },
    ],
    relatedTools: [
      { name: "AI Background Remover", path: "/image-background-remover", description: "Segment subjects and replace backdrops with true RGBA transparency." },
      { name: "JPG to PDF Converter", path: "/jpg-to-pdf", description: "Convert photos into clean multi-page PDF documents." },
      { name: "Screenshot AI", path: "/screenshot-ai", description: "Explain error messages and extract text from screen captures." },
      { name: "Scam Checker", path: "/scam-checker", description: "Evaluate suspicious emails, texts, and links for fraud signals." },
    ],
    schemaType: "WebSite",
  },

  "/image-background-remover": {
    path: "/image-background-remover",
    view: "background-remover",
    title: "Remove Image Background Online with AI | Smart AI",
    metaDescription:
      "Remove image backgrounds with AI. Create clean transparent cutouts, crisp white backdrops, and custom colors with full original resolution retention.",
    h1: "AI Background Remover & HD Replacement",
    badge: "Deep Neural Segmentation",
    subheading: "Accurate foreground separation, crisp hair and skin boundaries, and studio backdrop replacement.",
    introParagraph:
      "Smart AI's Background Remover utilizes state-of-the-art neural subject segmentation to isolate portraits, products, and objects with pixel-level precision. Unlike tools that downsample imagery or apply naive edge feathering, our engine preserves 100% of your source image's original dimensions and RGB fidelity while delivering genuine RGBA alpha channel cutouts or studio backdrop recompositions.",
    howToSteps: [
      {
        stepNumber: 1,
        title: "Upload Your Photo",
        description: "Drag and drop or select any JPG, PNG, or WEBP portrait, product photo, or graphic up to 15MB.",
      },
      {
        stepNumber: 2,
        title: "Instant Neural Segmentation",
        description: "The AI engine detects foreground subjects, extracts edge boundaries, and removes the background in under 2 seconds.",
      },
      {
        stepNumber: 3,
        title: "Select Backdrop or Custom Palette",
        description: "Choose pure transparent alpha, studio white, off-white, light gray, sky blue, or a custom backdrop.",
      },
      {
        stepNumber: 4,
        title: "Download Full-Resolution Output",
        description: "Export full-resolution transparent PNG, HD PNG, flattened JPG, or lossless WEBP files with 1:1 dimension preservation.",
      },
    ],
    supportedFormats: [
      { category: "Input Formats", formats: ["JPG", "JPEG", "PNG", "WEBP"], note: "RGB and RGBA photos up to 15MB and 4K resolution" },
      { category: "Output Formats", formats: ["PNG (Alpha)", "JPG (Flattened)", "WEBP (Lossless)"], note: "True 32-bit RGBA transparency or solid backdrops" },
      { category: "Backdrops", formats: ["Transparent", "White (#ffffff)", "Off-White (#f8fafc)", "Light Gray (#e5e7eb)", "Sky Blue (#38bdf8)", "Custom Hex"], note: "Sub-second live recompositing" },
    ],
    technicalSpecifications: [
      { label: "Alpha Channel", value: "Full 8-bit Alpha Mask (256 gradations of transparency)" },
      { label: "Resolution Retention", value: "100% 1:1 Source Dimension Preservation (Zero Downsampling)" },
      { label: "Recomposite Engine", value: "Server-side Sharp + Canvas compositing pipeline" },
      { label: "Session Persistence", value: "Dual-Tier Memory + Encrypted Disk Cache" },
    ],
    limitations: [
      "Extremely blurry or heavily occluded subjects may require clean edge contrast.",
      "Input files exceeding 15MB must be compressed prior to upload.",
      "Animation frames (animated GIF/APNG) are processed as single static frames.",
    ],
    privacyCommitment:
      "Uploaded photos are processed exclusively in volatile memory and cached temporarily for active re-compositing sessions. Your photos are never shared, displayed publicly, or used for model training.",
    faqs: [
      {
        question: "Does this tool really remove backgrounds automatically?",
        answer: "Yes. Smart AI uses machine-learning segmentation models running on our backend to automatically distinguish subjects from their backgrounds without manual brushwork.",
      },
      {
        question: "Can I download a transparent background PNG?",
        answer: "Yes. Simply select the 'Transparent' option and click 'Download Transparent PNG' or 'HD PNG' to receive a true 32-bit RGBA PNG with alpha transparency.",
      },
      {
        question: "Does the output image lose resolution or quality?",
        answer: "No. The system preserves the exact 1:1 pixel dimensions and color space of your source image. No downscaling or compression artifacts are introduced.",
      },
      {
        question: "Can I change the background to white or custom colors?",
        answer: "Yes. You can switch between Transparent, White, Off-White, Light Gray, Sky Blue, or enter any custom hex color code. Recompositing completes in under 200ms.",
      },
    ],
    relatedTools: [
      { name: "JPG to PDF Converter", path: "/jpg-to-pdf", description: "Package your photos and cutouts into professional PDF documents." },
      { name: "Screenshot AI", path: "/screenshot-ai", description: "Analyze product photos, receipts, and screen captures." },
      { name: "File Tools", path: "/file-tools", description: "Resize, compress, and convert between image formats." },
    ],
    schemaType: "WebApplication",
    appCategory: "MultimediaApplication",
  },

  "/jpg-to-pdf": {
    path: "/jpg-to-pdf",
    view: "file-tools",
    subtool: "jpg-to-pdf",
    title: "Convert JPG Images to PDF Document Online | Smart AI",
    metaDescription:
      "Convert JPG and JPEG images to clean, multi-page PDF documents online. Reorder images, preserve original aspect ratios, and choose custom page sizes.",
    h1: "JPG to PDF Converter",
    badge: "Aspect-Preserving PDF Engine",
    subheading: "Combine photos, scans, and graphic files into clean, professional PDF documents.",
    introParagraph:
      "Smart AI's JPG to PDF Converter transforms JPEG and JPG images into organized, multi-page PDF documents. Unlike generic tools that distort image proportions, crop margins awkwardly, or introduce compression artifacts, our binary PDF compiler precisely calculates dimensions, supports standard A4 and Letter standards, and preserves full optical fidelity.",
    howToSteps: [
      {
        stepNumber: 1,
        title: "Upload Your JPG Images",
        description: "Upload one or multiple JPG or JPEG files using drag-and-drop or file selection.",
      },
      {
        stepNumber: 2,
        title: "Reorder & Configure Layout",
        description: "Arrange image page order and configure page sizing (Auto, A4, Letter), orientation, and page margins.",
      },
      {
        stepNumber: 3,
        title: "Convert to PDF",
        description: "Click Convert to build a unified vector-compliant PDF document in real time.",
      },
      {
        stepNumber: 4,
        title: "Download Document",
        description: "Download your completed PDF document with 100% aspect ratio preservation.",
      },
    ],
    supportedFormats: [
      { category: "Supported Inputs", formats: ["JPG", "JPEG"], note: "Up to 30 images in a single batch conversion" },
      { category: "Output Format", formats: ["PDF (.pdf)"], note: "ISO 32000-1 compliant PDF document" },
      { category: "Page Sizing", formats: ["Auto (Image Bounds)", "Standard A4", "US Letter"], note: "Portrait, Landscape, or Auto orientation" },
    ],
    technicalSpecifications: [
      { label: "Engine", value: "pdf-lib vector compiler with lossless binary embedding" },
      { label: "Aspect Ratio", value: "100% Proportional Preserved (Zero Distortion)" },
      { label: "Batch Capacity", value: "Up to 30 images per single PDF compile" },
      { label: "Security", value: "Direct in-memory compilation without disk artifacts" },
    ],
    limitations: [
      "Total batch payload size is limited to 15MB for anonymous access.",
      "Corrupted or zero-byte files are rejected to protect PDF integrity.",
    ],
    privacyCommitment:
      "Images compiled into PDFs are processed strictly in volatile memory. No permanent copies or searchable archives are stored on our servers.",
    faqs: [
      {
        question: "Can I convert multiple JPG images into a single multi-page PDF?",
        answer: "Yes. You can upload up to 30 JPG files at once, reorder them as desired, and compile them into a single multi-page PDF document.",
      },
      {
        question: "Will my images be stretched or distorted in the PDF?",
        answer: "No. Smart AI calculates bounding boxes to ensure every image retains its exact original aspect ratio and clarity.",
      },
      {
        question: "Can I choose between A4 and Letter page sizes?",
        answer: "Yes. You can choose 'Auto' to fit each image exactly, or enforce standard 'A4' or 'US Letter' paper dimensions with custom margins.",
      },
      {
        question: "Is there any watermark on the exported PDF?",
        answer: "No. Smart AI produces clean, watermark-free PDF documents.",
      },
    ],
    relatedTools: [
      { name: "PDF to JPG Converter", path: "/pdf-to-jpg", description: "Extract pages from existing PDF files into high-resolution JPG images." },
      { name: "JPG to Word Converter", path: "/jpg-to-word", description: "Extract text from image scans into editable Word documents." },
      { name: "AI Background Remover", path: "/image-background-remover", description: "Clean up photos before compiling into PDFs." },
    ],
    schemaType: "WebApplication",
    appCategory: "UtilitiesApplication",
  },

  "/pdf-to-jpg": {
    path: "/pdf-to-jpg",
    view: "file-tools",
    subtool: "pdf-to-jpg",
    title: "Convert PDF Pages to JPG Images Online | Smart AI",
    metaDescription:
      "Convert PDF pages to high-resolution JPG images online. Extract single pages or download all pages in a convenient ZIP archive with zero quality loss.",
    h1: "PDF to JPG Converter",
    badge: "High-DPI PDF Rendering",
    subheading: "Extract crisp, high-resolution JPEG images from multi-page PDF documents.",
    introParagraph:
      "Smart AI's PDF to JPG Converter renders vector PDF pages into high-definition JPEG images. Powered by server-side canvas rendering, it accurately reproduces embedded fonts, vector illustrations, complex tables, and high-resolution photography at customizable DPI scales with optional ZIP archiving for multi-page extractions.",
    howToSteps: [
      {
        stepNumber: 1,
        title: "Upload Your PDF Document",
        description: "Select or drag and drop any standard PDF document up to 15MB.",
      },
      {
        stepNumber: 2,
        title: "Select Page Range & Resolution",
        description: "Choose to extract 'all' pages or specific pages (e.g. 1, 3, 5-8), and select 1x, 2x, or 3x DPI quality.",
      },
      {
        stepNumber: 3,
        title: "Render Pages to JPG",
        description: "The server renders each selected page to a high-density RGB JPEG buffer.",
      },
      {
        stepNumber: 4,
        title: "Download JPG or ZIP Archive",
        description: "Download a single JPEG for one page, or an organized ZIP package containing all rendered page images.",
      },
    ],
    supportedFormats: [
      { category: "Input", formats: ["PDF (.pdf)"], note: "Encrypted PDFs require passwords; standard PDFs supported up to 15MB" },
      { category: "Output", formats: ["JPG / JPEG", "ZIP Archive (.zip)"], note: "Customizable rendering scale up to 300 DPI" },
    ],
    technicalSpecifications: [
      { label: "Rendering Engine", value: "Server-side headless Canvas + PDF.js rasterizer" },
      { label: "DPI Scaling", value: "1.0x (Standard), 2.0x (High-Res 150 DPI), 3.0x (Ultra 300 DPI)" },
      { label: "Packaging", value: "Automated JSZip multi-page packaging" },
      { label: "Color Space", value: "RGB sRGB with 90%+ quality compression" },
    ],
    limitations: [
      "Password-protected or encrypted PDF documents must be unlocked before conversion.",
      "Extremely long documents (>50 pages) may take several seconds to render completely.",
    ],
    privacyCommitment:
      "PDF pages are rendered in sandboxed memory. Neither the source document nor the extracted images are persisted permanently.",
    faqs: [
      {
        question: "How do I convert an entire multi-page PDF into images?",
        answer: "Keep the page selection set to 'all'. Smart AI will render each page sequentially and package them into an organized ZIP archive containing page-01.jpg, page-02.jpg, etc.",
      },
      {
        question: "Can I convert just a single page from a PDF?",
        answer: "Yes. Specify the page number (e.g. '1' or '3') in the page selection field, and the tool will deliver a direct JPG download.",
      },
      {
        question: "Is text and line art sharp in the converted JPGs?",
        answer: "Yes. We render pages at 2.0x or 3.0x supersampling so that small text and thin line art remain crisp and legible.",
      },
    ],
    relatedTools: [
      { name: "JPG to PDF Converter", path: "/jpg-to-pdf", description: "Convert images back into PDF documents." },
      { name: "PDF to Word Converter", path: "/pdf-to-word", description: "Convert PDF documents into editable Word files." },
      { name: "Screenshot AI", path: "/screenshot-ai", description: "Analyze extracted page images for summaries and error diagnostics." },
    ],
    schemaType: "WebApplication",
    appCategory: "UtilitiesApplication",
  },

  "/jpg-to-word": {
    path: "/jpg-to-word",
    view: "file-tools",
    subtool: "jpg-to-word",
    title: "Convert JPG Image to Editable Word Document | Smart AI",
    metaDescription:
      "Convert JPG images into editable Microsoft Word (.docx) documents with AI optical character recognition (OCR). Preserves text layout and formatting.",
    h1: "JPG to Word Converter",
    badge: "AI Optical Character Recognition",
    subheading: "Extract text, headings, and data tables from images directly into editable .docx documents.",
    introParagraph:
      "Smart AI's JPG to Word Converter applies optical character recognition (OCR) and layout analysis to transform photos of documents, receipts, invoices, book pages, and whiteboard notes into editable Microsoft Word (.docx) documents. The engine detects paragraph structures, table columns, and formatted text, producing a clean document ready for editing.",
    howToSteps: [
      {
        stepNumber: 1,
        title: "Upload an Image Containing Text",
        description: "Upload a JPG, JPEG, or scan of a document, invoice, form, or article.",
      },
      {
        stepNumber: 2,
        title: "Configure Word Output Options",
        description: "Choose whether to include the original image as a reference header inside the generated .docx.",
      },
      {
        stepNumber: 3,
        title: "Automatic OCR Extraction",
        description: "The OCR engine parses character boundaries, paragraphs, and tabular structures.",
      },
      {
        stepNumber: 4,
        title: "Download Editable .docx",
        description: "Open and edit the converted document in Microsoft Word, Google Docs, or LibreOffice.",
      },
    ],
    supportedFormats: [
      { category: "Input", formats: ["JPG", "JPEG", "PNG", "WEBP"], note: "High contrast scans and readable text photos" },
      { category: "Output", formats: ["Microsoft Word (.docx)"], note: "Office Open XML (.docx) with editable text and tables" },
    ],
    technicalSpecifications: [
      { label: "OCR Engine", value: "Tesseract OCR neural engine with word confidence scoring" },
      { label: "Document Standard", value: "ECMA-376 Office Open XML (.docx)" },
      { label: "Layout Detection", value: "Automatic heading detection, paragraphs, and multi-column tables" },
      { label: "Compatibility", value: "Microsoft Word, Google Docs, Apple Pages, LibreOffice" },
    ],
    limitations: [
      "Handwritten notes with irregular cursive may yield lower OCR accuracy than printed typography.",
      "Low-resolution or severely distorted images should be re-photographed under bright, even lighting.",
    ],
    privacyCommitment:
      "Document scans and extracted text are processed in volatile memory. No permanent records or searchable indexes are created.",
    faqs: [
      {
        question: "Can I edit the text after opening the downloaded file?",
        answer: "Yes. The generated file is a genuine Microsoft Word (.docx) file containing selectable, editable paragraphs, headings, and table cells.",
      },
      {
        question: "Does it support tables and columns?",
        answer: "Yes. Smart AI's layout engine detects column gaps and tabular borders, converting them into structured Microsoft Word tables.",
      },
      {
        question: "What languages can the OCR recognize?",
        answer: "The engine is optimized for English, Latin scripts, numbers, invoices, code, and financial documents.",
      },
    ],
    relatedTools: [
      { name: "PNG to Word Converter", path: "/png-to-word", description: "Convert PNG graphics and screenshot captures into editable Word files." },
      { name: "PDF to Word Converter", path: "/pdf-to-word", description: "Convert digital and scanned PDF files into Word format." },
      { name: "Screenshot AI", path: "/screenshot-ai", description: "Instant text extraction with 1-click clipboard copy." },
    ],
    schemaType: "WebApplication",
    appCategory: "UtilitiesApplication",
  },

  "/png-to-word": {
    path: "/png-to-word",
    view: "file-tools",
    subtool: "png-to-word",
    title: "Convert PNG Image to Editable Word Document | Smart AI",
    metaDescription:
      "Convert PNG graphics and screenshots into editable Word (.docx) files. Extracts text using high-accuracy OCR with table and heading detection.",
    h1: "PNG to Word Converter",
    badge: "High-Fidelity OCR Extraction",
    subheading: "Turn PNG screenshots, diagrams, and digital graphics into editable Microsoft Word documents.",
    introParagraph:
      "Smart AI's PNG to Word Converter processes PNG screenshots, digital scans, and graphic documents into editable Microsoft Word (.docx) documents. Because PNG graphics often contain sharp digital text, software error dialogs, and tabular figures, our OCR engine extracts content with high accuracy, preserving formatting and structural layout.",
    howToSteps: [
      {
        stepNumber: 1,
        title: "Upload Your PNG Image",
        description: "Select or drag and drop any PNG screenshot, diagram, or graphic document up to 15MB.",
      },
      {
        stepNumber: 2,
        title: "Adjust OCR Settings",
        description: "Optionally embed the original PNG graphic as an inspection reference at the top of your document.",
      },
      {
        stepNumber: 3,
        title: "Run Neural OCR Extraction",
        description: "The system analyzes character contours, line spacing, and tabular alignments.",
      },
      {
        stepNumber: 4,
        title: "Download Word (.docx)",
        description: "Receive your editable Word document ready for editing, formatting, or printing.",
      },
    ],
    supportedFormats: [
      { category: "Input", formats: ["PNG (.png)"], note: "Standard RGB and RGBA PNG screenshots and scans" },
      { category: "Output", formats: ["DOCX (.docx)"], note: "Fully editable Office Open XML Word document" },
    ],
    technicalSpecifications: [
      { label: "Engine", value: "High-accuracy neural OCR + DOCX layout builder" },
      { label: "Alpha Handling", value: "Transparent backgrounds flattened onto studio canvas for OCR clarity" },
      { label: "Output Compatibility", value: "Microsoft 365, Google Docs, Apple Pages, LibreOffice" },
    ],
    limitations: [
      "Text rendered in extremely ornate script fonts or heavily blurred graphics may require verification.",
    ],
    privacyCommitment:
      "All PNG uploads and extracted text strings are processed exclusively in volatile RAM and immediately discarded after file generation.",
    faqs: [
      {
        question: "Can I convert a screenshot of a spreadsheet or table into Word?",
        answer: "Yes. Smart AI identifies tabular structures and converts rows and columns into native Microsoft Word tables.",
      },
      {
        question: "Does it work with transparent PNG images?",
        answer: "Yes. Transparent PNGs are composited with an optimal neutral backing before OCR analysis to ensure maximum contrast and accuracy.",
      },
    ],
    relatedTools: [
      { name: "JPG to Word Converter", path: "/jpg-to-word", description: "Convert JPG and JPEG photos into editable Word documents." },
      { name: "Screenshot AI", path: "/screenshot-ai", description: "Extract text from screenshots with real-time AI explanations." },
      { name: "AI Background Remover", path: "/image-background-remover", description: "Isolate subjects and create transparent cutouts." },
    ],
    schemaType: "WebApplication",
    appCategory: "UtilitiesApplication",
  },

  "/pdf-to-word": {
    path: "/pdf-to-word",
    view: "file-tools",
    subtool: "pdf-to-word",
    title: "Convert PDF to Editable Word Document Online | Smart AI",
    metaDescription:
      "Convert PDF documents to editable Microsoft Word (.docx) files online. Preserves paragraphs, formatting, and automatically OCRs scanned documents.",
    h1: "PDF to Word Converter",
    badge: "Dual-Engine Text & OCR",
    subheading: "Transform digital and scanned PDF documents into editable Word (.docx) files.",
    introParagraph:
      "Smart AI's PDF to Word Converter employs a dual-engine architecture: for native digital PDFs, it directly maps vector text flows, font styles, and paragraphs into Microsoft Word XML; for scanned documents and image-only PDFs, it automatically activates high-precision OCR to recover text and tables without manual retyping.",
    howToSteps: [
      {
        stepNumber: 1,
        title: "Upload Your PDF Document",
        description: "Upload any digital or scanned PDF document up to 15MB.",
      },
      {
        stepNumber: 2,
        title: "Choose Page Range",
        description: "Convert all pages or specify a custom range (e.g. 1-5).",
      },
      {
        stepNumber: 3,
        title: "Automatic Text & OCR Processing",
        description: "The engine extracts digital text or runs OCR on scanned pages automatically.",
      },
      {
        stepNumber: 4,
        title: "Download Word Document",
        description: "Download your clean, editable .docx document ready to open in Microsoft Word or Google Docs.",
      },
    ],
    supportedFormats: [
      { category: "Input", formats: ["PDF (.pdf)"], note: "Both digital vector PDFs and scanned image PDFs" },
      { category: "Output", formats: ["DOCX (.docx)"], note: "Native Office Open XML Word document" },
    ],
    technicalSpecifications: [
      { label: "Processing Mode", value: "Automatic Digital Text Vector Flow + Scanned OCR Fallback" },
      { label: "Document Formatting", value: "Retains paragraphs, bold/italic text, and heading hierarchy" },
      { label: "Output Format", value: "Standard Microsoft Word .docx" },
    ],
    limitations: [
      "Password-protected PDF files must have security credentials removed before conversion.",
      "Heavily skewed photocopies may produce minor OCR deviations.",
    ],
    privacyCommitment:
      "Uploaded PDF documents are decoded in volatile memory only and are never indexed, stored permanently, or shared.",
    faqs: [
      {
        question: "Does this work on scanned PDFs that don't have selectable text?",
        answer: "Yes. Smart AI detects when a PDF contains scanned images and automatically triggers neural OCR to extract the text into Word.",
      },
      {
        question: "Will the original document layout be preserved?",
        answer: "Yes. The compiler preserves paragraph breaks, section headings, and text formatting in the resulting .docx file.",
      },
    ],
    relatedTools: [
      { name: "PDF to JPG Converter", path: "/pdf-to-jpg", description: "Convert PDF pages into high-resolution JPG images." },
      { name: "JPG to Word Converter", path: "/jpg-to-word", description: "Convert standalone JPG images and photos to Word." },
      { name: "File Tools", path: "/file-tools", description: "Merge, split, and compress your PDF files." },
    ],
    schemaType: "WebApplication",
    appCategory: "UtilitiesApplication",
  },

  "/screenshot-ai": {
    path: "/screenshot-ai",
    view: "screenshot-ai",
    title: "Analyze Screenshots with AI Visual Assistant | Smart AI",
    metaDescription:
      "Understand error codes, extract verbatim text, decipher complex forms, and draft contextual replies from any screenshot using multimodal AI vision.",
    h1: "AI Screenshot Tool & Visual Intelligence",
    badge: "Multimodal AI Vision",
    subheading: "Understand error dialogs, extract text, decode forms, and draft smart replies from any screen capture.",
    introParagraph:
      "Smart AI's Screenshot Tool applies multimodal artificial intelligence to interpret what you are seeing on your screen. Whether you encounter an ambiguous system error code, need to extract text from a locked interface, require step-by-step guidance on filling out a foreign form, or want contextual replies to an email or chat thread, Screenshot AI delivers concrete, actionable answers in seconds.",
    howToSteps: [
      {
        stepNumber: 1,
        title: "Upload or Paste Screenshot",
        description: "Upload an image, capture using your device camera, or paste directly from clipboard (Ctrl+V).",
      },
      {
        stepNumber: 2,
        title: "Select an AI Analysis Mode",
        description: "Choose from Explain (General Overview), Error Solver, Form Helper, Text Extractor (OCR), or Reply Helper.",
      },
      {
        stepNumber: 3,
        title: "Review Step-by-Step Insights",
        description: "Read detailed root-cause diagnoses, verified solutions, prevention tips, or copy extracted text in 1 click.",
      },
    ],
    supportedFormats: [
      { category: "Input", formats: ["PNG", "JPG", "JPEG", "WEBP"], note: "Clipboard paste supported directly from desktop and mobile" },
      { category: "AI Analysis Modes", formats: ["Explain", "Error Solver", "Form Helper", "Text Extractor (OCR)", "Reply Helper"], note: "5 specialized multimodal modes" },
    ],
    technicalSpecifications: [
      { label: "Vision Model", value: "Multimodal Gemini Neural Vision Engine" },
      { label: "Confidence Assessment", value: "Explicit fact-checking separating verified facts from hypotheses" },
      { label: "Text Extraction", value: "Verbatim character extraction with markdown formatting and 1-click copy" },
    ],
    limitations: [
      "Avoid uploading screenshots containing highly sensitive passwords, financial PINs, or private keys.",
      "The tool provides diagnostic assistance; critical production infrastructure errors should be reviewed by qualified engineers.",
    ],
    privacyCommitment:
      "Screenshots are analyzed in isolated API calls and discarded immediately. No user images or conversation histories are retained.",
    faqs: [
      {
        question: "Can I paste a screenshot directly from my clipboard?",
        answer: "Yes. Simply press Ctrl+V (or Cmd+V on Mac) anywhere in the tool to paste and analyze your screenshot immediately.",
      },
      {
        question: "How does the Error Solver mode work?",
        answer: "Error Solver identifies the software, programming language, or operating system in the screenshot, identifies the exact error message, explains the root cause, and provides step-by-step troubleshooting actions.",
      },
      {
        question: "Does the Text Extractor work on screenshots with low contrast?",
        answer: "Yes. The multimodal vision model excels at reading code, table data, fine print, and text overlays that standard OCR engines miss.",
      },
    ],
    relatedTools: [
      { name: "AI Scam Checker", path: "/scam-checker", description: "Evaluate suspicious emails, texts, and links for deception." },
      { name: "PNG to Word Converter", path: "/png-to-word", description: "Convert screenshot text directly into editable Word documents." },
      { name: "AI Background Remover", path: "/image-background-remover", description: "Remove backdrops from graphics and screenshots." },
    ],
    schemaType: "WebApplication",
    appCategory: "UtilitiesApplication",
  },

  "/scam-checker": {
    path: "/scam-checker",
    view: "scam-checker",
    title: "AI Scam Checker for Suspicious Messages & URLs | Smart AI",
    metaDescription:
      "Analyze suspicious emails, SMS texts, and web URLs for phishing, spoofing, and fraud signals with AI threat intelligence and risk breakdown.",
    h1: "AI Scam Checker & URL Threat Inspector",
    badge: "Threat Intelligence Engine",
    subheading: "Identify deceptive messages, phishing URLs, fake alerts, and social engineering tricks.",
    introParagraph:
      "Smart AI's Scam Checker is an online threat intelligence utility built to protect everyday users from digital fraud. By analyzing the linguistic urgency, coercive tactics, payment anomalies, and technical URL indicators of suspicious content, our engine generates an objective 0–100 risk score, flags critical warning signs, and provides practical defense steps.",
    howToSteps: [
      {
        stepNumber: 1,
        title: "Choose Message or URL Mode",
        description: "Select whether you want to inspect a suspicious text/email message or a web address (URL).",
      },
      {
        stepNumber: 2,
        title: "Input the Suspicious Content",
        description: "Paste the text of the message or enter the full website link into the analysis field.",
      },
      {
        stepNumber: 3,
        title: "Review Risk Analysis",
        description: "Receive an immediate Risk Score (0–100), severity tier, specific warning signals, and safety recommendations.",
      },
    ],
    supportedFormats: [
      { category: "Message Analysis", formats: ["SMS Texts", "Emails", "Social Media DMs", "Job Offers", "Invoices"], note: "Identifies urgent pressure, OTP lures, and impersonation" },
      { category: "URL Inspection", formats: ["HTTP & HTTPS Links", "Shortened URLs", "IP Addresses"], note: "Detects typosquatting, raw IPs, deceptive subdomains, and suspicious TLDs" },
    ],
    technicalSpecifications: [
      { label: "Scoring Metric", value: "0–100 Risk Score (Low Risk: 0–39, Moderate: 40–69, High Risk: 70–100)" },
      { label: "URL Signals", value: "Domain age, homoglyphs, multiple hyphens, suspicious TLDs, raw IP hostnames" },
      { label: "Safety Advice", value: "Concrete defensive measures and reporting links" },
    ],
    limitations: [
      "The Scam Checker provides threat intelligence; always verify suspicious bank and account claims by calling the official phone number on your card.",
      "Do not enter personal passwords or verification OTP codes into the analysis field.",
    ],
    privacyCommitment:
      "Analyzed messages and links are inspected in volatile memory and never saved into public threat databases with identifying information.",
    faqs: [
      {
        question: "How does the Scam Checker evaluate suspicious messages?",
        answer: "The AI evaluates psychological pressure triggers (e.g. artificial urgency, account closure threats), requests for sensitive data (OTPs, passwords, gift cards), and known impersonation patterns used by fraudsters.",
      },
      {
        question: "What does the URL security inspector check?",
        answer: "The URL inspector scans for domain typosquatting, look-alike characters (homoglyphs), deceptive subdomains, suspicious non-standard top-level domains (TLDs), and raw IP addresses.",
      },
    ],
    relatedTools: [
      { name: "Screenshot AI", path: "/screenshot-ai", description: "Upload screenshots of suspicious popups and dialogs for visual diagnosis." },
      { name: "File Tools", path: "/file-tools", description: "Safely convert and inspect attachments." },
    ],
    schemaType: "WebApplication",
    appCategory: "UtilitiesApplication",
  },

  "/file-tools": {
    path: "/file-tools",
    view: "file-tools",
    title: "Online File Tools for PDF & Image Documents | Smart AI",
    metaDescription:
      "All-in-one suite of everyday file utilities. Merge, split, compress PDFs, convert between JPG, PNG, WEBP, and extract document text without watermarks.",
    h1: "Smart File & Document Tools",
    badge: "All-in-One Utility Suite",
    subheading: "Fast, reliable file operations with zero watermarks and genuine binary processing.",
    introParagraph:
      "Smart AI's File Tools suite brings essential document and image utilities together in one privacy-respecting platform. Whether you need to merge multiple PDFs into a single client portfolio, split specific pages from a contract, compress hefty scans, or convert between JPG, PNG, and WEBP formats, our server-side processors complete your task without quality loss or advertisements.",
    howToSteps: [
      {
        stepNumber: 1,
        title: "Select Your File Utility",
        description: "Choose from Featured Converters (JPG/PDF/Word), PDF Utilities (Merge, Split, Compress), or Image Tools (Convert, Resize, Compress, Inspect).",
      },
      {
        stepNumber: 2,
        title: "Upload Your Files",
        description: "Upload single or multiple files up to 15MB.",
      },
      {
        stepNumber: 3,
        title: "Customize Conversion Options",
        description: "Adjust quality, page ranges, dimensions, or target file formats.",
      },
      {
        stepNumber: 4,
        title: "Instant Download",
        description: "Download the processed files immediately with zero watermarks.",
      },
    ],
    supportedFormats: [
      { category: "PDF Utilities", formats: ["Merge PDF", "Split PDF", "Compress PDF", "Images to PDF"], note: "Handles multi-page documents" },
      { category: "Featured Converters", formats: ["JPG to PDF", "PDF to JPG", "JPG to Word", "PNG to Word", "PDF to Word"], note: "High-accuracy OCR and vector rendering" },
      { category: "Image Utilities", formats: ["JPEG", "PNG", "WEBP"], note: "Format conversion, aspect-aware resizing, compression, and metadata inspection" },
    ],
    technicalSpecifications: [
      { label: "File Size Limit", value: "15 MB per upload (Expanded for Pro)" },
      { label: "Architecture", value: "Direct server-side binary stream (pdf-lib, sharp, canvas, docx)" },
      { label: "Watermarks", value: "Zero Watermarks on all outputs" },
    ],
    limitations: [
      "Files exceeding 15MB are not supported under standard free daily quotas.",
    ],
    privacyCommitment:
      "Files are held strictly in memory during conversion and discarded immediately after processing. We maintain zero permanent file archives.",
    faqs: [
      {
        question: "Are there any hidden watermarks on output documents?",
        answer: "Never. Smart AI produces clean, professional documents with zero logos or watermarks.",
      },
      {
        question: "Can I merge PDF documents with different page orientations?",
        answer: "Yes. Smart AI's PDF engine merges pages with distinct orientations and dimensions while keeping each page intact.",
      },
    ],
    relatedTools: [
      { name: "AI Background Remover", path: "/image-background-remover", description: "Isolate subjects and create transparent cutouts." },
      { name: "Screenshot AI", path: "/screenshot-ai", description: "Extract text and analyze screen captures." },
    ],
    schemaType: "WebApplication",
    appCategory: "UtilitiesApplication",
  },

  "/pricing": {
    path: "/pricing",
    view: "pricing",
    title: "Free Plan Limits & Pro Tier Access Pricing | Smart AI",
    metaDescription:
      "Explore Smart AI access tiers. Generous daily free quotas with immediate access, plus optional Pro tiers for high-volume file conversions and analysis.",
    h1: "Transparent Daily Access & Pricing",
    badge: "Honest Access Tiers",
    subheading: "Essential everyday digital tools with free daily access and zero predatory paywalls.",
    introParagraph:
      "Smart AI believes essential digital tools—such as converting an invoice to PDF, removing a background from a family photo, or checking a suspicious message—should be accessible to everyone without entering credit card details or falling into subscription traps. We offer generous free daily quotas and optional Pro plans for power users.",
    howToSteps: [
      {
        stepNumber: 1,
        title: "Standard Free Access (Active Now)",
        description: "Enjoy 5 Screenshot AI analyses, 10 Scam & URL checks, and 20 File conversions every day without registration.",
      },
      {
        stepNumber: 2,
        title: "Free Account Upgrade",
        description: "Create a free account in 10 seconds to increase daily limits to 25 Screenshot analyses, 50 Scam checks, and 100 File conversions.",
      },
      {
        stepNumber: 3,
        title: "Optional Pro Tier",
        description: "For high-volume business workflows, Pro provides unlimited analyses, 100MB file uploads, and batch processing.",
      },
    ],
    supportedFormats: [
      { category: "Free Tier", formats: ["5 Screenshot AI / day", "10 Scam checks / day", "20 File tools / day"], note: "No account required" },
      { category: "Registered Tier", formats: ["25 Screenshot AI / day", "50 Scam checks / day", "100 File tools / day"], note: "Free signup with email" },
      { category: "Pro Tier", formats: ["Unlimited analyses", "100MB file limit", "Batch processing"], note: "Coming soon" },
    ],
    technicalSpecifications: [
      { label: "Payment Policy", value: "No Credit Card Required for Free Access" },
      { label: "Quota Reset", value: "Daily at 00:00 UTC" },
      { label: "Account Privacy", value: "Zero Advertising • Zero Tracking Pixels" },
    ],
    limitations: [
      "Free daily allowances are tracked by anonymous client token or verified user account to ensure fair shared server capacity.",
    ],
    privacyCommitment:
      "We never sell user emails, usage data, or payment information. All communications adhere strictly to user privacy.",
    faqs: [
      {
        question: "Do I need a credit card to use the free plan?",
        answer: "No. You can use all free features immediately without entering payment details.",
      },
      {
        question: "When do the daily usage quotas reset?",
        answer: "All daily feature quotas reset every 24 hours at midnight UTC.",
      },
    ],
    relatedTools: [
      { name: "About Smart AI", path: "/about", description: "Learn about our platform architecture and privacy values." },
      { name: "All File Tools", path: "/file-tools", description: "Explore all included document converters." },
    ],
    schemaType: "WebPage",
  },

  "/about": {
    path: "/about",
    view: "about",
    title: "About Our Mission, Technology & Platform | Smart AI",
    metaDescription:
      "Learn about Smart AI's mission to provide honest, dependable, and privacy-first digital utility tools for screenshots, documents, and cybersecurity.",
    h1: "About Smart AI & Our Platform Mission",
    badge: "Built for Everyday People",
    subheading: "Solving digital frustrations with dependable utilities, real processing, and zero privacy compromise.",
    introParagraph:
      "Smart AI was established to solve a common modern frustration: everyday computer and smartphone tasks shouldn't require ad-infested software, predatory subscription traps, or handing private files over to untrusted third parties. We build transparent, robust tools powered by authentic server-side engines and state-of-the-art multimodal AI.",
    howToSteps: [
      {
        stepNumber: 1,
        title: "Understand",
        description: "Breaking down technical confusion, complex error messages, and foreign interfaces into plain, actionable advice.",
      },
      {
        stepNumber: 2,
        title: "Convert",
        description: "Providing real, dependable binary file transformations with zero watermarks, distortion, or artificial throttling.",
      },
      {
        stepNumber: 3,
        title: "Stay Safe",
        description: "Equipping users with practical threat intelligence to detect scam messages, fraudulent links, and phishing lures.",
      },
    ],
    supportedFormats: [
      { category: "Core Modules", formats: ["AI Visual Intelligence", "Binary File Converters", "Threat Detection", "Background Segmentation"], note: "All integrated into one unified web platform" },
    ],
    technicalSpecifications: [
      { label: "Infrastructure", value: "Secure Cloud Run container architecture with isolated memory pools" },
      { label: "AI Framework", value: "Google DeepMind Gemini models with server-side API credential isolation" },
      { label: "Data Integrity", value: "In-memory processing with automatic session expiration" },
    ],
    limitations: [
      "Smart AI is an automated utility suite; it is not a substitute for professional legal, medical, or certified financial advice.",
    ],
    privacyCommitment:
      "Privacy is our founding principle. We never monetize user content, retain document text in public search engines, or sell personal identifiers.",
    faqs: [
      {
        question: "Why was Smart AI created?",
        answer: "To provide a trustworthy, ad-free, high-quality destination for daily computer tasks like converting documents, removing backgrounds, and understanding technical screenshots.",
      },
      {
        question: "Where are Smart AI servers located?",
        answer: "Our systems run on Google Cloud Platform with enterprise-grade encryption in transit (HTTPS/TLS) and isolated processing containers.",
      },
    ],
    relatedTools: [
      { name: "Privacy Policy", path: "/privacy", description: "Review our complete data protection commitments." },
      { name: "Pricing", path: "/pricing", description: "See daily quotas and access plans." },
    ],
    schemaType: "AboutPage",
  },

  "/privacy": {
    path: "/privacy",
    view: "privacy",
    title: "Privacy Policy & Data Security Commitments | Smart AI",
    metaDescription:
      "Read the Smart AI Privacy Policy. Learn how we process your files in temporary volatile memory and never sell or monetize user content.",
    h1: "Privacy Policy & Data Protection",
    badge: "Strict Privacy Commitment",
    subheading: "Transparent, honest data protection with zero permanent storage of your personal files.",
    introParagraph:
      "At Smart AI, protecting your personal privacy is fundamental to our service design. This Privacy Policy details how we handle information when you use our web applications, file conversion tools, screenshot analyzer, and background remover.",
    howToSteps: [
      {
        stepNumber: 1,
        title: "Volatile Memory Processing",
        description: "Files you upload are loaded temporarily into volatile RAM solely to perform the requested transformation.",
      },
      {
        stepNumber: 2,
        title: "Automatic Session Expiration",
        description: "Temporary processing caches are automatically cleared once conversions complete or short session TTLs expire.",
      },
      {
        stepNumber: 3,
        title: "Zero Selling or Monetization",
        description: "We do not sell, rent, or trade your files, personal data, or account details to third parties.",
      },
    ],
    supportedFormats: [
      { category: "Security Standards", formats: ["TLS 1.3 / HTTPS Encryption", "Volatile RAM Isolation", "Strict Content Security Policies"], note: "Enterprise-grade data safety" },
    ],
    technicalSpecifications: [
      { label: "Data Retention", value: "Zero Permanent Storage for Uploaded Content" },
      { label: "Encryption", value: "End-to-End HTTPS in transit" },
      { label: "Ad Trackers", value: "Zero Third-Party Advertising Trackers" },
    ],
    limitations: [
      "Do not upload government credentials, passwords, or financial private keys into any public tool.",
    ],
    privacyCommitment:
      "We process only what is strictly required to execute your requested transformations and discard it promptly.",
    faqs: [
      {
        question: "Do you use uploaded files to train AI models?",
        answer: "No. Your files are processed using secure enterprise API endpoints with zero training usage.",
      },
      {
        question: "Can anyone else see the files I upload?",
        answer: "No. Your processing sessions are private and accessible only via temporary, unguessable session tokens.",
      },
    ],
    relatedTools: [
      { name: "Terms of Service", path: "/terms", description: "Review our terms of use." },
      { name: "About Smart AI", path: "/about", description: "Learn about our platform values." },
    ],
    schemaType: "WebPage",
  },

  "/terms": {
    path: "/terms",
    view: "terms",
    title: "Terms of Service & Platform Usage Guidelines | Smart AI",
    metaDescription:
      "Review the Terms of Service for using Smart AI tools, acceptable use guidelines, intellectual property terms, and service commitments.",
    h1: "Terms of Service & Usage Guidelines",
    badge: "Platform Guidelines",
    subheading: "Clear, equitable terms governing the use of Smart AI online utility software.",
    introParagraph:
      "These Terms of Service outline the rules and guidelines governing the use of Smart AI's website and software tools. By using our services, you agree to these terms, designed to maintain fair access, system reliability, and digital safety for all users.",
    howToSteps: [
      {
        stepNumber: 1,
        title: "Acceptable Use",
        description: "You agree to use Smart AI only for lawful purposes and not to upload malicious exploits, malware, or illegal material.",
      },
      {
        stepNumber: 2,
        title: "Fair Quotas & Rate Limits",
        description: "Users must respect daily allowances and not attempt to bypass rate limits using automated scrapers or bots.",
      },
      {
        stepNumber: 3,
        title: "Intellectual Property",
        description: "You retain 100% of all rights and ownership in the content and files you upload to Smart AI.",
      },
    ],
    supportedFormats: [
      { category: "Applicability", formats: ["Web Browser Access", "Mobile Devices", "Tablets", "API Endpoints"], note: "Applies to all visitors and registered accounts" },
    ],
    technicalSpecifications: [
      { label: "Ownership", value: "Users retain full ownership of their files and output data" },
      { label: "Service Uptime", value: "Best-effort high-availability cloud architecture" },
      { label: "Applicable Law", value: "Standard commercial cloud terms" },
    ],
    limitations: [
      "Attempting to upload executable files, exploits, or bypass security quotas is strictly prohibited.",
    ],
    privacyCommitment:
      "Smart AI guarantees you retain full intellectual property rights to your original images and converted files.",
    faqs: [
      {
        question: "Who owns the files generated by Smart AI?",
        answer: "You do. You retain complete ownership and intellectual property rights over all files you upload and download.",
      },
      {
        question: "Can I use the output files for commercial projects?",
        answer: "Yes. You may use your converted and processed files for both personal and commercial purposes.",
      },
    ],
    relatedTools: [
      { name: "Privacy Policy", path: "/privacy", description: "Learn how we protect your personal privacy." },
      { name: "About Smart AI", path: "/about", description: "Read about our platform." },
    ],
    schemaType: "WebPage",
  },
};
